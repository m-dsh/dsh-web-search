window.__ModuleLoader__.load({
  id: "dsh-web-search",
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;
    Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
    let react = require("react");
    let react_jsx_runtime = require("react/jsx-runtime");

    const TAVILY_KEY_REF = "TAVILY_API_KEY";
    const SERPER_KEY_REF = "SERPER_API_KEY";
    const PROBE_TAVILY = "/api/web-search-probe/tavily";
    const PROBE_SERPER = "/api/web-search-probe/serper";

    function injectCss() {
      if (typeof document === "undefined") return () => {};
      const prev = document.querySelector("style[data-dws-search-css]");
      if (prev) prev.remove();
      const tag = document.createElement("style");
      tag.setAttribute("data-dws-search-css", "3");
      tag.textContent = [
        ".dws_toggle{flex:none;appearance:none;border:1px solid var(--dsw-alias-border-l3);background:var(--dsw-alias-bg-layer-3);cursor:pointer;border-radius:999px;align-items:center;width:40px;height:22px;padding:2px;transition:background .12s,border-color .12s;display:inline-flex;position:relative}",
        ".dws_toggle[aria-checked=true]{border-color:var(--dsw-alias-brand-primary);background:var(--dsw-alias-brand-primary)}",
        ".dws_toggle:disabled{opacity:.4;cursor:default}",
        ".dws_toggle:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:2px}",
        ".dws_toggleKnob{background:var(--dsw-alias-label-primary-foreground,#fff);width:18px;height:18px;box-shadow:0 0 0 1px var(--dsw-alias-border-l4,#0f172a1f);border-radius:50%;transition:transform .12s;display:block;transform:translate(0)}",
        ".dws_toggle[aria-checked=true] .dws_toggleKnob{transform:translate(18px)}",
        ".dws_input{width:100%;height:34px;padding:0 12px;border:1px solid var(--dsw-alias-border-l2);border-radius:8px;background:var(--dsw-alias-bg-layer-3);font:inherit;font-size:13px;line-height:1.5;color:var(--dsw-alias-label-primary);box-sizing:border-box}",
        ".dws_input:focus-visible{outline:none;border-color:var(--dsw-alias-brand-primary)}",
        ".dws_input:disabled{color:var(--dsw-alias-label-tertiary);cursor:default}",
        ".dws_badge{flex:none;border-radius:999px;padding:2px 8px;font-size:11px;line-height:17px;font-weight:500;background:var(--dsw-alias-bg-module-platform);color:var(--dsw-alias-label-secondary)}",
        ".dws_btn{appearance:none;border:1px solid var(--dsw-alias-border-l2);border-radius:8px;padding:5px 14px;font:inherit;font-size:13px;line-height:1.5;cursor:pointer;background:none;color:var(--dsw-alias-label-secondary)}",
        ".dws_btn:hover:not(:disabled):not(.dws_btnPrimary){color:var(--dsw-alias-label-primary);border-color:var(--dsw-alias-label-dimmed)}",
        ".dws_btn:disabled{opacity:.4;cursor:default}",
        ".dws_btnPrimary{background:var(--dsw-alias-label-primary);color:var(--dsw-alias-bg-layer-3);border-color:transparent}",
        ".dws_btnPrimary:hover:not(:disabled){opacity:.85}",
      ].join("");
      document.head.appendChild(tag);
      return () => tag.remove();
    }

    const name = "dsh-web-search-client";
    const inject = ["slots", "settingsScope", "connection"];

    function ToggleSwitch({ checked, disabled, onChange }) {
      return react_jsx_runtime.jsxs("button", {
        type: "button", role: "switch", "aria-checked": checked, disabled,
        className: "dws_toggle", onClick: onChange,
        children: [react_jsx_runtime.jsx("span", { className: "dws_toggleKnob" })],
      });
    }

    function probeText(fail) {
      if (!fail) return null;
      if (fail.code === "timeout") return "超时";
      if (fail.code === "invalid_key") return "密钥无效";
      if (fail.code === "network") return "网络错误";
      if (fail.code === "http") return "HTTP " + fail.status;
      return fail.error || "失败";
    }

    // ── Styles ──
    const rowStyle = {
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "10px 16px", cursor: "pointer", borderRadius: 8, transition: "background 0.12s",
    };
    const rowDisabled = { ...rowStyle, opacity: 0.5, cursor: "not-allowed" };
    const labelStyle = { fontSize: 14, fontWeight: 500, color: "var(--dsw-alias-label-primary)" };
    const labelMuted = { fontSize: 14, fontWeight: 500, color: "var(--dsw-alias-label-secondary)" };
    const fieldStyle = { padding: "8px 16px 12px", display: "flex", flexDirection: "column", gap: 6 };
    const fieldLabel = { fontSize: 13, fontWeight: 500, color: "var(--dsw-alias-label-primary)" };
    const dividerStyle = { height: 1, margin: "0 16px", background: "var(--dsw-alias-border-l2)" };
    const sectionTitleStyle = { fontSize: 12, fontWeight: 600, color: "var(--dsw-alias-label-secondary)", padding: "8px 16px 4px", textTransform: "uppercase", letterSpacing: "0.5px" };

    function hoverOn(e) { e.currentTarget.style.background = "var(--dsw-alias-bg-layer-2)"; }
    function hoverOff(e) { e.currentTarget.style.background = ""; }

    function apply(ctx) {
      const { api } = ctx.get("connection");
      const scope = ctx.settingsScope.bind({ namespace: "web-search" });

      ctx.effect(() => injectCss(), "dws css");

      ctx.slots.inject("settings.section", () => {
        return ctx.slots.register({
          name: "settings.section", id: "web-search", order: 700, label: "Web 搜索",
          inject: () => ({ scope, api }),
        }, WebSearchSection);
      });
    }

    function WebSearchSection(props) {
      const { scope, api } = props;
      const [snap, setSnap] = react.useState(() => scope.getSnapshot());
      react.useEffect(() => scope.subscribe(() => setSnap(scope.getSnapshot())), [scope]);
      const values = snap.value ?? {};
      const writable = snap.writable && snap.status === "ready";

      const [tKey, setTKey] = react.useState("");
      const [sKey, setSKey] = react.useState("");
      const [tOk, setTOk] = react.useState(false);
      const [sOk, setSOk] = react.useState(false);
      const [saving, setSaving] = react.useState(false);
      const [saved, setSaved] = react.useState(false);
      const [tp, setTp] = react.useState(null);
      const [sp, setSp] = react.useState(null);

      react.useEffect(() => {
        (async () => {
          try {
            const [tk, sk] = await Promise.all([
              api.credentials.describe({ refs: [TAVILY_KEY_REF] }),
              api.credentials.describe({ refs: [SERPER_KEY_REF] }),
            ]);
            setTOk(!!(tk.result.ok && tk.result.value.credentials[TAVILY_KEY_REF]?.configured));
            setSOk(!!(sk.result.ok && sk.result.value.credentials[SERPER_KEY_REF]?.configured));
          } catch {}
        })();
      }, []);

      const tOn = values.tavilyEnabled === true;
      const sOn = values.serperEnabled === true;
      const defCh = values.defaultChannel || "tavily";
      const def = tOn && sOn ? defCh : tOn ? "tavily" : sOn ? "serper" : null;

      const doSave = async () => {
        setSaving(true);
        try {
          const tk = tKey.trim(), sk = sKey.trim();
          if (tk) await api.credentials.set({ ref: TAVILY_KEY_REF, value: tk });
          if (sk) await api.credentials.set({ ref: SERPER_KEY_REF, value: sk });
          if (tk) { setTOk(true); setTKey(""); }
          if (sk) { setSOk(true); setSKey(""); }
          setSaved(true);
          setTimeout(() => setSaved(false), 2000);
        } catch { /* silently ignore */ }
        setSaving(false);
      };

      const doProbe = async (ch) => {
        const isT = ch === "tavily";
        const cur = isT ? tp : sp;
        if (cur && cur.probing) return;
        const st = isT ? setTp : setSp;
        st({ probing: true, result: null });
        try {
          const r = await fetch(isT ? PROBE_TAVILY : PROBE_SERPER, {
            method: "POST", headers: { "content-type": "application/json" }, cache: "no-store", body: "{}",
          });
          const json = await r.json().catch(() => ({}));
          st({ probing: false, result: json && json.ok ? { ok: true } : { ok: false, code: json.code, status: json.status, error: json.error } });
        } catch { st({ probing: false, result: { ok: false, code: "network" } }); }
      };

      if (snap.status === "loading") return react_jsx_runtime.jsx("div", { style: { padding: 16, color: "var(--dsw-alias-label-secondary)" }, children: "加载中…" });

      return react_jsx_runtime.jsxs("div", { style: { display: "flex", flexDirection: "column", gap: 2, border: "1px solid var(--dsw-alias-border-l2)", borderRadius: 12, background: "var(--dsw-alias-bg-layer-3)", overflow: "hidden", padding: "4px 0" }, children: [
        // ── Tavily ──
        react_jsx_runtime.jsx("div", { style: sectionTitleStyle, children: "Tavily" }),
        react_jsx_runtime.jsxs("label", {
          style: writable ? rowStyle : rowDisabled,
          onMouseEnter: writable ? hoverOn : undefined,
          onMouseLeave: writable ? hoverOff : undefined,
          children: [
            react_jsx_runtime.jsxs("span", { style: labelStyle, children: [
            "启用 Tavily",
            react_jsx_runtime.jsx("span", { style: { fontSize: 12, fontWeight: 400, color: "var(--dsw-alias-label-tertiary)" }, children: "（无 Key 走 keyless）" }),
          ] }),
            react_jsx_runtime.jsxs("span", { style: { flex: 1 }, children: [] }),
            react_jsx_runtime.jsx(ToggleSwitch, { checked: tOn, disabled: !writable, onChange: () => scope.set("tavilyEnabled", !tOn) }),
          ],
        }),
        tOn ? react_jsx_runtime.jsxs("div", { style: fieldStyle, children: [
          react_jsx_runtime.jsxs("div", { style: { display: "flex", alignItems: "center", gap: 8 }, children: [
            react_jsx_runtime.jsx("span", { style: fieldLabel, children: "API Key" }),
            tOk ? react_jsx_runtime.jsx("span", { className: "dws_badge", children: "已配置" }) : null,
          ]}),
          react_jsx_runtime.jsx("input", { className: "dws_input", type: "password", placeholder: tOk ? "已配置密钥" : "可选，留空走 keyless", value: tKey, disabled: saving, onChange: (e) => setTKey(e.target.value) }),
          react_jsx_runtime.jsx("span", { style: { ...fieldLabel, marginTop: 8 }, children: "自定义接口地址" }),
          react_jsx_runtime.jsx("input", { className: "dws_input", type: "text", placeholder: "https://api.tavily.com", value: values.tavilyBaseURL || "", disabled: false, onChange: (e) => scope.set("tavilyBaseURL", e.target.value) }),
          react_jsx_runtime.jsxs("div", { style: { display: "flex", alignItems: "center", gap: 8 }, children: [
            react_jsx_runtime.jsx("button", { className: "dws_btn", disabled: (tp && tp.probing), onClick: () => doProbe("tavily"), children: tp && tp.probing ? "测试中…" : "连通测试" }),
            tp && tp.result ? react_jsx_runtime.jsx("span", { style: { fontSize: 12, lineHeight: "17px", color: tp.result.ok ? "var(--dsw-alias-state-success-primary)" : "var(--dsw-alias-label-error)" }, children: tp.result.ok ? "✓ 连通正常" : "✗ " + probeText(tp.result) }) : null,
          ]}),
        ]}) : null,

        // ── Serper ──
        react_jsx_runtime.jsx("div", { style: dividerStyle }),
        react_jsx_runtime.jsx("div", { style: sectionTitleStyle, children: "Serper" }),
        react_jsx_runtime.jsxs("label", {
          style: writable ? rowStyle : rowDisabled,
          onMouseEnter: writable ? hoverOn : undefined,
          onMouseLeave: writable ? hoverOff : undefined,
          children: [
            react_jsx_runtime.jsxs("span", { style: labelStyle, children: [
            "启用 Serper",
            react_jsx_runtime.jsx("span", { style: { fontSize: 12, fontWeight: 400, color: "var(--dsw-alias-label-tertiary)" }, children: "（需要 API Key）" }),
          ] }),
            react_jsx_runtime.jsxs("span", { style: { flex: 1 }, children: [] }),
            react_jsx_runtime.jsx(ToggleSwitch, { checked: sOn, disabled: !writable, onChange: () => scope.set("serperEnabled", !sOn) }),
          ],
        }),
        sOn ? react_jsx_runtime.jsxs("div", { style: fieldStyle, children: [
          react_jsx_runtime.jsxs("div", { style: { display: "flex", alignItems: "center", gap: 8 }, children: [
            react_jsx_runtime.jsx("span", { style: fieldLabel, children: "API Key" }),
            sOk ? react_jsx_runtime.jsx("span", { className: "dws_badge", children: "已配置" }) : null,
          ]}),
          react_jsx_runtime.jsx("input", { className: "dws_input", type: "password", placeholder: sOk ? "已配置密钥" : "必填，前往 serper.dev 获取", value: sKey, disabled: saving, onChange: (e) => setSKey(e.target.value) }),
          react_jsx_runtime.jsx("span", { style: { ...fieldLabel, marginTop: 8 }, children: "自定义接口地址" }),
          react_jsx_runtime.jsx("input", { className: "dws_input", type: "text", placeholder: "https://google.serper.dev", value: values.serperBaseURL || "", disabled: false, onChange: (e) => scope.set("serperBaseURL", e.target.value) }),
          react_jsx_runtime.jsxs("div", { style: { display: "flex", alignItems: "center", gap: 8 }, children: [
            react_jsx_runtime.jsx("button", { className: "dws_btn", disabled: (sp && sp.probing), onClick: () => doProbe("serper"), children: sp && sp.probing ? "测试中…" : "连通测试" }),
            sp && sp.result ? react_jsx_runtime.jsx("span", { style: { fontSize: 12, lineHeight: "17px", color: sp.result.ok ? "var(--dsw-alias-state-success-primary)" : "var(--dsw-alias-label-error)" }, children: sp.result.ok ? "✓ 连通正常" : "✗ " + probeText(sp.result) }) : null,
          ]}),
        ]}) : null,

        // ── Default channel ──
        react_jsx_runtime.jsx("div", { style: dividerStyle }),
        react_jsx_runtime.jsx("div", { style: sectionTitleStyle, children: "默认渠道" }),
        react_jsx_runtime.jsxs("div", { style: { padding: "8px 16px 12px", display: "flex", flexDirection: "column", gap: 4 }, children: [
          react_jsx_runtime.jsxs("select", {
            value: defCh,
            disabled: !writable,
            onChange: (e) => scope.set("defaultChannel", e.target.value),
            style: { height: 34, padding: "0 12px", border: "1px solid var(--dsw-alias-border-l2)", borderRadius: 8, background: "var(--dsw-alias-bg-layer-3)", font: "inherit", fontSize: 13, color: "var(--dsw-alias-label-primary)", cursor: "pointer" },
            children: [
              react_jsx_runtime.jsx("option", { value: "tavily", children: "Tavily" }),
              react_jsx_runtime.jsx("option", { value: "serper", children: "Serper" }),
            ],
          }),
          react_jsx_runtime.jsx("p", { style: { fontSize: 12, lineHeight: "1.5", color: "var(--dsw-alias-label-tertiary)" }, children: def ? "当前默认：" + (def === "tavily" ? "Tavily" : "Serper") + (tOn && sOn ? "" : "（仅一个渠道启用，自动使用）") : "两个渠道都未启用，搜索走官方 DeepSeek。" }),
        ]}),

        // ── Footer ──
        react_jsx_runtime.jsxs("div", { style: { display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 8, padding: "12px 16px 8px" }, children: [
          saved ? react_jsx_runtime.jsx("span", { style: { fontSize: 12, color: "var(--dsw-alias-state-success-primary)", lineHeight: "30px" }, children: "✓ 已保存" }) : null,
          react_jsx_runtime.jsx("button", { className: "dws_btn dws_btnPrimary", disabled: saving, onClick: doSave, children: saving ? "保存中…" : "保存" }),
        ]}),
      ]});
    }

    exports.apply = apply;
    exports.inject = inject;
    exports.name = name;
    return module.exports;
  },
});