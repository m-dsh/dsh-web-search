import React, { useState, useEffect, useCallback } from 'react'
import type { ConfigForm, ConfigFormSnapshot } from '@deepseek-ai/dsh-client-ui-settings/client'

// ── 常量 ────────────────────────────────────────────────────────

const TAVILY_KEY_REF = 'TAVILY_API_KEY'
const SERPER_KEY_REF = 'SERPER_API_KEY'
const PROBE_TAVILY = '/api/web-search-probe/tavily'
const PROBE_SERPER = '/api/web-search-probe/serper'

// ── CSS ────────────────────────────────────────────────────────

function injectCss(): () => void {
  if (typeof document === 'undefined') return () => {}
  const prev = document.querySelector('style[data-dws-search-css]')
  if (prev) prev.remove()
  const tag = document.createElement('style')
  tag.setAttribute('data-dws-search-css', '5')
  tag.textContent = [
    '.dws_input{width:100%;height:34px;padding:0 12px;border:1px solid var(--dsw-alias-border-l2);border-radius:8px;background:var(--dsw-alias-bg-layer-3);font:inherit;font-size:13px;line-height:1.5;color:var(--dsw-alias-label-primary);box-sizing:border-box}',
    '.dws_input:focus-visible{outline:none;border-color:var(--dsw-alias-brand-primary)}',
    '.dws_input:disabled{color:var(--dsw-alias-label-tertiary);cursor:default}',
    '.dws_badge{flex:none;border-radius:999px;padding:2px 8px;font-size:11px;line-height:17px;font-weight:500;background:var(--dsw-alias-bg-module-platform);color:var(--dsw-alias-label-secondary)}',
    '.dws_btn{appearance:none;border:1px solid var(--dsw-alias-border-l2);border-radius:8px;padding:5px 14px;font:inherit;font-size:13px;line-height:1.5;cursor:pointer;background:none;color:var(--dsw-alias-label-secondary)}',
    '.dws_btn:hover:not(:disabled):not(.dws_btnPrimary){color:var(--dsw-alias-label-primary);border-color:var(--dsw-alias-label-dimmed)}',
    '.dws_btn:disabled{opacity:.4;cursor:default}',
    '.dws_btnPrimary{background:var(--dsw-alias-label-primary);color:var(--dsw-alias-bg-layer-3);border-color:transparent}',
    '.dws_btnPrimary:hover:not(:disabled){opacity:.85}',
  ].join('')
  document.head.appendChild(tag)
  return () => tag.remove()
}

// ── Styles ──────────────────────────────────────────────────

const cardStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 10,
}

const cardItemStyle: React.CSSProperties = {
  border: '1px solid var(--dsw-alias-border-l2)',
  borderRadius: 12,
  background: 'var(--dsw-alias-bg-layer-3)',
  overflow: 'hidden',
}

const rowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '10px 16px',
  cursor: 'pointer',
  borderRadius: 8,
  transition: 'background 0.12s',
}

const rowDisabled: React.CSSProperties = { ...rowStyle, opacity: 0.5, cursor: 'not-allowed' }

const labelStyle: React.CSSProperties = {
  fontSize: 14,
  fontWeight: 500,
  color: 'var(--dsw-alias-label-primary)',
}

const fieldStyle: React.CSSProperties = {
  padding: '8px 16px 12px',
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
}

const fieldLabel: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 500,
  color: 'var(--dsw-alias-label-primary)',
}

function hoverOn(e: React.MouseEvent<HTMLElement>) {
  ;(e.currentTarget as HTMLElement).style.background = 'var(--dsw-alias-bg-layer-2)'
}

function hoverOff(e: React.MouseEvent<HTMLElement>) {
  ;(e.currentTarget as HTMLElement).style.background = ''
}

// ── Probe ───────────────────────────────────────────────────

interface ProbeResult {
  ok: boolean
  code?: string
  status?: string
  error?: string
}

function probeText(fail: ProbeResult): string {
  if (fail.code === 'timeout') return '超时'
  if (fail.code === 'invalid_key') return '密钥无效'
  if (fail.code === 'network') return '网络错误'
  if (fail.code === 'http') return 'HTTP ' + (fail.status || '')
  return fail.error || '失败'
}

// ── WebSearchConfig ─────────────────────────────────────────

interface WebSearchConfig {
  tavilyBaseURL: string
  serperBaseURL: string
  defaultChannel: string
}

interface Connection {
  api: {
    credentials: {
      describe(opts: { refs: string[] }): Promise<{
        result: { ok: boolean; value: { credentials: Record<string, { configured: boolean }> } }
      }>
      set(opts: { ref: string; value: string }): Promise<void>
    }
  }
}

interface WebSearchProps {
  scope: ConfigForm<WebSearchConfig>
  api: Connection['api']
}

