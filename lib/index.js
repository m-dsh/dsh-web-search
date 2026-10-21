import Schema from "@deepseek-ai/schemastery";

//#region src/index.ts
const TAVILY_HOST = "https://api.tavily.com";
const SERPER_HOST = "https://google.serper.dev";
const TAVILY_CHANNEL = "tavily";
const SERPER_CHANNEL = "serper";
const DEFAULT_TIMEOUT_MS = 3e4;
const TAVILY_KEY_REF = "TAVILY_API_KEY";
const TAVILY_BASE_URL_REF = "TAVILY_BASE_URL";
const SERPER_KEY_REF = "SERPER_API_KEY";
const SERPER_BASE_URL_REF = "SERPER_BASE_URL";
const DEFAULT_SERPER_REF = "WEB_SEARCH_DEFAULT_SERPER";
const Config = Schema.object({
	maxResults: Schema.number().min(1).max(20).step(1).default(5),
	searchTimeoutMs: Schema.number().min(1).step(1).default(DEFAULT_TIMEOUT_MS),
	tavilyBaseURL: Schema.string().default("").volatile(),
	serperBaseURL: Schema.string().default("").volatile(),
	defaultChannel: Schema.string().default(TAVILY_CHANNEL).volatile()
});
var WebError = class extends Error {
	code;
	cause;
	constructor(message, code, opts) {
		super(message);
		this.name = "WebError";
		this.code = code;
		this.cause = opts?.cause;
	}
};
function throwIfAborted(signal) {
	if (signal?.aborted) throw new WebError("Web search aborted", "WEB_ABORTED", { cause: signal.reason });
}
function truthy(v) {
	if (v == null) return false;
	if (typeof v === "boolean") return v;
	if (typeof v === "string") return v.length > 0 && v !== "false" && v !== "0";
	return true;
}
/** 读取 credential ref 的值 */
async function resolveRef(ctx, ref) {
	try {
		const creds = ctx.get("credentials");
		if (!creds) return void 0;
		return (await creds.resolve(ref))?.value;
	} catch {
		return;
	}
}
/** 解析 baseURL：credential ref (legacy) > Config > 默认 host */
async function resolveBaseURL(ctx, config, credRef, configKey, defaultHost) {
	const credVal = await resolveRef(ctx, credRef);
	if (credVal && credVal.trim().length > 0) return credVal.trim();
	const cfgVal = config[configKey].get();
	if (typeof cfgVal === "string" && cfgVal.trim().length > 0) return cfgVal.trim();
	return defaultHost;
}
/**
* 拼接搜索端点路径。
*
* 不能写成 `new URL('/search', baseURL)`：那会把自定义地址里的路径前缀
* （如 `https://host/tavily` 的 `/tavily`）整段替换掉，导致两个渠道最终
* 都打到同一个 `/search` 上。这里改为在前缀之后追加，且对已以该路径
* 结尾的地址保持幂等。
*/
function buildSearchURL(baseURL, path = "/search") {
	const trimmed = baseURL.trim().replace(/\/+$/, "");
	return trimmed.endsWith(path) ? trimmed : `${trimmed}${path}`;
}
/**
* 去掉启用开关后，实际使用的渠道完全由默认渠道决定。
* credential 上的 legacy DEFAULT_SERPER_REF 仍保持最高优先级。
*/
async function resolveChannel(ctx, config) {
	if (truthy(await resolveRef(ctx, DEFAULT_SERPER_REF))) return SERPER_CHANNEL;
	if (config.defaultChannel.get() === SERPER_CHANNEL) return SERPER_CHANNEL;
	return TAVILY_CHANNEL;
}
function tavilyToSources(data) {
	const results = data.results;
	if (!Array.isArray(results)) return [];
	return results.filter((r) => !!r && typeof r === "object").map((r) => ({
		title: typeof r.title === "string" ? r.title : "",
		url: typeof r.url === "string" ? r.url : "",
		content: typeof r.content === "string" ? r.content : ""
	}));
}
async function searchTavily(baseURL, key, request, maxResults, timeoutMs, signal) {
	const body = {
		query: request.query,
		max_results: maxResults,
		search_depth: "basic",
		include_answer: false
	};
	if (key) body.api_key = key;
	const controller = new AbortController();
	const linked = AbortSignal.any?.([signal, controller.signal].filter(Boolean)) ?? controller.signal;
	const timer = setTimeout(() => controller.abort(), timeoutMs);
	try {
		const res = await fetch(buildSearchURL(baseURL), {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(body),
			signal: linked
		});
		if (!res.ok) {
			const text = await res.text().catch(() => "");
			throw new WebError(`Tavily HTTP ${res.status}: ${text.slice(0, 200)}`, "provider_error");
		}
		return tavilyToSources(await res.json());
	} finally {
		clearTimeout(timer);
	}
}
function serperToSources(data) {
	const organic = data.organic;
	if (!Array.isArray(organic)) return [];
	return organic.filter((r) => !!r && typeof r === "object").map((r) => ({
		title: typeof r.title === "string" ? r.title : "",
		url: typeof r.link === "string" ? r.link : "",
		content: typeof r.snippet === "string" ? r.snippet : ""
	}));
}
async function searchSerper(baseURL, key, request, maxResults, timeoutMs, signal) {
	const body = {
		q: request.query,
		num: maxResults
	};
	const controller = new AbortController();
	const linked = AbortSignal.any?.([signal, controller.signal].filter(Boolean)) ?? controller.signal;
	const timer = setTimeout(() => controller.abort(), timeoutMs);
	try {
		const url = buildSearchURL(baseURL);
		const res = await fetch(url, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				...key ? { "X-API-KEY": key } : {}
			},
			body: JSON.stringify(body),
			signal: linked
		});
		if (!res.ok) {
			const text = await res.text().catch(() => "");
			throw new WebError(`Serper HTTP ${res.status}: ${text.slice(0, 200)}`, "provider_error");
		}
		return serperToSources(await res.json());
	} finally {
		clearTimeout(timer);
	}
}
/**
* 原生 http.ServerResponse 没有 Express 的 status()/json()，
* 直接 writeHead + end 输出 JSON；body 为 null/undefined 时只发状态码。
*/
function sendJson(res, status, body) {
	const r = res;
	if (body === null || body === void 0) {
		r.writeHead(status);
		r.end();
		return;
	}
	r.writeHead(status, { "content-type": "application/json; charset=utf-8" });
	r.end(JSON.stringify(body));
}
function createProbeHandler(ctx, config, channel) {
	return async (req, res) => {
		const r = req;
		if (r.method === "OPTIONS") return sendJson(res, 204, null);
		if (r.method !== "POST") return sendJson(res, 405, {
			ok: false,
			code: "method"
		});
		try {
			const keyRef = channel === TAVILY_CHANNEL ? TAVILY_KEY_REF : SERPER_KEY_REF;
			const baseRef = channel === TAVILY_CHANNEL ? TAVILY_BASE_URL_REF : SERPER_BASE_URL_REF;
			const host = channel === TAVILY_CHANNEL ? TAVILY_HOST : SERPER_HOST;
			const configKey = channel === TAVILY_CHANNEL ? "tavilyBaseURL" : "serperBaseURL";
			const [key, baseURL] = await Promise.all([resolveRef(ctx, keyRef), resolveBaseURL(ctx, config, baseRef, configKey, host)]);
			await (channel === TAVILY_CHANNEL ? searchTavily : searchSerper)(baseURL, key, { query: "test" }, 1, 1e4, AbortSignal.timeout(1e4));
			return sendJson(res, 200, { ok: true });
		} catch (err) {
			if (err instanceof WebError) {
				if (err.code === "WEB_ABORTED") return sendJson(res, 200, {
					ok: false,
					code: "timeout"
				});
				return sendJson(res, 200, {
					ok: false,
					code: err.code,
					status: void 0,
					error: err.message
				});
			}
			return sendJson(res, 200, {
				ok: false,
				code: "network",
				error: String(err)
			});
		}
	};
}
const name = "dsh-web-search";
const inject = [
	"web",
	"webServer",
	"credentials",
	"settings"
];
function apply(ctx, config) {
	(async () => {
		for (const [credRef, cfgKey] of [[TAVILY_BASE_URL_REF, "tavilyBaseURL"], [SERPER_BASE_URL_REF, "serperBaseURL"]]) try {
			const credVal = await resolveRef(ctx, credRef);
			if (credVal != null && String(credVal).length > 0 && !config[cfgKey].get()) await ctx.settings.update("web-search", { [cfgKey]: String(credVal) });
		} catch {}
		try {
			if (truthy(await resolveRef(ctx, DEFAULT_SERPER_REF)) && config.defaultChannel.get() !== SERPER_CHANNEL) await ctx.settings.update("web-search", { defaultChannel: SERPER_CHANNEL });
		} catch {}
	})();
	const provider = {
		id: "web-search",
		available: () => true,
		search: async (request, signal) => {
			throwIfAborted(signal);
			const channel = await resolveChannel(ctx, config);
			const { maxResults, searchTimeoutMs } = config;
			const keyRef = channel === TAVILY_CHANNEL ? TAVILY_KEY_REF : SERPER_KEY_REF;
			const baseRef = channel === TAVILY_CHANNEL ? TAVILY_BASE_URL_REF : SERPER_BASE_URL_REF;
			const host = channel === TAVILY_CHANNEL ? TAVILY_HOST : SERPER_HOST;
			const cfgKey = channel === TAVILY_CHANNEL ? "tavilyBaseURL" : "serperBaseURL";
			const [key, baseURL] = await Promise.all([resolveRef(ctx, keyRef), resolveBaseURL(ctx, config, baseRef, cfgKey, host)]);
			return { sources: await (channel === TAVILY_CHANNEL ? searchTavily : searchSerper)(baseURL, key, request, maxResults, searchTimeoutMs, signal) };
		}
	};
	const web = ctx.get("web");
	if (web) web.registerSearchProvider(provider);
	else {
		const providers = ctx.get("webSearchProviders");
		if (providers) providers["web-search"] = provider;
	}
	const ws = ctx.get("webServer");
	if (ws) {
		ws.register({
			kind: "exact",
			path: "/api/web-search-probe/tavily",
			handler: createProbeHandler(ctx, config, TAVILY_CHANNEL)
		});
		ws.register({
			kind: "exact",
			path: "/api/web-search-probe/serper",
			handler: createProbeHandler(ctx, config, SERPER_CHANNEL)
		});
		ws.register({
			kind: "exact",
			path: "/api/web-search-config",
			handler: async (req, res) => {
				if (req.method !== "GET") return sendJson(res, 405, {});
				try {
					const [travilyURL, serperURL, defSerper] = await Promise.all([
						resolveBaseURL(ctx, config, TAVILY_BASE_URL_REF, "tavilyBaseURL", TAVILY_HOST),
						resolveBaseURL(ctx, config, SERPER_BASE_URL_REF, "serperBaseURL", SERPER_HOST),
						resolveRef(ctx, DEFAULT_SERPER_REF)
					]);
					return sendJson(res, 200, {
						tavilyBaseURL: travilyURL === TAVILY_HOST ? "" : travilyURL,
						serperBaseURL: serperURL === SERPER_HOST ? "" : serperURL,
						defaultChannel: truthy(defSerper) ? SERPER_CHANNEL : config.defaultChannel.get() || TAVILY_CHANNEL
					});
				} catch {
					return sendJson(res, 200, {
						tavilyBaseURL: "",
						serperBaseURL: "",
						defaultChannel: TAVILY_CHANNEL
					});
				}
			}
		});
	}
}

//#endregion
export { Config, apply, inject, name };