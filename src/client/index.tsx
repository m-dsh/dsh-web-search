import React, { useState, useEffect, useCallback } from 'react'
import type { SettingsScope, SettingsScopeSnapshot } from '@deepseek-ai/dsh-client-runtime/client'

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
  tag.setAttribute('data-dws-search-css', '3')
  tag.textContent = [
    '.dws_toggle{flex:none;appearance:none;border:1px solid var(--dsw-alias-border-l3);background:var(--dsw-alias-bg-layer-3);cursor:pointer;border-radius:999px;width:40px;height:22px;padding:2px;transition:background .12s,border-color .12s;display:inline-flex;position:relative}',
    '.dws_toggle[aria-checked=true]{border-color:var(--dsw-alias-brand-primary);background:var(--dsw-alias-brand-primary)}',
    '.dws_toggle:disabled{opacity:.4;cursor:default}',
    '.dws_toggle:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:2px}',
    '.dws_toggleKnob{background:var(--dsw-alias-label-primary-foreground,#fff);width:18px;height:18px;box-shadow:0 0 0 1px var(--dsw-alias-border-l4,#0f172a1f);border-radius:50%;transition:transform .12s;display:block;transform:translate(0)}',
    '.dws_toggle[aria-checked=true] .dws_toggleKnob{transform:translate(18px)}',
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

// ── ToggleSwitch ────────────────────────────────────────────

function ToggleSwitch({
  checked,
  disabled,
  onChange,
}: {
  checked: boolean
  disabled: boolean
  onChange: () => void
}): React.ReactElement {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      className="dws_toggle"
      onClick={onChange}
    >
      <span className="dws_toggleKnob" />
    </button>
  )
}

// ── Styles ──────────────────────────────────────────────────

const cardStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 2,
  border: '1px solid var(--dsw-alias-border-l2)',
  borderRadius: 12,
  background: 'var(--dsw-alias-bg-layer-3)',
  overflow: 'hidden',
  padding: '4px 0',
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

const dividerStyle: React.CSSProperties = {
  height: 1,
  margin: '0 16px',
  background: 'var(--dsw-alias-border-l2)',
}

const sectionTitleStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 600,
  color: 'var(--dsw-alias-label-secondary)',
  padding: '8px 16px 4px',
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
} as React.CSSProperties

function hoverOn(e: React.MouseEvent<HTMLLabelElement>) {
  ;(e.currentTarget as HTMLLabelElement).style.background = 'var(--dsw-alias-bg-layer-2)'
}

function hoverOff(e: React.MouseEvent<HTMLLabelElement>) {
  ;(e.currentTarget as HTMLLabelElement).style.background = ''
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
  tavilyEnabled: boolean
  serperEnabled: boolean
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
  scope: SettingsScope<WebSearchConfig>
  api: Connection['api']
}

