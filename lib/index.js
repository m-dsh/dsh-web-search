import z from "@deepseek-ai/schemastery";
import { credentialRef } from "@deepseek-ai/dsh-credentials";
import { launchEnvironmentOf } from "@deepseek-ai/dsh-launch-environment";
import { WebError } from "@deepseek-ai/dsh-web";
import {
  DeepSeekSearchProvider,
  DEEPSEEK_DEFAULT_API_VERSION,
  DEEPSEEK_DEFAULT_BASE_URL,
  DEEPSEEK_DEFAULT_MAX_TOKENS,
  DEEPSEEK_DEFAULT_MAX_USES,
  DEEPSEEK_DEFAULT_MODEL,
} from "@deepseek-ai/dsh-web-search-deepseek";

/**
 * Composite registry id. Pinned in cordis.patch.yml so selection is
 * deterministic no matter how many channels are enabled.
 * Must not collide with deepseek-official / exa / perplexity.
 */
export const WEB_SEARCH_PROVIDER_ID = "web-search";
export const TAVILY_CHANNEL = "tavily";
export const SERPER_CHANNEL = "serper";

// ── Default hosts ─────────────────────────────────────────
const TAVILY_HOST = "https://api.tavily.com";
const SERPER_HOST = "https://google.serper.dev";
const DEFAULT_TIMEOUT_MS = 30_000;

// ── Credential refs ───────────────────────────────────────
// Per-channel switch/key/baseURL. describe() is value-free: presence = on.
export const TAVILY_ENABLED_REF = "TAVILY_SEARCH_ENABLED";
export const TAVILY_KEY_REF = "TAVILY_API_KEY";
export const TAVILY_BASE_URL_REF = "TAVILY_BASE_URL";

export const SERPER_ENABLED_REF = "SERPER_SEARCH_ENABLED";
export const SERPER_KEY_REF = "SERPER_API_KEY";
export const SERPER_BASE_URL_REF = "SERPER_BASE_URL";

// Default channel when both are enabled. Presence of this ref = "serper";
// absent (or the legacy TAVILY marker) = "tavily". Value-free friendly.
export const DEFAULT_SERPER_REF = "WEB_SEARCH_DEFAULT_SERPER";

// ── Plugin metadata ───────────────────────────────────────
export const name = "web-search";
export const inject = ["web", "webServer", "settings"];

// ── Config schema ──
// enabled / baseURL / defaultChannel live in config (client-readable via settings.section).
// Credential refs are legacy / headless overrides (checked first for backward compat).
// API keys remain in credentials (secrets — not readable from client).
export const Config = z.object({
  maxResults: z.number().step(1).min(1).max(20).default(5),
  searchTimeoutMs: z.number().step(1).min(1).default(DEFAULT_TIMEOUT_MS),
  tavilyEnabled: z.boolean().default(false),
  serperEnabled: z.boolean().default(false),
  tavilyBaseURL: z.string().default(""),
  serperBaseURL: z.string().default(""),
  defaultChannel: z.string().default("tavily"),
});

// ═══════════════════════════════════════════════════════════
//  Helpers
// ═══════════════════════════════════════════════════════════

function throwIfAborted(signal) {
  if (signal?.aborted)
    throw new WebError("Web search aborted", "WEB_ABORTED", { cause: signal.reason });
}

function isAbortError(error) {
  return error instanceof DOMException && (error.name === "AbortError" || error.name === "TimeoutError");
}

function truthy(value) {
  if (value == null) return false;
  const v = String(value).trim().toLowerCase();
  return v === "true" || v === "1" || v === "yes" || v === "on";
}

function validateHost(baseURL, defaultHost) {
  const host = (baseURL || defaultHost).replace(/\/+$/, "");
  if (!host.startsWith("https://")) {
    throw new WebError(`Custom baseURL must use https: ${host}`, "WEB_PROVIDER_ERROR");
  }
  return host;
}

function deadlineSignal(signal, timeoutMs) {
  if (!timeoutMs || timeoutMs <= 0) return signal;
  const timer = AbortSignal.timeout(timeoutMs);
  if (!signal) return timer;
  if (typeof AbortSignal.any === "function") return AbortSignal.any([signal, timer]);
  return timer;
}

/** literal > credentials plane > launch environment. */
async function resolveRef(ctx, envName, literal) {
  if (literal && literal.length > 0) return literal;
  const ref = credentialRef(envName);
  const creds = ctx.get("credentials");
  if (creds) {
    const resolved = await creds.resolve(ref);
    if (resolved?.value && resolved.value.length > 0) return resolved.value;
  }
  const env = launchEnvironmentOf(ctx).get(ref);
  if (env?.value && env.value.length > 0) return env.value;
  return undefined;
}

