# Anthropic Claude Code 对比

本页将 DeepSeek Harness（`dsh`）与 [Anthropic Claude Code](https://code.claude.com/docs/) 进行对比。所有关于 Claude Code 的结论均源自其官方文档（通过 [llms.txt](https://code.claude.com/docs/llms.txt) 索引逐页访问），并附链接可溯源；关于 dsh 的结论源自 [dsh 官方仓库](https://github.com/deepseek-ai/deepseek-harness)。

## 官方文档来源

- 官方文档首页：<https://code.claude.com/docs/>
- 官方文档索引（llms.txt）：<https://code.claude.com/docs/llms.txt>
- 概览：<https://code.claude.com/docs/en/overview>
- 扩展能力总览：<https://code.claude.com/docs/en/features-overview>
- Agent Teams：<https://code.claude.com/docs/en/agent-teams>
- 子代理：<https://code.claude.com/docs/en/sub-agents>
- Hooks：<https://code.claude.com/docs/en/hooks-guide>
- Skills：<https://code.claude.com/docs/en/skills>
- MCP：<https://code.claude.com/docs/en/mcp>
- Plugins：<https://code.claude.com/docs/en/plugins>
- Headless / Agent SDK：<https://code.claude.com/docs/en/headless>

## 架构模型

Claude Code 是 Anthropic 官方的**智能体编码工具**，可读取代码库、编辑文件、运行命令并集成开发工具，覆盖终端、IDE、桌面应用与浏览器多表面 [概览](https://code.claude.com/docs/en/overview)。核心由「会推理的模型」+「内置工具」组成，扩展层按「插入 agentic loop 的位置」划分 [扩展能力总览](https://code.claude.com/docs/en/features-overview)：

| 扩展 | 作用 |
|---|---|
| CLAUDE.md | 每次会话加载的持久上下文（项目约定） |
| Skills | 可复用的知识、工作流与可调用指令 |
| MCP | 连接外部服务与工具 |
| Subagents | 在隔离上下文中运行自有循环，返回摘要 |
| Agent teams | 协调多个独立 Claude Code 会话，共享任务与代理间消息 |
| Hooks | 在生命周期事件上触发脚本/HTTP/prompt/subagent |
| Plugins | 将 skills/hooks/subagents/MCP 打包为可安装单元 |

!!! note "与 dsh 的核心架构差异"
    Claude Code 是**闭源商业产品**，扩展通过文件约定（`.claude/` 目录、`CLAUDE.md`、`SKILL.md`）与 Plugins 机制接入一个由厂商控制的 agentic loop；dsh 是**开源 agent harness**，以 Cordis 为内核、采用「一切皆插件」架构，连 agent loop、会话日志、模型适配器本身都是可从配置替换的插件 [dsh 架构文档](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/architecture.zh.md)。

## 功能详情

### 内置工具清单

内置工具覆盖文件操作、搜索、执行与网络访问 [扩展能力总览](https://code.claude.com/docs/en/features-overview)、[How Claude Code works](https://code.claude.com/docs/en/how-claude-code-works)：

| 类别 | 工具 |
|---|---|
| 文件操作 | Read、Write、Edit |
| 搜索 | Glob（文件名模式）、Grep（基于 ripgrep 的内容搜索） |
| 执行 | Bash |
| 网络访问 | WebSearch、WebFetch |
| 任务管理 | TodoWrite |
| 子代理 | Task（委托 subagent） |

> 来源说明：内置工具清单未在单一页面集中列出，主要通过 features-overview 与 settings.json 的 `allowedTools`/`disallowedTools` 字段间接确认。

### Skills 机制

本质是 Markdown 文件（SKILL.md），含 YAML frontmatter（声明元数据）+ 正文（知识/工作流），可通过 slash 命令显式调用或由 Claude 自动加载 [Skills](https://code.claude.com/docs/en/skills)。

- **进阶式披露（progressive disclosure）**：仅在相关时加载，避免占用上下文。
- **命名空间**：插件内 skill 使用 `plugin-name:skill-name` 格式（如 `/my-plugin:review`）。
- **运行方式**：可在当前会话或隔离上下文（通过 subagent）运行。

### MCP 支持

MCP 用于连接外部服务与工具 [MCP](https://code.claude.com/docs/en/mcp)。

- **配置层级**：local（项目本地，不入 git）、project（团队共享，`.mcp.json`）、user（`~/.claude.json`）。
- **工具命名约定**：`mcp__server__tool`。
- **企业管控**：`managed-mcp.json` 文件存在时进入排他模式，仅允许企业批准的 MCP server [Managed MCP](https://docs.anthropic.com/en/docs/claude-code/settings)。

### Hooks 机制

在生命周期事件触发时执行，可运行脚本、HTTP 请求、prompt 或 subagent [Hooks Guide](https://code.claude.com/docs/en/hooks-guide)。

- **生命周期事件**：PreToolUse、PostToolUse、SessionStart、UserPromptSubmit、Stop、SubagentStop、Notification 等。
- **Hook 类型**：command（命令）、prompt（提示词注入）、agent（启动 subagent）。
- **配置**：在 settings.json 的 `hooks` 字段下，按事件类型配置 matcher 与执行体。

### Subagents

隔离的执行上下文，运行自己的循环，返回摘要结果 [Sub-agents](https://code.claude.com/docs/en/sub-agents)。

- **配置**：YAML frontmatter 声明 name、description、tools 等字段。
- **嵌套层级**：最多支持 5 层嵌套 subagent。
- **内置 subagent**：Explore（探索代码库）、Plan（规划）、general-purpose（通用）。
- **隔离机制**：独立上下文窗口，结果以摘要形式返回主会话，避免主上下文膨胀。

### Agent Teams 与 Dynamic Workflows

**Agent Teams** 用于协调多个独立的 Claude Code 会话，支持共享任务与代理间点对点消息 [Agent Teams](https://code.claude.com/docs/en/agent-teams)。适用并行研究、新功能开发、用竞争假设调试。与 subagent 区别：subagent 在单会话内隔离上下文；Agent teams 是多会话协调。

**Dynamic Workflows**：通过 subagent + agent teams + hooks 组合实现动态编排 [Agents](https://code.claude.com/docs/en/agents)。主代理可动态调度多个 subagent 并行处理；Hooks 可在工具调用前后注入逻辑。

!!! tip "dsh 子代理能力的渊源"
    dsh 的 `subagent-claude-code` 通过官方 Claude Agent SDK 调用真实 Claude Code 作为子代理运行时，`tool-subagent-control` 向模型公开子代理消息传递与列表，与 Claude Code Agent Teams 的「代理间消息」语义直接对应 [dsh subagent-claude-code/README](https://github.com/deepseek-ai/deepseek-harness/blob/master/packages/subagent/subagent-claude-code/README.md)。

### Plugins & Marketplaces

Plugin 是打包层，将 skills、hooks、subagents、MCP servers 打包成单一可安装单元 [Plugins](https://code.claude.com/docs/en/plugins)、[Plugin Marketplaces](https://code.claude.com/docs/en/plugin-marketplaces)。

- **命名空间**：插件内能力使用 `plugin-name:capability` 格式，避免冲突。
- **安装命令**：`/plugin` 命令安装与管理。
- **企业管控**：可限制 plugin marketplace 添加权限（`enabledPlugins`、`allowedMcpServers` 字段）。

### CLAUDE.md / Memory

持久化上下文，每次会话加载，用于项目约定 [Memory](https://code.claude.com/docs/en/memory)。

- **三级加载**：项目级（`CLAUDE.md` 或 `.claude/CLAUDE.md`）、用户级（`~/.claude/CLAUDE.md`）、组织级。
- **自动记忆（auto-memory）**：Claude 可在会话中自动记录关键事实到 CLAUDE.md。
- **分层加载**：多个层级合并，更具体的层级优先。

### 权限模式

控制执行敏感操作时的交互方式 [Permission Modes](https://code.claude.com/docs/en/permission-modes)：

| 模式 | 行为 |
|---|---|
| `default` | 每次敏感操作询问用户 |
| `acceptEdits` | 自动批准文件编辑 |
| `plan` | 仅规划不执行，输出计划后退出 |
| `dontAsk` | 已批准工具直接执行 |
| `bypassPermissions` | 跳过所有权限检查（CI 沙箱） |

权限规则语法：`Bash(git:*)`、`Read`、`Bash(rm -rf:*)`（deny）。

### 会话管理

会话是基本单元，拥有独立聊天历史、项目文件夹与代码变更 [Sessions](https://code.claude.com/docs/en/sessions)、[Worktrees](https://code.claude.com/docs/en/worktrees)。

- **命名/恢复/分支/导出**：可手动命名；`--resume <id>` 恢复；`--fork-session` 分支；支持导出 transcript。
- **Worktree 隔离**：`--worktree` 标志结合 git worktree 实现并行会话隔离。

### 可观测性

- **OpenTelemetry** 集成：可导出 trace 到 OTel 后端 [Monitoring](https://code.claude.com/docs/en/monitoring-usage)。
- **调试命令**：`/doctor`（诊断配置健康）、`/context`（查看上下文文件列表）、`/hooks`（查看已加载 hooks）、`/mcp`（查看 MCP server 状态）、`/usage`（查看实时用量）[Debug Your Config](https://code.claude.com/docs/en/debug-your-config)。

### 企业部署

支持多供应商、企业代理、LLM 网关与服务器托管设置 [Third Party Integrations](https://code.claude.com/docs/en/third-party-integrations)、[LLM Gateway](https://code.claude.com/docs/en/llm-gateway)。

**供应商对比**：

| 供应商 | 适用场景 | 认证 |
|---|---|---|
| Anthropic 直连 | 多数组织（推荐） | Claude.ai SSO 或 API key |
| Amazon Bedrock | AWS 原生部署 | AWS 凭据（IAM） |
| Google Vertex AI | GCP 原生部署 | GCP 凭据 |
| Microsoft Foundry | Azure 原生部署 | API key 或 Microsoft Entra ID |

**企业代理 vs LLM 网关**：企业代理（`HTTPS_PROXY`/`HTTP_PROXY`）用于流量监控/合规；LLM 网关（`ANTHROPIC_BASE_URL` 等）位于 Claude Code 与供应商之间，处理认证与路由。两者可叠加。

**服务器托管设置**：从 Anthropic 服务器经 admin console 下发，用户无法覆盖；同样支持 MDM/OS 级策略（macOS `com.anthropic.claudecode` 配置域、Windows 注册表键）。配置作用域五级优先级：Managed > 命令行 > Local > Project > User。

### Headless / Agent SDK

Agent SDK 把 CLI 的全部能力（工具、循环、上下文管理、MCP、hooks、skills、subagent）暴露为可调用函数 [Headless](https://code.claude.com/docs/en/headless)、[Agent SDK Overview](https://platform.claude.com/docs/en/agent-sdk/overview)。

- **两种语言**：TypeScript（`@anthropic-ai/claude-agent-sdk`）、Python（`claude-agent-sdk`，Python 3.10+）。
- **核心 API**：`query(prompt, options)` 返回异步迭代器，产出类型化消息对象（AssistantMessage、ToolResultMessage、ResultMessage、SystemMessage）。
- **Headless CLI（`claude -p`）vs SDK**：SDK 支持 `can_use_tool` 回调、编程式 hooks、`agents` 选项（子代理定义）等 CLI 不支持的能力。
- **运行边界标志**：`--max-turns`、`--max-budget-usd`、`--model`/`--fallback-model`、`--allowedTools`/`--permission-mode`。

## 界面/交互详情

### 终端 TUI 界面

交互式 REPL 界面 [Interactive Mode](https://code.claude.com/docs/en/interactive-mode)。

- **启动**：`claude` 命令进入交互模式。
- **配置**：`/config` 命令打开分页式 Settings 界面。
- **多行输入、流式输出**：思考过程展示（`showThinkingSummaries` 设置控制）。
- **`/effort` 命令**：low/medium/high 三档努力等级。
- **`/compact`**：压缩长对话。

### IDE 集成界面

- **VS Code**：[Visual Studio Code 集成](https://code.claude.com/docs/en/vs-code)，内嵌 Claude Code 面板，支持文件引用、diff 预览、内联编辑。
- **JetBrains IDEs**：[JetBrains IDEs 集成](https://code.claude.com/docs/en/jetbrains)（Rider、IntelliJ、PyCharm、WebStorm）。

### 桌面应用界面

Claude Desktop 应用含三个标签页 [Desktop](https://claudecode.ac.cn/docs/en/desktop)：**Chat**（日常对话）、**Cowork**（Dispatch 与长时间 Agent 任务）、**Code**（软件开发）。

**Code 标签页核心交互**：

- 会话独立隔离，侧边栏列出，可并行运行多个。
- **环境选择**：Local（本地）/ Cloud（Anthropic 云端会话）/ SSH（远程机器）。
- **面板布局**：拖拽式并排排列，支持 chat、diff、浏览器、终端、文件编辑器。
- **Diff 审查**：可视化 diff 查看、添加评论、通过 CI 监控生成的 PR。
- **应用预览**：浏览器面板中预览运行中的应用，Claude 自动验证变更。
- **iOS 模拟器**：在面板中运行并测试 iOS 应用。
- **旁聊（side chats）**：基于会话上下文提出旁支问题，不打断主会话。
- **跨会话操作**：Claude 可查看、发消息给或归档其他会话。
- **外部工具连接**：GitHub、Slack、Linear。
- **计算机使用（Computer use）**：Claude 打开应用并控制屏幕。

支持平台：macOS（Intel 与 Apple 芯片通用构建）、Windows（x64/ARM64）、Linux（apt/.deb）。

### Web 版界面（云端运行）

- **入口**：claude.ai/code [Claude Code on the web](https://code.claude.com/docs/en/web-quickstart)。
- **会话传送（Session teleportation）**：`--teleport` 标志将本地会话传送到云端继续。
- **远程会话续接**：从移动端/浏览器继续远程会话。

### 浏览器/移动端、Remote Control

- **Chrome 扩展（beta）**：[Chrome extension](https://code.claude.com/docs/en/chrome)。
- **Computer use（preview）**：[Computer use](https://code.claude.com/docs/en/computer-use)。
- **Remote Control**：从移动端发起 Dispatch 会话，继续远程会话 [Remote Control](https://code.claude.com/docs/en/remote-control)；需可信设备认证（device attestation），自定义 `ANTHROPIC_BASE_URL`（如代理）下会被隐藏。

### Slash 命令交互

- **内置命令**：`/help`、`/clear`（清空上下文）、`/compact`（压缩）、`/config`、`/agents`、`/hooks`、`/mcp`、`/doctor`、`/context`、`/usage`、`/model`、`/effort`、`/plugin`、`/login`、`/logout` [Interactive Mode](https://code.claude.com/docs/en/interactive-mode)、[Slash Commands](https://code.claude.com/docs/en/slash-commands)。
- **自定义 slash 命令**：通过 Skills 或 custom commands 实现。

### Agent View

可视化代理工作流的界面概念 [Agents](https://code.claude.com/docs/en/agents)：

- 主代理调度多个 subagent 的可视化。
- Agent teams 多会话协调的可视化展示。
- 动态工作流（dynamic workflows）的实时进度。

### 可视化元素

- **Diff 视图**：可视化代码变更、添加评论。
- **浏览器面板**：应用预览、外部网站浏览、操作批准。
- **iOS 模拟器面板**：iOS 应用运行与测试。
- **思考摘要（thinking summaries）**：`showThinkingSummaries` 设置控制显示。
- **面板布局**：拖拽式并排排列（chat、diff、浏览器、终端、文件编辑器）。

### 权限询问交互

- **default 模式**：敏感操作弹出询问，用户选择允许/拒绝/允许并记住。
- **acceptEdits**：自动批准文件编辑，不再询问。
- **plan**：仅规划不执行，输出计划后退出。
- **bypassPermissions**：跳过所有检查（CI 沙箱）[Permission Modes](https://code.claude.com/docs/en/permission-modes)。

### Routines

云端基础设施执行的定时/触发式任务 [Routines](https://code.claude.com/docs/en/routines)。

- **触发方式**：定时（cron 式）、API 调用、GitHub 事件（如 issue 创建、PR 提交）。
- **执行环境**：Anthropic 云端基础设施。
- **典型场景**：从手机提交 GitHub issue → Claude 实现功能 → 开 PR → 跑测试 → 上线。

## 与 dsh 的核心差异

| 维度 | Claude Code | dsh |
|---|---|---|
| 架构 | 闭源商业，agentic loop 由厂商控制 | 开源 MIT，一切皆插件，agent loop 可替换 [dsh 架构](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/architecture.zh.md) |
| 子代理后端 | 仅 Claude Code 自身 | **多后端**：Claude Code/Codex/ACP/dsh-sdk/进程内 spawn/fork [dsh subagent/README](https://github.com/deepseek-ai/deepseek-harness/blob/master/packages/subagent/README.md) |
| 代理间消息 | Agent Teams 原生支持 [Agent Teams](https://code.claude.com/docs/en/agent-teams) | `tool-subagent-control` 提供 [dsh subagent/README](https://github.com/deepseek-ai/deepseek-harness/blob/master/packages/subagent/README.md) |
| 生态对齐 | 自有生态 | hooks 桥接（`hooks-claude-code`）、MCP 工具命名形状对齐、文件搜索参数对齐 [dsh hooks/README](https://github.com/deepseek-ai/deepseek-harness/blob/master/packages/hooks/README.md) |
| 界面 | 终端/IDE/桌面/Web/浏览器/移动多表面 | 本地 Web UI，无桌面/移动/云端 |
| 企业部署 | Bedrock/Vertex/Foundry/网关/托管设置/OTLP [企业部署](https://code.claude.com/docs/en/third-party-integrations) | 无（developer preview） |
| 可观测性 | OpenTelemetry/`/doctor` | append-only JSONL，「Model-visible ⟺ logged」强不变量 [dsh AGENTS.md](https://github.com/deepseek-ai/deepseek-harness/blob/master/AGENTS.md) |
| 许可证 | 闭源商业，需订阅或 API Key [概览](https://code.claude.com/docs/en/overview) | MIT 完全开源 [dsh README](https://github.com/deepseek-ai/deepseek-harness/blob/master/README.md) |

## Claude Code 的相对优势

1. **Agent Teams 原生协同**：多实例共享任务、代理间消息与集中管理 [Agent Teams](https://code.claude.com/docs/en/agent-teams)。
2. **企业级部署**：支持 Bedrock/Vertex/Foundry、自托管网关、托管设置、OTLP 遥测 [企业部署](https://code.claude.com/docs/en/third-party-integrations)。
3. **多表面与 Remote Control**：终端/IDE/桌面/浏览器/移动端全覆盖，支持跨设备续接会话 [平台与集成](https://code.claude.com/docs/en/platforms)、[Remote Control](https://code.claude.com/docs/en/remote-control)。
4. **桌面应用三标签页**：Chat/Cowork/Code，拖拽式面板布局，含 diff 审查、应用预览、iOS 模拟器、旁聊 [Desktop](https://claudecode.ac.cn/docs/en/desktop)。
5. **Plugin Marketplace**：成熟的插件打包、命名空间与市场分发 [Plugins](https://code.claude.com/docs/en/plugins)。
6. **Routines 云端定时任务**：cron/API/GitHub 事件触发 [Routines](https://code.claude.com/docs/en/routines)。
7. **Agent SDK**：TypeScript/Python 编程式调用，`can_use_tool` 回调与编程式 hooks [Headless](https://code.claude.com/docs/en/headless)。

## Claude Code 的缺陷 / 弊端

1. **闭源且绑定订阅**：核心运行时不开源，使用受订阅计划与功能可用性约束 [Feature availability](https://code.claude.com/docs/en/feature-availability)。
2. **子代理后端单一**：子代理仅能运行 Claude Code 自身，无法像 dsh 那样在 Claude Code/Codex/ACP/dsh-sdk/进程内之间选择后端 [dsh subagent/README](https://github.com/deepseek-ai/deepseek-harness/blob/master/packages/subagent/README.md)。
3. **核心不可替换**：agent loop、会话日志等核心由厂商控制，无法从配置替换 [dsh 架构文档](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/architecture.zh.md)。
4. **无 MIT 自托管路径**：无法在完全自主可控的开源协议下二次开发与分发。
5. **企业能力依赖厂商基础设施**：网关、托管设置等企业能力需对接 Anthropic 或云厂商服务 [企业部署](https://code.claude.com/docs/en/third-party-integrations)。
6. **无 append-only traceable session log 不变量**：可观测性以 OpenTelemetry/`/doctor` 为主，未声明类似 dsh 的「Model-visible ⟺ logged」强不变量 [dsh AGENTS.md](https://github.com/deepseek-ai/deepseek-harness/blob/master/AGENTS.md)。
