# dsh-work

> **插件名**：dsh-work（package.json name `dsh-desktop`，productName `dsh-work`）
> **来源仓库**：<https://github.com/vibeinging/dsh-work>
> **许可证**：MIT（Copyright (c) 2026 SmartDigit；第三方依赖见 THIRD_PARTY_NOTICES.md）
> **commit SHA**：前 7 位 `67f35d1`

建立在 DeepSeek Harness（DSH）之上的本地 AI 工作桌面。它把 DSH 的 Session、Agent、Tool、Skill、MCP 和 Profile Bundle 与项目、文件、网页、Git Worktree、Canvas、Site 和 Office 产物组织在同一个桌面应用中。Local-first，数据默认在 `~/.dsh`。

!!! warning "非标准 DSH 插件 bundle — Electron 桌面应用"
    本仓库是 Electron 桌面应用（package.json `name: "dsh-desktop"`，`main: "electron/main.js"`，`private: true`），不是可通过 `dsh plugin add` 安装的 DSH 插件 bundle。它在 DSH 之上提供桌面外壳，启动官方 DSH Web Profile 并复用同一套 Session/Agent/Tool/Skill/MCP/Settings/Profile Bundle/Client Loader，不复制 Agent 运行时，也不是 DSH 官方 Web 的 iframe。出处：README「与 DSH 官方 Web 的关系」、package.json。

---

## 1. 使用指南

### 前置依赖

- Node.js `>= 24`（package.json `engines`，本地开发要求；README「快速开始」明确）
- DSH `0.1.0-rc.6`（README 明确「当前项目使用 DSH `0.1.0-rc.6`」）
- 切换 Node.js 大版本、CPU 架构或操作系统后需运行 `npm run setup` 重新准备依赖
- 平台支持（README「平台状态」）：macOS Apple Silicon（开发与目录包已验证）；macOS Intel（Rosetta 检查通过，仍需实机验收）；Windows x64（已接入构建流程，仍需实机验收）；Windows arm64（暂不支持）；Linux（暂无桌面打包配置）

### 安装命令

```bash
# 本地开发运行（README「快速开始」）
npm install
npm run doctor
npm run dev
```

切换 Node.js 大版本、CPU 架构或操作系统后：

```bash
npm run setup   # 重新准备依赖
```

### 配置项

| 来源 | 字段 |
|---|---|
| 应用内设置 | 语言、网络、通知、终端、隐私选项；主题与外观（明暗模式、背景、透明度） |
| 项目设置 | 应用指令、项目指令、授权源码目录、写入目标、全局/项目记忆 |
| 模型与权限 | Provider、模型、推理强度、凭据引用、Session 权限、工具审批、模型提问 |
| 插件中心 | npm 包（带精确版本）或 `dsh-external` 仓库地址（带完整 commit），兼容性检查后写入当前 Profile |
| 桌面外壳 | 三列工作台、左右栏折叠、全局搜索、缩放快捷键、更新检查 |
| 主题 | `@deepseek-ai/dsh-theme-pack` Profile Bundle 提供 `professional-blue` 与 `anime-blue`；本地主题只能用安全颜色与外观设置，不能注入原始 CSS / 远程图片 / 修改应用名称 |

### 典型用法示例

| 功能 | 用户可以做什么 |
|---|---|
| DSH 对话 | 流式回答、思考过程、工具调用、停止、继续、重试、消息分支和重启恢复 |
| 模型与权限 | 选择 Provider、模型和推理强度，管理凭据引用、Session 权限、工具审批和模型提问 |
| Tool、Skill、MCP 与多 Agent | 使用当前 Profile 中的工具、技能、MCP、Hook、子 Agent 和 Workflow |
| 项目与对话 | 创建项目、全局或临时对话，置顶、排序、重命名、归档、恢复和删除 |
| 编码工作区 | 查看 Diff、逐行评论和编辑、在外部编辑器打开、发起 AI Review，并安全撤销模型产生的文件修改 |
| Git Worktree | 创建、启用、停用和删除隔离工作目录，让新对话在指定 Worktree 中运行 |
| Browser Workspace | 多标签浏览、历史、页内查找、缩放、下载、打印、开发者工具、站点权限、网页快照和「使用此页」 |
| 结果与证据 | 直接查看当前 DSH Session 的完整轨迹、工具输入输出、耗时、Token 和最终回答 |
| Canvas 与本地 Site | 创建和编辑 Canvas、处理行内建议与版本冲突，生成并响应式预览单文件 Site |
| Office 产物 | 创建、查看和定点编辑 Markdown、DOCX、XLSX、PPTX 和 PDF，并保留版本 |
| 插件中心 | 检查兼容性，把 DSH Profile Bundle 安装到当前 Web Profile，并查看来源、版本和加载顺序 |

Git Worktree 隔离开发流程：

1. 为项目创建一个或多个独立分支和工作目录，同一时间启用一个。
2. 启用后，新建对话的 Agent、DSH Session、Diff 和行编辑使用该 Worktree，主检出保持不变。
3. 切换工作目录不会迁移已有对话；应先启用目标 Worktree，再新建对话。
4. 删除前必须切回主检出；删除工作目录后保留 Git 分支，避免误删提交。
5. 非 Git 目录、重复分支、越界路径和异常符号链接会被拒绝；磁盘上丢失的 Worktree 会标记为不可用。