// ── HTTP helpers ──────────────────────────────────────────

function sendJson(res, status, payload) {
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
  });
  res.end(JSON.stringify(payload));
}

function readJsonBody(req, limit = 4096) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > limit) { reject(new Error("body too large")); req.destroy(); return; }
      chunks.push(chunk);
    });
    req.on("end", () => {
      const text = Buffer.concat(chunks).toString("utf8").trim();
      if (!text) { resolve({}); return; }
      try {
        const json = JSON.parse(text);
        resolve(json !== null && typeof json === "object" && !Array.isArray(json) ? json : {});
      } catch { reject(new Error("invalid JSON body")); }
    });
    req.on("error", reject);
  });
}

function classifyProbeError(error) {
  const msg = error instanceof Error ? error.message : String(error);
  if (/timed out|TimeoutError/i.test(msg)) return { code: "timeout" };
  if (/aborted/i.test(msg)) return { code: "timeout" };
  const http = msg.match(/HTTP (\d{3})/);
  if (http) {
    const status = Number(http[1]);
    if (status === 401 || status === 403) return { code: "invalid_key" };
    return { code: "http", status };
  }
  if (/unauthorized|invalid api key|forbidden|invalid key|missing api key/i.test(msg)) return { code: "invalid_key" };
  if (/request failed|fetch failed|ECONN|ENOTFOUND|network/i.test(msg)) return { code: "network" };
  if (/must use https/i.test(msg)) return { code: "other", error: "baseURL must use https" };
  const trimmed = msg.replace(/^(Tavily|Serper) (API error|returned an unprocessable response):?\s*/i, "").slice(0, 60);
  return { code: "other", error: trimmed || "unknown" };
}

// ═══════════════════════════════════════════════════════════
//  Tavily channel
// ═══════════════════════════════════════════════════════════

function tavilyHeaders(apiKey) {
  const headers = { "content-type": "application/json", accept: "application/json" };
  if (apiKey) headers.authorization = `Bearer ${apiKey}`;
  else headers["x-tavily-access-mode"] = "keyless";
  return headers;
}

async function tavilyErrorText(res) {
  let message = `Tavily API error (HTTP ${res.status})`;
  try {
    const json = await res.json();
    const detail = typeof json?.error === "string" ? json.error
      : json?.error?.message || json?.message || json?.detail;
    if (typeof detail === "string" && detail.length > 0) message = detail;
  } catch { /* keep status-line fallback */ }
  return message;
}

function tavilyToSources(body) {
  const rows = Array.isArray(body?.results) ? body.results : [];
  const sources = [];
  for (const row of rows) {
    if (typeof row?.url !== "string" || row.url.length === 0) continue;
    const item = { url: row.url };
    if (typeof row.title === "string" && row.title) item.title = row.title;
    if (typeof row.content === "string" && row.content) item.snippet = row.content.slice(0, 800);
    if (typeof row.published_date === "string" && row.published_date) item.publishedAt = row.published_date;
    sources.push(item);
  }
  return { sources, truncated: false };
}

