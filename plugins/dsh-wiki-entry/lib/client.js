window.__ModuleLoader__.load({
	id: "dsh-wiki-entry",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react_jsx_runtime = require("react/jsx-runtime");
		let react = require("react");
		//#region lib/client/index.js
		/** The wiki server URL (same value the host configures). */
		const WIKI_URL = "http://127.0.0.1:8099/wiki/";
		/** Browser event the card dispatches after a toggle; the header re-reads on it. */
		const WIKI_CHANGED_EVENT = "dsh-wiki-entry-changed";
		/** Read the current status; resolves undefined on any transport failure. */
		async function readStatus() {
			try {
				const response = await fetch("/wiki-api/status");
				if (!response.ok) return void 0;
				const data = await response.json();
				if (typeof data !== "object" || data === null) return void 0;
				const status = data;
				if (typeof status.enabled !== "boolean" || typeof status.running !== "boolean") return void 0;
				return {
					enabled: status.enabled,
					running: status.running,
					url: typeof status.url === "string" ? status.url : WIKI_URL
				};
			} catch {
				return;
			}
		}
		/** Shared pill styling, driven by the theme's semantic tokens. */
		const entryStyle = {
			display: "inline-flex",
			alignItems: "center",
			justifyContent: "center",
			height: 32,
			padding: "6px 12px",
			gap: 4,
			border: "1px solid var(--dsw-alias-border-l2)",
			borderRadius: 18,
			color: "var(--dsw-alias-label-primary)",
			background: "transparent",
			fontFamily: "var(--dsw-font-family)",
			fontSize: 13,
			fontWeight: 400,
			lineHeight: "20px",
			cursor: "pointer",
			textDecoration: "none",
			whiteSpace: "nowrap"
		};
		/** Book glyph for the entry (inline SVG, no icon dependency). */
		function BookIcon() {
			return (0, react_jsx_runtime.jsxs)("svg", {
				width: 14,
				height: 14,
				viewBox: "0 0 24 24",
				fill: "none",
				stroke: "currentColor",
				strokeWidth: 2,
				strokeLinecap: "round",
				strokeLinejoin: "round",
				"aria-hidden": "true",
				children: [(0, react_jsx_runtime.jsx)("path", { d: "M4 19.5A2.5 2.5 0 0 1 6.5 17H20" }), (0, react_jsx_runtime.jsx)("path", { d: "M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" })]
			});
		}
		/**
		* The top-right Wiki entry. Renders nothing while the plugin is disabled;
		* clicking ensures the wiki server is up (host side) and opens it in a new
		* tab — a plain anchor navigation once the server is known to be running.
		*/
		function WikiEntry() {
			const [status, setStatus] = (0, react.useState)(void 0);
			const [phase, setPhase] = (0, react.useState)("idle");
			const refresh = () => {
				readStatus().then((next) => {
					if (next !== void 0) setStatus(next);
				});
			};
			(0, react.useEffect)(() => {
				refresh();
				const onChanged = () => {
					refresh();
				};
				window.addEventListener(WIKI_CHANGED_EVENT, onChanged);
				return () => {
					window.removeEventListener(WIKI_CHANGED_EVENT, onChanged);
				};
			}, []);
			const enabled = status?.enabled !== false;
			const running = status?.running === true;
			if (!enabled) return null;
			const onClick = (event) => {
				if (phase === "starting") {
					event.preventDefault();
					return;
				}
				if (running) return;
				event.preventDefault();
				setPhase("starting");
				fetch("/wiki-api/open", { method: "POST" }).then((response) => {
					if (!response.ok) {
						setPhase("error");
						return null;
					}
					return response.json().then((data) => {
						setPhase("idle");
						setStatus((previous) => previous === void 0 ? previous : {
							...previous,
							running: true
						});
						if (typeof data === "object" && data !== null && typeof data.url === "string") try {
							window.open(data.url, "_blank", "noopener");
						} catch {}
					});
				}).catch(() => setPhase("error"));
			};
			const label = phase === "starting" ? "启动中…" : "Wiki";
			return (0, react_jsx_runtime.jsxs)("a", {
				href: WIKI_URL,
				target: "_blank",
				rel: "noopener noreferrer",
				style: entryStyle,
				title: phase === "starting" ? "正在启动 Wiki…" : phase === "error" ? "Wiki 启动失败，点击重试" : "打开 Wiki（未运行将自动启动）",
				"aria-label": "打开 Wiki",
				"data-busy": phase === "starting" ? "true" : void 0,
				onClick,
				children: [(0, react_jsx_runtime.jsx)(BookIcon, {}), (0, react_jsx_runtime.jsx)("span", { children: label })]
			});
		}
		/** Card row chrome shared with the card body. */
		const cardRowStyle = {
			display: "flex",
			alignItems: "center",
			justifyContent: "space-between",
			gap: 16,
			padding: "10px 14px",
			border: "1px solid var(--dsw-alias-border-l1)",
			borderRadius: 10,
			background: "var(--dsw-alias-bg-layer-1)"
		};
		/**
		* The 设置 → 插件 → 可配置 card: a persistent enable switch for the Wiki 入口.
		* The write goes to the host `/wiki-api/set-enabled` route, which stores the
		* value in the `wiki-entry` settings namespace (settings.yaml) — the plugin
		* stays off across restarts and page refreshes until switched back on.
		*/
		function WikiEntryCard() {
			const [status, setStatus] = (0, react.useState)(void 0);
			const [saving, setSaving] = (0, react.useState)(false);
			(0, react.useEffect)(() => {
				let alive = true;
				readStatus().then((next) => {
					if (alive && next !== void 0) setStatus(next);
				});
				return () => {
					alive = false;
				};
			}, []);
			if (status === void 0) return null;
			const enabled = status.enabled;
			const toggle = (next) => {
				if (saving) return;
				setSaving(true);
				fetch("/wiki-api/set-enabled", {
					method: "POST",
					headers: { "content-type": "application/json" },
					body: JSON.stringify({ enabled: next })
				}).then((response) => {
					if (!response.ok) return null;
					return response.json().then((data) => {
						if (typeof data === "object" && data !== null && typeof data.ok === "boolean") {
							if (data.ok) {
								setStatus((previous) => previous === void 0 ? previous : {
									...previous,
									enabled: next
								});
								window.dispatchEvent(new Event(WIKI_CHANGED_EVENT));
							}
						}
					});
				}).finally(() => setSaving(false));
			};
			return (0, react_jsx_runtime.jsxs)("li", {
				style: cardRowStyle,
				children: [(0, react_jsx_runtime.jsxs)("div", { children: [(0, react_jsx_runtime.jsx)("strong", {
					style: {
						color: "var(--dsw-alias-label-primary)",
						fontSize: 13
					},
					children: "Wiki 入口"
				}), (0, react_jsx_runtime.jsx)("p", {
					style: {
						color: "var(--dsw-alias-label-secondary)",
						fontSize: 12,
						margin: "2px 0 0"
					},
					children: "右上角 Wiki 入口：未运行时点击自动启动本地 Wiki 服务器并打开"
				})] }), (0, react_jsx_runtime.jsxs)("label", {
					style: {
						display: "flex",
						alignItems: "center",
						gap: 6,
						color: "var(--dsw-alias-label-primary)",
						fontSize: 13
					},
					children: [(0, react_jsx_runtime.jsx)("input", {
						type: "checkbox",
						checked: enabled,
						disabled: saving,
						onChange: (event) => {
							toggle(event.target.checked);
						}
					}), "启用"]
				})]
			});
		}
		/** Required services: only slots — the enable switch travels through host routes. */
		const inject = ["slots"];
		/**
		* Mount the Wiki entry and its settings card.
		* @param ctx - browser context carrying the slot registry.
		*/
		function apply(ctx) {
			ctx.slots.inject("conversation.session.header.utilities", () => ctx.slots.register({
				name: "conversation.session.header.utilities",
				id: "wiki-entry",
				order: 100,
				label: "Wiki"
			}, WikiEntry));
			ctx.slots.inject("settings.plugin.item", () => ctx.slots.register({
				name: "settings.plugin.item",
				id: "wiki-entry",
				order: 30
			}, WikiEntryCard));
		}
		//#endregion
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map