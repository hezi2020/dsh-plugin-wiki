# deepseek-harness-for-vs-code

> **插件名**：DeepSeek Harness for VS Code（扩展 id `dsh-vscode`，发布者 `Jager`）
> **来源仓库**：<https://github.com/NEXTINDIE/DeepSeek-Harness-for-VS-Code>（注：package.json `repository.url` 误填为 DSH 主仓库）
> **许可证**：MIT（package.json `license: "MIT"`；LICENSE 文件为 MIT 文本但含未解决的 git merge conflict 标记，故 GitHub SPDX 推断为 NOASSERTION）
> **commit SHA**：前 7 位 `7e861a5`

在 VS Code 中直接使用 DeepSeek Harness（`dsh`），与 ChatGPT / Copilot 一样出现在 VS Code 聊天体系中，支持中英文双语界面。内置聊天参与者 `@dsh`、辅助侧栏 tab、独立聊天窗口，跨项目会话（每工作区独立或全局共享），复用同一套 DSH API。

!!! warning "非标准 DSH 插件 bundle — VS Code 扩展"
    本仓库是 VS Code 扩展（`engines.vscode: "^1.90.0"`，含 `viewsContainers` / `views` / `menus` / `configuration` 等 VS Code 贡献点），不是可通过 `dsh plugin add` 安装的 DSH 插件 bundle。它通过 DSH Web API（`dsh.url` 默认 `http://127.0.0.1:3080`）连接本地 DSH 服务器，复用同一套 DSH Session/Agent/Tool/Skill。出处：package.json `engines.vscode`、`contributes`、README「安装」。

---

## 1. 使用指南

### 前置依赖

- VS Code `>= 1.90`（package.json `engines.vscode`）
- 内置聊天 `@dsh` 需 `>= 1.95`；辅助侧栏容器需 `>= 1.106`（旧版自动回退活动栏图标）
- DSH CLI（`dsh`），或允许扩展用 `npx --yes @deepseek-ai/dsh@latest` 自动启动服务器
- DSH 已配置模型凭证（与 `dsh web` 一致）
- 运行时依赖：`dompurify ^3.2.4`、`marked ^15.0.7`、`ws ^8.18.0`

### 安装命令

```bash
# 方式一：安装 .vsix（推荐）
cd <本目录>
npm install
npm run package          # 生成 Releases/dsh-vscode-<版本>.vsix
```

VS Code 中：扩展 → `…` → 从 VSIX 安装 → 选择 `Releases\` 下的 .vsix → 重载窗口。

```bash
# 方式二：开发模式（F5）
npm install
npm run watch
```

用 VS Code 打开本目录，按 F5 启动扩展开发宿主。

### 配置项

| 来源 | 字段 |
|---|---|
| VS Code settings · `dsh.url` | `http://127.0.0.1:3080`（DSH Web 服务器地址，修改后需重载） |
| VS Code settings · `dsh.autoStart` | `true`（VS Code 启动时若服务器未运行则自动启动 `dsh web`） |
| VS Code settings · `dsh.command` | `dsh`（启动命令；找不到时回退 npx） |
| VS Code settings · `dsh.autoStartTimeoutSec` | `60`（自动启动最长等待秒数，5~300） |
| VS Code settings · `dsh.participantSessionMode` | `per-workspace`（@dsh 会话范围：每项目 / 全局） |
| VS Code settings · `dsh.openPanelOnStartup` | `false`（启动时自动打开独立聊天窗口） |
| VS Code settings · `dsh.defaultReasoningEffort` | `""`（新会话默认思考深度，off/high/max 等，取决于模型） |
| VS Code settings · `dsh.language` | `auto`（auto / zh-cn / en） |
| DSH 服务器侧 | 模型凭证（与 `dsh web` 一致）、Session、Agent、Tool、Skill、MCP、Profile Bundle |

### 典型用法示例

| 入口 | 说明 |
|---|---|
| 内置 Chat `@dsh` | 输入 `@` 选 dsh；`DSH: 打开内置聊天 (@dsh)` 或状态栏 DSH 图标可自动填入 |
| 辅助侧栏 tab | 视图 → 外观 → Secondary Side Bar（Ctrl+Alt+B） |
| 独立窗口 | `DSH: 打开独立聊天窗口` |

操作要点：
- 输入框：`Enter` 发送，`Shift+Enter` 换行；运行中发送按钮变停止，输入文字变回发送（消息排队）。
- 左下角 `/` 按钮：命令菜单（计划模式 / 压缩上下文 / 设置目标 / 记录反馈 / 切换权限 / 技能 / .claude 命令与技能）。
- 左上角 `+` 按钮：添加文件 / 添加文件夹（二选一）；附件行蓝色芯片为自动附加的激活文件。
- 消息操作条：分叉 / 回退菜单（回退到此处 / 从此处新建分支 / 分支并回退到更早位置 / 回到主线）。
- 右键菜单：编辑器选中代码 → `DSH: 发送选中代码到 @dsh`；文件右键 → `DSH: 向 @dsh 询问此文件`。

斜杠命令：`/new`、`/session <ID>`、`/preset <名>`。

### 重启生效说明

!!! tip "dsh.url 改动需重载窗口，凭证与 DSH 服务器侧一致"
    `dsh.url` 修改后需重载窗口；`dsh.autoStart` 在 VS Code 启动时探测服务器，失败后每 15 秒重探，服务器上线即自动连接；具体失败原因见输出通道「DeepSeek Harness」的 `[server]` 日志。模型凭证与 `dsh web` 一致，DSH 服务器侧改动需重启 `dsh web`。

