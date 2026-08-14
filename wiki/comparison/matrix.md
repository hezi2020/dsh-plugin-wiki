# 对比矩阵

下表横向对比 DeepSeek Harness（`dsh`）、Trae、OpenAI Codex CLI、Anthropic Claude Code、Pi Agent 与 AgentCLI。每个单元格给出简短结论并附官方文档链接可溯源；AgentCLI 因无明确官方文档，一律标注「无明确官方文档」。

!!! info "方法论"
    所有结论均源自对应工具的官方文档或官方仓库。链接格式为 `[文档]`，点击可溯源。dsh 一方信息源自 [dsh 官方仓库](https://github.com/deepseek-ai/deepseek-harness)。

## 总览矩阵

| 维度 | DeepSeek Harness | Trae | OpenAI Codex CLI | Anthropic Claude Code | Pi Agent | AgentCLI |
|---|---|---|---|---|---|---|
| **架构模型** | 开源 agent harness；Cordis 内核；一切皆插件，agent loop/会话日志/模型适配器均可替换 [架构] | 闭源商业 IDE/工作台产品族（TraeCode/TraeWork/CLI/Plugin）[什么是TraeCode] | 本地终端编码代理，主要由 Rust 构建 [README] | 闭源商业智能体编码工具，多表面 [概览] | 极简终端编程脚手架；TypeScript 扩展；「Primitives, not features」[Pi 概览] | 无明确官方文档 |
| **插件机制** | 一切皆插件；Profile + 组合包（bundle）按序叠加可逆组合 [架构] | Skill/MCP/Agent/Subagent/Rule/命令/插件市场 [技能][MCP] | MCP connectors/sub-agents/tool hooks/Skills/Plugins [Hooks][Subagents][Skills] | Skills/MCP/Hooks/Plugins/Marketplaces [扩展总览] | TypeScript 扩展（registerTool/on/registerCommand）+ Skills + Pi packages [扩展][Skills] | 无明确官方文档 |
| **界面表面** | 本地 Web UI [README] | 网页/桌面/移动版；IDE 集成 [什么是TraeCode] | 终端 TUI/IDE（VS Code/Cursor/Windsurf/JetBrains）/桌面应用/Codex Cloud/移动端 [CLI][IDE][App] | 终端/IDE/桌面/Web/浏览器/移动端 [概览][桌面] | 纯终端 TUI（无 IDE/桌面/Web/移动）[使用 Pi] | 无明确官方文档 |
| **运行时模式** | Profile 机制：`web`/`headless`/自定义 [CLI README] | IDE 模式/SOLO 模式；Work/Code/Design [什么是TraeCode] | Plan/Execute；非交互/CI（`codex exec`）[Non-interactive] | 终端/IDE/桌面/浏览器/移动；Web/Routines [概览] | 交互 TUI/`-p`（print）/`--mode json`/`--mode rpc` [使用 Pi][SDK] | 无明确官方文档 |
| **可观测性（session log）** | append-only JSONL 会话日志；「Model-visible ⟺ logged」强不变量；类型化事件+版本机制 [AGENTS.md] | 日志/SessionID 获取；隐私模式 [获取日志][隐私模式] | `codex doctor`/SQLite memory/tracing/`/status`/`/hooks` [Agent approvals] | OpenTelemetry；会话管理；`/doctor`/`/context`/`/usage` [Monitoring][Sessions] | `/session`/`/tree` + JSONL；`/share`/`/export` [会话][上下文压缩] | 无明确官方文档 |
| **沙箱** | Linux Landlock 原生模块 + E2B POC；Windows 原生模块受限 [AGENTS.md] | 沙箱运行（标注 Legacy）；文件访问控制+高风险命令拦截 [沙箱] | OS 级（Landlock/sandbox-exec/AppContainer）+ network_proxy + Codex Cloud 隔离 [Sandboxing] | 权限模式 + dev container + worktrees 隔离 [权限模式][Worktrees] | **无内置沙箱**（刻意设计，依赖 OS/容器边界）[安全] | 无明确官方文档 |
| **子代理** | 多后端：Claude Code/Codex/ACP/dsh-sdk/进程内 spawn/fork；`tool-subagent-control` 代理间消息 [subagent/README] | Subagent（Markdown 定义，独立上下文窗口）[子智能体] | subagents（default/worker/explorer + custom agents + CSV 批处理；max_threads/max_depth）[Subagents] | Subagents + Agent Teams + dynamic workflows [子代理][Agent Teams] | 无原生子代理（可通过扩展实现）[扩展] | 无明确官方文档 |
| **Skill** | skill capability 包（provider registry + catalog/loader）[AGENTS.md] | `SKILL.md` 定义，结构化按需加载 [技能] | `SKILL.md` + Agent Skills standard；progressive disclosure；`$skill`/`/skills` [Skills] | Skills（Markdown，progressive disclosure，`/命令` 或自动加载）[Skills] | `SKILL.md` + Agent Skills standard；progressive disclosure；`/skill:name` [Skills] | 无明确官方文档 |
| **MCP 支持** | 支持；工具名采用与 Claude Code/Codex 相同的服务器限定形状 [mcp-client/README] | 支持；MCP 市场 + 手动配置 [MCP概览] | STDIO/HTTP/OAuth；config.toml；工具策略；plugin MCP [MCP] | 支持 [MCP] | 无内置 MCP（可通过扩展实现）[扩展] | 无明确官方文档 |
| **Hooks/事件** | hooks 桥接（Claude Code/Codex）[AGENTS.md] | 未明确独立 Hooks 概念 | 10 个生命周期事件；managed/plugin hooks；信任审查 [Hooks] | Hooks（PreToolUse/PostToolUse/Stop 等；command/prompt/agent 类型）[Hooks Guide] | 扩展事件（生命周期/资源/会话/Agent/模型/Tool）[扩展] | 无明确官方文档 |
| **会话管理** | append-only JSONL；Profile 机制 [AGENTS.md] | SessionID 获取 [获取日志] | rollout 文件；`codex exec resume`；worktree 隔离 [Non-interactive] | 会话命名/恢复/分支/导出；worktree 隔离 [Sessions][Worktrees] | **树结构** JSONL；`/tree` 分支/`/fork`/`/clone`；分支摘要 [会话] | 无明确官方文档 |
| **上下文压缩** | 未明确独立机制 | 未明确独立机制 | PreCompact/PostCompact hooks [Hooks] | `/compact` [Interactive Mode] | 自动压缩 + 分支摘要 + 累积式文件跟踪 + 拆分轮次 [上下文压缩] | 无明确官方文档 |
| **权限/审批** | 未明确独立机制 | 沙箱 + 高风险命令拦截 [沙箱] | sandbox mode + approval policy + auto-review + network_proxy [Agent approvals] | permission modes（default/acceptEdits/plan/dontAsk/bypassPermissions）[权限模式] | 项目信任（输入加载护栏，非沙箱）[安全] | 无明确官方文档 |
| **Provider/模型支持** | DeepSeek 为主；自定义 `DEEPSEEK_BASE_URL` [README] | 内置多种模型；Auto 模式 [Auto 模式] | ChatGPT 订阅/OpenAI API Key [CLI] | Anthropic 直连/Bedrock/Vertex/Foundry [企业部署] | **30+ Provider**（订阅 + API Key + Cloud）[Providers] | 无明确官方文档 |
| **生态成熟度** | developer preview；生态尚小；`dsh-plugin` topic + Discord [README] | 成熟：插件市场/MCP市场/教程/一键导入智能体 [文档索引] | 高活跃开源；多表面；Python SDK；GitHub Action [README] | 完整：Skills/Plugins/Marketplaces/Agent SDK/CI 集成 [文档索引] | 社区较小；Pi packages 分发；gallery [Packages] | 无明确官方文档 |
| **许可证** | MIT，完全开源 [README] | 闭源商业；积分计费；开源声明仅针对第三方组件 [积分计费][开源声明] | Apache-2.0，开源 [README] | 闭源商业；需订阅或 API Key；官方文档未明确开源协议 [概览] | MIT，完全开源 [Pi 仓库] | 无明确官方文档 |
| **状态** | developer preview，明确会有兼容性破坏变更 [README] | 商业正式版 [什么是TraeCode] | 实验性（experimental），活跃开发 [README] | 商业正式版 [概览] | 活跃开发 [Pi 仓库] | 无明确官方文档 |

## 链接索引

### DeepSeek Harness
- [README]：<https://github.com/deepseek-ai/deepseek-harness/blob/master/README.md>
- [AGENTS.md]：<https://github.com/deepseek-ai/deepseek-harness/blob/master/AGENTS.md>
- [架构]：<https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/architecture.zh.md>
- [CLI README]：<https://github.com/deepseek-ai/deepseek-harness/blob/master/apps/cli/README.zh.md>
- [subagent/README]：<https://github.com/deepseek-ai/deepseek-harness/blob/master/packages/subagent/README.md>
- [mcp-client/README]：<https://github.com/deepseek-ai/deepseek-harness/blob/master/packages/mcp/mcp-client/README.md>

### Trae
- [什么是TraeCode]：<https://docs.trae.cn/ide/what-is-trae-code>
- [技能]：<https://docs.trae.cn/ide/skills>
- [MCP]：<https://docs.trae.cn/ide/model-context-protocol>
- [MCP概览]：<https://docs.trae.cn/ide/model-context-protocol>
- [子智能体]：<https://docs.trae.cn/ide/subagents>
- [获取日志]：<https://docs.trae.cn/ide/get-logs-or-session-id>
- [隐私模式]：<https://docs.trae.cn/ide/privacy-mode>
- [沙箱]：<https://docs.trae.cn/ide/sandbox>
- [WSL]：<https://docs.trae.cn/ide/wsl>
- [积分计费]：<https://docs.trae.cn/ide/credit-based-billing-is-available>
- [开源声明]：<https://docs.trae.cn/ide/open-source-software-notice>
- [文档索引]：<https://docs.trae.cn/llms.txt>

### OpenAI Codex CLI
- [README]：<https://github.com/openai/codex>
- [changelog]：<https://developers.openai.com/codex/changelog>

### Anthropic Claude Code
- [概览]：<https://code.claude.com/docs/en/overview>
- [扩展总览]：<https://code.claude.com/docs/en/features-overview>
- [子代理]：<https://code.claude.com/docs/en/sub-agents>
- [Agent Teams]：<https://code.claude.com/docs/en/agent-teams>
- [Skills]：<https://code.claude.com/docs/en/skills>
- [MCP]：<https://code.claude.com/docs/en/mcp>
- [Monitoring]：<https://code.claude.com/docs/en/monitoring-usage>
- [Sessions]：<https://code.claude.com/docs/en/sessions>
- [权限模式]：<https://code.claude.com/docs/en/permission-modes>
- [Worktrees]：<https://code.claude.com/docs/en/worktrees>
- [企业部署]：<https://code.claude.com/docs/en/third-party-integrations>
- [文档索引]：<https://code.claude.com/docs/llms.txt>

### Pi Agent
- [Pi 概览]：<https://pi-agent.org/docs>
- [使用 Pi]：<https://pi-agent.org/docs/usage>
- [Pi 扩展]：<https://pi-agent.org/docs/extensions>
- [Skills]：<https://pi-agent.org/docs/skills>
- [Pi 会话]：<https://pi-agent.org/docs/sessions>
- [上下文压缩]：<https://pi-agent.org/docs/context-compaction>
- [Pi Providers]：<https://pi-agent.org/docs/providers>
- [SDK]：<https://pi-agent.org/docs/sdk>
- [安全]：<https://pi-agent.org/docs/security>
- [Pi packages]：<https://pi-agent.org/docs/packages>
- [Pi 仓库]：<https://github.com/earendil-works/pi>

## 关键差异速读

!!! abstract "三句话总结"
    1. **开源 vs 闭源**：dsh（MIT）与 Pi（MIT）、Codex CLI（Apache-2.0）开源；Trae 与 Claude Code 闭源商业。
    2. **可组合性**：dsh 是唯一「一切皆插件、agent loop 可替换」的 harness；Pi 以「Primitives, not features」极简脚手架 + TypeScript 扩展点为哲学；Trae、Codex CLI、Claude Code 核心运行时均由厂商控制。
    3. **子代理后端**：dsh 支持多后端（Claude Code/Codex/ACP/dsh-sdk/进程内）；Claude Code 子代理仅限自身运行时；Pi 无原生子代理（仅可扩展实现）。