function WebSearchSection(props: Record<string, unknown>): React.ReactElement {
  const { scope, api } = props as unknown as WebSearchProps
  const [snap, setSnap] = useState<SettingsScopeSnapshot<WebSearchConfig>>(() => scope.getSnapshot())
  useEffect(() => scope.subscribe(() => setSnap(scope.getSnapshot())), [scope])

  const values = (snap.value ?? {}) as WebSearchConfig
  const writable = snap.writable && snap.status === 'ready'

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

  const tOn = values.tavilyEnabled === true
  const sOn = values.serperEnabled === true
  const defCh = values.defaultChannel || 'tavily'
  const def = tOn && sOn ? defCh : tOn ? 'tavily' : sOn ? 'serper' : null

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

  return (
    <div style={cardStyle}>
      {/* ── Tavily ── */}
      <div style={sectionTitleStyle}>Tavily</div>
      <label
        style={writable ? rowStyle : rowDisabled}
        onMouseEnter={writable ? hoverOn : undefined}
        onMouseLeave={writable ? hoverOff : undefined}
      >
        <span style={labelStyle}>
          启用 Tavily
          <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--dsw-alias-label-tertiary)' }}>
            （无 Key 走 keyless）
          </span>
        </span>
        <span style={{ flex: 1 }}></span>
        <ToggleSwitch
          checked={tOn}
          disabled={!writable}
          onChange={() => scope.set('tavilyEnabled', !tOn)}
        />
      </label>
      {tOn && (
        <div style={fieldStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={fieldLabel}>API Key</span>
            {tOk && <span className="dws_badge">已配置</span>}
          </div>
          <input
            className="dws_input"
            type="password"
            placeholder={tOk ? '已配置密钥' : '可选，留空走 keyless'}
            value={tKey}
            disabled={saving}
            onChange={(e) => setTKey(e.target.value)}
          />
          <span style={{ ...fieldLabel, marginTop: 8 }}>自定义接口地址</span>
          <input
            className="dws_input"
            type="text"
            placeholder="https://api.tavily.com"
            value={values.tavilyBaseURL || ''}
            onChange={(e) => scope.set('tavilyBaseURL', e.target.value)}
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              className="dws_btn"
              disabled={(tp && tp.probing) || false}
              onClick={() => { void doProbe('tavily') }}
            >
              {tp && tp.probing ? '测试中…' : '连通测试'}
            </button>
            {tp && tp.result && (
              <span
                style={{
                  fontSize: 12,
                  lineHeight: '17px',
                  color: tp.result.ok
                    ? 'var(--dsw-alias-state-success-primary)'
                    : 'var(--dsw-alias-label-error)',
                }}
              >
                {tp.result.ok ? '✓ 连通正常' : '✗ ' + probeText(tp.result)}
              </span>
            )}
          </div>
        </div>
      )}

      {/* ── Serper ── */}
      <div style={dividerStyle} />
      <div style={sectionTitleStyle}>Serper</div>
      <label
        style={writable ? rowStyle : rowDisabled}
        onMouseEnter={writable ? hoverOn : undefined}
        onMouseLeave={writable ? hoverOff : undefined}
      >
        <span style={labelStyle}>
          启用 Serper
          <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--dsw-alias-label-tertiary)' }}>
            （需要 API Key）
          </span>
        </span>
        <span style={{ flex: 1 }}></span>
        <ToggleSwitch
          checked={sOn}
          disabled={!writable}
          onChange={() => scope.set('serperEnabled', !sOn)}
        />
      </label>
      {sOn && (
        <div style={fieldStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={fieldLabel}>API Key</span>
            {sOk && <span className="dws_badge">已配置</span>}
          </div>
          <input
            className="dws_input"
            type="password"
            placeholder={sOk ? '已配置密钥' : '必填，前往 serper.dev 获取'}
            value={sKey}
            disabled={saving}
            onChange={(e) => setSKey(e.target.value)}
          />
          <span style={{ ...fieldLabel, marginTop: 8 }}>自定义接口地址</span>
          <input
            className="dws_input"
            type="text"
            placeholder="https://google.serper.dev"
            value={values.serperBaseURL || ''}
            onChange={(e) => scope.set('serperBaseURL', e.target.value)}
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              className="dws_btn"
              disabled={(sp && sp.probing) || false}
              onClick={() => { void doProbe('serper') }}
            >
              {sp && sp.probing ? '测试中…' : '连通测试'}
            </button>
            {sp && sp.result && (
              <span
                style={{
                  fontSize: 12,
                  lineHeight: '17px',
                  color: sp.result.ok
                    ? 'var(--dsw-alias-state-success-primary)'
                    : 'var(--dsw-alias-label-error)',
                }}
              >
                {sp.result.ok ? '✓ 连通正常' : '✗ ' + probeText(sp.result)}
              </span>
            )}
          </div>
        </div>
      )}

      {/* ── Default channel ── */}
      <div style={dividerStyle} />
      <div style={sectionTitleStyle}>默认渠道</div>
      <div style={{ padding: '8px 16px 12px', display: 'flex', flexDirection: 'column', gap: 4 }}>
        <select
          value={defCh}
          disabled={!writable}
          onChange={(e) => scope.set('defaultChannel', e.target.value)}
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
          {def
            ? '当前默认：' +
              (def === 'tavily' ? 'Tavily' : 'Serper') +
              (tOn && sOn ? '' : '（仅一个渠道启用，自动使用）')
            : '两个渠道都未启用，搜索走官方 DeepSeek。'}
        </p>
      </div>

      {/* ── Footer ── */}
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
export const inject = ['slots', 'settingsScope', 'connection'] as const

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
  settingsScope: {
    bind<T>(spec: { namespace: string }): SettingsScope<T>
  }
  get(key: string): Connection
}

export function apply(ctx: ClientContext): void {
  const { api } = ctx.get('connection')
  const scope = ctx.settingsScope.bind<WebSearchConfig>({ namespace: 'web-search' })

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