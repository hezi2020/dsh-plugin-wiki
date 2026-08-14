# dsh 相对优势与缺陷小结

本页汇总 DeepSeek Harness（`dsh`）相对 Trae / OpenAI Codex CLI / Anthropic Claude Code / Pi Agent 的优势与缺陷，并给出适用场景建议。所有结论均源自 [dsh 官方仓库](https://github.com/deepseek-ai/deepseek-harness)与各竞品官方文档：[Trae](https://docs.trae.cn/)、[Codex CLI](https://github.com/openai/codex)、[Claude Code](https://code.claude.com/docs/)、[Pi Agent](https://pi-agent.org/docs)。

## dsh 的相对优势

### 1. 「一切皆插件」的可组合性

dsh 以 Cordis 为内核，**产品的每一部分都是插件**——包括模型适配器、工具注册表、会话日志，以及 agent loop（智能体循环）本身，因此每一部分都可以从配置替换。扩展 dsh 的方式是把插件挂载到其他插件旁边，各项注册都是副作用，会在其插件卸载时撤销；不存在需要打补丁的特权内核 [dsh 架构文档](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/architecture.zh.md)。

这是 dsh 与所有竞品最本质的差异：Trae、Codex CLI、Claude Code 的核心 agent loop 均由厂商控制，无法从配置替换；Pi Agent 虽开源 MIT 且以「Primitives, not features」为哲学、提供 TypeScript 扩展点 [Pi 扩展](https://pi-agent.org/docs/extensions)，但其核心 agent loop 并非以「一切皆插件、可从配置替换」为架构不变量。

### 2. 开源 MIT 许可证

dsh 采用 **MIT** 许可证，完全开源，允许在自主可控的协议下二次开发与分发 [dsh README](https://github.com/deepseek-ai/deepseek-harness/blob/master/README.md)。相比之下：

- Trae 与 Claude Code 闭源商业 [Trae 积分计费](https://docs.trae.cn/ide/credit-based-billing-is-available)、[Claude Code 概览](https://code.claude.com/docs/en/overview)。
- Codex CLI 开源但为 Apache-2.0（含专利授权条款）[Codex CLI README](https://github.com/openai/codex)。
- Pi Agent 同为 **MIT** 开源 [Pi 仓库](https://github.com/earendil-works/pi)，因此在「开源 MIT」这一点上 dsh 与 Pi 持平，不构成相对 Pi 的差异化优势。

### 3. Cordis 内核的时空可组合性

dsh 基于 [Cordis](https://github.com/cordiverse/cordis)，其设计来自《A Programming Paradigm for Spatiotemporal Composability》论文，插件向共享上下文贡献服务、类型化事件与可逆副作用 [dsh README](https://github.com/deepseek-ai/deepseek-harness/blob/master/README.md)、[dsh 架构文档](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/architecture.zh.md)。

### 4. Profile 机制提供可组合的运行时入口

dsh 通过 **Profile + 组合包（bundle）** 实现按序叠加的可逆组合：`web` 与 `headless` 作为模板随发行版交付，其他 profile 通过 `dsh plugin` 创建 [dsh CLI README](https://github.com/deepseek-ai/deepseek-harness/blob/master/apps/cli/README.zh.md)、[dsh 架构文档](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/architecture.zh.md)。

### 5. append-only traceable session log

dsh 以 **append-only JSONL 会话日志** 为可观测性核心，并维护「**Model-visible ⟺ logged**」强不变量：任何到达模型请求的内容都必须可从会话日志重建；类型化事件使用声明合并与版本机制（`SESSION_FORMAT_VERSION`）[dsh AGENTS.md](https://github.com/deepseek-ai/deepseek-harness/blob/master/AGENTS.md)、[dsh Python SDK README](https://github.com/deepseek-ai/deepseek-harness/blob/master/python/sdk/README.zh.md)。竞品中无一方声明同等强度的会话日志不变量：Pi Agent 虽以 JSONL 记录会话并支持树结构分支 `/tree`/`/fork` [Pi 会话](https://pi-agent.org/docs/sessions)，但未声明「Model-visible ⟺ logged」级别的不变量与版本机制。

### 6. 多后端子代理能力

dsh 的 subagent capability 支持**多后端**：Claude Code（通过官方 Claude Agent SDK）、Codex（app-server）、ACP、dsh-sdk、进程内 spawn/fork，并通过 `tool-subagent-control` 提供子代理间消息传递与列表 [dsh subagent/README](https://github.com/deepseek-ai/deepseek-harness/blob/master/packages/subagent/README.md)、[dsh subagent-claude-code/README](https://github.com/deepseek-ai/deepseek-harness/blob/master/packages/subagent/subagent-claude-code/README.md)。Claude Code 的子代理仅限自身运行时 [Claude Code 子代理](https://code.claude.com/docs/en/sub-agents)；Pi Agent 无原生子代理能力（仅可通过扩展自行实现）[Pi 扩展](https://pi-agent.org/docs/extensions)。

### 7. 与 Claude Code / Codex 生态刻意对齐

dsh 在多处与 Claude Code/Codex 生态对齐：hooks 桥接（`hooks-claude-code`）、MCP 工具命名形状（`mcp__github__create_issue`）、文件搜索工具参数上限（`globMaxResults`/`grepMaxMatches`）、WebFetch 同源重定向模式 [dsh hooks/README](https://github.com/deepseek-ai/deepseek-harness/blob/master/packages/hooks/README.md)、[dsh mcp-client/README](https://github.com/deepseek-ai/deepseek-harness/blob/master/packages/mcp/mcp-client/README.md)、[dsh tool-fs-search/README](https://github.com/deepseek-ai/deepseek-harness/blob/master/packages/fs/tool-fs-search/README.md)。这降低了既有生态的迁移成本。

## dsh 的相对缺陷

### 1. developer preview，不稳定

dsh 处于 **developer preview**，迭代迅速，明确声明「**会有兼容性破坏变更**」[dsh README](https://github.com/deepseek-ai/deepseek-harness/blob/master/README.md)。相比之下，Trae 与 Claude Code 为商业正式版，Codex CLI 虽实验性但由 OpenAI 官方高活跃维护。

### 2. 生态尚小

dsh 生态处于早期，主要通过 `dsh-plugin` GitHub topic 与 Discord 社区积累 [dsh README](https://github.com/deepseek-ai/deepseek-harness/blob/master/README.md)。Trae 有插件市场/MCP市场/教程体系 [Trae 文档索引](https://docs.trae.cn/llms.txt)；Claude Code 有完整 Skills/Plugins/Marketplaces/SDK/CI 集成 [Claude Code 文档索引](https://code.claude.com/docs/llms.txt)。

### 3. Windows 原生模块受限

dsh 的原生沙箱模块 `node-addon-landlock-run` 基于 Linux Landlock，**仅适用于 Linux**；Windows 上原生模块受限（官方注明 `check:windows-wine` 仅用于诊断已知 Windows 失败）[dsh AGENTS.md](https://github.com/deepseek-ai/deepseek-harness/blob/master/AGENTS.md)。Codex CLI 在 Windows 原生支持上更成熟 [Codex CLI README](https://github.com/openai/codex)。

### 4. 无内置模型，需自配 API Key

dsh 无内置模型，需自配 `DEEPSEEK_API_KEY`（支持自定义 `DEEPSEEK_BASE_URL`）[dsh README](https://github.com/deepseek-ai/deepseek-harness/blob/master/README.md)。Trae 内置多种模型并提供 Auto 模式 [Trae Auto 模式](https://docs.trae.cn/ide/auto-mode)；Codex CLI 与 Claude Code 可通过订阅账号直接使用；Pi Agent 原生支持 **30+ Provider**（订阅 + API Key + Cloud）[Pi Providers](https://pi-agent.org/docs/providers)，模型生态广度明显优于 dsh。

### 5. 文档仍在完善

dsh 处于 developer preview 阶段，文档仍在完善中（如沙箱、Windows 支持等细节随迭代演进）[dsh README](https://github.com/deepseek-ai/deepseek-harness/blob/master/README.md)。竞品的官方文档体系更为成熟完整。

### 6. 无企业级部署能力

dsh 无企业级云部署、自托管网关、托管设置、OTLP 遥测等能力（developer preview 阶段）。Claude Code 提供 Bedrock/Vertex/Foundry/网关/dev container 等企业部署 [Claude Code 企业部署](https://code.claude.com/docs/en/third-party-integrations)。

### 7. 会话分支灵活性弱于 Pi

dsh 会话为 append-only JSONL 线性日志，无原生的会话分支/分叉能力。Pi Agent 采用**树结构会话**，提供 `/tree` 导航、`/fork` 分叉、`/clone` 克隆，并在切换分支时为被放弃分支生成摘要 [Pi 会话](https://pi-agent.org/docs/sessions)、[Pi 上下文压缩](https://pi-agent.org/docs/context-compaction)，在「探索多方案并行试错」场景下灵活性优于 dsh。

## 适用场景建议

### 什么情况选 dsh

- **需要开源 MIT 自主可控**：希望在完全自主的开源协议下二次开发、分发或私有部署。
- **需要可替换的 agent harness**：需要替换 agent loop、会话日志、模型适配器等核心组件，或研究 agent harness 架构本身。
- **需要多后端子代理编排**：需要在 Claude Code、Codex、ACP、dsh-sdk、进程内等不同子代理后端之间灵活选择与组合。
- **需要强可观测的会话日志**：需要 append-only、可重建、可溯源的会话日志（「Model-visible ⟺ logged」）。
- **研究与原型开发**：接受 developer preview 的不稳定性，用于探索、研究或二次开发。

### 什么情况选 Trae

- **需要开箱即用的完整 IDE 体验**：希望内置模型、无需自配 API Key 即可开始 [Trae 什么是 TraeCode](https://docs.trae.cn/ide/what-is-trae-code)。
- **需要多端客户端**：需要网页/桌面/移动版客户端与 Remote SSH/WSL 远程开发 [Trae WSL](https://docs.trae.cn/ide/wsl)。
- **需要 Plan/Spec 结构化工作流**：需要内置的规划文档生成能力 [Trae Plan/Spec](https://docs.trae.cn/ide/spec-and-plan-workflows)。

### 什么情况选 OpenAI Codex CLI

- **需要轻量 Rust 二进制**：希望单二进制安装、无需 Node.js 运行时 [Codex CLI README](https://github.com/openai/codex)。
- **需要跨平台原生沙箱**：需要 Windows 原生沙箱与网络沙箱代理 [Codex CLI README](https://github.com/openai/codex)、[Codex CLI changelog](https://developers.openai.com/codex/changelog)。
- **与 ChatGPT/OpenAI 生态集成**：希望使用 ChatGPT 计划登录与 OpenAI 模型生态 [Codex CLI README](https://github.com/openai/codex)。

### 什么情况选 Anthropic Claude Code

- **需要企业级部署**：需要 Bedrock/Vertex/Foundry、自托管网关、托管设置、OTLP 遥测 [Claude Code 企业部署](https://code.claude.com/docs/en/third-party-integrations)。
- **需要 Agent Teams 原生协同**：需要多实例共享任务、代理间消息与集中管理 [Claude Code Agent Teams](https://code.claude.com/docs/en/agent-teams)。
- **需要完整 Plugin Marketplace**：需要成熟的插件打包、命名空间与市场分发 [Claude Code Plugins](https://code.claude.com/docs/en/plugins)。
- **需要多表面与 Remote Control**：需要终端/IDE/桌面/浏览器/移动端全覆盖与跨设备续接 [Claude Code 平台与集成](https://code.claude.com/docs/en/platforms)。

### 什么情况选 Pi Agent

- **需要极简开源 MIT 脚手架**：希望以最小内核起步、按需用 TypeScript 扩展点自建能力，而非接受重型运行时 [Pi 扩展](https://pi-agent.org/docs/extensions)。
- **需要广覆盖的模型 Provider**：希望在一个终端工具内切换 30+ Provider（订阅 + API Key + Cloud）[Pi Providers](https://pi-agent.org/docs/providers)。
- **需要树结构会话分支试错**：需要在同一会话内 `/fork`/`/clone` 多方案并行探索，并自动为被放弃分支生成摘要 [Pi 会话](https://pi-agent.org/docs/sessions)、[Pi 上下文压缩](https://pi-agent.org/docs/context-compaction)。
- **接受「无内置沙箱」的极简哲学**：愿意依赖 OS/容器边界而非工具内置沙箱 [Pi 安全](https://pi-agent.org/docs/security)。
