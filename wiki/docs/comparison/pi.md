# Pi Agent 对比

本页将 DeepSeek Harness（`dsh`）与 [Pi Agent](https://pi-agent.org/)（Pi Coding Agent）进行对比。所有关于 Pi 的结论均源自其官方文档站（pi-agent.org/docs）与官方仓库（GitHub: earendil-works/pi），并附链接可溯源；关于 dsh 的结论源自 [dsh 官方仓库](https://github.com/deepseek-ai/deepseek-harness)。

## 官方文档来源

- 官方文档首页：<https://pi-agent.org/docs>
- 官方仓库：<https://github.com/earendil-works/pi>（pi-mono 仓库：<https://github.com/earendil-works/pi-mono>）
- 官方网站：<https://pi.dev>
- 使用 Pi：<https://pi-agent.org/docs/usage>
- 扩展：<https://pi-agent.org/docs/extensions>
- Skills：<https://pi-agent.org/docs/skills>
- 会话：<https://pi-agent.org/docs/sessions>
- 安全：<https://pi-agent.org/docs/security>
- 上下文压缩：<https://pi-agent.org/docs/compaction>
- Providers：<https://pi-agent.org/docs/providers>
- Packages：<https://pi-agent.org/docs/packages>
- 设置：<https://pi-agent.org/docs/settings>
- SDK：<https://pi-agent.org/docs/sdk>
- RPC 模式：<https://pi-agent.org/docs/rpc>
- JSON 事件流：<https://pi-agent.org/docs/json>
- 容器化：<https://pi-agent.org/docs/containerization>

## 架构模型

Pi 是一个**极简的终端编程脚手架（minimal terminal coding agent harness）**，由 Mario Zechner / Earendil Works 开发，采用 MIT 许可证 [概览](https://pi-agent.org/docs)。设计哲学是 **"Primitives, not features"（提供原语而非功能）**：核心保持小巧，通过 TypeScript 扩展、Skill、提示词模板、主题和 pi packages 来扩展能力 [概览](https://pi-agent.org/docs)。

核心链路：在项目目录运行 `pi` → 加载上下文文件（`AGENTS.md`/`CLAUDE.md`）与 Skill/扩展 → 交互式 TUI 输入任务 → 模型调用内置工具或扩展注册的自定义工具 → 输出可审查的变更 [使用 Pi](https://pi-agent.org/docs/usage)。

Pi 的扩展点划分 [扩展](https://pi-agent.org/docs/extensions)：

| 扩展 | 作用 |
|---|---|
| AGENTS.md / CLAUDE.md | 每次会话加载的持久上下文（项目约定） |
| Skills | 可复用、按需调用的 Agent Skills（遵循 [Agent Skills standard](https://agentskills.io/)） |
| Extensions | TypeScript 模块，订阅生命周期事件、注册自定义工具/命令/UI |
| Prompt templates | 可从 slash 命令展开的可复用提示词 |
| Themes | 内置和自定义终端主题 |
| Pi packages | 打包并分享扩展、Skills、提示词和主题 |

!!! note "与 dsh 的核心架构差异"
    Pi 与 dsh 都是**开源 agent harness**，但哲学不同：Pi 追求「极简核心 + TypeScript 扩展」，内置工具数量少（read/write/edit/bash 等），复杂能力交给扩展；dsh 采用「一切皆插件」架构，以 Cordis 为内核，agent loop、会话日志、模型适配器本身都是可从配置替换的插件 [dsh 架构文档](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/architecture.zh.md)。两者都不内置沙箱，依赖 OS/容器边界。

## 功能详情

### 内置工具清单

Pi 的内置工具保持极简，覆盖文件操作、执行与搜索 [使用 Pi](https://pi-agent.org/docs/usage)、[安全](https://pi-agent.org/docs/security)：

| 类别 | 工具 |
|---|---|
| 文件操作 | `read`、`write`、`edit` |
| 执行 | `bash`（shell 命令） |
| 搜索 | 文件搜索（通过 `read` 与 `bash` 组合） |
| 上下文文件 | `AGENTS.md`/`CLAUDE.md` 加载 |
| 图片 | 粘贴/拖入图片作为输入 |
| Shell 命令 | `!command`（输出发送给模型）、`!!command`（不发送） |

> 来源说明：Pi 的内置工具未在单一页面集中列出，主要通过扩展文档的 `tool_call` 事件、编辑器功能与安全文档间接确认。复杂能力（如 web 搜索、浏览器自动化、Google APIs）通过 Skill 或扩展实现 [扩展](https://pi-agent.org/docs/extensions)、[Pi Skills 仓库](https://github.com/badlogic/pi-skills)。

### Skills 机制

本质是 `SKILL.md` 文件 + 可选脚本/资源目录，遵循 [Agent Skills standard](https://agentskills.io/specification) [Skills](https://pi-agent.org/docs/skills)。

- **渐进式披露（progressive disclosure）**：启动时扫描 Skill 位置，仅提取 name/description 加入 system prompt（XML 格式）；任务匹配时用 `read` 加载完整 `SKILL.md`。
- **调用方式**：隐式（任务匹配 description 自动选择）与显式（`/skill:name` 命令）。
- **Skill 命令**：`/skill:name` 加载并执行，`/skill:name args` 带参数；可在 `/settings` 或 `settings.json` 中通过 `enableSkillCommands` 切换。
- **位置**：全局（`~/.pi/agent/skills/`、`~/.agents/skills/`）、项目（`.pi/skills/`、`cwd` 及祖先目录的 `.agents/skills/`，需信任）、包（`skills/` 目录或 `package.json` 的 `pi.skills`）、设置（`skills` 数组）、CLI（`--skill <path>`）。
- **跨 harness 共享**：可将 Claude Code/Codex 的 skill 目录加入设置共享 [从其他 Harness 中使用 Skill](https://pi-agent.org/docs/skills#从其他-harness-中使用-skill)。
- **Frontmatter**：必填 `name`（小写 a-z、0-9、连字符，最多 64 字符）、`description`（最多 1024 字符）；可选 `license`、`compatibility`、`metadata`、`allowed-tools`（实验性）、`disable-model-invocation`。
- **名称规则**：Pi 不要求名称与父目录一致（与标准不同，便于多 harness 共享）。
- **校验**：大多数违规仅警告但仍加载；缺少 description 的 Skill 不会被加载；名称冲突保留先找到的。
- **Skill 仓库**：[Anthropic Skills](https://github.com/anthropics/skills)、[Pi Skills](https://github.com/badlogic/pi-skills)。

### 扩展机制（Extensions）

扩展是能扩展 Pi 行为的 **TypeScript 模块**，是 Pi 最强大的扩展点 [扩展](https://pi-agent.org/docs/extensions)。

- **放置位置**：`~/.pi/agent/extensions/`（全局）或 `.pi/extensions/`（项目本地）自动发现；`pi -e ./path.ts` 用于快速测试；`/reload` 热重载。
- **主要能力**：

| 能力 | API |
|---|---|
| 自定义工具 | `pi.registerTool()` 注册 LLM 可调用的工具 |
| 事件拦截 | 阻止或修改 tool call，带入上下文，自定义上下文压缩 |
| 用户交互 | `ctx.ui` 提示用户（select、confirm、input、notify） |
| 自定义 UI 组件 | `ctx.ui.custom()` 构建支持键盘输入的完整 TUI 组件 |
| 自定义命令 | `pi.registerCommand()` 注册 `/mycommand` 命令 |
| 会话持久化 | `pi.appendEntry()` 保存重启后仍能保留的状态 |
| 自定义渲染 | 控制 tool call/result 和消息在 TUI 中的显示方式 |

- **事件类型**：生命周期事件、资源事件、会话事件、Agent 事件、模型事件、Tool 事件。
- **ExtensionContext**：提供 `ctx.ui`、`ctx.effect` 等上下文。
- **状态管理**：扩展可维护有状态工具（待办列表、连接池）。
- **示例用法**：权限闸门（`rm -rf`/`sudo` 确认）、Git 检查点（每轮 stash）、路径保护（阻止写入 `.env`/`node_modules/`）、自定义上下文压缩、对话摘要、交互式工具、有状态工具、外部集成（文件监听/webhook/CI 触发器）、等待时玩游戏（`snake.ts` 示例）。

### Providers（模型提供方）

Pi 支持 30+ provider，是模型选择最灵活的 agent harness 之一 [Providers](https://pi-agent.org/docs/providers)。

- **订阅型（OAuth）**：ChatGPT Plus/Pro（Codex，获 OpenAI 官方背书）、Claude Pro/Max、GitHub Copilot。
- **API Key 型**：Anthropic、OpenAI、DeepSeek、Google Gemini、Mistral、Groq、Cerebras、xAI、OpenRouter、NVIDIA NIM、Azure OpenAI、Amazon Bedrock、Cloudflare、Vercel AI Gateway、Hugging Face、Fireworks、Together AI、Kimi、MiniMax、Xiaomi MiMo、ZAI、OpenCode Zen/Go 等。
- **Auth File**：`~/.pi/agent/auth.json`（`0600` 权限），key 支持命令执行（`!command`）、环境变量插值（`$ENV_VAR`）、字面量。
- **Cloud Providers**：Azure OpenAI、Amazon Bedrock（含 ECS task role、IRSA、提示词缓存）。
- **Custom Providers**：可实现自定义 API 和 OAuth 流程 [Custom providers](https://pi-agent.org/docs/custom-provider)。
- **解析顺序**：auth.json > 环境变量。
- **模型切换**：`/model` 命令；`/scoped-models` 为 Ctrl+P 轮转启用/禁用模型。

### 会话管理（树结构会话）

Pi 的会话是**树结构的 JSONL 文件**，是其核心特色之一 [会话](https://pi-agent.org/docs/sessions)。

- **存储**：自动保存到 `~/.pi/agent/sessions/`，按工作目录组织。
- **启动选项**：`pi -c`（继续最近）、`pi -r`（浏览选择）、`pi --no-session`（临时模式）、`pi --name "<name>"`（命名）、`pi --session <path|id>`（指定）、`pi --fork <path|id>`（fork）。
- **会话命令**：`/resume`、`/new`、`/name`、`/session`、`/tree`、`/fork`、`/clone`、`/compact`、`/export`、`/share`。
- **`/tree` 分支**：跳到任意之前的点继续，不创建新文件；支持折叠/展开、标签、过滤模式（默认/无工具/仅用户/仅带标签/全部）。
- **`/fork` vs `/clone`**：`/fork` 从更早的用户消息创建新会话文件；`/clone` 复制当前活动分支到新会话文件。
- **分支摘要**：`/tree` 切换分支时可对被放弃的分支做摘要，保留上下文 [上下文压缩](https://pi-agent.org/docs/compaction)。
- **命名会话**：`/name <name>` 或 `--name`/`-n`，便于在 `/resume` 中搜索。
- **恢复/删除**：`/resume` 交互式选择器，支持搜索、排序、重命名、删除（优先用 `trash` CLI）。
- **会话格式**：JSONL，含消息条目、模型变更、思考级别变更、标签、上下文压缩、分支摘要、扩展条目 [会话格式](https://pi-agent.org/docs/session-format)。

### 上下文压缩

Pi 有两种摘要机制 [上下文压缩](https://pi-agent.org/docs/compaction)：

| 机制 | 触发条件 | 作用 |
|---|---|---|
| 上下文压缩 | `contextTokens > contextWindow - reserveTokens`（默认 reserve 16384）或 `/compact [instructions]` | 将旧消息总结成摘要，腾出上下文 |
| 分支摘要 | `/tree` 导航切换分支 | 切换分支时保留被放弃分支的上下文 |

- **工作机制**：找到截断点（`keepRecentTokens` 默认 20k）→ 提取消息 → 生成结构化摘要 → 追加 `CompactionEntry` → 重新加载使用摘要 + `firstKeptEntryId` 后的消息。
- **拆分轮次**：单个轮次超过 `keepRecentTokens` 时，截断点落在轮次中部的 assistant 消息上，生成历史摘要 + 轮次前缀摘要两份并合并。
- **截断点规则**：有效截断点包括 User/Assistant/BashExecution/Custom messages；不在 tool 返回结果处截断。
- **累积式文件跟踪**：上下文压缩和分支摘要都从 tool call 中提取文件操作（read/modified），累积跟踪。
- **扩展钩子**：`fromHook` 字段标记扩展提供的摘要；扩展可自定义上下文压缩逻辑。

### 权限与安全

Pi **不内置沙箱**，这是刻意设计 [安全](https://pi-agent.org/docs/security)。

- **项目信任**：决定是否加载项目本地的 settings、资源、Package 和扩展；`defaultProjectTrust`（`ask`/`never`/`always`），决策存于 `~/.pi/agent/trust.json`。
- **信任边界**：Pi 以启动用户权限运行，用户可写文件视为同一本地信任边界内；项目信任只是输入加载护栏，不是沙箱。
- **无沙箱的理由**：Pi 直接操作本地源码树、调用项目工具链、接入用户开发环境；真正的隔离必须来自 OS 或虚拟化/容器边界。
- **容器化建议**：把整个 `pi` 进程运行在容器/VM/micro-VM；或用 Gondolin micro-VM 路由工具执行；只挂载必要 workspace；限制网络；审查 diff [容器化](https://pi-agent.org/docs/containerization)。
- **Prompt injection**：来自仓库文件/注释/文档/上下文文件/构建输出的 prompt injection 是本地 agent 的预期风险，Pi 无法可靠防御。
- **扩展权限**：扩展以相同权限运行的 TypeScript 模块；Skill 可指示模型执行任意操作（包括运行可执行文件）。

### Pi Packages（包分发）

Pi packages 将扩展、Skill、提示词模板、主题组合，通过 npm 或 git 分享 [Packages](https://pi-agent.org/docs/packages)。

- **安装**：`pi install npm:@foo/bar@1.0.0`、`pi install git:github.com/user/repo@v1`、`pi install /absolute/path`、`pi install ./relative/path`。
- **来源**：npm（带版本固定）、git（HTTPS/SSH，ref 固定）、local paths。
- **管理**：`pi remove`、`pi list`、`pi update`（更新 pi/packages/git refs）。
- **临时试用**：`pi -e npm:@foo/bar` 安装到临时目录。
- **作用域**：用户（`~/.pi/agent/settings.json`）与项目（`.pi/settings.json`，`-l`）；项目设置可团队共享，项目信任后自动安装缺失 packages。
- **Package 结构**：`package.json` 的 `pi` 键声明资源，或约定目录（`extensions/`、`skills/`、`prompts/`、`themes/`）。
- **Gallery Metadata**：`video`（MP4）或 `image`（PNG/JPEG/GIF/WebP）字段用于 [package gallery](https://pi.dev/packages) 预览。
- **依赖**：第三方运行时依赖放 `dependencies`；pi 核心包放 `peerDependencies`（`*` 范围）；其他 pi packages 放 `dependencies` + `bundledDependencies`。
- **过滤**：settings 中对象形式可筛选加载内容（glob + `!exclusions` + `+path`/`-path`）。
- **去重**：项目条目优先于全局；身份按 npm name / git URL（不含 ref）/ 本地绝对路径判定。

### 程序化用法

Pi 支持三种程序化集成方式 [概览](https://pi-agent.org/docs)：

- **SDK**：将 pi 嵌入 Node.js 应用 [SDK](https://pi-agent.org/docs/sdk)。
- **RPC 模式**：通过 stdin/stdout 的 JSONL 集成 [RPC](https://pi-agent.org/docs/rpc)。
- **JSON 事件流模式**：以结构化事件输出的打印模式 [JSON](https://pi-agent.org/docs/json)。
- **TUI 组件**：为扩展构建自定义终端 UI [TUI](https://pi-agent.org/docs/tui)。

### 可观测性

- **会话格式**：JSONL，含完整条目类型，可解析重建 [会话格式](https://pi-agent.org/docs/session-format)。
- **`/session`**：显示会话文件、ID、消息数、token 和费用。
- **`/tree`**：浏览会话树，支持标签与过滤。
- **非交互模式**：`-p`（print mode）、`--mode json`、`--mode rpc`。
- **`/share`**：上传为私有 GitHub gist，生成可分享 HTML 链接。
- **`/export [file]`**：导出为 HTML。

dsh 的可观测性以 **append-only session log** 为核心，声明「Model-visible ⟺ logged」强不变量 [dsh AGENTS.md](https://github.com/deepseek-ai/deepseek-harness/blob/master/AGENTS.md)；Pi 未声明类似不变量。

## 界面/交互详情

### 终端 TUI 界面

Pi 是**纯终端 TUI 应用**，无 IDE/桌面/Web/移动多表面 [使用 Pi](https://pi-agent.org/docs/usage)。

界面分为四个主要区域：

| 区域 | 说明 |
|---|---|
| 启动头部 | 快捷方式、已加载的上下文文件、提示词模板、Skill 和扩展 |
| 消息区 | 用户消息、助手回复、tool call、tool result、通知、错误和扩展 UI |
| 编辑器 | 输入内容的地方；边框颜色表示当前思考级别 |
| 底部栏 | 工作目录、会话名称、token/cache 使用情况、费用、上下文使用量和当前模型 |

- **启动**：`pi` 进入交互模式。
- **编辑器可被替换**：被内置 UI（如 `/settings`）或自定义扩展 UI 临时替换。
- **`/settings`**：思考级别、主题、消息传递、传输方式。

### 编辑器功能

| 功能 | 使用方法 |
|---|---|
| 文件引用 | 输入 `@` 模糊搜索项目文件 |
| 路径补全 | 按 Tab 补全路径 |
| 多行输入 | Shift+Enter，或 Windows Terminal 中 Ctrl+Enter |
| 图片 | Ctrl+V、Windows 上 Alt+V 粘贴，或拖入终端 |
| Shell 命令 | `!command` 运行并发送输出给模型 |
| 隐藏的 Shell 命令 | `!!command` 运行但不发送输出给模型 |
| 外部编辑器 | Ctrl+G 打开 `$VISUAL` 或 `$EDITOR` |

### 斜杠命令

| 命令 | 说明 |
|---|---|
| `/login`、`/logout` | 管理 OAuth 或 API-key 凭据 |
| `/model` | 切换模型 |
| `/scoped-models` | 为 Ctrl+P 轮转启用/禁用模型 |
| `/settings` | 思考级别、主题、消息传递、传输方式 |
| `/resume` | 从之前的会话中选择 |
| `/new` | 开始一个新会话 |
| `/name <name>` | 设置会话显示名称 |
| `/session` | 显示会话文件、ID、消息、token 和费用 |
| `/tree` | 跳到会话中的任意位置，并从那里继续 |
| `/fork` | 基于之前的一条用户消息创建新会话 |
| `/clone` | 将当前活动分支复制到一个新会话中 |
| `/compact [prompt]` | 手动执行上下文压缩，可附带自定义指令 |
| `/copy` | 将上一条助手消息复制到剪贴板 |
| `/export [file]` | 将会话导出为 HTML |
| `/share` | 上传为私有 GitHub gist，并生成可分享的 HTML 链接 |
| `/reload` | 重新加载键位绑定、扩展、Skill、提示词和上下文文件 |
| `/hotkeys` | 显示所有键盘快捷键 |
| `/changelog` | 显示版本历史 |
| `/quit` | 退出 pi |
| `/skill:name` | 加载并执行 Skill |

### 消息队列

Pi 支持在 agent 工作时继续提交消息 [消息队列](https://pi-agent.org/docs/usage#消息队列)：

- **Enter**：加入 steering 消息，在当前助手轮次执行完 tool call 后发送。
- **Alt+Enter**：加入后续消息，在 agent 完成全部工作后发送。
- **Escape**：中止，并把队列里的消息恢复到编辑器中。
- **Alt+Up**：把队列里的消息取回编辑器。

### 上下文文件

Pi 在启动时加载 `AGENTS.md` 或 `CLAUDE.md` [上下文文件](https://pi-agent.org/docs/usage#上下文文件)：

- `~/.pi/agent/AGENTS.md`（全局指令）。
- 当前工作目录向上逐级查找父目录。
- 当前目录。
- `--no-context-files` 或 `-nc` 禁用加载。

**系统提示词文件**：

- `.pi/SYSTEM.md`（项目）、`~/.pi/agent/SYSTEM.md`（全局）替换默认系统提示词。
- `APPEND_SYSTEM.md` 追加内容而不替换。

### 可视化元素

- **树视图**：会话树的可视化浏览与导航 [树视图](https://pi-agent.org/docs/sessions#使用-tree-进行分支)。
- **扩展 UI**：`ctx.ui.custom()` 构建支持键盘输入的完整 TUI 组件。
- **自定义渲染**：控制 tool call/result 和消息在 TUI 中的显示方式。
- **主题**：内置和自定义终端主题 [Themes](https://pi-agent.org/docs/themes)。
- **思考级别边框**：编辑器边框颜色表示当前思考级别。
- **底部栏**：token/cache/费用/上下文使用量/模型实时显示。

### 无 IDE/桌面/Web/移动多表面

Pi 是**纯终端应用**，不提供：

- IDE 集成（无 VS Code/JetBrains 扩展）。
- 桌面应用（无 macOS/Windows 原生应用）。
- Web 版（无云端运行）。
- 移动端/Remote Control。

这是其「极简」哲学的体现，也是与 Trae/Claude Code/Codex CLI 的显著差异。

## 与 dsh 的核心差异

| 维度 | Pi | dsh |
|---|---|---|
| 架构 | 极简核心 + TypeScript 扩展 | 一切皆插件，Cordis 内核 [dsh 架构](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/architecture.zh.md) |
| 内置工具 | 极简（read/write/edit/bash） | 较多内置工具 |
| 扩展模型 | TypeScript 模块（`pi.registerTool()` 等） | 插件即副作用，注册返回 disposer [dsh AGENTS.md](https://github.com/deepseek-ai/deepseek-harness/blob/master/AGENTS.md) |
| 会话结构 | **树结构** JSONL，`/tree` 分支导航 | append-only JSONL，线性 [dsh AGENTS.md](https://github.com/deepseek-ai/deepseek-harness/blob/master/AGENTS.md) |
| 子代理 | 无原生子代理（可通过扩展实现） | **多后端**：Claude Code/Codex/ACP/dsh-sdk/进程内 spawn/fork [dsh subagent/README](https://github.com/deepseek-ai/deepseek-harness/blob/master/packages/subagent/README.md) |
| 沙箱 | 无内置沙箱（刻意设计，依赖 OS/容器） | Linux Landlock + E2B POC [dsh AGENTS.md](https://github.com/deepseek-ai/deepseek-harness/blob/master/AGENTS.md) |
| 界面 | 纯终端 TUI | 本地 Web UI |
| Provider 支持 | 30+ provider（最灵活） | DeepSeek 为主 |
| 可观测性 | `/session`/`/tree` + JSONL | append-only JSONL，「Model-visible ⟺ logged」强不变量 [dsh AGENTS.md](https://github.com/deepseek-ai/deepseek-harness/blob/master/AGENTS.md) |
| 许可证 | MIT | MIT [dsh README](https://github.com/deepseek-ai/deepseek-harness/blob/master/README.md) |

## Pi 的相对优势

1. **极简哲学**：核心小巧，复杂能力交给扩展，学习曲线低 [概览](https://pi-agent.org/docs)。
2. **TypeScript 扩展**：`pi.registerTool()`/`pi.on()`/`ctx.ui.custom()` 等 API 强大，可注册自定义工具、拦截事件、构建自定义 TUI 组件 [扩展](https://pi-agent.org/docs/extensions)。
3. **树结构会话**：`/tree` 分支导航、`/fork`、`/clone`、分支摘要，探索不同方案时不丢失上下文 [会话](https://pi-agent.org/docs/sessions)。
4. **30+ Provider 支持**：订阅型（ChatGPT/Claude/Copilot）+ API Key 型（Anthropic/OpenAI/DeepSeek/Gemini 等），模型选择最灵活 [Providers](https://pi-agent.org/docs/providers)。
5. **跨 harness Skill 共享**：可将 Claude Code/Codex 的 skill 目录加入设置共享 [从其他 Harness 中使用 Skill](https://pi-agent.org/docs/skills#从其他-harness-中使用-skill)。
6. **Pi Packages 分发**：npm/git/local 三种来源，gallery 预览，过滤，去重 [Packages](https://pi-agent.org/docs/packages)。
7. **上下文压缩机制**：自动压缩 + 分支摘要 + 累积式文件跟踪 + 拆分轮次处理 [上下文压缩](https://pi-agent.org/docs/compaction)。
8. **消息队列**：steering（Enter）+ follow-up（Alt+Enter）+ 中止恢复（Escape）[消息队列](https://pi-agent.org/docs/usage#消息队列)。
9. **程序化集成**：SDK + RPC 模式 + JSON 事件流模式 [概览](https://pi-agent.org/docs)。
10. **MIT 完全开源**：可二次开发与分发 [官方仓库](https://github.com/earendil-works/pi)。

## Pi 的缺陷 / 弊端

1. **无 IDE/桌面/Web/移动多表面**：纯终端 TUI，无 VS Code/JetBrains 扩展、无桌面应用、无云端运行、无移动端 Remote Control [使用 Pi](https://pi-agent.org/docs/usage)。
2. **无内置沙箱**：刻意不内置沙箱，依赖 OS/容器边界；对不受信任的仓库需手动容器化 [安全](https://pi-agent.org/docs/security)。
3. **无原生子代理**：无类似 dsh/Claude Code 的多后端子代理能力，需通过扩展实现 [dsh subagent/README](https://github.com/deepseek-ai/deepseek-harness/blob/master/packages/subagent/README.md)。
4. **无 append-only traceable session log 不变量**：会话是树结构 JSONL，未声明类似 dsh 的「Model-visible ⟺ logged」强不变量 [dsh AGENTS.md](https://github.com/deepseek-ai/deepseek-harness/blob/master/AGENTS.md)。
5. **内置工具极简**：无内置 web 搜索、浏览器自动化、图像生成等，需依赖 Skill 或扩展 [使用 Pi](https://pi-agent.org/docs/usage)。
6. **社区规模较小**：相比 Trae/Claude Code/Codex CLI，Pi 的社区与生态规模较小（单人/小团队维护）。
7. **Prompt injection 风险**：来自仓库文件/注释/文档的 prompt injection 是预期风险，Pi 无法可靠防御 [安全](https://pi-agent.org/docs/security)。
