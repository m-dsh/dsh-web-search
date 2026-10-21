window.__ModuleLoader__.load({ id: "dsh-web-search", factory: (require) => {
var module={exports:{}}; var exports=module.exports;
//#region rolldown:runtime
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
	if (from && typeof from === "object" || typeof from === "function") for (var keys = __getOwnPropNames(from), i = 0, n = keys.length, key; i < n; i++) {
		key = keys[i];
		if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
			get: ((k) => from[k]).bind(null, key),
			enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
		});
	}
	return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", {
	value: mod,
	enumerable: true
}) : target, mod));

//#endregion
let react = require("react");
react = __toESM(react);
let react_jsx_runtime = require("react/jsx-runtime");
react_jsx_runtime = __toESM(react_jsx_runtime);

//#region src/client/index.tsx
const TAVILY_KEY_REF = "TAVILY_API_KEY";
const SERPER_KEY_REF = "SERPER_API_KEY";
const PROBE_TAVILY = "/api/web-search-probe/tavily";
const PROBE_SERPER = "/api/web-search-probe/serper";
function injectCss() {
	if (typeof document === "undefined") return () => {};
	const prev = document.querySelector("style[data-dws-search-css]");
	if (prev) prev.remove();
	const tag = document.createElement("style");
	tag.setAttribute("data-dws-search-css", "5");
	tag.textContent = [
		".dws_input{width:100%;height:34px;padding:0 12px;border:1px solid var(--dsw-alias-border-l2);border-radius:8px;background:var(--dsw-alias-bg-layer-3);font:inherit;font-size:13px;line-height:1.5;color:var(--dsw-alias-label-primary);box-sizing:border-box}",
		".dws_input:focus-visible{outline:none;border-color:var(--dsw-alias-brand-primary)}",
		".dws_input:disabled{color:var(--dsw-alias-label-tertiary);cursor:default}",
		".dws_badge{flex:none;border-radius:999px;padding:2px 8px;font-size:11px;line-height:17px;font-weight:500;background:var(--dsw-alias-bg-module-platform);color:var(--dsw-alias-label-secondary)}",
		".dws_btn{appearance:none;border:1px solid var(--dsw-alias-border-l2);border-radius:8px;padding:5px 14px;font:inherit;font-size:13px;line-height:1.5;cursor:pointer;background:none;color:var(--dsw-alias-label-secondary)}",
		".dws_btn:hover:not(:disabled):not(.dws_btnPrimary){color:var(--dsw-alias-label-primary);border-color:var(--dsw-alias-label-dimmed)}",
		".dws_btn:disabled{opacity:.4;cursor:default}",
		".dws_btnPrimary{background:var(--dsw-alias-label-primary);color:var(--dsw-alias-bg-layer-3);border-color:transparent}",
		".dws_btnPrimary:hover:not(:disabled){opacity:.85}"
	].join("");
	document.head.appendChild(tag);
	return () => tag.remove();
}
const cardStyle = {
	display: "flex",
	flexDirection: "column",
	gap: 10
};
const cardItemStyle = {
	border: "1px solid var(--dsw-alias-border-l2)",
	borderRadius: 12,
	background: "var(--dsw-alias-bg-layer-3)",
	overflow: "hidden"
};
const rowStyle = {
	display: "flex",
	alignItems: "center",
	justifyContent: "space-between",
	padding: "10px 16px",
	cursor: "pointer",
	borderRadius: 8,
	transition: "background 0.12s"
};
const rowDisabled = {
	...rowStyle,
	opacity: .5,
	cursor: "not-allowed"
};
const labelStyle = {
	fontSize: 14,
	fontWeight: 500,
	color: "var(--dsw-alias-label-primary)"
};
const fieldStyle = {
	padding: "8px 16px 12px",
	display: "flex",
	flexDirection: "column",
	gap: 6
};
const fieldLabel = {
	fontSize: 13,
	fontWeight: 500,
	color: "var(--dsw-alias-label-primary)"
};
function hoverOn(e) {
	e.currentTarget.style.background = "var(--dsw-alias-bg-layer-2)";
}
function hoverOff(e) {
	e.currentTarget.style.background = "";
}
function probeText(fail) {
	if (fail.code === "timeout") return "超时";
	if (fail.code === "invalid_key") return "密钥无效";
	if (fail.code === "network") return "网络错误";
	if (fail.code === "http") return "HTTP " + (fail.status || "");
	return fail.error || "失败";
}
function WebSearchSection(props) {
	const { scope, api } = props;
	const [snap, setSnap] = (0, react.useState)(() => scope.getSnapshot());
	(0, react.useEffect)(() => scope.subscribe(() => setSnap(scope.getSnapshot())), [scope]);
	const values = snap.value ?? {};
	const writable = snap.writable && snap.status === "ready";
	const [writeError, setWriteError] = (0, react.useState)();
	const setConfig = async (field, value) => {
		setWriteError(void 0);
		try {
			if (!await scope.set(field, value)) setWriteError("设置未保存，请根据最新状态重试。");
		} catch {
			setWriteError("设置保存失败，请检查连接后重试。");
		}
	};
	const [tKey, setTKey] = (0, react.useState)("");
	const [sKey, setSKey] = (0, react.useState)("");
	const [tOk, setTOk] = (0, react.useState)(false);
	const [sOk, setSOk] = (0, react.useState)(false);
	const [saving, setSaving] = (0, react.useState)(false);
	const [saved, setSaved] = (0, react.useState)(false);
	const [tp, setTp] = (0, react.useState)(null);
	const [sp, setSp] = (0, react.useState)(null);
	(0, react.useEffect)(() => {
		(async () => {
			try {
				const [tk, sk] = await Promise.all([api.credentials.describe({ refs: [TAVILY_KEY_REF] }), api.credentials.describe({ refs: [SERPER_KEY_REF] })]);
				setTOk(!!(tk.result.ok && tk.result.value.credentials[TAVILY_KEY_REF]?.configured));
				setSOk(!!(sk.result.ok && sk.result.value.credentials[SERPER_KEY_REF]?.configured));
			} catch {}
		})();
	}, [api]);
	const defCh = values.defaultChannel || "tavily";
	const [open, setOpen] = (0, react.useState)("tavily");
	const doSave = (0, react.useCallback)(async () => {
		setSaving(true);
		try {
			const tk = tKey.trim();
			const sk = sKey.trim();
			if (tk) await api.credentials.set({
				ref: TAVILY_KEY_REF,
				value: tk
			});
			if (sk) await api.credentials.set({
				ref: SERPER_KEY_REF,
				value: sk
			});
			if (tk) {
				setTOk(true);
				setTKey("");
			}
			if (sk) {
				setSOk(true);
				setSKey("");
			}
			setSaved(true);
			setTimeout(() => setSaved(false), 2e3);
		} catch {}
		setSaving(false);
	}, [
		api,
		tKey,
		sKey
	]);
	const doProbe = (0, react.useCallback)(async (ch) => {
		const isT = ch === "tavily";
		const cur = isT ? tp : sp;
		if (cur && cur.probing) return;
		const st = isT ? setTp : setSp;
		st({
			probing: true,
			result: null
		});
		try {
			const json = await (await fetch(isT ? PROBE_TAVILY : PROBE_SERPER, {
				method: "POST",
				headers: { "content-type": "application/json" },
				cache: "no-store",
				body: "{}"
			})).json().catch(() => ({}));
			st({
				probing: false,
				result: json && json.ok ? { ok: true } : {
					ok: false,
					code: json.code,
					status: json.status,
					error: json.error
				}
			});
		} catch {
			st({
				probing: false,
				result: {
					ok: false,
					code: "network"
				}
			});
		}
	}, [tp, sp]);
	if (snap.status === "loading") return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
		style: {
			padding: 16,
			color: "var(--dsw-alias-label-secondary)"
		},
		children: "加载中…"
	});
	if (snap.status === "unavailable") return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
		style: {
			padding: 16,
			color: "var(--dsw-alias-label-secondary)"
		},
		children: snap.mode === "memory" ? "当前连接不支持保存设置，请在 DSH 所在电脑通过 localhost 打开设置。" : "Web 搜索设置暂不可用，请确认 DSH 已加载兼容的 dsh-web-search 插件，并刷新页面。"
	});
	const channelBlock = (ch, opts) => {
		const active = defCh === ch;
		const isOpen = open === ch;
		const baseURL = ch === "tavily" ? values.tavilyBaseURL : values.serperBaseURL;
		const onBase = (v) => void setConfig(ch === "tavily" ? "tavilyBaseURL" : "serperBaseURL", v);
		return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
			style: cardItemStyle,
			children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				role: "button",
				tabIndex: 0,
				"aria-expanded": isOpen,
				style: writable ? rowStyle : rowDisabled,
				onMouseEnter: writable ? hoverOn : void 0,
				onMouseLeave: writable ? hoverOff : void 0,
				onClick: writable ? () => setOpen(isOpen ? null : ch) : void 0,
				onKeyDown: writable ? (e) => {
					if (e.key === "Enter" || e.key === " ") {
						e.preventDefault();
						setOpen(isOpen ? null : ch);
					}
				} : void 0,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
					style: {
						display: "flex",
						alignItems: "center",
						gap: 8
					},
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						style: labelStyle,
						children: opts.title
					}), active && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: "dws_badge",
						children: "默认"
					})]
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
					style: {
						display: "flex",
						alignItems: "center",
						gap: 8
					},
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						style: {
							fontSize: 12,
							color: "var(--dsw-alias-label-tertiary)"
						},
						children: opts.hint
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						style: {
							fontSize: 12,
							color: "var(--dsw-alias-label-tertiary)",
							transition: "transform 0.12s",
							transform: isOpen ? "rotate(90deg)" : "rotate(0deg)"
						},
						children: "›"
					})]
				})]
			}), isOpen && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				style: fieldStyle,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: {
							display: "flex",
							alignItems: "center",
							gap: 8
						},
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							style: fieldLabel,
							children: "API Key"
						}), opts.keyOk && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: "dws_badge",
							children: "已配置"
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
						className: "dws_input",
						type: "password",
						placeholder: opts.keyPlaceholder,
						value: opts.keyDraft,
						disabled: saving,
						onChange: (e) => opts.onKey(e.target.value)
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						style: {
							...fieldLabel,
							marginTop: 8
						},
						children: "自定义接口地址"
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
						className: "dws_input",
						type: "text",
						placeholder: ch === "tavily" ? "https://api.tavily.com" : "https://google.serper.dev",
						value: baseURL || "",
						disabled: !writable,
						onChange: (e) => onBase(e.target.value)
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: {
							display: "flex",
							alignItems: "center",
							gap: 8
						},
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							className: "dws_btn",
							disabled: opts.probe?.probing || false,
							onClick: opts.onProbe,
							children: opts.probe?.probing ? "测试中…" : "连通测试"
						}), opts.probe?.result && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							style: {
								fontSize: 12,
								lineHeight: "17px",
								color: opts.probe.result.ok ? "var(--dsw-alias-state-success-primary)" : "var(--dsw-alias-label-error)"
							},
							children: opts.probe.result.ok ? "✓ 连通正常" : "✗ " + probeText(opts.probe.result)
						})]
					})
				]
			})]
		}, ch);
	};
	return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
		style: cardStyle,
		children: [
			channelBlock("tavily", {
				title: "Tavily",
				hint: "无 Key 走 keyless",
				keyOk: tOk,
				keyPlaceholder: tOk ? "已配置密钥" : "可选，留空走 keyless",
				keyDraft: tKey,
				onKey: setTKey,
				probe: tp,
				onProbe: () => {
					doProbe("tavily");
				}
			}),
			channelBlock("serper", {
				title: "Serper",
				hint: "需要 API Key",
				keyOk: sOk,
				keyPlaceholder: sOk ? "已配置密钥" : "必填，前往 serper.dev 获取",
				keyDraft: sKey,
				onKey: setSKey,
				probe: sp,
				onProbe: () => {
					doProbe("serper");
				}
			}),
			/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				style: cardItemStyle,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					style: rowStyle,
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						style: labelStyle,
						children: "默认渠道"
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						style: {
							fontSize: 12,
							color: "var(--dsw-alias-label-tertiary)"
						},
						children: "实际使用的 API"
					})]
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					style: {
						padding: "4px 16px 12px",
						display: "flex",
						flexDirection: "column",
						gap: 4
					},
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("select", {
						value: defCh,
						disabled: !writable,
						onChange: (e) => {
							setConfig("defaultChannel", e.target.value);
						},
						style: {
							height: 34,
							padding: "0 12px",
							border: "1px solid var(--dsw-alias-border-l2)",
							borderRadius: 8,
							background: "var(--dsw-alias-bg-layer-3)",
							font: "inherit",
							fontSize: 13,
							color: "var(--dsw-alias-label-primary)",
							cursor: "pointer"
						},
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
							value: "tavily",
							children: "Tavily"
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
							value: "serper",
							children: "Serper"
						})]
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						style: {
							fontSize: 12,
							lineHeight: "1.5",
							color: "var(--dsw-alias-label-tertiary)"
						},
						children: "搜索实际使用默认渠道所对应的 API。"
					})]
				})]
			}),
			writeError && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				role: "alert",
				style: {
					padding: "8px 16px",
					color: "var(--dsw-alias-label-error)"
				},
				children: writeError
			}),
			/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				style: {
					display: "flex",
					alignItems: "center",
					justifyContent: "flex-end",
					gap: 8,
					padding: "12px 16px 8px"
				},
				children: [saved && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					style: {
						fontSize: 12,
						color: "var(--dsw-alias-state-success-primary)",
						lineHeight: "30px"
					},
					children: "✓ 已保存"
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
					className: "dws_btn dws_btnPrimary",
					disabled: saving,
					onClick: doSave,
					children: saving ? "保存中…" : "保存"
				})]
			})
		]
	});
}
const name = "dsh-web-search-client";
const inject = [
	"slots",
	"configForms",
	"connection"
];
function apply(ctx) {
	const { api } = ctx.get("connection");
	const scope = ctx.configForms.get("web-search");
	injectCss();
	ctx.slots.inject("settings.section", () => {
		return ctx.slots.register({
			name: "settings.section",
			id: "web-search",
			order: 700,
			label: "Web 搜索",
			inject: () => ({
				scope,
				api
			})
		}, WebSearchSection);
	});
}

//#endregion
exports.apply = apply;
exports.inject = inject;
exports.name = name;
return module.exports; } });