/**
 * dsh-web-search — Tavily + Serper 多渠道网页搜索插件。
 *
 * 综合 Provider id "web-search"，内部按配置路由到对应渠道；
 * 两个渠道都未启用时回退官方 DeepSeek 搜索。
 */

import Schema from '@deepseek-ai/schemastery'

// DSH-injected context — not extending Cordis to avoid conflicting settings type
interface DshContext {
  settings: {
    update(ns: string, patch: Record<string, unknown>): Promise<void>
  }
  get(key: 'web'): DshWeb | undefined
  get(key: 'webServer'): DshWebServer | undefined
  get(key: 'credentials'): DshCredentials | undefined
  get(key: 'webSearchProviders'): Record<string, WebSearchProvider> | undefined
  get(key: string): unknown
  on(event: string, handler: (...args: unknown[]) => void): void
}

/**
 * The current `web` service. A provider is registered by calling a method on
 * this service; the `webSearchProviders` registry object it replaced no longer
 * exists, so writing to that object alone registers nothing (silently).
 */
interface DshWeb {
  registerSearchProvider(provider: WebSearchProvider): () => void
}

interface DshWebServer {
  register(opts: {
    kind: 'exact'
    path: string
    handler: (req: unknown, res: unknown) => void | Promise<void>
  }): void
}

interface DshCredentials {
  resolve: (ref: string) => Promise<{ value?: string }>
}

// ═══════════════════════════════════════════════════════════
//  常量
// ═══════════════════════════════════════════════════════════

const TAVILY_HOST = 'https://api.tavily.com'
const SERPER_HOST = 'https://google.serper.dev'
const TAVILY_CHANNEL = 'tavily'
const SERPER_CHANNEL = 'serper'
const DEFAULT_TIMEOUT_MS = 30_000

const TAVILY_KEY_REF = 'TAVILY_API_KEY'
const TAVILY_BASE_URL_REF = 'TAVILY_BASE_URL'
const SERPER_KEY_REF = 'SERPER_API_KEY'
const SERPER_BASE_URL_REF = 'SERPER_BASE_URL'
const DEFAULT_SERPER_REF = 'WEB_SEARCH_DEFAULT_SERPER'

// ═══════════════════════════════════════════════════════════
//  Config
// ═══════════════════════════════════════════════════════════

export const Config = Schema.object({
  maxResults: Schema.number().min(1).max(20).step(1).default(5),
  searchTimeoutMs: Schema.number().min(1).step(1).default(DEFAULT_TIMEOUT_MS),
  tavilyBaseURL: Schema.string().default('').volatile(),
  serperBaseURL: Schema.string().default('').volatile(),
  defaultChannel: Schema.string().default(TAVILY_CHANNEL).volatile(),
})

export type ConfigType = ReturnType<typeof Config>

// ═══════════════════════════════════════════════════════════
//  声明扩展
// ═══════════════════════════════════════════════════════════

declare module '@deepseek-ai/cordis' {
  interface Events {
    // 由 dsh-web 注入的搜索能力
  }
}

interface WebSearchRequest {
  query: string
  maxResults?: number
}

interface WebSearchSource {
  title: string
  url: string
  content: string
}

interface WebSearchResult {
  sources: WebSearchSource[]
}

interface WebSearchProvider {
  id: string
  available(ctx: unknown, signal?: AbortSignal): boolean | Promise<boolean>
  search(request: WebSearchRequest, signal?: AbortSignal): Promise<WebSearchResult>
}

// ═══════════════════════════════════════════════════════════
//  Helpers
// ═══════════════════════════════════════════════════════════

class WebError extends Error {
  code: string
  cause?: unknown
  constructor(message: string, code: string, opts?: { cause?: unknown }) {
    super(message)
    this.name = 'WebError'
    this.code = code
    this.cause = opts?.cause
  }
}

function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) {
    throw new WebError('Web search aborted', 'WEB_ABORTED', {
      cause: signal.reason,
    })
  }
}

function isAbortError(error: unknown): boolean {
  if (error instanceof WebError && error.code === 'WEB_ABORTED') return true
  if (error instanceof DOMException && error.name === 'AbortError') return true
  if (error instanceof Error && error.name === 'AbortError') return true
  return false
}

