# dsh-vscode（DeepSeek Harness for VS Code）

> **插件名**：dsh-vscode（DeepSeek Harness for VS Code，扩展 id `dsh-vscode`，发布者 `Jager`）
> **来源仓库**：<https://github.com/NEXTINDIE/DeepSeek-Harness-for-VS-Code>
> **许可证**：MIT（LICENSE 文件含未解决的 git merge conflict 标记，GitHub SPDX detector 推断为 NOASSERTION）
> **commit SHA**：`7e861a5`

在 VS Code 里用 DSH 如 ChatGPT / Copilot：内置聊天参与者 `@dsh`、辅助侧栏 tab、独立聊天窗口，跨项目会话（每工作区独立或全局共享），复用同一套 DSH API；支持现代聊天界面、消息分支、子代理、轨迹视图、设置面板、附件、图片、技能、`.claude` / `.codex` / Copilot 目录。

---

## 1. 使用指南

### 前置依赖

- VS Code `>= 1.90`（package.json `engines.vscode`）
- 内置聊天 `@dsh` 需 `>= 1.95`；辅助侧栏容器需 `>= 1.106`（旧版自动回退活动栏图标）
- DSH CLI（`dsh`），或允许扩展用 `npx --yes @deepseek-ai/dsh@latest` 自动启动服务器
- DSH 已配置模型凭证（与 `dsh web` 一致）
- 运行时依赖：`dompurify ^3.2.4`、`marked ^15.0.7`、`ws ^8.18.0`

### 安装命令

**方式一：安装 .vsix（推荐）**

```bash
cd <本目录>
npm install
npm run package          # 生成 Releases/dsh-vscode-<版本>.vsix
```

VS Code 中：扩展 → `…` → 从 VSIX 安装 → 选择 `Releases\` 下的 .vsix → 重载窗口。

**方式二：开发模式（F5）**

```bash
npm install
npm run watch
```

用 VS Code 打开本目录，按 F5 启动扩展开发宿主。

!!! warning "非标准 DSH 插件 bundle"
    本仓库是 VS Code 扩展（`engines.vscode: "^1.90.0"`，含 `viewsContainers` / `views` / `menus` / `configuration` 等 VS Code 贡献点），不是可通过 `dsh plugin add` 安装的 DSH 插件 bundle。它通过 DSH Web API（`dsh.url` 默认 `http://127.0.0.1:3080`）连接本地 DSH 服务器，复用同一套 DSH Session/Agent/Tool/Skill。出处：PLUGIN.md 安装命令说明、package.json `engines` 与 `contributes` 字段。

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

### 典型用法示例

| 入口 | 说明 |
|---|---|
| 内置 Chat `@dsh` | 输入 `@` 选 dsh；`DSH: 打开内置聊天 (@dsh)` 或状态栏 DSH 图标可自动填入 |
| 辅助侧栏 tab | 视图 → 外观 → Secondary Side Bar（Ctrl+Alt+B） |
| 独立窗口 | `DSH: 打开独立聊天窗口` |

- `Enter` 发送，`Shift+Enter` 换行；运行中发送按钮变停止，输入文字再变回发送（消息排队）。
- 左下角 `/` 按钮：命令菜单（计划模式 / 压缩上下文 / 设置目标 / 记录反馈 / 切换权限 / 技能 / `.claude` 命令与技能）。
- 右键菜单：编辑器选中代码 → `DSH: 发送选中代码到 @dsh`；文件右键 → `DSH: 向 @dsh 询问此文件`。

### 重启生效说明

!!! tip "修改 dsh.url 后需重载 VS Code 窗口"
    `dsh.url` 修改后需重载窗口；`dsh.autoStart` / `dsh.autoStartTimeoutSec` 等启动相关设置同样需重载。`dsh.language` 切换后界面跟随 VS Code 显示语言。

---

## 2. 弊端与缺陷

!!! warning "非标准 DSH 插件 bundle，不通过 dsh plugin add 安装"
    本仓库是 VS Code 扩展而非 DSH 插件 bundle，不通过 `dsh plugin add` 安装；需经 VSIX 安装或 F5 开发模式。出处：PLUGIN.md 已知限制、README「安装」章节。

