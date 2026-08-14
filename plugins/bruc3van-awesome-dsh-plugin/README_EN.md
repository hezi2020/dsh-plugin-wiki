# Awesome DSH Plugins

> Find the right DeepSeek Harness plugin in 30 seconds.
> More than a repository dump: learn what each plugin solves, who it is for, and where to start.

[![Awesome](https://awesome.re/badge-flat2.svg)](https://awesome.re)
![Plugins](https://img.shields.io/badge/plugins-1026-2563eb)
![Updated](https://img.shields.io/badge/updated-2026--08--14-16a34a)
[![Catalog refresh](https://github.com/bruc3van/awesome-dsh-plugin/actions/workflows/update-catalog.yml/badge.svg)](https://github.com/bruc3van/awesome-dsh-plugin/actions/workflows/update-catalog.yml)
![License](https://img.shields.io/badge/license-MIT-f59e0b)

[中文](./README.md) · [Browse all 1026 plugins](./CATALOG.md) · [Star Top 100](./TOP100.md) · [Recommend a plugin](./CONTRIBUTING.md) · [Machine-readable data](./data/repositories.json)

**If this list helps you discover something useful, consider leaving a Star ⭐ so more DSH users can find the ecosystem.**

## What do you want DSH to do?

| I want to… | Start here | Why |
| --- | --- | --- |
| Run DSH as a standalone desktop app, not a browser tab | [dsh-desktop](https://github.com/bruc3van/dsh-desktop) | An out-of-the-box desktop experience: auto-reuse a running local instance or launch the bundled runtime with no Node.js/CLI install required, plus remote-instance connections, tray residency, and crash recovery. |
| Manage and discover plugins | [plugin-registry](https://github.com/vlln/plugin-registry) | Manage repository plugins in a browser console with plugin-development guidance. |
| Turn existing application code into agent-callable capabilities | [Code2Skill](https://github.com/leechen298/Code2Skill) | Generate Functions, MCP tools, workflow Skills, and offline tests from user-authorized frontend, backend, or full-stack source code, packaged as an installable DSH bundle. |
| Track background tasks | [dsh-task-status](https://github.com/vlln/dsh-task-status) | Show task progress and a live output tail in the conversation view. |
| Wake an agent on a schedule or event | [dsh-loop](https://github.com/vlln/dsh-loop) · [dsh-sentinel](https://github.com/fuhefei/dsh-sentinel) | Cover scheduled runs plus file, command, HTTP, process, and webhook events. |
| Keep requests from dying to network hiccups and timeouts without manually saying "continue" every time | [dsh-auto-continue](https://github.com/HsiangNianian/dsh-auto-continue) | Watches the live event streams and auto-sends a queued "继续" after non-human failures: error classification resumes only transient faults, adaptive backoff avoids hammering a broken upstream, and templated continue text plus browser notifications keep you in the loop — all configurable from the plugin settings card. |
| Navigate and annotate long conversations | [dsh-navbar](https://github.com/vlln/dsh-navbar) · [dsh-annotation](https://github.com/omdsh-dev/dsh-annotation) | Jump between user-message nodes and attach Codex-style annotations. |
| Reference workspace files with @ mentions | [dsh-at-file](https://github.com/omdsh-dev/dsh-at-file) | @-search workspace files in the composer and attach their contents to the prompt, no copy-paste needed. |
| Render interactive UI in chat | [dsh-genui](https://github.com/omdsh-dev/dsh-genui) | Render charts, forms, quizzes, Mermaid diagrams, and 3D scenes inline. |
| Let agents operate a real design canvas | [dsh-openpencil](https://github.com/ZSeven-W/dsh-openpencil) | Create, edit, preview, and validate interactive multi-page OpenPencil designs. |
| Add visual understanding to DSH | [modlens](https://github.com/liustack/modlens) · [dsh-vision-toolkit](https://github.com/Anionex/dsh-vision-toolkit) · [dsh-luna-vision-bridge](https://github.com/ycp424c/dsh-luna-vision-bridge) | modlens turns images into structured OCR/layout/semantics evidence; dsh-vision-toolkit covers image Q&A, long-screenshot OCR, UI restoration, and pixel diffs — or bridge pure-text models to image input via a Luna transcription adapter. |
| Let the agent search the web and X with citations | [modsearch](https://github.com/liustack/modsearch) | Search and fetch from the web/X inline, returning cited structured evidence so text-only models answer from sources. |
| Inspect and operate the current web page from your dev conversation | [dsh-browser-bridge](https://github.com/ycp424c/dsh-browser-bridge) | Embeds the full DSH Web in a Chrome side panel; grant the current tab per prompt so DSH can read the DOM, styles, and console errors and interact with the page inside your existing conversation instead of a separate browser chat. |
| Turn the sidebar into a workbench | [DSH-better-sidebar](https://github.com/omdsh-dev/DSH-better-sidebar) | File rendering/editing, terminal, Git, and subagents built in, with third-party tab extensions. |
| Work from a Claude Code-style terminal UI | [dsh-TUI](https://github.com/ccch1mneyyy/dsh-TUI) · [dsh-tianshu-tui](https://github.com/huiliyi37/dsh-tianshu-tui) | Full-screen interactive terminals with a live status line, thought streaming, and context/TPS gauges; the tianshu build adds TDD and evidence-gate workflows. |
| Add auditable cross-session memory | [dsh-memory-evolve](https://github.com/csyangwen/dsh-memory-evolve) · [dsh-mneme](https://github.com/modusensus/dsh-mneme) | Five-track memory with skill self-evolution, or an SQLite + editable Markdown memory mirror you can audit. |
| Get notified when a turn finishes | [dsh-notification](https://github.com/omdsh-dev/dsh-notification) | Per-outcome notifications with keyword include/exclude rules so long tasks need no babysitting. |
| Rewind conversation and workspace state | [dsh-turn-rewind](https://github.com/Anionex/dsh-turn-rewind) | Rewind to any earlier turn via a persistent Change Ledger, restoring both conversation and workspace state. |
| Add a companion to the workspace | [whale-girl](https://github.com/vlln/whale-girl) | A draggable companion with feeding, play, and persistent progression. |
| Migrate chat histories from other tools into DSH | [dsh-chat-import](https://github.com/Nwflower/dsh-chat-import) | Full-fidelity import of Claude Code / Codex / ChatGPT / Cursor transcripts (tools + thinking) as resumable DSH sessions. |
| Change the skin / set a custom wallpaper | [dsh-skin](https://github.com/KinGao294/dsh-skin) · [dsh-deep-whale](https://github.com/Small-tailqwq/dsh-deep-whale) | dsh-skin switches --dsw-alias-* palettes and translucent wallpapers (Codex-style); dsh-deep-whale is the most popular whale-girl skin series (CC BY-NC-SA, non-commercial). |
| Track token usage and costs | [dsh-web-billing](https://github.com/bpc-oss/dsh-web-billing) · [dsh-cost-meter](https://github.com/Han-1413141/dsh-cost-meter) | Auto-bill per message with official pricing (incl. peak/off-peak hours), keep a persistent cost ledger, show the account balance, and switch ¥/$ with the UI language. |
| Drive Harness from an external agent | [dsh-harness-mcp-server](https://github.com/chushixixin/dsh-harness-mcp-server) | Runs an MCP server inside Harness so any MCP client (e.g. Hermes) can delegate coding tasks to Harness — a 'brain + arms' setup. |
| Access your local Harness securely from another device | [dsh-remote](https://github.com/flymysql/dsh-remote) | Prints the exact commands for the live instance — SSH local forward, autossh keepalive, NAT-friendly reverse tunnel, and reverse-proxy access with --trusted-host — with one-click copy from the settings page. Respects the official safety design: no 0.0.0.0 hacks. |

## New to DSH plugins?

You do not need to install everything. Start with the kit closest to the problem you have today:

### Everyday experience kit

Start with plugin management, background-task visibility, and long-conversation navigation.

[plugin-registry](https://github.com/vlln/plugin-registry) · [dsh-task-status](https://github.com/vlln/dsh-task-status) · [dsh-navbar](https://github.com/vlln/dsh-navbar)

### Automation kit

Combine scheduled loops with event-driven wakeups for long-running or unattended work.

[dsh-loop](https://github.com/vlln/dsh-loop) · [dsh-sentinel](https://github.com/fuhefei/dsh-sentinel)

### Vision & search kit

Let a text-only model see and search: structured image evidence plus cited web search, with the native vision toolkit for more visual tasks.

[modlens](https://github.com/liustack/modlens) · [modsearch](https://github.com/liustack/modsearch) · [dsh-vision-toolkit](https://github.com/Anionex/dsh-vision-toolkit)

### Creation and interface kit

Let agents render interactive UI, operate a real design canvas, and understand visual content.

[dsh-genui](https://github.com/omdsh-dev/dsh-genui) · [dsh-openpencil](https://github.com/ZSeven-W/dsh-openpencil) · [dsh-vision-toolkit](https://github.com/Anionex/dsh-vision-toolkit)

### Memory & long-running kit

Build auditable cross-session memory and auto-resume interrupted turns for long unattended projects.

[dsh-memory-evolve](https://github.com/csyangwen/dsh-memory-evolve) · [dsh-mneme](https://github.com/modusensus/dsh-mneme) · [dsh-auto-continue](https://github.com/HsiangNianian/dsh-auto-continue)

## Editor's picks

These are not ranked automatically by stars. We favor projects that solve a clear problem, explain themselves well, remain active, and represent a distinctive capability. Inclusion is not a security or compatibility endorsement.

### [dsh-desktop — a standalone desktop client for DSH](https://github.com/bruc3van/dsh-desktop)

A community-maintained unofficial desktop client that loads DSH's official Web UI directly — auto-reuse a running local instance, or launch the bundled dsh runtime with no Node.js/CLI install required. Includes smart connect, remote-instance support, tray residency, and crash recovery.

`desktop client` `zero-install` `smart connect`

### [plugin-registry — move from browsing to managing plugins](https://github.com/vlln/plugin-registry)

A visual plugin-management entry point for users, paired with make-dsh-plugin guidance for developers. A strong first stop for the ecosystem.

`beginner-friendly` `plugin management` `developer guidance`

### [DSH-better-sidebar — a full workbench in the sidebar](https://github.com/omdsh-dev/DSH-better-sidebar)

The most popular sidebar upgrade (460+ stars): file rendering/editing, terminal, Git, and subagents built in, plus third-party tab extensions — turning the sidebar into the daily workspace.

`sidebar` `workbench` `extensible`

### [dsh-sentinel — event-driven wakeups beyond schedules](https://github.com/fuhefei/dsh-sentinel)

Watch files, commands, HTTP endpoints, processes, or webhooks and wake DSH when conditions match. Built for monitoring and unattended workflows.

`event-driven` `durable watches` `automation`

### [dsh-task-status — see what background work is doing](https://github.com/vlln/dsh-task-status)

Bring background-task progress and a live output tail into the conversation view, especially for builds, downloads, and long-running tests.

`background tasks` `live output` `observability`

### [dsh-notification — desktop notifications on turn completion](https://github.com/omdsh-dev/dsh-notification)

Desktop notifications when a turn completes, with per-outcome controls and keyword include/exclude rules — no need to watch the page during long tasks.

`notifications` `unattended` `keyword rules`

### [dsh-annotation — Codex-style annotations for DSH](https://github.com/omdsh-dev/dsh-annotation)

Select text, attach annotations to the next message, and receive annotation-aware replies. Useful for review and precise feedback.

`annotations` `precise feedback` `zero core changes`

### [dsh-at-file — Codex-style @file mentions](https://github.com/omdsh-dev/dsh-at-file)

@-search workspace files in the composer and attach their contents to the prompt without copy-paste. Official bundle, zero core changes; completes the composer workflow with navbar/annotation.

`@file` `workspace` `composer`

### [dsh-genui — turn replies into interactive interfaces](https://github.com/omdsh-dev/dsh-genui)

Render charts, forms, quizzes, Mermaid diagrams, and 3D scenes inline, with user actions flowing back to the model.

`generative UI` `interactive` `visualization`

### [DSH OpenPencil — let agents work on a real design canvas](https://github.com/ZSeven-W/dsh-openpencil)

Connect DSH to OpenPencil so agents can understand canvas structure and directly create, edit, preview, and validate editable multi-page designs instead of returning a flat image.

`design canvas` `multi-page` `editable`

### [modlens — structured visual evidence for text-only models](https://github.com/liustack/modlens)

The most-starred third-party plugin in the ecosystem (900+ stars, MIT): paste an image and get structured JSON evidence with OCR, layout, and semantics so text-only models can reliably see. Ships a Web UI; same author as modsearch.

`vision` `OCR` `structured evidence`

### [modsearch — web search with cited evidence](https://github.com/liustack/modsearch)

Let DSH search the web and X and return structured JSON evidence with citations (search/fetch/cite), so text-only models answer from sources — the see+search pair with modlens.

`search` `citations` `evidence`

### [dsh-vision-toolkit — a vision toolbox for text-first models](https://github.com/Anionex/dsh-vision-toolkit)

Cover image Q&A, long-screenshot OCR, UI restoration, grounding, pixel diffs, and artifacts for frontend and visual work.

`vision` `OCR` `UI restoration`

### [whale-girl — a companion for vibe coding](https://github.com/vlln/whale-girl)

A draggable DSH Web GUI companion with feeding and play interactions for a little personality during long agent sessions.

`desktop pet` `companion` `Web UI`

### [dsh-mneme — memory sovereignty: human-editable cross-session memory](https://github.com/modusensus/dsh-mneme)

SQLite + human-editable Markdown mirror keeps memory transparent — you hold the memory, not the agent. autoDream consolidates in the background.

`memory sovereignty` `cross-session` `autoDream`

### [dsh-memory-evolve — cross-session memory that evolves](https://github.com/csyangwen/dsh-memory-evolve)

Pure-plugin five-track long-term memory: git-branch awareness, per-turn self-review, skill self-evolution with a skill manager, four-track todos, and session search — zero core changes, zero runtime deps.

`long-term memory` `self-evolving` `zero deps`

### [dsh-TUI — a full-screen terminal UI for DSH](https://github.com/ccch1mneyyy/dsh-TUI)

A Claude Code-style full-screen terminal UI for DSH — pixel-whale header, a live status line, streaming thought expansion, double-Esc rollback, and a context/TPS gauge. One-command npm install, filling the TUI gap for CLI-first users.

`terminal UI` `full-screen` `CLI-first`

### [dsh-tianshu-tui — terminal UI with evidence-gate workflows](https://github.com/huiliyi37/dsh-tianshu-tui)

An interactive terminal UI on the official Harness (Apache-2.0) that layers TDD and evidence-gate workflows on top of the TUI, turning one-shot agent runs into a governed engineering process.

`terminal UI` `TDD` `evidence gate`

### [dsh-web-ui — a plugin and skin bundle for the DSH Web UI](https://github.com/zhu1090093659/dsh-web-ui)

An all-in-one bundle for the DSH Web UI — task board, git graph, a side panel, a remote mobile UI, a desktop pet, live token stats, and a skin center — covering several common UI needs in a single install. Note: no license declared.

`all-in-one` `skin center` `mobile UI`

### [dsh-auto-continue — auto-resume interrupted requests](https://github.com/HsiangNianian/dsh-auto-continue)

Auto-resumes turns that failed to network hiccups, timeouts, or host crashes by sending a queued "继续": error classification skips permanent failures, adaptive backoff spaces out retries, continue text supports templates, and browser notifications keep you informed — all configurable from the plugin settings card.

`auto-resume` `unattended` `error classification`

## Popular by stars

Ranked by stars and refreshed daily with the catalog; the 97 repositories that ride the `dsh-plugin` topic without being DSH plugins are excluded. Full Top 100: [TOP100.md](./TOP100.md).

| # | Project | ⭐ Stars | License | Updated |
| ---: | --- | ---: | --- | --- |
| 1 | [zhu1090093659/dsh-web-ui](https://github.com/zhu1090093659/dsh-web-ui) | 1126 | — | 2026-08-14 |
| 2 | [liustack/modlens](https://github.com/liustack/modlens) | 930 | MIT | 2026-08-14 |
| 3 | [ccch1mneyyy/dsh-TUI](https://github.com/ccch1mneyyy/dsh-TUI) | 580 | MIT | 2026-08-14 |
| 4 | [omdsh-dev/DSH-better-sidebar](https://github.com/omdsh-dev/DSH-better-sidebar) | 466 | MIT | 2026-08-14 |
| 5 | [Small-tailqwq/dsh-deep-whale](https://github.com/Small-tailqwq/dsh-deep-whale) | 330 | — | 2026-08-14 |
| 6 | [morluto/rea](https://github.com/morluto/rea) | 290 | MIT | 2026-08-14 |
| 7 | [Anionex/dsh-vision-toolkit](https://github.com/Anionex/dsh-vision-toolkit) | 254 | MIT | 2026-08-14 |
| 8 | [Nagi-ovo/dsh-ads](https://github.com/Nagi-ovo/dsh-ads) | 240 | — | 2026-08-14 |
| 9 | [NanmiCoder/dsh-agent-teams](https://github.com/NanmiCoder/dsh-agent-teams) | 169 | — | 2026-08-14 |
| 10 | [hust-open-atom-club/oh-dsh](https://github.com/hust-open-atom-club/oh-dsh) | 119 | BSD-3-Clause | 2026-08-14 |
| 11 | [Electricitysheep/dsh-handbook](https://github.com/Electricitysheep/dsh-handbook) | 105 | — | 2026-08-14 |
| 12 | [huiliyi37/dsh-tianshu-tui](https://github.com/huiliyi37/dsh-tianshu-tui) | 98 | Apache-2.0 | 2026-08-14 |

## Recently added

| Project | Description | Created |
| --- | --- | --- |
| [mbj733/dsh-hermes-memory](https://github.com/mbj733/dsh-hermes-memory) | DSH (DeepSeek Harness) agent preset + plugin: Hermes-style cross-session memory & autonomous skill learning. | 2026-08-14 |
| [SnowAmberX/dsh-role-router](https://github.com/SnowAmberX/dsh-role-router) | Role-based model routing plugin for DeepSeek Harness: planner/subagent roles plus a settings card and composer summary | 2026-08-14 |
| [Yee-h/dsh-zen-proxy](https://github.com/Yee-h/dsh-zen-proxy) | dsh plugin: in-process proxy that injects official OpenCode Zen client headers, enabling Zen free models in dsh without the 429 FreeUsageLimitError | 2026-08-14 |
| [khiqwq/dsh-credentials-system](https://github.com/khiqwq/dsh-credentials-system) | System-bound encrypted credential provider for DeepSeek Harness | 2026-08-14 |
| [CodePrometheus/dsh-observability](https://github.com/CodePrometheus/dsh-observability) | Observability for DeepSeek Harness (dsh), use the OpenTelemetry Protocol | 2026-08-14 |
| [mixin-ai/dsh-file-changes](https://github.com/mixin-ai/dsh-file-changes) | DeepSeek Harness web plugin: per-turn file-change panel with diff viewing and filesystem reveal | 2026-08-14 |
| [pineapple880066/dsh-desktop-pets](https://github.com/pineapple880066/dsh-desktop-pets) | Codex-style desktop pets for DeepSeek Harness (dsh-plugin) | 2026-08-14 |
| [sherconan/dsh-web-recon](https://github.com/sherconan/dsh-web-recon) | 网页系统侦察 · DeepSeek Harness 插件：摸清一个网页系统怎么运作，只摸一次。抓真实接口与可访问性树，固化成可复用的作战手册。零依赖，不用 Playwright。 | 2026-08-14 |

## Why this list?

- **Built for users, not crawlers:** start from the job you want to accomplish instead of scanning hundreds of repository names.
- **Human guidance plus complete coverage:** the home page helps you choose; [CATALOG.md](./CATALOG.md) preserves the full topic snapshot.
- **Topic riders excluded:** repositories that tag `dsh-plugin` without being DSH plugins (the platform itself, other agent tools, competing catalogs) are left out of the catalog and rankings, with reasons recorded in [data/curated.json](./data/curated.json).
- **Bilingual by design:** Chinese is the default, with an independent English entry point.
- **Structured and reproducible:** curation lives in [data/curated.json](./data/curated.json), while source metadata lives in [data/repositories.json](./data/repositories.json).
- **Continuously refreshed:** the catalog updates daily from GitHub's `dsh-plugin` topic. Current data timestamp: **2026-08-14 UTC**.

The index currently covers **1026** repositories across **16** primary languages. **861** declare a license, and **1024** are neither archived nor disabled.

## Usage and safety

Third-party plugins may access conversations, files, networks, or system resources. Review source code, permissions, installation steps, licenses, and recent activity before installing, and test in an isolated environment when possible. Inclusion does not imply official DSH endorsement.

## Recommend or correct a plugin

Found a missing project, stale description, or incorrect category? Issues and pull requests are welcome. Public repositories carrying the `dsh-plugin` topic enter the full catalog automatically if they actually are DSH plugins (topic riders are excluded); editor's picks require a clear use case and bilingual rationale. See [CONTRIBUTING.md](./CONTRIBUTING.md).

## License

This list is released under the [MIT License](./LICENSE). Included projects retain their respective licenses.