function truthy(v: unknown): boolean {
  if (v == null) return false
  if (typeof v === 'boolean') return v
  if (typeof v === 'string') return v.length > 0 && v !== 'false' && v !== '0'
  return true
}

/** 读取 credential ref 的值 */
async function resolveRef(ctx: DshContext, ref: string): Promise<string | undefined> {
  try {
    const creds = ctx.get('credentials')
    if (!creds) return undefined
    const r = await creds.resolve(ref)
    return r?.value
  } catch {
    return undefined
  }
}

/** 解析 baseURL：credential ref (legacy) > Config > 默认 host */
async function resolveBaseURL(
  ctx: DshContext,
  config: ConfigType,
  credRef: string,
  configKey: 'tavilyBaseURL' | 'serperBaseURL',
  defaultHost: string,
): Promise<string> {
  const credVal = await resolveRef(ctx, credRef)
  if (credVal && credVal.trim().length > 0) return credVal.trim()
  const cfgVal = config[configKey].get()
  if (typeof cfgVal === 'string' && cfgVal.trim().length > 0) return cfgVal.trim()
  return defaultHost
}

/**
 * 拼接搜索端点路径。
 *
 * 不能写成 `new URL('/search', baseURL)`：那会把自定义地址里的路径前缀
 * （如 `https://host/tavily` 的 `/tavily`）整段替换掉，导致两个渠道最终
 * 都打到同一个 `/search` 上。这里改为在前缀之后追加，且对已以该路径
 * 结尾的地址保持幂等。
 */
function buildSearchURL(baseURL: string, path = '/search'): string {
  const trimmed = baseURL.trim().replace(/\/+$/, '')
  return trimmed.endsWith(path) ? trimmed : `${trimmed}${path}`
}

// ═══════════════════════════════════════════════════════════
//  Channel resolution
// ═══════════════════════════════════════════════════════════

/**
 * 去掉启用开关后，实际使用的渠道完全由默认渠道决定。
 * credential 上的 legacy DEFAULT_SERPER_REF 仍保持最高优先级。
 */
async function resolveChannel(
  ctx: DshContext,
  config: ConfigType,
): Promise<string | null> {
  const defaultSerper = await resolveRef(ctx, DEFAULT_SERPER_REF)
  if (truthy(defaultSerper)) return SERPER_CHANNEL
  if (config.defaultChannel.get() === SERPER_CHANNEL) return SERPER_CHANNEL
  return TAVILY_CHANNEL
}

// ═══════════════════════════════════════════════════════════
//  Tavily search
// ═══════════════════════════════════════════════════════════

function tavilyToSources(data: Record<string, unknown>): WebSearchSource[] {
  const results = data.results
  if (!Array.isArray(results)) return []
  return results
    .filter((r: unknown): r is Record<string, unknown> => !!r && typeof r === 'object')
    .map((r) => ({
      title: typeof r.title === 'string' ? r.title : '',
      url: typeof r.url === 'string' ? r.url : '',
      content: typeof r.content === 'string' ? r.content : '',
    }))
}

async function searchTavily(
  baseURL: string,
  key: string | undefined,
  request: WebSearchRequest,
  maxResults: number,
  timeoutMs: number,
  signal?: AbortSignal,
): Promise<WebSearchSource[]> {
  const body: Record<string, unknown> = {
    query: request.query,
    max_results: maxResults,
    search_depth: 'basic',
    include_answer: false,
  }
  if (key) body.api_key = key

  const controller = new AbortController()
  const linked = AbortSignal.any?.([signal, controller.signal].filter(Boolean) as AbortSignal[])
    ?? controller.signal
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const res = await fetch(buildSearchURL(baseURL), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: linked,
    })
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new WebError(`Tavily HTTP ${res.status}: ${text.slice(0, 200)}`, 'provider_error')
    }
    const data = (await res.json()) as Record<string, unknown>
    return tavilyToSources(data)
  } finally {
    clearTimeout(timer)
  }
}

// ═══════════════════════════════════════════════════════════
//  Serper search
// ═══════════════════════════════════════════════════════════

