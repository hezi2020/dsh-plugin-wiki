# OpenAI Codex CLI 对比

本页将 DeepSeek Harness（`dsh`）与 [OpenAI Codex CLI](https://github.com/openai/codex) 进行对比。所有关于 Codex CLI 的结论均源自其官方仓库与官方文档站（developers.openai.com/codex），并附链接可溯源；关于 dsh 的结论源自 [dsh 官方仓库](https://github.com/deepseek-ai/deepseek-harness)。

## 官方文档来源

- 官方代码仓库：<https://github.com/openai/codex>
- 官方文档首页：<https://developers.openai.com/codex>
- CLI 概览：<https://developers.openai.com/codex/cli>
- Skills：<https://developers.openai.com/codex/skills>
- MCP：<https://developers.openai.com/codex/mcp>
- Subagents：<https://developers.openai.com/codex/subagents>
- Hooks：<https://developers.openai.com/codex/hooks>
- Plugins：<https://developers.openai.com/codex/plugins>
- 沙箱与审批：<https://developers.openai.com/codex/agent-approvals-security>
- 非交互模式：<https://developers.openai.com/codex/noninteractive>
- IDE 扩展：<https://developers.openai.com/codex/ide>
- 桌面应用：<https://developers.openai.com/codex/app>
- 更新日志：<https://developers.openai.com/codex/changelog>

## 架构模型

Codex CLI 是 OpenAI 推出的**本地终端编码代理（coding agent）**，在用户计算机上本地运行，主要由 Rust 构建（仓库中 Rust 占比 96.1%）[官方仓库](https://github.com/openai/codex)。核心链路：在仓库目录启动 `codex` → 读取工作区、Git 状态与 `AGENTS.md` → 自然语言描述任务 → 搜索文件、分析代码、制定修改方案 → 在权限允许范围内编辑文件与运行命令 → 输出可审查的变更 [CLI 概览](https://developers.openai.com/codex/cli)。

其 `codex-rs/` 仓库下按功能拆分为众多 Rust crate（`core`、`tui`、`exec`、`mcp-server`、`sandboxing`、`hooks`、`skills`、`plugin`、`app-server` 等），整体仍是一个由厂商维护的单体二进制 [官方仓库 codex-rs](https://github.com/openai/codex/tree/main/codex-rs)。

Codex 提供多种表面 [CLI 概览](https://developers.openai.com/codex/cli)：

| 表面 | 说明 |
|---|---|
| 终端 CLI | 核心 `codex` 命令，交互式 TUI |
| IDE 扩展 | VS Code、Cursor、Windsurf、JetBrains IDEs |
| 桌面应用 | `codex app`，macOS/Windows 原生应用 |
| Codex Cloud | 云端代理（chatgpt.com/codex），可从 CLI/IDE 委托 |

!!! note "与 dsh 的核心架构差异"
    Codex CLI 是一个由厂商维护的**单体本地代理**，核心用 Rust 构建、以二进制分发；dsh 是**开源 agent harness**，以 Cordis（TypeScript）为内核，采用「一切皆插件」架构，agent loop、会话日志、模型适配器均可从配置替换 [dsh 架构文档](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/architecture.zh.md)。两者都读取 `AGENTS.md` 作为项目指令，但 dsh 进一步把指令约定上升为仓库级不变量 [dsh AGENTS.md](https://github.com/deepseek-ai/deepseek-harness/blob/master/AGENTS.md)。

## 功能详情

### 内置工具与能力

Codex CLI 内置工具覆盖文件操作、执行、搜索、网络访问与代理编排 [CLI 概览](https://developers.openai.com/codex/cli)、[Non-interactive](https://developers.openai.com/codex/noninteractive)：

| 类别 | 工具/能力 |
|---|---|
| 文件操作 | `apply_patch`（统一编辑/创建/删除文件） |
| 执行 | `Bash`（shell 命令） |
| 搜索 | 文件搜索（`file-search` crate）、代码库探索 |
| 网络访问 | `WebSearch`（cached/live 两种模式） |
| 图像 | 图片输入、图像生成 |
| 代理编排 | subagent 生成、`spawn_agents_on_csv`（CSV 批处理） |
| 代码审查 | 本地代码审查（独立 agent 审查 PR） |
| 云任务 | Codex Cloud 任务启动与 diff 应用 |

> 来源说明：内置工具未在单一页面集中列出，主要通过 hooks 的 matcher、approval 策略与 non-interactive 的 item 类型（command_execution、agent_message、file changes、MCP tool calls、web searches、plan updates）间接确认 [Hooks matcher](https://developers.openai.com/codex/hooks#matcher-patterns)、[Non-interactive JSON](https://developers.openai.com/codex/noninteractive#make-output-machine-readable)。

### Skills 机制

本质是 `SKILL.md` 文件 + 可选脚本/资源目录，遵循 [open agent skills standard](https://agentskills.io/) [Skills](https://developers.openai.com/codex/skills)。

- **进阶式披露（progressive disclosure）**：初始仅加载 name/description/路径，上限约模型上下文窗口的 2%（未知时为 8000 字符）；选中后才读取完整 `SKILL.md`。
- **两种调用方式**：显式（`/skills` 或 `$skill` 提及）与隐式（任务匹配 description 时自动选择）。
- **作用域**：`REPO`（`.agents/skills`，逐级向上到仓库根）、`USER`（`$HOME/.agents/skills`）、`ADMIN`（`/etc/codex/skills`）、`SYSTEM`（内置）。
- **启用/禁用**：`~/.codex/config.toml` 的 `[[skills.config]]` 表项。
- **插件打包**：skill 可打包进 plugin 分发，plugin 可同时包含 skills、apps、MCP servers。
- **元数据**：`agents/openai.yaml` 可配置 UI 显示、调用策略（`allow_implicit_invocation`）与工具依赖。
- **内置 skill**：`$skill-creator`（创建 skill 向导）、`$skill-installer`（安装 curated skill）、plan skills 等。

### MCP 支持

支持 STDIO 与 Streamable HTTP 两种传输，并支持 OAuth 认证（`codex mcp login`）[MCP](https://developers.openai.com/codex/mcp)。

- **配置位置**：`~/.codex/config.toml`（用户级）或 `.codex/config.toml`（项目级，需 trusted）。
- **配置方式**：CLI（`codex mcp add`）或直接编辑 `[mcp_servers.<name>]` 表。
- **STDIO 字段**：`command`、`args`、`env`、`env_vars`、`cwd`、`experimental_environment`（远程执行）。
- **HTTP 字段**：`url`、`bearer_token_env_var`、`http_headers`、`env_http_headers`。
- **工具策略**：`enabled_tools`/`disabled_tools`、`default_tools_approval_mode`（`auto`/`prompt`/`approve`）、`tools.<tool>.approval_mode`。
- **企业管控**：`required = true` 时 server 启动失败会导致整个会话失败；`enabled = false` 可禁用。
- **插件 MCP**：plugin 可在 manifest 中声明 MCP server，用户配置仅控制开关与工具策略。
- **CLI 与 IDE 共享配置**：一次配置，CLI 与 IDE 扩展共享。

### Hooks 机制

在生命周期事件触发时执行确定性脚本（command 类型），是扩展 Codex agentic loop 的主要框架 [Hooks](https://developers.openai.com/codex/hooks)。

- **生命周期事件**：`SessionStart`、`SubagentStart`、`PreToolUse`、`PermissionRequest`、`PostToolUse`、`PreCompact`、`PostCompact`、`UserPromptSubmit`、`SubagentStop`、`Stop`。
- **Hook 类型**：目前仅 `command` 类型实际运行；`prompt` 与 `agent` 类型被解析但跳过。
- **配置位置**：`~/.codex/hooks.json`、`~/.codex/config.toml`（inline `[hooks]`）、`<repo>/.codex/hooks.json`、`<repo>/.codex/config.toml`、plugin manifest。
- **信任审查**：非 managed hook 必须先经 `/hooks` 审查并信任（按 hook 当前 hash 记录），变更后需重新信任；`--dangerously-bypass-hook-trust` 可跳过。
- **Matcher 模式**：正则过滤，按事件不同过滤 tool name（`Bash`/`apply_patch`/`Edit`/`Write`/`mcp__server__tool`）、compaction trigger（`manual`/`auto`）、start source（`startup`/`resume`/`clear`/`compact`）、subagent type 等。
- **输入/输出**：hook 通过 stdin 接收 JSON（含 `session_id`、`cwd`、`hook_event_name`、`model`、`permission_mode` 等），通过 stdout 返回 JSON（`continue`、`stopReason`、`systemMessage`、`hookSpecificOutput`）。
- **PreToolUse 拦截**：可 deny 工具调用（`permissionDecision: "deny"`），但仅拦截简单 shell 调用、`apply_patch`、MCP 工具，不拦截 `WebSearch` 等。
- **Managed hooks**：来自 `requirements.toml`、MDM、cloud 的 hook 标记为 managed，按策略信任，用户不可禁用；`allow_managed_hooks_only = true` 可强制仅运行 managed hook。
- **Plugin hooks**：plugin 可通过 manifest 的 `hooks` 字段或默认 `hooks/hooks.json` 打包 hook；安装 plugin 不会自动信任其 hook。
- **Windows 支持**：`command_windows`/`commandWindows` 字段提供 Windows 专用命令覆盖。

### Subagents

Codex 可并行生成专门的 subagent 并收集结果 [Subagents](https://developers.openai.com/codex/subagents)。

- **启用**：默认启用；仅在用户显式要求时才生成（避免无谓 token 消耗）。
- **编排**：Codex 负责生成、路由后续指令、等待结果、关闭 agent 线程；多 agent 并行时等待全部完成再返回合并响应。
- **管理命令**：`/agent` 切换/查看活动 agent 线程；可直接要求 Codex steer/stop/close 线程。
- **审批与沙箱继承**：subagent 继承当前沙箱策略；父轮次的运行时覆盖（如 `/permissions`、`--yolo`）会传递给子 agent；非交互流中无法弹出审批时该操作失败并回传父工作流。
- **全局配置**：`agents.max_threads`（默认 6）、`agents.max_depth`（默认 1，允许直接子 agent 但禁止更深嵌套）、`agents.job_max_runtime_seconds`（CSV 任务默认超时 1800s）。
- **内置 agent**：`default`（通用）、`worker`（执行导向）、`explorer`（只读探索）。
- **Custom agents**：`~/.codex/agents/`（个人）或 `.codex/agents/`（项目）下的 TOML 文件，必填 `name`/`description`/`developer_instructions`，可选 `nickname_candidates`/`model`/`model_reasoning_effort`/`sandbox_mode`/`mcp_servers`/`skills.config`。
- **CSV 批处理（实验性）**：`spawn_agents_on_csv` 工具，每行生成一个 worker，导出合并结果 CSV；每个 worker 必须调用 `report_agent_job_result` 一次。
- **可见性**：目前在 Codex app 与 CLI 中可见，IDE 扩展即将支持。

### Plugins & Marketplaces

Plugin 是打包层，将 skills、apps（连接器）、MCP servers 打包成单一可安装单元 [Plugins](https://developers.openai.com/codex/plugins)、[Build plugins](https://developers.openai.com/codex/plugins/build)。

- **Plugin 内容**：skills（可复用指令）、apps（GitHub/Slack/Google Drive 等连接）、MCP servers。
- **安装入口**：Codex app 的 Plugin Directory、CLI 的 `codex /plugins` 命令。
- **Marketplace**：支持 repo marketplace（项目/团队共享）、workspace 共享、OpenAI curated。
- **调用方式**：直接描述任务让 Codex 选择，或用 `@` 显式调用 plugin/skill。
- **权限**：安装 plugin 不绕过既有 approval 设置；外部服务受自身认证与隐私策略约束。
- **禁用**：`~/.codex/config.toml` 中 `[plugins."<name>@<marketplace>"] enabled = false`。
- **Sites plugin**：特殊 plugin，可构建并部署托管网站/Web 应用/游戏。
- **Record & Replay**：展示一次工作流并转为可复用 skill。
- **Codex Security plugin**：扫描授权代码并确认漏洞。

### AGENTS.md / Memory

- **AGENTS.md**：Codex 读取项目根的 `AGENTS.md` 作为项目指令；曾实验子目录 AGENTS.md（`child_agents_md`），后移除 [官方仓库 docs/agents_md.md](https://github.com/openai/codex/blob/main/docs/agents_md.md)。
- **Memories**：Codex 将 memory 运行时状态迁入专用 SQLite 数据库（`memories` crate）[官方更新日志](https://developers.openai.com/codex/changelog)。
- **项目信任**：`.codex/` 项目层需被信任后才加载 project-local hooks 与配置。

dsh 的对应：dsh 同样读取 `AGENTS.md`，并进一步把指令约定上升为仓库级不变量 [dsh AGENTS.md](https://github.com/deepseek-ai/deepseek-harness/blob/master/AGENTS.md)。

### 权限/审批模式

安全控制由「沙箱模式」+「审批策略」两层组成 [Agent approvals & security](https://developers.openai.com/codex/agent-approvals-security)。

**沙箱模式（`--sandbox`）**：

| 模式 | 行为 |
|---|---|
| `read-only` | 仅读文件，不可编辑/运行命令/联网 |
| `workspace-write` | 默认；可读写工作区、运行命令，默认无网络 |
| `danger-full-access` | 无沙箱限制（`--yolo` 别名，不推荐） |

**审批策略（`--ask-for-approval`）**：

| 策略 | 行为 |
|---|---|
| `on-request` | 默认；离开沙箱、联网、运行非可信命令时询问 |
| `untrusted` | 仅自动运行已知安全的读操作，其余均询问 |
| `never` | 不询问（配合 `read-only` 用于 CI） |
| `granular` | 细粒度，按类别（sandbox/rules/mcp/request_permissions/skill）分别配置 |

**常见组合**：

| 意图 | 标志/配置 | 效果 |
|---|---|---|
| Auto（预设） | 无标志 或 `--sandbox workspace-write --ask-for-approval on-request` | 工作区内自动读写，越界/联网询问 |
| 只读浏览 | `--sandbox read-only --ask-for-approval on-request` | 仅读，编辑/命令/联网均询问 |
| CI 只读 | `--sandbox read-only --ask-for-approval never` | 仅读，从不询问 |
| 自动审查 | `approvals_reviewer = "auto_review"` | 合格审批请求由审查 agent 代替用户审查 |

**Auto-review**：`approvals_reviewer = "auto_review"` 将合格审批请求路由到审查 agent，按数据外泄/凭证探测/安全削弱/破坏性策略评估风险等级 [Auto-review](https://developers.openai.com/codex/concepts/sandboxing/auto-review)。

**网络访问**：默认关闭；`[sandbox_workspace_write] network_access = true` 开启；`[features.network_proxy]` 提供域名级策略（allow/deny，支持通配符 `*`/`**`），含 DNS 重绑定保护、本地/私网目标阻断、SOCKS5 支持 [Network access](https://developers.openai.com/codex/agent-approvals-security#network-access)。

**Web 搜索**：`web_search = "cached"`（默认，OpenAI 维护的索引）/`"live"`/`"disabled"`；`--yolo` 或全访问沙箱下默认 live。

**受保护路径**：`workspace-write` 下 `.git`、`.agents`、`.codex` 目录递归只读。

### 沙箱机制

- **平台沙箱**：OS 级强制（Linux Landlock/seccomp、macOS sandbox-exec、Windows AppContainer）[Sandboxing](https://developers.openai.com/codex/sandbox)。
- **Windows 实验性沙箱**：基于 AppContainer restricted token，按需授予文件系统 capability SID，禁用出站网络（覆盖代理环境变量 + 插入 stub 可执行）；限制是无法阻止 `Everyone` SID 已有写权限的目录写入 [Windows experimental sandbox](https://developers.openai.com/codex/sandbox#windows-experimental-sandbox)。
- **Codex Cloud**：OpenAI 管理的隔离容器，两阶段运行（setup 阶段可联网装依赖，agent 阶段默认离线，secrets 仅在 setup 阶段可用）。
- **Python SDK presets**：友好的沙箱预设 [官方更新日志](https://developers.openai.com/codex/changelog)。

dsh 的沙箱对比：

- dsh 含 `native/node-addon-landlock-run`（Linux Landlock）与 `e2b`（E2B 沙箱 POC）[dsh AGENTS.md](https://github.com/deepseek-ai/deepseek-harness/blob/master/AGENTS.md)。
- !!! warning "dsh 沙箱的平台限制"
    dsh 的原生 Landlock 沙箱仅适用于 Linux；Windows 上原生模块受限 [dsh AGENTS.md](https://github.com/deepseek-ai/deepseek-harness/blob/master/AGENTS.md)。Codex CLI 在 Windows 原生支持（AppContainer + WSL2）上更成熟 [Sandboxing](https://developers.openai.com/codex/sandbox)。

### 会话管理

- **会话持久化**：rollout 文件存储到 `~/.codex/sessions/`（`rollout`/`rollout-trace` crate）。
- **恢复/分支**：`codex exec resume --last`、`codex exec resume <SESSION_ID>` [Non-interactive resume](https://developers.openai.com/codex/noninteractive#resume-a-non-interactive-session)。
- **临时会话**：`codex exec --ephemeral` 不持久化 rollout。
- **Worktree 隔离**：Codex app 内置 Git worktree 支持，多线程并行变更隔离 [App worktrees](https://developers.openai.com/codex/app/worktrees)。
- **Git 仓库要求**：`codex exec` 默认要求在 Git 仓库内运行（`--skip-git-repo-check` 可跳过）。

### 可观测性

- **`codex doctor`**：报告环境、Git、终端、app-server 与线程清单等诊断信息 [官方更新日志](https://developers.openai.com/codex/changelog)。
- **SQLite memory**：memory 运行时状态迁入专用 SQLite 数据库 [官方更新日志](https://developers.openai.com/codex/changelog)。
- **Tracing/verbose logging**：提供 tracing 能力 [官方仓库 README](https://github.com/openai/codex)。
- **`/status`**：查看当前工作区包含的目录。
- **`/hooks`**：查看、审查、信任、禁用 hook。
- **`/mcp`**：查看活动 MCP server。
- **`/agent`**：查看活动 subagent 线程。

dsh 的可观测性以 **append-only session log** 为核心：

- 会话数据持久化为 JSONL，采用显式组合语义检查点策略 [dsh Python SDK README](https://github.com/deepseek-ai/deepseek-harness/blob/master/python/sdk/README.zh.md)。
- 「Model-visible ⟺ logged」不变量：任何到达模型请求的内容都必须可从会话日志重建 [dsh AGENTS.md](https://github.com/deepseek-ai/deepseek-harness/blob/master/AGENTS.md)。

### Non-interactive / CI 模式

`codex exec` 用于脚本与 CI，无 TUI [Non-interactive](https://developers.openai.com/codex/noninteractive)。

- **基本用法**：`codex exec "<task>"`，进度到 stderr，最终消息到 stdout。
- **JSON Lines 输出**：`--json` 输出 JSONL 流（`thread.started`/`turn.started`/`item.*`/`turn.completed` 等）。
- **结构化输出**：`--output-schema ./schema.json` 强制最终响应符合 JSON Schema。
- **stdin 管道**：`prompt-plus-stdin`（prompt 参数 + piped context）、`codex exec -`（stdin 即完整 prompt）。
- **认证**：默认复用 CLI 认证；CI 推荐 `CODEX_API_KEY`（仅 `codex exec` 支持）或 [Codex GitHub Action](https://github.com/openai/codex-action)。
- **沙箱默认**：`codex exec` 默认 `read-only`；`--sandbox workspace-write` 允许编辑；`--full-auto` 已废弃。
- **忽略配置**：`--ignore-user-config`（不加载用户 config）、`--ignore-rules`（跳过 execpolicy `.rules`）。
- **GitHub Action**：`openai/codex-action` 启动安全代理，减少 API key 暴露。

### 企业部署

- **Managed configuration**：`requirements.toml` 定义 managed hooks、`allow_managed_hooks_only`、`experimental_network` 等企业策略 [Managed configuration](https://developers.openai.com/codex/enterprise/managed-configuration)。
- **Auto-review policy**：`guardian_policy_config` 可替换默认审查策略的租户特定部分。
- **MDM**：macOS 配置域、Windows 注册表键支持下发。
- **Codex Security**：独立产品，扫描连接的 GitHub 仓库 [Codex Security](https://developers.openai.com/codex/security)。
- **Codex Cloud**：OpenAI 管理的隔离容器，适合无本地运行环境的团队。

## 界面/交互详情

### 终端 TUI 界面

交互式终端 UI（`tui` crate）[CLI 概览](https://developers.openai.com/codex/cli)。

- **启动**：`codex` 进入交互模式，首次运行提示登录。
- **`/model`**：切换模型。
- **`/permissions`**：切换沙箱/审批模式（如 `read-only`）。
- **`/status`**：查看工作区目录。
- **`/hooks`**：查看、审查、信任、禁用 hook。
- **`/mcp`**：查看活动 MCP server。
- **`/agent`**：切换/查看活动 subagent 线程。
- **`/skills`** 或 `$`**：调用 skill。
- **`@`**：显式调用 plugin/skill。
- **`/plugins`**：打开 plugin 浏览器（`codex /plugins`）。
- **审批交互**：subagent 审批请求可从非活动线程弹出，按 `o` 打开该线程后再审批；显示源线程标签。
- **图像**：支持截图/设计稿作为输入，支持图像生成。
- **代码审查**：独立 agent 审查当前分支变更。
- **Web 搜索**：内置 Web 搜索工具。

### IDE 集成界面

支持 VS Code 及其 fork（Cursor、Windsurf）与 JetBrains IDEs（Rider、IntelliJ、PyCharm、WebStorm）[IDE 扩展](https://developers.openai.com/codex/ide)。

- **安装位置**：VS Code 默认右侧边栏；Cursor/Windsurf 需手动拖到右侧边栏。
- **JetBrains**：独立安装包，支持 ChatGPT/API key/JetBrains AI 订阅登录。
- **Prompt 上下文**：开放文件、选区、`@file` 引用。
- **模型切换**：默认模型或切换其他模型。
- **推理努力**：`low`/`medium`/`high`。
- **审批模式**：`Chat`/`Agent`/`Agent (Full Access)`。
- **云委托**：长任务委托 Codex Cloud，监控进度并审查结果。
- **云任务跟进**：预览云变更、要求跟进、本地应用 diff。
- **键盘快捷键**：可在 IDE 设置中绑定命令。
- **Slash 命令**：见 [IDE slash commands](https://developers.openai.com/codex/ide/slash-commands)。
- **与 CLI 共享配置**：MCP 配置在 CLI 与 IDE 间共享。

### 桌面应用界面（Codex app）

macOS/Windows 原生桌面应用，是多线程并行的命令中心 [Codex app](https://developers.openai.com/codex/app)。

- **多项目并行**：项目线程并排，快速切换。
- **Worktrees**：内置 Git worktree，并行代码变更隔离。
- **远程连接**：ChatGPT 移动端发起、steer、审批、审查 Codex 工作 [Remote connections](https://developers.openai.com/codex/remote-connections)。
- **Computer use**：Codex 使用 macOS 应用进行 GUI 任务、浏览器流程、原生应用测试 [Computer use](https://developers.openai.com/codex/app/computer-use)。
- **Appshots**：将最前 Mac 应用窗口截图 + 可用文本发送给 Codex [Appshots](https://developers.openai.com/codex/appshots)。
- **审查与发布**：检查 diff、处理 PR 反馈、暂存文件、提交、推送 [Review and ship](https://developers.openai.com/codex/app/review)。
- **集成终端**：每个线程运行命令、启动可重复项目动作。
- **内置浏览器**：打开渲染页面、留评论、让 Codex 操作本地浏览器流程 [In-app browser](https://developers.openai.com/codex/app/browser)。
- **Chrome 扩展**：让 Codex 使用 Chrome 执行已登录浏览器任务 [Chrome extension](https://developers.openai.com/codex/app/chrome-extension)。
- **图像生成**：在线程中生成/编辑图片。
- **Automations**：定时/触发式任务（类似 cron）[Automations](https://developers.openai.com/codex/app/automations)。
- **Skills**：跨 app/CLI/IDE 复用指令与工作流。
- **侧边栏与 artifacts**：跟踪计划、来源、任务摘要、生成文件预览。
- **Plugins**：连接 apps、skills、MCP servers。
- **Sites**：构建并部署托管网站/Web 应用/游戏。
- **IDE 扩展同步**：跨 app 与 IDE 会话共享 Auto Context 与活动线程。

### Web 版界面（Codex Cloud）

- **入口**：chatgpt.com/codex [CLI 概览](https://developers.openai.com/codex/cli)。
- **两阶段运行**：setup 阶段可联网装依赖，agent 阶段默认离线。
- **委托方式**：从 CLI/IDE 委托长任务到 Cloud，监控进度并审查 diff。
- **环境隔离**：OpenAI 管理的隔离容器，无主机访问。
- **互联网访问**：默认关闭，可开启全互联网或域名白名单 [Cloud internet access](https://developers.openai.com/codex/cloud/internet-access)。
- **Secrets**：仅 setup 阶段可用，agent 阶段前移除。

### 移动端 / Remote Control

- **ChatGPT 移动端**：发起、steer、审批、审查 Codex 工作 [Remote connections](https://developers.openai.com/codex/remote-connections)。
- **需可信设备认证**：device attestation。

### Slash 命令交互

- **内置命令**：`/model`、`/permissions`、`/status`、`/hooks`、`/mcp`、`/agent`、`/skills`、`/plugins`、`/mcp login` 等 [CLI 概览](https://developers.openai.com/codex/cli)。
- **Skill 调用**：`$skill` 或 `/skills`。
- **Plugin 调用**：`@plugin` 或 `@skill`。
- **MCP 管理**：`codex mcp add/list/remove`、`codex mcp login <server>`。
- **IDE slash 命令**：见 [IDE slash commands](https://developers.openai.com/codex/ide/slash-commands)。

### 审批/权限交互

- **审批弹窗**：显示操作详情、源线程标签（subagent 场景），按 `o` 打开线程后审批。
- **Auto-review**：`approvals_reviewer = "auto_review"` 时合格请求由审查 agent 代替用户审查，显示 Reviewing/Approved/Denied/Aborted/Timed out 状态与风险等级。
- **受保护路径**：`.git`/`.agents`/`.codex` 递归只读。
- **网络策略**：`network_proxy` 域名白名单/黑名单，DNS 重绑定保护。
- **MCP 工具策略**：`default_tools_approval_mode`/`tools.<tool>.approval_mode`。

### 可视化元素

- **Diff 视图**：检查代码变更、处理 PR 反馈、暂存/提交/推送。
- **Worktree 隔离**：并行代码变更可视化。
- **Sidebar artifacts**：计划、来源、任务摘要、生成文件预览。
- **Plugin Directory**：分组浏览（OpenAI curated/workspace 共享/自建）。
- **Appshots**：Mac 应用窗口截图发送。
- **Computer use**：GUI 任务可视化。
- **内置浏览器**：渲染页面预览、评论。
- **Auto-review 状态**：Reviewing/Approved/Denied/Aborted/Timed out + 风险等级。

## 与 dsh 的核心差异

| 维度 | Codex CLI | dsh |
|---|---|---|
| 架构 | 单体 Rust 二进制，厂商维护 | 开源 MIT，一切皆插件，agent loop 可替换 [dsh 架构](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/architecture.zh.md) |
| 扩展模型 | 配置型扩展（MCP/Hooks/Skills/Plugins） | 插件即副作用，注册返回 disposer，可卸载撤销 [dsh AGENTS.md](https://github.com/deepseek-ai/deepseek-harness/blob/master/AGENTS.md) |
| 子代理后端 | 仅 Codex 自身 | **多后端**：Claude Code/Codex/ACP/dsh-sdk/进程内 spawn/fork [dsh subagent/README](https://github.com/deepseek-ai/deepseek-harness/blob/master/packages/subagent/README.md) |
| 沙箱 | OS 级（Landlock/sandbox-exec/AppContainer）+ network_proxy + Codex Cloud 隔离 | Linux Landlock + E2B POC，Windows 受限 [dsh AGENTS.md](https://github.com/deepseek-ai/deepseek-harness/blob/master/AGENTS.md) |
| Windows 原生 | 成熟（AppContainer + WSL2） | 受限（原生模块受限）[dsh AGENTS.md](https://github.com/deepseek-ai/deepseek-harness/blob/master/AGENTS.md) |
| 界面 | 终端/IDE/桌面/Web/移动多表面 | 本地 Web UI，无桌面/移动/云端 |
| 可观测性 | `codex doctor`/SQLite memory/tracing | append-only JSONL，「Model-visible ⟺ logged」强不变量 [dsh AGENTS.md](https://github.com/deepseek-ai/deepseek-harness/blob/master/AGENTS.md) |
| 企业部署 | managed configuration/MDM/Codex Security/Codex Cloud | 无（developer preview） |
| 许可证 | Apache-2.0（含专利授权条款） | MIT（更简洁宽松） [dsh README](https://github.com/deepseek-ai/deepseek-harness/blob/master/README.md) |

## Codex CLI 的相对优势

1. **多表面成熟度高**：终端、IDE（VS Code/Cursor/Windsurf/JetBrains）、桌面应用、Codex Cloud、移动端 Remote Control 齐备，且与 ChatGPT 计划深度集成 [CLI 概览](https://developers.openai.com/codex/cli)、[IDE 扩展](https://developers.openai.com/codex/ide)、[Codex app](https://developers.openai.com/codex/app)。
2. **跨平台原生沙箱**：OS 级强制（Landlock/sandbox-exec/AppContainer）+ network_proxy 域名策略 + DNS 重绑定保护 + Codex Cloud 隔离容器，Windows 原生支持成熟 [Agent approvals & security](https://developers.openai.com/codex/agent-approvals-security)、[Sandboxing](https://developers.openai.com/codex/sandbox)。
3. **Rust 二进制分发**：单二进制安装，无需 Node.js 运行时，启动轻量 [官方仓库](https://github.com/openai/codex)。
4. **Subagents 生态完善**：内置 default/worker/explorer、custom agents TOML、CSV 批处理、`/agent` 管理、审批与沙箱继承 [Subagents](https://developers.openai.com/codex/subagents)。
5. **Hooks 框架成熟**：10 个生命周期事件、managed hooks、plugin hooks、信任审查、Windows 命令覆盖 [Hooks](https://developers.openai.com/codex/hooks)。
6. **Plugin Marketplace**：成熟的 plugin 打包（skills+apps+MCP）、marketplace 分发、OpenAI curated 目录 [Plugins](https://developers.openai.com/codex/plugins)。
7. **`codex doctor` 诊断**：提供环境与线程清单诊断，便于排障 [官方更新日志](https://developers.openai.com/codex/changelog)。
8. **Auto-review**：`approvals_reviewer = "auto_review"` 将合格审批路由到审查 agent，按风险等级自动决策 [Auto-review](https://developers.openai.com/codex/concepts/sandboxing/auto-review)。
9. **Codex Cloud 两阶段运行**：setup 阶段联网装依赖，agent 阶段默认离线，secrets 仅 setup 阶段可用 [Codex Cloud](https://developers.openai.com/codex/cloud/internet-access)。
10. **Non-interactive 与 CI 集成**：`codex exec` + `--json` JSONL 流 + `--output-schema` 结构化输出 + GitHub Action [Non-interactive](https://developers.openai.com/codex/noninteractive)。
11. **Computer use 与 Appshots**：Codex app 可控制 macOS GUI、发送最前窗口截图 [Computer use](https://developers.openai.com/codex/app/computer-use)、[Appshots](https://developers.openai.com/codex/appshots)。
12. **Sites plugin**：构建并部署托管网站/Web 应用/游戏 [Sites](https://developers.openai.com/codex/sites)。
13. **OpenAI 官方背书与高活跃社区**：迭代频繁，功能持续演进（9,199 commits、563 contributors）[官方仓库](https://github.com/openai/codex)。

## Codex CLI 的缺陷 / 弊端

1. **核心不可替换**：agent loop 等核心由 Rust 二进制封装，无法像 dsh 那样从配置替换 [dsh 架构文档](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/architecture.zh.md)。
2. **子代理后端单一**：子代理仅能运行 Codex 自身，无法像 dsh 那样在 Claude Code/Codex/ACP/dsh-sdk/进程内之间选择后端 [dsh subagent/README](https://github.com/deepseek-ai/deepseek-harness/blob/master/packages/subagent/README.md)。
3. **绑定 OpenAI 生态**：登录以 ChatGPT 账号或 OpenAI API Key 为主，模型选择受 OpenAI 生态约束 [CLI 概览](https://developers.openai.com/codex/cli)。
4. **无 append-only traceable session log 不变量**：可观测性以 `codex doctor`/SQLite memory/tracing 为主，未声明类似 dsh 的「Model-visible ⟺ logged」强不变量 [dsh AGENTS.md](https://github.com/deepseek-ai/deepseek-harness/blob/master/AGENTS.md)。
5. **Apache-2.0 含专利条款**：相比 dsh 的 MIT，协议更重，部分场景下需注意专利授权终止条款 [官方仓库 LICENSE](https://github.com/openai/codex/blob/main/LICENSE)。
6. **扩展模型差异**：Codex 的扩展以 MCP/Hooks/Skills/Plugins 为主，仍是围绕固定 Rust 二进制的「配置型扩展」；dsh 走「插件即副作用」路线，注册返回 disposer，每个扩展点都可在其插件卸载时撤销 [dsh AGENTS.md](https://github.com/deepseek-ai/deepseek-harness/blob/master/AGENTS.md)。
7. **PreToolUse 拦截不完整**：仅拦截简单 shell 调用、`apply_patch`、MCP 工具，不拦截 `WebSearch` 等；`unified_exec` 机制虽支持更丰富的 streaming stdin/stdout，但拦截仍不完整 [Hooks PreToolUse](https://developers.openai.com/codex/hooks#pretooluse)。
8. **Hook 类型受限**：目前仅 `command` 类型实际运行；`prompt` 与 `agent` 类型被解析但跳过 [Hooks config shape](https://developers.openai.com/codex/hooks#config-shape)。
9. **实验性、未稳定**：官方明确自述为实验性项目，可能存在 bug 与破坏性变更 [官方仓库 README](https://github.com/openai/codex)。
