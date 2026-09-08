/**
 * dsh-web-search — Tavily + Serper 多渠道网页搜索插件。
 *
 * 综合 Provider id "web-search"，内部按配置路由到对应渠道；
 * 两个渠道都未启用时回退官方 DeepSeek 搜索。
 */

import Schema from '@deepseek-ai/schemastery'
import { settingsNamespace } from '@deepseek-ai/dsh-settings'

// DSH-injected context — not extending Cordis to avoid conflicting settings type
interface DshContext {
  settings: {
    set: (ns: string, key: string, value: unknown) => void
    register(ns: unknown, schema: unknown, opts?: { base?: unknown; applies?: string }): void
  }
  get(key: 'webServer'): DshWebServer | undefined
  get(key: 'credentials'): DshCredentials | undefined
  get(key: 'webSearchProviders'): Record<string, WebSearchProvider> | undefined
  get(key: string): unknown
  on(event: string, handler: (...args: unknown[]) => void): void
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

const TAVILY_ENABLED_REF = 'TAVILY_SEARCH_ENABLED'
const TAVILY_KEY_REF = 'TAVILY_API_KEY'
const TAVILY_BASE_URL_REF = 'TAVILY_BASE_URL'
const SERPER_ENABLED_REF = 'SERPER_SEARCH_ENABLED'
const SERPER_KEY_REF = 'SERPER_API_KEY'
const SERPER_BASE_URL_REF = 'SERPER_BASE_URL'
const DEFAULT_SERPER_REF = 'WEB_SEARCH_DEFAULT_SERPER'

// ═══════════════════════════════════════════════════════════
//  Config
// ═══════════════════════════════════════════════════════════

export const Config = Schema.object({
  maxResults: Schema.number().min(1).max(20).step(1).default(5),
  searchTimeoutMs: Schema.number().min(1).step(1).default(DEFAULT_TIMEOUT_MS),
  tavilyEnabled: Schema.boolean().default(false),
  serperEnabled: Schema.boolean().default(false),
  tavilyBaseURL: Schema.string().default(''),
  serperBaseURL: Schema.string().default(''),
  defaultChannel: Schema.string().default(TAVILY_CHANNEL),
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
  configKey: string,
  defaultHost: string,
): Promise<string> {
  const credVal = await resolveRef(ctx, credRef)
  if (credVal && credVal.trim().length > 0) return credVal.trim()
  const cfgVal = (config as Record<string, unknown>)[configKey]
  if (typeof cfgVal === 'string' && cfgVal.trim().length > 0) return cfgVal.trim()
  return defaultHost
}

// ═══════════════════════════════════════════════════════════
//  Channel resolution
// ═══════════════════════════════════════════════════════════

async function resolveChannel(
  ctx: DshContext,
  config: ConfigType,
): Promise<string | null> {
  const [tavilyOnCred, serperOnCred, defaultSerper] = await Promise.all([
    resolveRef(ctx, TAVILY_ENABLED_REF),
    resolveRef(ctx, SERPER_ENABLED_REF),
    resolveRef(ctx, DEFAULT_SERPER_REF),
  ])
  const tavilyOn = truthy(tavilyOnCred) || config.tavilyEnabled === true
  const serperOn = truthy(serperOnCred) || config.serperEnabled === true
  const preferred = truthy(defaultSerper)
    ? SERPER_CHANNEL
    : config.defaultChannel === SERPER_CHANNEL
      ? SERPER_CHANNEL
      : TAVILY_CHANNEL

  const enabled: Record<string, boolean> = {
    [TAVILY_CHANNEL]: tavilyOn,
    [SERPER_CHANNEL]: serperOn,
  }
  if (enabled[preferred]) return preferred
  if (enabled[TAVILY_CHANNEL]) return TAVILY_CHANNEL
  if (enabled[SERPER_CHANNEL]) return SERPER_CHANNEL
  return null
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
    const res = await fetch(new URL('/search', baseURL).toString(), {
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
    const url = baseURL.endsWith('/search')
      ? baseURL
      : new URL('/search', baseURL).toString()
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
//  DeepSeek fallback
// ═══════════════════════════════════════════════════════════

async function getDeepSeekProvider(ctx: DshContext): Promise<WebSearchProvider | undefined> {
  try {
    const providers = ctx.get('webSearchProviders')
    if (!providers) return undefined
    const deepseek = Object.values(providers).find(
      (p) => p.id !== 'web-search' && p.id !== 'web-search-tavily',
    )
    return deepseek
  } catch {
    return undefined
  }
}

// ═══════════════════════════════════════════════════════════
//  Probe endpoints
// ═══════════════════════════════════════════════════════════

function sendJson(
  res: unknown,
  status: number,
  body: unknown,
): void {
  const r = res as {
    status: (n: number) => unknown
    json: (b: unknown) => unknown
  }
  r.status(status)
  r.json(body)
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
export const inject = ['webServer', 'credentials', 'settings']

/** Settings 命名空间 */
const WEB_SEARCH_NS = settingsNamespace('web-search')

export function apply(ctx: DshContext, config: ConfigType): void {
  // ── Register settings namespace (so client settingsScope.bind can read/write) ──
  ctx.settings.register(WEB_SEARCH_NS, Config, { applies: 'live' })

  // ── One-time migration: copy old credential values into config ──
  void (async () => {
    for (const [credRef, cfgKey] of [
      [TAVILY_ENABLED_REF, 'tavilyEnabled'],
      [SERPER_ENABLED_REF, 'serperEnabled'],
      [TAVILY_BASE_URL_REF, 'tavilyBaseURL'],
      [SERPER_BASE_URL_REF, 'serperBaseURL'],
    ] as const) {
      try {
        const credVal = await resolveRef(ctx, credRef)
        if (credVal != null && String(credVal).length > 0 && !config[cfgKey as keyof ConfigType]) {
          const v: unknown = (cfgKey as string).endsWith('Enabled')
            ? truthy(credVal)
            : String(credVal)
          ctx.settings.set('web-search', cfgKey, v)
          ;(config as Record<string, unknown>)[cfgKey] = v
        }
      } catch {
        /* best-effort */
      }
    }
    try {
      const defSerper = await resolveRef(ctx, DEFAULT_SERPER_REF)
      if (truthy(defSerper) && config.defaultChannel !== SERPER_CHANNEL) {
        ctx.settings.set('web-search', 'defaultChannel', SERPER_CHANNEL)
        config.defaultChannel = SERPER_CHANNEL
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

      if (channel) {
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
      }

      // Both channels off → fall back to official DeepSeek
      const deepseek = await getDeepSeekProvider(ctx)
      if (deepseek) {
        return deepseek.search(request, signal)
      }

      throw new WebError('No web search channel available', 'WEB_UNAVAILABLE')
    },
  }

  const providers = ctx.get('webSearchProviders') as
    | Record<string, WebSearchProvider>
    | undefined
  if (providers) {
    providers['web-search'] = provider
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
            travilyOn,
            serperOn,
            defSerper,
          ] = await Promise.all([
            resolveBaseURL(ctx, config, TAVILY_BASE_URL_REF, 'tavilyBaseURL', TAVILY_HOST),
            resolveBaseURL(ctx, config, SERPER_BASE_URL_REF, 'serperBaseURL', SERPER_HOST),
            resolveRef(ctx, TAVILY_ENABLED_REF),
            resolveRef(ctx, SERPER_ENABLED_REF),
            resolveRef(ctx, DEFAULT_SERPER_REF),
          ])
          return sendJson(res, 200, {
            tavilyEnabled: truthy(travilyOn) || config.tavilyEnabled === true,
            serperEnabled: truthy(serperOn) || config.serperEnabled === true,
            tavilyBaseURL: travilyURL === TAVILY_HOST ? '' : travilyURL,
            serperBaseURL: serperURL === SERPER_HOST ? '' : serperURL,
            defaultChannel: truthy(defSerper)
              ? SERPER_CHANNEL
              : config.defaultChannel || TAVILY_CHANNEL,
          })
        } catch {
          return sendJson(res, 200, {
            tavilyEnabled: false,
            serperEnabled: false,
            tavilyBaseURL: '',
            serperBaseURL: '',
            defaultChannel: TAVILY_CHANNEL,
          })
        }
      },
    })
  }
}