function serperToSources(data: Record<string, unknown>): WebSearchSource[] {
  const organic = data.organic as unknown
  if (!Array.isArray(organic)) return []
  return organic
    .filter((r: unknown): r is Record<string, unknown> => !!r && typeof r === 'object')
    .map((r) => ({
      title: typeof r.title === 'string' ? r.title : '',
      url: typeof r.link === 'string' ? r.link : '',
      content: typeof r.snippet === 'string' ? r.snippet : '',
    }))
}

async function searchSerper(
  baseURL: string,
  key: string | undefined,
  request: WebSearchRequest,
  maxResults: number,
  timeoutMs: number,
  signal?: AbortSignal,
): Promise<WebSearchSource[]> {
  const body = {
    q: request.query,
    num: maxResults,
  }

  const controller = new AbortController()
  const linked = AbortSignal.any?.([signal, controller.signal].filter(Boolean) as AbortSignal[])
    ?? controller.signal
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const url = buildSearchURL(baseURL)
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(key ? { 'X-API-KEY': key } : {}),
      },
      body: JSON.stringify(body),
      signal: linked,
    })
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new WebError(`Serper HTTP ${res.status}: ${text.slice(0, 200)}`, 'provider_error')
    }
    const data = (await res.json()) as Record<string, unknown>
    return serperToSources(data)
  } finally {
    clearTimeout(timer)
  }
}

// ═══════════════════════════════════════════════════════════
//  Probe endpoints
// ═══════════════════════════════════════════════════════════

/**
 * 原生 http.ServerResponse 没有 Express 的 status()/json()，
 * 直接 writeHead + end 输出 JSON；body 为 null/undefined 时只发状态码。
 */
function sendJson(
  res: unknown,
  status: number,
  body: unknown,
): void {
  const r = res as {
    writeHead: (status: number, headers?: Record<string, string>) => void
    end: (body?: string) => void
  }
  if (body === null || body === undefined) {
    r.writeHead(status)
    r.end()
    return
  }
  r.writeHead(status, { 'content-type': 'application/json; charset=utf-8' })
  r.end(JSON.stringify(body))
}

function createProbeHandler(
  ctx: DshContext,
  config: ConfigType,
  channel: string,
): (req: unknown, res: unknown) => Promise<void> {
  return async (req, res) => {
    const r = req as { method?: string }
    if (r.method === 'OPTIONS') return sendJson(res, 204, null)
    if (r.method !== 'POST') return sendJson(res, 405, { ok: false, code: 'method' })

    try {
      const keyRef = channel === TAVILY_CHANNEL ? TAVILY_KEY_REF : SERPER_KEY_REF
      const baseRef = channel === TAVILY_CHANNEL ? TAVILY_BASE_URL_REF : SERPER_BASE_URL_REF
      const host = channel === TAVILY_CHANNEL ? TAVILY_HOST : SERPER_HOST
      const configKey = channel === TAVILY_CHANNEL ? 'tavilyBaseURL' : 'serperBaseURL'

      const [key, baseURL] = await Promise.all([
        resolveRef(ctx, keyRef),
        resolveBaseURL(ctx, config, baseRef, configKey, host),
      ])

      const searchFn = channel === TAVILY_CHANNEL ? searchTavily : searchSerper
      await searchFn(
        baseURL,
        key,
        { query: 'test' },
        1,
        10_000,
        AbortSignal.timeout(10_000),
      )
      return sendJson(res, 200, { ok: true })
    } catch (err) {
      if (err instanceof WebError) {
        if (err.code === 'WEB_ABORTED') {
          return sendJson(res, 200, { ok: false, code: 'timeout' })
        }
        return sendJson(res, 200, {
          ok: false,
          code: err.code,
          status: undefined,
          error: err.message,
        })
      }
      return sendJson(res, 200, { ok: false, code: 'network', error: String(err) })
    }
  }
}

// ═══════════════════════════════════════════════════════════
//  Plugin
// ═══════════════════════════════════════════════════════════

export const name = 'dsh-web-search'
export const inject = ['web', 'webServer', 'credentials', 'settings']