!!! warning "LICENSE 文件含未解决的 git merge conflict 标记"
    LICENSE 文件第 3-7 行存在 `<<<<<<< HEAD` / `=======` / `>>>>>>> 88885257...` 冲突标记，两份版权声明并存（`Copyright (c) 2025 dsh-vscode contributors` 与 `Copyright (c) 2026 Jager`）；正因冲突标记存在，GitHub SPDX detector 推断为 NOASSERTION。文件本身是 MIT 文本，package.json `license: "MIT"`。出处：PLUGIN.md 已知限制、LICENSE 文件第 3-7 行。

!!! warning "package.json repository.url 误填为 DSH 主仓库"
    package.json `repository.url` 误填为 `https://github.com/deepseek-ai/deepseek-harness.git`（DSH 主仓库），非本扩展实际仓库 `NEXTINDIE/DeepSeek-Harness-for-VS-Code`。出处：PLUGIN.md 已知限制、package.json `repository.url` 字段。

!!! warning "版本声明不一致"
    package.json `version` 为 `0.10.0`，但 README 中文 / 英文版均写「最新版本:0.9.0」；以 package.json 为准。出处：PLUGIN.md 已知限制、README 顶部 / package.json `version` 字段。

!!! warning "VS Code 1.100.x 平台缺陷：Webview 报 Service Worker 错误"
    VS Code 1.100.x 平台缺陷导致 Webview 报 Service Worker 错误，需升级 VS Code 或清空 `%APPDATA%\Code\Service Worker\CacheStorage`。出处：PLUGIN.md 已知限制、README「故障排查」。

!!! warning "已开始的会话不可切换预设"
    「agent preset is fixed」：已开始的会话不可切换预设，预设胶囊只在新会话显示。出处：PLUGIN.md 已知限制、README「故障排查」。

!!! warning "VS Code 从 DSH 会话或受限终端启动会报 0xC0000142/EPERM"
    VS Code 从 DSH 会话或受限终端启动会报 `0xC0000142` / `EPERM`：子进程创建被拦截；需改用普通方式启动 VS Code，或把该会话权限调为 `danger-full-access`。出处：PLUGIN.md 已知限制、README「故障排查」。

!!! warning "辅助侧栏容器与内置聊天对 VS Code 版本有要求"
    辅助侧栏容器需 VS Code `>= 1.106`（旧版自动回退活动栏图标）；内置聊天 `@dsh` 需 `>= 1.95`。出处：PLUGIN.md 已知限制、README「前置条件」。

---

## 3. 后续拓展思路

### 可二次开发的方向

- **修复 LICENSE 冲突标记**：删除 LICENSE 文件中的 git merge conflict 标记，统一版权声明，使 GitHub SPDX detector 正确识别为 MIT。
- **修正 repository.url**：将 `repository.url` 改为 `https://github.com/NEXTINDIE/DeepSeek-Harness-for-VS-Code.git`，避免扩展面板中显示错误来源。
- **多窗口会话共享**：扩展 `participantSessionMode` 支持跨窗口共享同一 session，便于多窗口对照同一对话。

### 可对接的 DSH 能力

- **skill**：`/` 菜单已能列出 `.claude/commands`、`.codex/skills`、`.github/agents` 等技能目录，可扩展自定义 dsh skill 注入入口。
- **hooks**：可在「子代理状态变化」「goal 完成」「计划模式进入」等事件上挂 hooks，触发 VS Code 通知或 statusbar 颜色变化。
- **self-modification**：通过 `DSH: 显示诊断信息` 暴露的运行时状态，可作为 self-modification 反馈源，让 agent 自动调参（思考深度 / 预设）。

### 与其它插件组合的可能性

- **dsh-vscode + dsh-plugin-installer**：在 VS Code 中通过 `@dsh` 触发 plugin-installer 技能，完成插件安装与排障，无需切回浏览器。
- **dsh-vscode + dsh-better-sidebar**：VS Code 侧用 dsh-vscode 聊天，DSH Web 侧用 better-sidebar 看文件树 / 终端 / Git，两端互补。
- **dsh-vscode + dsh-vision-toolkit**：VS Code 中发送图片附件触发 vision-toolkit 的 OCR / UI 还原工具，闭环「截图-还原-代码」流程。