---

## 2. 弊端与缺陷

!!! warning "非标准 DSH 插件 bundle，是 VS Code 扩展"
    本仓库是 VS Code 扩展（`engines.vscode: "^1.90.0"`，含 VS Code 贡献点），不是可通过 `dsh plugin add` 安装的 DSH 插件 bundle；需经 VSIX 安装或 F5 开发模式，不能用标准 DSH 插件装载机制。出处：package.json `engines.vscode`、`contributes`、README「安装」。

!!! warning "LICENSE 文件含未解决的 git merge conflict 标记，GitHub 推断为 NOASSERTION"
    LICENSE 文件第 3-7 行存在 `<<<<<<< HEAD` / `=======` / `>>>>>>> 88885257d2ef617b8b8e7983895396acf336364a` 冲突标记，两份版权声明并存（`Copyright (c) 2025 dsh-vscode contributors` 与 `Copyright (c) 2026 Jager`）；这正是 GitHub SPDX detector 推断为 NOASSERTION 的原因。文件本身是 MIT 文本，package.json `license: "MIT"`；但未解决的冲突标记是仓库健康问题，需手动 resolve。出处：LICENSE 文件第 3-7 行、package.json `license`。

!!! warning "package.json repository.url 误填为 DSH 主仓库"
    package.json `repository.url` 写为 `https://github.com/deepseek-ai/deepseek-harness.git`（DSH 主仓库），非本扩展实际仓库；用户从 package.json 找仓库地址会被误导。出处：package.json `repository.url`。

!!! warning "版本声明不一致：package.json 0.10.0 vs README 0.9.0"
    package.json `version` 为 `0.10.0`，但 README 中文/英文版均写「最新版本:0.9.0」；以 package.json 为准，但 README 版本号滞后。出处：package.json `version`、README 顶部「最新版本:0.9.0」。

!!! warning "VS Code 1.100.x 平台缺陷：Webview Service Worker 错误"
    Webview 报 Service Worker 错误是 VS Code 1.100.x 平台缺陷，需升级 VS Code 或清空 `%APPDATA%\Code\Service Worker\CacheStorage`。出处：README「故障排查 · Webview 报 Service Worker 错误」。

!!! warning "VS Code 从 DSH 会话或受限终端启动会报 0xC0000142/EPERM"
    若报错含 `0xC0000142`/`EPERM`，说明 VS Code 是从 DSH 会话或受限终端启动的（子进程创建被拦截）；需改用普通方式启动 VS Code，或把该会话权限调为 `danger-full-access`。出处：README「故障排查 · 启动时无法自动启动服务器」。

!!! warning "已开始的会话不可切换预设"
    「agent preset is fixed」——已开始的会话不可切换预设，预设胶囊只在新会话显示；用户中途想换预设需新建会话。出处：README「故障排查 · agent preset is fixed」。

!!! warning "辅助侧栏需 VS Code ≥ 1.106，内置 @dsh 需 ≥ 1.95"
    辅助侧栏容器需 VS Code ≥ 1.106（旧版自动回退活动栏图标）；内置聊天 `@dsh` 需 ≥ 1.95。低版本用户功能受限。出处：README「前置条件」。

---

## 3. 后续拓展思路

### 可二次开发的方向

- **LICENSE 冲突标记 resolve**：LICENSE 文件的 git merge conflict 标记是仓库健康问题，需手动 resolve 两份版权声明（`2025 dsh-vscode contributors` vs `2026 Jager`），让 GitHub SPDX detector 正确识别为 MIT。
- **repository.url 修正**：package.json `repository.url` 误填为 DSH 主仓库，应改为本扩展实际仓库 `https://github.com/NEXTINDIE/DeepSeek-Harness-for-VS-Code.git`。
- **README 版本号同步**：package.json 已是 `0.10.0` 但 README 仍写 `0.9.0`，发版流程应同步更新 README 版本号。
- **移动端 / Web 版**：当前是 VS Code 桌面扩展，可探索 VS Code Web（vscode.dev）兼容性，让浏览器也能用 `@dsh`。

### 可对接的 DSH 能力

- **DSH API**：扩展通过 `dsh.url` 连接本地 DSH Web API，复用同一套 Session/Agent/Tool/Skill；可扩展为支持远程 DSH 服务器（如团队共享 DSH 实例）。
- **skill**：`/` 菜单已列出会话可用技能（官方 `skill.list`）；可把 VS Code 特有操作（如「在当前文件位置发起 AI Review」）封装为 DSH Skill。
- **self-modification**：扩展的「消息分支 / 回退到此处 / 从此处新建分支」是 self-modification 的「会话级版本控制」范例；Agent 自主探索不同解决路径时可分叉会话而非覆盖。

### 与其它插件组合的可能性

- **dsh-vscode + dsh-file-explorer**：dsh-file-explorer 是 DSH Web UI 的文件浏览器；dsh-vscode 在 VS Code 里用 DSH。组合可在 VS Code 原生资源管理器与 DSH 文件浏览器之间形成「VS Code 编辑 → DSH Agent 操作」的协同。
- **dsh-vscode + dsh-track**：把 dsh-track 面板挂载到 VS Code 辅助侧栏（与 `@dsh` 并列），让 VS Code 内也能看捕获墙与任务墙，跳回原始 prompt 时定位到 VS Code 编辑器对应位置。
- **dsh-vscode + dsh-github**：在 VS Code 里用 `@dsh` 触发 `/pr create`、`/review`，PR 创建与评审经 dsh-github 工具完成，VS Code 编辑器直接打开生成的 PR 文件 diff。