export function apply(ctx: DshContext, config: ConfigType): void {
  // ── One-time migration: copy old baseURL credentials into config ──
  void (async () => {
    for (const [credRef, cfgKey] of [
      [TAVILY_BASE_URL_REF, 'tavilyBaseURL'],
      [SERPER_BASE_URL_REF, 'serperBaseURL'],
    ] as const) {
      try {
        const credVal = await resolveRef(ctx, credRef)
        if (credVal != null && String(credVal).length > 0 && !config[cfgKey].get()) {
          await ctx.settings.update('web-search', { [cfgKey]: String(credVal) })
        }
      } catch {
        /* best-effort */
      }
    }
    try {
      const defSerper = await resolveRef(ctx, DEFAULT_SERPER_REF)
      if (truthy(defSerper) && config.defaultChannel.get() !== SERPER_CHANNEL) {
        await ctx.settings.update('web-search', { defaultChannel: SERPER_CHANNEL })
      }
    } catch {
      /* best-effort */
    }
  })()

  // ── Composite web-search provider ──
  const provider: WebSearchProvider = {
    id: 'web-search',
    available: () => true,
    search: async (request, signal) => {
      throwIfAborted(signal)

      const channel = await resolveChannel(ctx, config)
      const { maxResults, searchTimeoutMs } = config

      const keyRef = channel === TAVILY_CHANNEL ? TAVILY_KEY_REF : SERPER_KEY_REF
      const baseRef = channel === TAVILY_CHANNEL ? TAVILY_BASE_URL_REF : SERPER_BASE_URL_REF
      const host = channel === TAVILY_CHANNEL ? TAVILY_HOST : SERPER_HOST
      const cfgKey = channel === TAVILY_CHANNEL ? 'tavilyBaseURL' : 'serperBaseURL'

      const [key, baseURL] = await Promise.all([
        resolveRef(ctx, keyRef),
        resolveBaseURL(ctx, config, baseRef, cfgKey, host),
      ])

      const searchFn = channel === TAVILY_CHANNEL ? searchTavily : searchSerper
      const sources = await searchFn(baseURL, key, request, maxResults, searchTimeoutMs, signal)
      return { sources }
    },
  }

  const web = ctx.get('web')
  if (web) {
    // Current API: register with the `web` service, which disposes the entry
    // with this plugin's fiber.
    web.registerSearchProvider(provider)
  } else {
    // Legacy fallback for DSH versions that still expose a provider registry.
    const providers = ctx.get('webSearchProviders')
    if (providers) {
      providers['web-search'] = provider
    }
  }

  // ── Probe endpoints ──
  const ws = ctx.get('webServer')
  if (ws) {
    ws.register({
      kind: 'exact',
      path: '/api/web-search-probe/tavily',
      handler: createProbeHandler(ctx, config, TAVILY_CHANNEL),
    })
    ws.register({
      kind: 'exact',
      path: '/api/web-search-probe/serper',
      handler: createProbeHandler(ctx, config, SERPER_CHANNEL),
    })
    ws.register({
      kind: 'exact',
      path: '/api/web-search-config',
      handler: async (req: unknown, res: unknown) => {
        const r = req as { method?: string }
        if (r.method !== 'GET') return sendJson(res, 405, {})
        try {
          const [
            travilyURL,
            serperURL,
            defSerper,
          ] = await Promise.all([
            resolveBaseURL(ctx, config, TAVILY_BASE_URL_REF, 'tavilyBaseURL', TAVILY_HOST),
            resolveBaseURL(ctx, config, SERPER_BASE_URL_REF, 'serperBaseURL', SERPER_HOST),
            resolveRef(ctx, DEFAULT_SERPER_REF),
          ])
          return sendJson(res, 200, {
            tavilyBaseURL: travilyURL === TAVILY_HOST ? '' : travilyURL,
            serperBaseURL: serperURL === SERPER_HOST ? '' : serperURL,
            defaultChannel: truthy(defSerper)
              ? SERPER_CHANNEL
              : config.defaultChannel.get() || TAVILY_CHANNEL,
          })
        } catch {
          return sendJson(res, 200, {
            tavilyBaseURL: '',
            serperBaseURL: '',
            defaultChannel: TAVILY_CHANNEL,
          })
        }
      },
    })
  }
}