async function searchTavily(query, opts, signal) {
  throwIfAborted(signal);
  const host = validateHost(opts.baseURL, TAVILY_HOST);
  const requestSignal = deadlineSignal(signal, opts.searchTimeoutMs);
  let res;
  try {
    res = await fetch(`${host}/search`, {
      method: "POST",
      redirect: "error",
      headers: tavilyHeaders(opts.apiKey),
      body: JSON.stringify({
        query,
        max_results: opts.maxResults,
        search_depth: "basic",
        chunks_per_source: 3,
        include_answer: false,
        include_raw_content: false,
        include_images: false,
      }),
      ...(requestSignal ? { signal: requestSignal } : {}),
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "TimeoutError")
      throw new WebError(`Tavily search timed out after ${opts.searchTimeoutMs}ms`, "WEB_PROVIDER_ERROR", { cause: error });
    if (signal?.aborted || isAbortError(error))
      throw new WebError("Tavily search aborted", "WEB_ABORTED", { cause: error });
    throw new WebError(`Tavily request failed: ${String(error)}`, "WEB_PROVIDER_ERROR", { cause: error });
  }
  if (!res.ok) {
    if (signal?.aborted) throwIfAborted(signal);
    throw new WebError(await tavilyErrorText(res), "WEB_PROVIDER_ERROR");
  }
  try {
    return tavilyToSources(await res.json());
  } catch (error) {
    if (signal?.aborted || isAbortError(error))
      throw new WebError("Tavily search aborted", "WEB_ABORTED", { cause: error });
    throw new WebError(`Tavily returned an unprocessable response: ${String(error)}`, "WEB_PROVIDER_ERROR", { cause: error });
  }
}

// ═══════════════════════════════════════════════════════════
//  Serper channel
// ═══════════════════════════════════════════════════════════

function serperHeaders(apiKey) {
  return {
    "content-type": "application/json",
    accept: "application/json",
    "x-api-key": apiKey || "",
  };
}

async function serperErrorText(res) {
  let message = `Serper API error (HTTP ${res.status})`;
  try {
    const json = await res.json();
    const detail = typeof json?.message === "string" ? json.message
      : typeof json?.error === "string" ? json.error : "";
    if (detail.length > 0) message = detail;
  } catch { /* keep status-line fallback */ }
  return message;
}

function serperToSources(body) {
  const rows = Array.isArray(body?.organic) ? body.organic : [];
  const sources = [];
  for (const row of rows) {
    if (typeof row?.link !== "string" || row.link.length === 0) continue;
    const item = { url: row.link };
    if (typeof row.title === "string" && row.title) item.title = row.title;
    if (typeof row.snippet === "string" && row.snippet) item.snippet = row.snippet.slice(0, 800);
    if (typeof row.date === "string" && row.date) item.publishedAt = row.date;
    sources.push(item);
  }
  return { sources, truncated: false };
}

async function searchSerper(query, opts, signal) {
  throwIfAborted(signal);
  if (!opts.apiKey) {
    throw new WebError("Serper API key is required (SERPER_API_KEY)", "WEB_PROVIDER_ERROR");
  }
  const host = validateHost(opts.baseURL, SERPER_HOST);
  const requestSignal = deadlineSignal(signal, opts.searchTimeoutMs);
  let res;
  try {
    res = await fetch(`${host}/search`, {
      method: "POST",
      redirect: "error",
      headers: serperHeaders(opts.apiKey),
      body: JSON.stringify({ q: query, num: opts.maxResults }),
      ...(requestSignal ? { signal: requestSignal } : {}),
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "TimeoutError")
      throw new WebError(`Serper search timed out after ${opts.searchTimeoutMs}ms`, "WEB_PROVIDER_ERROR", { cause: error });
    if (signal?.aborted || isAbortError(error))
      throw new WebError("Serper search aborted", "WEB_ABORTED", { cause: error });
    throw new WebError(`Serper request failed: ${String(error)}`, "WEB_PROVIDER_ERROR", { cause: error });
  }
  if (!res.ok) {
    if (signal?.aborted) throwIfAborted(signal);
    throw new WebError(await serperErrorText(res), "WEB_PROVIDER_ERROR");
  }
  try {
    return serperToSources(await res.json());
  } catch (error) {
    if (signal?.aborted || isAbortError(error))
      throw new WebError("Serper search aborted", "WEB_ABORTED", { cause: error });
    throw new WebError(`Serper returned an unprocessable response: ${String(error)}`, "WEB_PROVIDER_ERROR", { cause: error });
  }
}

// ═══════════════════════════════════════════════════════════
//  Base URL resolution: credential ref (legacy/headless) > config > default
// ═══════════════════════════════════════════════════════════

async function resolveBaseURL(ctx, config, credRef, configKey, defaultHost) {
  // 1) Credential ref — legacy / headless override
  const credVal = await resolveRef(ctx, credRef);
  if (typeof credVal === "string" && credVal.length > 0) return credVal;
  // 2) Plugin config — settable from client settings card
  const cfgVal = config[configKey];
  if (typeof cfgVal === "string" && cfgVal.length > 0) return cfgVal;
  // 3) Default
  return defaultHost;
}

// ═══════════════════════════════════════════════════════════
//  Channel routing (fresh resolution on every call)
// ═══════════════════════════════════════════════════════════

/**
 * Resolve the active channel at execution time:
 *   requested default (config.defaultChannel, or credential WEB_SEARCH_DEFAULT_SERPER)
 *   → fall back to the other channel if the requested one is disabled
 *   → null when neither channel is enabled (caller falls back to DeepSeek).
 */
async function resolveChannel(ctx, config) {
  const [tavilyOnCred, serperOnCred, defaultSerper] = await Promise.all([
    resolveRef(ctx, TAVILY_ENABLED_REF),
    resolveRef(ctx, SERPER_ENABLED_REF),
    resolveRef(ctx, DEFAULT_SERPER_REF),
  ]);
  // Config value with credential as override
  const tavilyOn = truthy(tavilyOnCred) || config.tavilyEnabled === true;
  const serperOn = truthy(serperOnCred) || config.serperEnabled === true;
  // defaultChannel: credential ref > config > "tavily"
  const preferred = truthy(defaultSerper) ? SERPER_CHANNEL
    : (config.defaultChannel === SERPER_CHANNEL ? SERPER_CHANNEL : TAVILY_CHANNEL);
  const enabled = { [TAVILY_CHANNEL]: tavilyOn, [SERPER_CHANNEL]: serperOn };
  if (enabled[preferred]) return preferred;
  if (enabled[TAVILY_CHANNEL]) return TAVILY_CHANNEL;
  if (enabled[SERPER_CHANNEL]) return SERPER_CHANNEL;
  return null;
}

// ═══════════════════════════════════════════════════════════
//  Probe endpoint factory (per channel, draft-aware)
// ═══════════════════════════════════════════════════════════

function createProbeHandler(ctx, config, channel) {
  const isTavily = channel === TAVILY_CHANNEL;
  const keyRef = isTavily ? TAVILY_KEY_REF : SERPER_KEY_REF;
  const baseURLRef = isTavily ? TAVILY_BASE_URL_REF : SERPER_BASE_URL_REF;
  const configKey = isTavily ? "tavilyBaseURL" : "serperBaseURL";
  const defaultHost = isTavily ? TAVILY_HOST : SERPER_HOST;
  const searchFn = isTavily ? searchTavily : searchSerper;

  return async (req, res) => {
    if (req.method !== "POST")
      return sendJson(res, 405, { ok: false, code: "other", error: "method not allowed" });
    try {
      const body = await readJsonBody(req);
      const draftKey = typeof body.apiKey === "string" ? body.apiKey.trim() : "";
      const clearKey = body.clearKey === true;
      const draftBaseURL = typeof body.baseURL === "string" ? body.baseURL.trim() : "";
      const clearBaseURL = body.clearBaseURL === true;

      let apiKey;
      if (draftKey.length > 0) apiKey = draftKey.slice(0, 512);
      else if (!clearKey) apiKey = await resolveRef(ctx, keyRef);

      let baseURL;
      if (draftBaseURL.length > 0) baseURL = draftBaseURL;
      else if (clearBaseURL) baseURL = defaultHost;
      else baseURL = await resolveBaseURL(ctx, config, baseURLRef, configKey, defaultHost);

      const mode = isTavily ? (apiKey ? "key" : "keyless") : (apiKey ? "key" : "no_key");
      await searchFn(isTavily ? "tavily" : "serper", {
        apiKey,
        baseURL,
        maxResults: 1,
        searchTimeoutMs: config.searchTimeoutMs || DEFAULT_TIMEOUT_MS,
      });
      return sendJson(res, 200, { ok: true, mode, channel });
    } catch (error) {
      if (error instanceof Error && (error.message === "invalid JSON body" || error.message === "body too large"))
        return sendJson(res, 400, { ok: false, code: "other", error: error.message });
      return sendJson(res, 200, { ok: false, ...classifyProbeError(error), channel });
    }
  };
}

// ═══════════════════════════════════════════════════════════
//  Plugin entry
// ═══════════════════════════════════════════════════════════

export function apply(ctx, config) {
  ctx.settings.register("web-search", Config);

  const maxResults = config.maxResults || 5;
  const searchTimeoutMs = config.searchTimeoutMs || DEFAULT_TIMEOUT_MS;

  // ── One-time migration: copy credential-stored state into config ──
  (async () => {
    for (const [credRef, cfgKey] of [[TAVILY_ENABLED_REF, "tavilyEnabled"], [SERPER_ENABLED_REF, "serperEnabled"], [TAVILY_BASE_URL_REF, "tavilyBaseURL"], [SERPER_BASE_URL_REF, "serperBaseURL"]]) {
      try {
        const credVal = await resolveRef(ctx, credRef);
        if (credVal != null && String(credVal).length > 0 && !config[cfgKey]) {
          const v = cfgKey.endsWith("Enabled") ? truthy(credVal) : String(credVal);
          ctx.settings.set("web-search", cfgKey, v);
          config[cfgKey] = v;
        }
      } catch { /* best-effort */ }
    }
    try {
      const defSerper = await resolveRef(ctx, DEFAULT_SERPER_REF);
      if (truthy(defSerper) && config.defaultChannel !== SERPER_CHANNEL) {
        ctx.settings.set("web-search", "defaultChannel", SERPER_CHANNEL);
        config.defaultChannel = SERPER_CHANNEL;
      }
    } catch { /* best-effort */ }
  })();

  // Official DeepSeek fallback (also used when both channels are off).
  const deepseek = new DeepSeekSearchProvider(() => ({
    resolveApiKey: async () => resolveRef(ctx, "DEEPSEEK_API_KEY"),
    apiKeyEnv: credentialRef("DEEPSEEK_API_KEY"),
    baseURL: DEEPSEEK_DEFAULT_BASE_URL,
    model: DEEPSEEK_DEFAULT_MODEL,
    apiVersion: DEEPSEEK_DEFAULT_API_VERSION,
    maxTokens: DEEPSEEK_DEFAULT_MAX_TOKENS,
    maxUses: DEEPSEEK_DEFAULT_MAX_USES,
  }));

  ctx.web.registerSearchProvider({
    id: WEB_SEARCH_PROVIDER_ID,

    /**
     * Cheap local check — always true: this provider can always serve a
     * search (an enabled channel, or the official DeepSeek fallback when
     * both channels are off). Routing happens at search time so credential
     * edits from the settings card take effect on the next call.
     */
    available() {
      return true;
    },

    async search(request, signal) {
      throwIfAborted(signal);
      const channel = await resolveChannel(ctx, config);

      if (channel === TAVILY_CHANNEL) {
        const apiKey = await resolveRef(ctx, TAVILY_KEY_REF);
        const baseURL = await resolveBaseURL(ctx, config, TAVILY_BASE_URL_REF, "tavilyBaseURL", TAVILY_HOST);
        return searchTavily(request.query, {
          apiKey,
          baseURL,
          maxResults: request.maxResults ?? maxResults,
          searchTimeoutMs,
        }, signal);
      }

      if (channel === SERPER_CHANNEL) {
        const apiKey = await resolveRef(ctx, SERPER_KEY_REF);
        const baseURL = await resolveBaseURL(ctx, config, SERPER_BASE_URL_REF, "serperBaseURL", SERPER_HOST);
        return searchSerper(request.query, {
          apiKey,
          baseURL,
          maxResults: request.maxResults ?? maxResults,
          searchTimeoutMs,
        }, signal);
      }

      // Both channels off → official DeepSeek (same as the old toggle-off).
      return deepseek.search(request, signal);
    },
  });

  // ── Connectivity probe endpoints (one per channel) ──
  ctx.webServer.register({
    kind: "exact",
    path: "/api/web-search-probe/tavily",
    handler: createProbeHandler(ctx, config, TAVILY_CHANNEL),
  });
  ctx.webServer.register({
    kind: "exact",
    path: "/api/web-search-probe/serper",
    handler: createProbeHandler(ctx, config, SERPER_CHANNEL),
  });

  // ── Config endpoint (returns resolved config for client) ──
  ctx.webServer.register({
    kind: "exact",
    path: "/api/web-search-config",
    handler: async (req, res) => {
      if (req.method !== "GET") return sendJson(res, 405, {});
      try {
        const [tavilyURL, serperURL, tavilyOn, serperOn, defSerper] = await Promise.all([
          resolveBaseURL(ctx, config, TAVILY_BASE_URL_REF, "tavilyBaseURL", TAVILY_HOST),
          resolveBaseURL(ctx, config, SERPER_BASE_URL_REF, "serperBaseURL", SERPER_HOST),
          resolveRef(ctx, TAVILY_ENABLED_REF),
          resolveRef(ctx, SERPER_ENABLED_REF),
          resolveRef(ctx, DEFAULT_SERPER_REF),
        ]);
        return sendJson(res, 200, {
          tavilyEnabled: truthy(tavilyOn) || config.tavilyEnabled === true,
          serperEnabled: truthy(serperOn) || config.serperEnabled === true,
          tavilyBaseURL: tavilyURL === TAVILY_HOST ? "" : tavilyURL,
          serperBaseURL: serperURL === SERPER_HOST ? "" : serperURL,
          defaultChannel: truthy(defSerper) ? SERPER_CHANNEL : (config.defaultChannel || TAVILY_CHANNEL),
        });
      } catch {
        return sendJson(res, 200, { tavilyEnabled: false, serperEnabled: false, tavilyBaseURL: "", serperBaseURL: "", defaultChannel: TAVILY_CHANNEL });
      }
    },
  });
}