### 重启生效说明

!!! tip "dsh-work 不是 DSH Web 的 iframe，而是同运行链上的桌面外壳"
    Electron 启动官方 DSH Web Profile，并继续使用同一套 Session、Agent、Tool、Skill、MCP、Settings、Profile Bundle 和 Client Loader。dsh-work 在同一运行链上提供自己的桌面外壳。需要模型使用的产品能力通过绑定 Session 和 DSH Tool 接入；项目数据、文件权限、网页、Worktree 和产物版本仍由 dsh-work 管理。

---

## 2. 弊端与缺陷

!!! warning "非标准 DSH 插件 bundle，是 Electron 桌面应用"
    本仓库是 Electron 桌面应用（`name: "dsh-desktop"`，`private: true`），不是可通过 `dsh plugin add` 安装的 DSH 插件 bundle；不能用标准 DSH 插件装载机制安装，需 `npm install` + `npm run dev` 本地构建运行。出处：README「与 DSH 官方 Web 的关系」、package.json。

!!! warning "平台覆盖不全，Windows arm64 与 Linux 暂不可用"
    macOS Apple Silicon 已验证；macOS Intel 仅 Rosetta 检查通过仍需实机；Windows x64 已接入构建仍需安装包实机验收；Windows arm64 暂不支持；Linux 暂无桌面打包配置。跨平台用户需确认平台状态。出处：README「平台状态」。

!!! warning "当前缺失多项功能：任务看板、定时任务页、Git 图谱、stage 面板、独立终端页"
    当前没有五列任务看板、独立定时任务页面、Git 图谱、stage/unstage 面板或独立终端页。从其它 IDE（如 VS Code）迁移的用户需补齐这些工作流。出处：README「当前边界」。

!!! warning "本地 Site 只预览和单文件导出，无部署服务"
    本地 Site 只提供预览和单文件导出，没有部署服务；公开分享目前只有只读查看。需要部署的用户需另寻工具。出处：README「当前边界」。

!!! warning "无移动端远程控制、二维码配对、公网隧道、SSH、SFTP、端口转发"
    当前没有移动端远程控制、二维码配对、公网隧道、SSH、SFTP 或端口转发。远程访问场景受限。出处：README「当前边界」。

!!! warning "子 Agent 可执行但无完整独立管理页"
    子 Agent 可以执行并出现在对话与轨迹中，但还没有完整的独立管理页。多 Agent 编排能力受限。出处：README「当前边界」。

!!! warning "第三方 Client UI Bundle 不进 Electron 主窗口"
    包含第三方 Client UI 的 Bundle 目前不会进入拥有 Electron 权限的主窗口；随应用提供并经过审核的 Client Bundle 不受此限制。第三方 UI 扩展能力受限。出处：README「插件中心」末段。

!!! warning "项目源码目录默认只读，Agent 写入需明确授权"
    项目源码目录默认只读，Agent 写入需要用户明确授权。Local-first 无云端同步，Profile/Session/项目/运行记录/产物数据默认在 `~/.dsh`。出处：README「数据与安全」。

---

## 3. 后续拓展思路

### 可二次开发的方向

- **缺失功能补齐**：五列任务看板、独立定时任务页面、Git 图谱、stage/unstage 面板、独立终端页均在「当前边界」列出，可逐项补齐对标 VS Code 完整开发体验。
- **Linux 桌面打包**：当前 Linux 暂无桌面打包配置，可接入 electron-builder 的 Linux target（AppImage / deb / rpm）补齐三平台覆盖。
- **移动端远程控制**：当前无移动端远程控制、二维码配对、公网隧道；可接入远程控制协议（如自建信令 + WebRTC）实现移动端访问桌面外壳。

### 可对接的 DSH 能力

- **Profile Bundle**：dsh-work 自带 `packages/dsh-product-bridge`、`dsh-theme-pack`、`dsh-work-shell` 三个子包，是 DSH Profile Bundle 形态；可作为「桌面外壳如何接入 DSH 运行链」的范例。
- **skill**：dsh-work 的项目管理、Git Worktree、Canvas、Office 产物均可封装为 DSH Skill，让 Agent 自然语言触发（如「在新 Worktree 里跑这个任务」）。
- **self-modification**：Canvas 保存不可变版本 + 精确行内建议 + 冲突处理，是 self-modification 的「可视化版本控制」范例；Agent 自主修改代码时 dsh-work 提供安全撤销模型产生的文件修改能力。

### 与其它插件组合的可能性

- **dsh-work + dsh-file-explorer**：dsh-work 的「项目源码目录默认只读，Agent 写入需授权」策略可与 dsh-file-explorer 的「可编辑标签页」组合，dsh-work 授权写入目录、dsh-file-explorer 提供编辑体验。
- **dsh-work + dsh-track**：把 dsh-work 的项目对话接入 dsh-track 捕获墙，每个项目对话的决策可追溯；dsh-track 面板挂载在 dsh-work 右侧栏。
- **dsh-work + ego-browser**：dsh-work 已有 Browser Workspace（多标签浏览、开发者工具、网页快照），可与 ego-browser 的 agent 专用浏览器组合——dsh-work 浏览器给人用，ego-browser 给 agent 用，观察窗在 dsh-work 内显示 agent 浏览实况。