function WebSearchSection(props: Record<string, unknown>): React.ReactElement {
  const { scope, api } = props as unknown as WebSearchProps
  const [snap, setSnap] = useState<ConfigFormSnapshot<WebSearchConfig>>(() => scope.getSnapshot())
  useEffect(() => scope.subscribe(() => setSnap(scope.getSnapshot())), [scope])

  const values = (snap.value ?? {}) as WebSearchConfig
  const writable = snap.writable && snap.status === 'ready'
  const [writeError, setWriteError] = useState<string | undefined>()
  const setConfig = async (field: keyof WebSearchConfig, value: boolean | string) => {
    setWriteError(undefined)
    try {
      const accepted = await scope.set(field, value)
      if (!accepted) setWriteError('设置未保存，请根据最新状态重试。')
    } catch {
      setWriteError('设置保存失败，请检查连接后重试。')
    }
  }

  const [tKey, setTKey] = useState('')
  const [sKey, setSKey] = useState('')
  const [tOk, setTOk] = useState(false)
  const [sOk, setSOk] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [tp, setTp] = useState<{ probing: boolean; result: ProbeResult | null } | null>(null)
  const [sp, setSp] = useState<{ probing: boolean; result: ProbeResult | null } | null>(null)

  useEffect(() => {
    void (async () => {
      try {
        const [tk, sk] = await Promise.all([
          api.credentials.describe({ refs: [TAVILY_KEY_REF] }),
          api.credentials.describe({ refs: [SERPER_KEY_REF] }),
        ])
        setTOk(
          !!(tk.result.ok && tk.result.value.credentials[TAVILY_KEY_REF]?.configured),
        )
        setSOk(
          !!(sk.result.ok && sk.result.value.credentials[SERPER_KEY_REF]?.configured),
        )
      } catch {
        /* ignore */
      }
    })()
  }, [api])

  const defCh = values.defaultChannel || 'tavily'
  const [open, setOpen] = useState<'tavily' | 'serper' | null>('tavily')

  const doSave = useCallback(async () => {
    setSaving(true)
    try {
      const tk = tKey.trim()
      const sk = sKey.trim()
      if (tk) await api.credentials.set({ ref: TAVILY_KEY_REF, value: tk })
      if (sk) await api.credentials.set({ ref: SERPER_KEY_REF, value: sk })
      if (tk) {
        setTOk(true)
        setTKey('')
      }
      if (sk) {
        setSOk(true)
        setSKey('')
      }
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch {
      /* ignore */
    }
    setSaving(false)
  }, [api, tKey, sKey])

  const doProbe = useCallback(
    async (ch: string) => {
      const isT = ch === 'tavily'
      const cur = isT ? tp : sp
      if (cur && cur.probing) return
      const st = isT ? setTp : setSp
      st({ probing: true, result: null })
      try {
        const r = await fetch(isT ? PROBE_TAVILY : PROBE_SERPER, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          cache: 'no-store',
          body: '{}',
        })
        const json: Record<string, unknown> = await r.json().catch(() => ({}))
        st({
          probing: false,
          result:
            json && json.ok
              ? { ok: true }
              : { ok: false, code: json.code as string, status: json.status as string, error: json.error as string },
        })
      } catch {
        st({ probing: false, result: { ok: false, code: 'network' } })
      }
    },
    [tp, sp],
  )

  if (snap.status === 'loading') {
    return <div style={{ padding: 16, color: 'var(--dsw-alias-label-secondary)' }}>加载中…</div>
  }

  if (snap.status === 'unavailable') {
    return <div style={{ padding: 16, color: 'var(--dsw-alias-label-secondary)' }}>
      {snap.mode === 'memory'
        ? '当前连接不支持保存设置，请在 DSH 所在电脑通过 localhost 打开设置。'
        : 'Web 搜索设置暂不可用，请确认 DSH 已加载兼容的 dsh-web-search 插件，并刷新页面。'}
    </div>
  }

  // 可复用的「点击展开」渠道分组
  const channelBlock = (
    ch: 'tavily' | 'serper',
    opts: {
      title: string
      hint: string
      keyOk: boolean
      keyPlaceholder: string
      keyDraft: string
      onKey: (v: string) => void
      probe: typeof tp
      onProbe: () => void
    },
  ): React.ReactElement => {
    const active = defCh === ch
    const isOpen = open === ch
    const baseURL = ch === 'tavily' ? values.tavilyBaseURL : values.serperBaseURL
    const onBase = (v: string) =>
      void setConfig(ch === 'tavily' ? 'tavilyBaseURL' : 'serperBaseURL', v)
    return (
      <div key={ch} style={cardItemStyle}>
        <div
          role="button"
          tabIndex={0}
          aria-expanded={isOpen}
          style={writable ? rowStyle : rowDisabled}
          onMouseEnter={writable ? hoverOn : undefined}
          onMouseLeave={writable ? hoverOff : undefined}
          onClick={writable ? () => setOpen(isOpen ? null : ch) : undefined}
          onKeyDown={
            writable
              ? (e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    setOpen(isOpen ? null : ch)
                  }
                }
              : undefined
          }
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={labelStyle}>{opts.title}</span>
            {active && <span className="dws_badge">默认</span>}
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 12, color: 'var(--dsw-alias-label-tertiary)' }}>{opts.hint}</span>
            <span style={{ fontSize: 12, color: 'var(--dsw-alias-label-tertiary)', transition: 'transform 0.12s', transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)' }}>
              ›
            </span>
          </span>
        </div>
        {isOpen && (
          <div style={fieldStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={fieldLabel}>API Key</span>
              {opts.keyOk && <span className="dws_badge">已配置</span>}
            </div>
            <input
              className="dws_input"
              type="password"
              placeholder={opts.keyPlaceholder}
              value={opts.keyDraft}
              disabled={saving}
              onChange={(e) => opts.onKey(e.target.value)}
            />
            <span style={{ ...fieldLabel, marginTop: 8 }}>自定义接口地址</span>
            <input
              className="dws_input"
              type="text"
              placeholder={ch === 'tavily' ? 'https://api.tavily.com' : 'https://google.serper.dev'}
              value={baseURL || ''}
              disabled={!writable}
              onChange={(e) => onBase(e.target.value)}
            />
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button
                className="dws_btn"
                disabled={opts.probe?.probing || false}
                onClick={opts.onProbe}
              >
                {opts.probe?.probing ? '测试中…' : '连通测试'}
              </button>
              {opts.probe?.result && (
                <span
                  style={{
                    fontSize: 12,
                    lineHeight: '17px',
                    color: opts.probe.result.ok
                      ? 'var(--dsw-alias-state-success-primary)'
                      : 'var(--dsw-alias-label-error)',
                  }}
                >
                  {opts.probe.result.ok ? '✓ 连通正常' : '✗ ' + probeText(opts.probe.result)}
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div style={cardStyle}>
      {channelBlock('tavily', {
        title: 'Tavily',
        hint: '无 Key 走 keyless',
        keyOk: tOk,
        keyPlaceholder: tOk ? '已配置密钥' : '可选，留空走 keyless',
        keyDraft: tKey,
        onKey: setTKey,
        probe: tp,
        onProbe: () => { void doProbe('tavily') },
      })}
      {channelBlock('serper', {
        title: 'Serper',
        hint: '需要 API Key',
        keyOk: sOk,
        keyPlaceholder: sOk ? '已配置密钥' : '必填，前往 serper.dev 获取',
        keyDraft: sKey,
        onKey: setSKey,
        probe: sp,
        onProbe: () => { void doProbe('serper') },
      })}

      {/* ── Default channel ── */}
      <div style={cardItemStyle}>
        <div style={rowStyle}>
          <span style={labelStyle}>默认渠道</span>
          <span style={{ fontSize: 12, color: 'var(--dsw-alias-label-tertiary)' }}>实际使用的 API</span>
        </div>
        <div style={{ padding: '4px 16px 12px', display: 'flex', flexDirection: 'column', gap: 4 }}>
          <select
            value={defCh}
            disabled={!writable}
            onChange={(e) => { void setConfig('defaultChannel', e.target.value) }}
            style={{
              height: 34,
              padding: '0 12px',
              border: '1px solid var(--dsw-alias-border-l2)',
              borderRadius: 8,
              background: 'var(--dsw-alias-bg-layer-3)',
              font: 'inherit',
              fontSize: 13,
              color: 'var(--dsw-alias-label-primary)',
              cursor: 'pointer',
            }}
          >
            <option value="tavily">Tavily</option>
            <option value="serper">Serper</option>
          </select>
          <p style={{ fontSize: 12, lineHeight: '1.5', color: 'var(--dsw-alias-label-tertiary)' }}>
            搜索实际使用默认渠道所对应的 API。
          </p>
        </div>
      </div>

      {/* ── Footer ── */}
      {writeError && <div role="alert" style={{ padding: '8px 16px', color: 'var(--dsw-alias-label-error)' }}>{writeError}</div>}
      <div
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8, padding: '12px 16px 8px' }}
      >
        {saved && (
          <span style={{ fontSize: 12, color: 'var(--dsw-alias-state-success-primary)', lineHeight: '30px' }}>
            ✓ 已保存
          </span>
        )}
        <button className="dws_btn dws_btnPrimary" disabled={saving} onClick={doSave}>
          {saving ? '保存中…' : '保存'}
        </button>
      </div>
    </div>
  )
}

// ── Plugin ──────────────────────────────────────────────────

export const name = 'dsh-web-search-client'
export const inject = ['slots', 'configForms', 'connection'] as const

interface ClientContext {
  slots: {
    inject(key: string, factory: () => unknown): () => void
    register(
      opts: {
        name: string
        id: string
        order?: number
        label?: string
        inject?: () => Record<string, unknown>
      },
      comp: React.FC<Record<string, unknown>>,
    ): () => void
  }
  configForms: {
    get<T>(entryId: string): ConfigForm<T>
  }
  get(key: string): Connection
}

export function apply(ctx: ClientContext): void {
  const { api } = ctx.get('connection')
  const scope = ctx.configForms.get<WebSearchConfig>('web-search')

  // Inject CSS
  const disposeCss = injectCss()

  ctx.slots.inject('settings.section', () => {
    return ctx.slots.register(
      {
        name: 'settings.section',
        id: 'web-search',
        order: 700,
        label: 'Web 搜索',
        inject: () => ({ scope, api }),
      },
      WebSearchSection as React.FC<Record<string, unknown>>,
    )
  })
}
