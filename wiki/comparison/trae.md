# Trae 对比

本页将 DeepSeek Harness（`dsh`）与 [TRAE](https://www.trae.cn/) 产品族进行对比。所有关于 Trae 的结论均源自其官方文档（通过 [llms.txt](https://docs.trae.cn/llms.txt) 索引逐页访问），并附链接可溯源；关于 dsh 的结论源自 [dsh 官方仓库](https://github.com/deepseek-ai/deepseek-harness)的 README 与架构文档。

## 官方文档来源

- 官方网站：<https://www.trae.cn/>
- 官方文档首页：<https://docs.trae.cn/>
- 官方文档索引（llms.txt）：<https://docs.trae.cn/llms.txt>
- TraeCode 下载：<https://www.trae.cn/ide/download>
- TraeCode Plugin：<https://www.trae.cn/plugin>

## 产品族总览

TRAE 是面向 AI 原生开发与智能体体验的**产品族品牌**，旗下包含多个独立产品 [TRAE 概览](https://docs.trae.cn/)：

| 产品 | 定位 |
|---|---|
| TraeCode（原 TRAE IDE） | AI 原生 IDE，保留编辑器/终端/调试/Git 工作流，内置可规划任务的 AI 智能体 [什么是 TraeCode](https://docs.trae.cn/ide_what-is-trae-code) |
| TraeWork（原 TRAE Work / SOLO） | AI 原生工作台，提供网页/桌面/移动版，含 Work/Code/Design 三种模式 [TRAE Work 概述](https://docs.trae.cn/solo_what-is-trae-solo) |
| TraeCode Plugin | 嵌入 VS Code / JetBrains / Android Studio 的 AI 编程助手 [TRAE 概览](https://docs.trae.cn/) |
| TraeCode CLI | 终端 Code Agent，支持脚本化与 CI/CD 集成 [TRAE 概览](https://docs.trae.cn/) |
| TRAE 企业版 | 覆盖全线产品的企业版本，含团队管理、安全治理、OpenAPI [TRAE 概览](https://docs.trae.cn/) |

## 架构模型

TraeCode 提供**双重开发模式** [什么是 TraeCode](https://docs.trae.cn/ide_what-is-trae-code)：

- **IDE 模式**：保留传统编辑器、终端、调试、插件、源代码管理等工作流，适合需要精细控制的场景。
- **SOLO 模式**：以 AI 为主导，自然语言输入需求后 AI 自动规划任务并推进代码生成、测试、预览。

!!! note "与 dsh 的核心架构差异"
    Trae 是**闭源商业 IDE/工作台产品族**，围绕一个由厂商控制的运行时构建；dsh 是**开源 agent harness**，以 Cordis 为内核、采用「一切皆插件」架构，产品的每一部分（包括模型适配器、工具注册表、会话日志、agent loop 本身）都是可从配置替换的插件 [dsh 架构文档](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/architecture.zh.md)。

## 功能详情

### 内置工具清单

智能体可调用的工具在子智能体文档中完整列出 [子智能体（Subagent）](https://docs.trae.cn/ide_subagents)：

| 工具 | 功能 |
|---|---|
| Bash | 运行终端命令 |
| Edit / Write | 编辑或创建/覆写文件 |
| Read | 读取文件或目录 |
| Glob / Grep | 按文件名模式 / 内容正则搜索 |
| WebFetch / WebSearch | 抓取网页 / 网络搜索 |
| TodoWrite | 管理任务清单 |
| Skill | 调用 Skill |
| LSP | 通过 Language Server 检查语法问题 |
| `mcp__<server>__<tool>` | 调用 MCP Server 工具 |

面向用户的工具归为五类：**阅读**、**文件系统**、**终端**、**联网搜索**、**预览** [创建并管理自定义智能体](https://docs.trae.cn/ide_agent)。另有「浏览器控制」能力：AI 可通过内置或外部 Chrome 浏览器打开网页、读取内容、点击按钮、填写表单 [浏览器控制](https://docs.trae.cn/ide_browser-use)。

### Skill 机制

技能通过 `SKILL.md` 定义，YAML frontmatter（`name`/`description`）+ Markdown 正文，目录结构含可选 `examples/`、`templates/`、`resources/` [技能（Skill）](https://docs.trae.cn/ide_skills)。

- **按需加载**：智能体先扫描所有技能的简要描述，仅当判断与当前任务高度相关时才加载详细内容，减少 Token 消耗。
- **目录**：全局技能 `~/.trae-cn/skills`（Windows `%userprofile%/.trae-cn/skills`）；项目技能 `.trae/skills/`。
- **与 Rule/MCP 的差异**：规则全量加载、开启即注入持续占用上下文；技能按需加载。MCP Server 提供「可调用工具」，技能描述「如何完成任务」[技能（Skill）](https://docs.trae.cn/ide_skills)。
- **内置技能**：TRAE-security-review（安全扫描）、TRAE-generate-mini-app（Taro 多端小程序）、TRAE-debugger（复杂问题调试）、TRAE-code-review（代码审查）[技能（Skill）](https://docs.trae.cn/ide_skills)。
- **`.agents/skills/`**：支持 Agent Skills 规范目录，可用 "find-skills" 技能从开放生态搜索安装 [技能（Skill）](https://docs.trae.cn/ide_skills)。

### MCP 支持

智能体作为 MCP 客户端向 MCP Server 发起请求 [MCP 概览](https://docs.trae.cn/ide_model-context-protocol)。添加方式：从 MCP 市场添加（设置 > MCP > 添加 > 从市场添加）或手动配置（JSON）[添加 MCP Server](https://docs.trae.cn/ide_add-mcp-servers)。

- **传输协议**：stdio（本地）、HTTP+SSE（本地/远程）、Streamable HTTP（本地/远程）[MCP 概览](https://docs.trae.cn/ide_model-context-protocol)。
- **项目级 MCP**：项目根 `.trae/mcp.json` 声明，需在设置打开「启用项目级 MCP」开关 [添加 MCP Server](https://docs.trae.cn/ide_add-mcp-servers)。
- **火山引擎 MCP 市场**：支持添加火山引擎云服务 MCP Server [添加 MCP Server](https://docs.trae.cn/ide_add-mcp-servers)。

### 智能体（Agent）

- **内置智能体**：Chat（快速问答）、Agent（自动化项目开发主智能体，需求拆解/方案设计/代码实现/重构/修复）[智能体概述](https://docs.trae.cn/ide_agent-overview)、[内置智能体：Agent](https://docs.trae.cn/ide_built-in-agent)。
- **自定义智能体**：智能生成或手动创建，可配置头像、名称、提示词、是否可被其他智能体调用（需英文标识名与调用时机）、工具（MCP Server + 内置工具）[创建并管理自定义智能体](https://docs.trae.cn/ide_agent)。
- **一键导入智能体**：官方提供 UI 设计师、前端架构师、后端架构师、API 测试工程师等模板 [支持一键导入的自定义智能体](https://docs.trae.cn/ide_custom-agents-ready-for-one-click-import)。

### 子智能体（Subagent）

通过 Markdown 文件定义的专用智能体，拥有**独立上下文窗口**，中间推理与执行不污染 Agent 对话历史 [子智能体（Subagent）](https://docs.trae.cn/ide_subagents)。

- **调用机制**：Agent 判断任务类型 → 与 Subagent `description` 匹配 → 委派任务 → Subagent 在独立上下文完成 → 返回结果由 Agent 汇总。
- **目录**：用户级 `~/.trae-cn/agents/{name}.md`；项目级 `{project}/.trae/agents/{name}.md`。项目级覆盖同名用户级。
- **模型限制**：仅支持 TraeCode 内置模型（Doubao-Seed-2.1-Pro/Turbo、Seed-Code、MiniMax-M3/M2.7、GLM-5.2/5.1/5、DeepSeek-V4-Pro/Flash、Kimi-K2.7-Code/K2.6、Qwen3.7-Plus 等）[子智能体（Subagent）](https://docs.trae.cn/ide_subagents)。
- **默认内置**：Agent 已内置 "Search" 子智能体用于检索查看文件 [内置智能体：Agent](https://docs.trae.cn/ide_built-in-agent)。
- **限制**：仅内置 "Agent" 可调用 Subagent。

### 规则（Rule）与斜杠命令

- **规则类型**：全局规则 `~/.trae-cn/user_rules`；项目规则 `.trae/rules/`（支持至多 3 层嵌套，子目录规则自动携带）[规则（Rule）](https://docs.trae.cn/ide_rules)。
- **生效方式**：始终生效（`alwaysApply: true`）、指定文件生效（`globs`）、智能生效（`description` 由 AI 判断）、手动触发生效（`#Rule`）[规则（Rule）](https://docs.trae.cn/ide_rules)。
- **AGENTS.md / CLAUDE.md 兼容**：项目根 AGENTS.md 提供行为指引，兼容 CLAUDE.md / CLAUDE.local.md 导入 [规则（Rule）](https://docs.trae.cn/ide_rules)。
- **斜杠命令**：项目命令 `.trae/commands/`、全局命令 `~/.trae-cn/commands`（最多 3 层嵌套）；内置 `/plan`、`/spec` [命令](https://docs.trae.cn/ide_slash-commands)。

### 工作流：Plan、Spec 与 Goal

仅内置 "Agent" 可用，"Chat" 不可用 [内置工作流：Plan、Spec 与 Goal](https://docs.trae.cn/ide_spec-and-plan-workflows)：

- **Plan 模式**：边界清晰的中小型任务，生成 `.trae/documents/` 规划文档，确认后一一执行。
- **Spec 模式**：复杂系统级任务，生成三阶段文档组存于 `.trae/specs/`：**大纲（spec.md）**、**任务列表（tasks.md）**、**验收清单（checklist.md）**，状态随执行进度自动更新，可纳入版本控制。
- **Goal 模式**：目标明确的长任务，升级为目标导向多轮续跑，每轮自动评估目标是否达成，配合专用「操作岛台」查看/编辑/暂停/删除目标。

### Auto 模式与 CUE

- **Auto 模式**：综合考虑速度、性能与资源调用合适内置模型（仅内置模型，不支持自定义）[Auto 模式](https://docs.trae.cn/ide_auto-mode)。
- **CUE 代码补全** [超级代码补全：CUE](https://docs.trae.cn/ide_cue)：
  - 代码补全、多行修改、修改点预测（结合最近修改/Linter 错误）、修改点跳转。
  - **Cue-Pro**：仓库级链式补全，学习编辑顺序，结合 LLM 推理与工具调用生成多条连续编辑建议。
  - **智能导入/重命名（Beta）**：支持 Python/TypeScript/Golang。
  - 全局设置，IDE/SOLO 模式同步生效；快捷键 Tab（跳转/接受）、`Control + Shift + C`（Cue-Pro 视图）。

### 沙箱

- **支持平台**：macOS、Windows（原生 + Remote WSL 2）、Linux（Debian 10+/Ubuntu 20.04+，通过 Remote SSH 与 Bubblewrap）[沙箱](https://docs.trae.cn/ide_sandbox)。
- **文件访问控制**：只读（`.vscode`、`/` 根目录默认只读）、读写（项目目录除 `.trae`/`.vscode`/`.git`、临时目录、缓存目录、工具链目录）；读写冲突以只读为准 [沙箱](https://docs.trae.cn/ide_sandbox)。
- **高风险命令拦截**：`rm -rf` 等高风险命令拦截并提示「跳过/添加白名单/沙箱内运行」[沙箱](https://docs.trae.cn/ide_sandbox)。
- **自定义**：`~/.trae-cn/sandbox.json` 自定义文件系统（`readWrite`/`readOnly`）与网络（仅 Windows，`allow`/`deny` 支持 IP/CIDR/域名/通配符）[沙箱](https://docs.trae.cn/ide_sandbox)。
- **自动运行**：自动运行 MCP（首次授权）、自动运行命令（沙箱外跳过安全检查，建议非必要不启用）[自动运行 & 安全性](https://docs.trae.cn/ide_auto-run-and-security)。

### 可观测性

- **SessionID**：双击对话段左上角 TRAE 头像复制 [获取日志或 SessionID](https://docs.trae.cn/ide_get-logs-or-session-id)。
- **隐私模式**：开启后对话内容/代码片段/AI 输出不用于数据分析/产品优化/模型训练；代码库文件始终不用于训练，始终本地保存（为索引临时上传计算嵌入后永久删除明文）[隐私模式](https://docs.trae.cn/ide_privacy-mode)。
- **上下文压缩**：每对话独立上下文管理，超窗口自动压缩或手动点击「压缩」按钮 [上下文压缩](https://docs.trae.cn/ide_context-compaction)。

### 模型

- **内置模型**：Seed-2.1-Pro/Turbo、Seed-Code、DeepSeek-V4-Pro/Flash、GLM-5.2/5.1/5、Kimi-K3/K2.7-Code、MiniMax-M3、Qwen3.7-Plus 等 [内置模型 & 自定义模型](https://docs.trae.cn/ide_models)。
- **自定义模型**：预设服务商列表填 API 密钥，或自定义配置（API 格式、请求地址、模型 ID、多模态开关、上下文窗口、工具调用轮次）[内置模型 & 自定义模型](https://docs.trae.cn/ide_models)。

### 积分计费

以积分为核心的计费体系，分**通用积分**与 **Work 专属积分**，多档会员套餐（Lite/Pro/Pro+/Ultra，单月 ¥49–¥699，含云端任务并行上限、高峰期优先、新模型优先体验等）[积分计费模式](https://docs.trae.cn/ide_coming-soon)。同一账号最多同时登录 3 台设备（TraeWork 网页版不计入）[设备数量限制](https://docs.trae.cn/ide_device-limit)。

## 界面/交互详情

### UI 表面

**TraeCode IDE 模式**：保留传统 IDE 布局（编辑器/终端/调试/插件/源代码管理），侧边对话面板位于右侧，快捷键 `Command/Ctrl + U` 重开 [对话](https://docs.trae.cn/ide_chat)。

**TraeCode SOLO 模式**：从左到右三栏布局——**任务管理面板**、**AI 对话面板**、**工具面板**；设置入口在对话面板右上角 [SOLO 模式概览](https://docs.trae.cn/ide_solo-mode)。

**TraeWork**：网页版/桌面版/移动版三端，工作区含四面板 [TRAE Work 网页版和桌面版快速开始](https://docs.trae.cn/solo_trae-solo-quickstart)：

1. **对话面板**：与 AI 实时对话、下达指令、查看输出
2. **待办**：AI 列出任务计划（Todos），实时追踪子任务进度
3. **任务产物**：存放 AI 为该任务生成的文件
4. **参考信息**：实时显示 AI 引用的上下文（技能/文件/网络信息），可「压缩」

### TraeWork 三种模式

界面左上角切换 [TRAE Work 网页版和桌面版快速开始](https://docs.trae.cn/solo_trae-solo-quickstart)：

- **Work 模式**：面向产品/数据/运营等非开发用户，处理文档/数据/演示稿。
- **Code 模式**：面向开发工程师，聚焦编码/调试/代码库管理/Git 工作流。
- **Design 模式**：生成与迭代界面设计 [Design 模式](https://docs.trae.cn/work_use-the-design-mode)。设计风格选择（自由探索/设计系统）；画布展示成果，顶部工具栏含预览（网页/平板/手机）、连线（页面跳转热区）、可视化编辑器（设计/原型属性）、导出（Figma/PNG/JPG/HTML/ZIP）；可与 Code 模式联动（`··· > 导出设计文件 > 在 Code 模式中开发`）。

### 交互方式

- **自然语言驱动**：SOLO 模式自然语言/语音/文件输入，AI 自主拆解任务 [SOLO 模式概览](https://docs.trae.cn/ide_solo-mode)。
- **智能体选择**：输入框左下角点 `@` 选智能体 [内置智能体：Agent](https://docs.trae.cn/ide_built-in-agent)。
- **任务规划展示**：Agent 先给可执行计划，确认后推进；TraeWork 待办面板实时追踪子任务进度；SOLO 模式已完成任务在对话框折叠并生成摘要（可展开）[SOLO 模式概览](https://docs.trae.cn/ide_solo-mode)。
- **对话能力**：侧边对话（`Command/Ctrl + U`）、行内对话（`Command/Ctrl + I`）、图片输入（拖入/粘贴/点击）、语音输入、Fork Chat（从任意 AI 回复创建独立对话继承上下文）[对话](https://docs.trae.cn/ide_chat)。

### 可视化元素

- **代码 Diff**：SOLO 模式点「查看变更」打开「代码变更」窗口，显示文件数/行数/diff 视图 [SOLO 模式概览](https://docs.trae.cn/ide_solo-mode)。
- **工具调用呈现**（工具面板）[工具面板](https://docs.trae.cn/ide_tool-panel)：
  - 编辑器：展示编码过程与最终代码，完成后自动接受。
  - 终端：展示命令执行过程与结果，可选中输出「添加到对话」。
  - 文档：展示 PRD/技术架构文档生成过程及初稿（Markdown）。
  - 浏览器：展示 Web 应用成果供预览。
- **实时跟随模式**：开启后系统按 AI 工作阶段自动切换工具展示进度，处理任务时工具只读 [工具面板](https://docs.trae.cn/ide_tool-panel)。

### 预览

- **SOLO 浏览器工具**：展示 Web 应用预览，「选择元素」进入元素选择模式（选中发送至 AI 修改），静态文字可单击编辑，「部署」按钮发起部署，地址栏可输入外部网址，底部显示 Info/Warning/Error 日志 [工具面板](https://docs.trae.cn/ide_tool-panel)。
- **Design 画布预览**：选中产物点「预览」在画布展示，可切换网页/平板/手机设备类型 [Design 模式](https://docs.trae.cn/work_use-the-design-mode)。
- **移动版预览**：仅支持预览云端任务生成的 Web 页面 [TraeWork 移动版快速开始](https://docs.trae.cn/solo_get-started-with-trae-solo-mobile)。

### 远程开发

- **WSL**：本地 PC 运行客户端 + UI 插件，WSL 运行服务端 + AI 后端 + 终端 + 调试器，通过 `/mnt/c` 映射；仅支持 WSL 2 [使用 WSL 进行远程开发](https://docs.trae.cn/ide_wsl)。
- **SSH**：远程主机运行服务端 + 代码 + 终端 + 调试器，通过 SSH 通道连接；支持端口转发与远程调试；远程主机仅支持 Linux（Debian 10+/Ubuntu 20.04+，至少 1GB RAM）[使用 SSH 进行远程开发](https://docs.trae.cn/ide_ssh-remote)。

### 插件市场

- **TraeCode 插件市场**：左侧导航栏入口，支持从 TraeCode 市场/VS Code 市场安装/导入本地 `.vsix`，详情窗口展示说明与变更日志 [插件](https://docs.trae.cn/ide_manage-extensions)。
- **MCP 市场**：设置 > MCP > 添加 > 从市场添加，进入市场浏览 [添加 MCP Server](https://docs.trae.cn/ide_add-mcp-servers)。

### 多端一致性

TraeWork 网页/桌面/移动版共享账号体系与任务数据，实时三端全量同步；设备离线自动切换云端执行 [TRAE Work 概述](https://docs.trae.cn/solo_what-is-trae-solo)。三端差异：

| 维度 | 网页版 | 桌面版 | 移动版 |
|---|---|---|---|
| 定位 | 临时需求/外出 | 长期开发/复杂项目 | 跨设备任务下发 |
| 运行环境 | 仅云端 | 本地 + 云端 | 云端或电脑 |
| 输入 | 文字、语音 | 文字、语音、附件、技能 | 按住说话、文本、附件、快捷指令 |
| 预览 | 完整 | 完整 | 仅云端任务 Web 页面 |
| 本地任务查看 | 不支持 | 支持 | 支持（同步） |

## 与 dsh 的核心差异

| 维度 | Trae | dsh |
|---|---|---|
| 架构 | 闭源商业产品族，运行时由厂商控制 | 开源 MIT，Cordis 内核，一切皆插件，agent loop/会话日志/模型适配器可替换 [dsh 架构](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/architecture.zh.md) |
| 扩展模型 | 文件 + 配置（SKILL.md/Agent 配置/MCP Server） | 插件即副作用，注册返回 disposer，卸载即撤销 [dsh AGENTS.md](https://github.com/deepseek-ai/deepseek-harness/blob/master/AGENTS.md) |
| 模型 | 内置多种 + 自定义接入 | 无内置，需自配 `DEEPSEEK_API_KEY` [dsh README](https://github.com/deepseek-ai/deepseek-harness/blob/master/README.md) |
| 界面 | IDE/SOLO/网页/桌面/移动多端 | 本地 Web UI（`dsh web`），无移动端/云端 |
| 工作流 | 内置 Plan/Spec/Goal 三种 | 通过 Profile + 组合包自定义 [dsh CLI README](https://github.com/deepseek-ai/deepseek-harness/blob/master/apps/cli/README.zh.md) |
| 可观测性 | SessionID/日志/隐私模式 | append-only JSONL 会话日志，「Model-visible ⟺ logged」强不变量 [dsh AGENTS.md](https://github.com/deepseek-ai/deepseek-harness/blob/master/AGENTS.md) |
| 沙箱 | 文件访问控制 + 高风险命令拦截，跨平台 | Linux Landlock 原生模块 + E2B POC，Windows 受限 [dsh AGENTS.md](https://github.com/deepseek-ai/deepseek-harness/blob/master/AGENTS.md) |
| 许可证 | 闭源商业，积分计费 [积分计费](https://docs.trae.cn/ide_coming-soon) | MIT 完全开源 [dsh README](https://github.com/deepseek-ai/deepseek-harness/blob/master/README.md) |

## Trae 的相对优势

1. **开箱即用的完整产品体验**：内置 IDE、桌面/移动/网页多端，无需自配 API Key 即可使用 [什么是 TraeCode](https://docs.trae.cn/ide_what-is-trae-code)。
2. **内置模型与 Auto 模式**：系统自动选择合适模型 [Auto 模式](https://docs.trae.cn/ide_auto-mode)。
3. **CUE 仓库级链式补全**：Cue-Pro 学习编辑顺序生成多条连续编辑建议 [超级代码补全：CUE](https://docs.trae.cn/ide_cue)。
4. **Plan/Spec/Goal 三种工作流**：内置结构化规划文档生成，Spec 三阶段文档可纳入版本控制 [Plan、Spec 与 Goal](https://docs.trae.cn/ide_spec-and-plan-workflows)。
5. **成熟多层扩展生态**：Skill/MCP 市场/Agent/Subagent/插件市场/教程齐备 [官方文档索引](https://docs.trae.cn/llms.txt)。
6. **Design 模式可视化设计**：画布预览/连线/导出 Figma，与 Code 模式联动 [Design 模式](https://docs.trae.cn/work_use-the-design-mode)。

## Trae 的缺陷 / 弊端

1. **闭源且绑定积分计费**：核心运行时不开源，使用受付费套餐与积分额度约束 [积分计费](https://docs.trae.cn/ide_coming-soon)。
2. **运行时不可替换**：agent loop、会话日志等核心组件由厂商控制，无法像 dsh 那样从配置替换 [dsh 架构文档](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/architecture.zh.md)。
3. **设备登录限制**：同一账号最多 3 台客户端设备同时在线 [设备数量限制](https://docs.trae.cn/ide_device-limit)。
4. **Subagent 模型受限**：仅支持内置模型，不支持自定义模型 [子智能体](https://docs.trae.cn/ide_subagents)。
5. **无开源 MIT 自托管路径**：无法在完全自主可控的开源协议下二次开发与分发。
