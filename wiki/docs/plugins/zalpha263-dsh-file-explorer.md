# dsh-file-explorer（Zalpha263）

> **插件名**：dsh-file-explorer
> **来源仓库**：<https://github.com/Zalpha263/dsh-file-explorer>
> **许可证**：MIT（Copyright (c) 2025 dsh-file-explorer contributors）
> **commit SHA**：`0f1e63c341f7ed8b2179bfc12ec88a0a6329780b`（前 7 位 `0f1e63c`）

DSH Web UI 侧边文件浏览器（持久插件）。让 Agent 像其他 IDE 一样查看当前工作区的文件夹，并能预览文件。

## 功能

- **目录树**：懒加载展开工作区目录，目录在前、文件带大小；默认隐藏 `node_modules`、`.git` 等（可切换）
- **文件预览**：点击文件在面板内预览；超大文件截断、二进制识别、智能换行；预览区高度可拖动调整（树区自动压缩出滚动条）
- **工作区自动跟随**：切换会话/工作区后约 1 秒内自动切换到对应目录树（DOM 探测 + Host 信号双保险）
- **停靠模式**：浮动（四边四角自由调整大小）/ 右侧（挤压对话栏，不遮挡）/ 中间，宽度记忆
- **悬浮球**：侧边可拖动入口按钮，可随时开关
- **记忆**：面板位置/尺寸/停靠模式/预览高度/悬浮球开关全部本地记忆（localStorage）

---

## 1. 使用指南

### 前置依赖

- DSH Web profile（持久 Client，`dsh.client.platform: web`）
- peer 依赖：
  - `@deepseek-ai/dsh-typert-protocol@^0.1.0-rc.6`（v1.2.0 起改为 peerDependency，与 gateway 共享同一模块实例——Remote 标记的 WeakMap 按模块实例隔离，独立副本会导致桥接失效）
- DSH Web client 注入（`dsh.client.inject`）：
  - `@deepseek-ai/dsh-client-runtime`
  - `@deepseek-ai/dsh-client-connection`
  - `@deepseek-ai/dsh-api-gateway`
  - `@deepseek-ai/dsh-typert-registry`
  - `@deepseek-ai/dsh-client-ui-slots`
- Host 运行时宿主能力（`ctx.get`）：`fs`、`agents`、`workspaceRegistry`、`sandboxPolicy`
- v1.2+ 官方安装方式需 pnpm（`npm install -g pnpm`）

### 安装命令

官方方式（v1.2+ 推荐）：

```bash
dsh plugin --profile web add github:Zalpha263/dsh-file-explorer
```

已发布到 npm 后可直接：

```bash
dsh plugin --profile web add dsh-file-explorer
```

装完重启 DSH。升级/卸载：

```bash
dsh plugin --profile web update/remove dsh-file-explorer
```

手动方式（v1.2 之前，需两份同步副本）见仓库 README「手动方式」章节，涉及 profile 副本 + dsh 安装目录副本 + `@deepseek-ai` junction + `cordis.patch.yml` 注册行。

### 配置项

| 来源 | 字段 |
|---|---|
| `package.json` 的 `dsh.client` | `platform: web`、`inject`（5 个 `@deepseek-ai/*` 命名空间，**绝不包含 `remote.fileExplorer`**——命名空间由本入口自己挂载，静态注入会自锁） |
| `package.json` 的 `dsh.bundle` | `patch`（`./cordis.patch.yml`） |
| `cordis.patch.yml` | `insert` 一行：`{ id: file-explorer, name: dsh-file-explorer }` |
| 运行时 localStorage | 面板位置 / 尺寸 / 停靠模式 / 预览高度 / 悬浮球开关 |
| Host `fsRead` 参数 | `path`（必填）、`maxBytes`（可选，默认 512KB，下限 1KB，上限 2MB） |

### 典型用法示例

**入口**（README「入口」）：

- 会话标题栏右侧「📁 文件」按钮
- 侧边悬浮球「📁」（可拖动，工具栏「🪁 悬浮球」可开关）

**Host Remote 方法**（源码 `lib/index.js` `FileExplorerService`，经 Typert Gateway `/api` RPC 暴露）：

| 方法 | 作用 |
|---|---|
| `fsList(path)` | 列出一层目录（目录在前、文件带大小） |
| `fsRead(path, maxBytes)` | 读文件内容（默认 512KB，超出截断 `truncated: true`，二进制 `binary: true`） |
| `wsRoot()` | 取最近活跃工作区根（`runningCwd` → `recentCwd` → `agents.roots()` → `workspaceRegistry.list()` → `sandboxPolicy.workspaceRoot` 兜底） |
| `wsList()` | 列出所有工作区（`workspaceRegistry.list()`） |

工作区自动跟随机制：Host 监听 `agent/status` 与 `session/event` 事件，从 `session.header.cwd` 更新 `runningCwd` / `recentCwd`；Client 用 DOM 探测 + Host 信号双保险，约 1 秒内切换。

### 重启生效说明

!!! tip "安装后需重启 DSH"
    装完插件后重启 `dsh web`，会话标题栏右侧「📁 文件」按钮与悬浮球才会出现。

!!! tip "v1.2+ 用官方 dsh plugin add，避免两份副本同步问题"
    v1.2.0 起支持 `dsh.bundle.patch` + 自带 `cordis.patch.yml`，由 `dsh plugin add` 统一管理；v1.2 之前的手动方式需同步 profile 与 dsh 安装目录两份副本，易出错。

!!! tip "localStorage 记忆全部 UI 状态"
    面板位置 / 尺寸 / 停靠模式 / 预览高度 / 悬浮球开关都本地记忆，刷新后恢复。

---

## 2. 弊端与缺陷

!!! warning "cordis.patch.yml 曾被意外清空（机制未定位）"
    `cordis.patch.yml` 的 `file-explorer` 行曾被意外清空，导致 Host 半区未加载 → `fileExplorer` 服务不存在 → Client 等 `remote.fileExplorer` 永久 pending → `web boot: 1 entry did not activate`。重启前请确认 `file-explorer` 行仍在。出处：README「架构」末段、「升级注意事项」。

!!! warning "v1.2 之前手动安装需同步两份副本"
    dsh 的持久插件需要两份同步副本（宿主行从 profile 目录解析，client 模块扫描从 dsh 安装目录解析）；任何 `lib/` 改动都必须同步两份副本，否则行为不一致。v1.2+ 用 `dsh plugin add` 后由官方机制管理。出处：README「手动方式」、「升级注意事项」。

!!! warning "dsh 升级会清空 dsh 安装目录"
    dsh 升级会清空 dsh 安装目录：需重新复制 dsh 副本；若 junction 目标失效（`@deepseek-ae` 目录被清），需重建 junction。出处：README「升级注意事项」。

!!! warning "dsh 版本升级后 CSS 混淆类名可能变化"
    CSS 中 `.pI_x6G_frame` 等混淆类名可能变化（侧边栏宽度探测的兜底路径），行为通常不受影响；但若侧边栏宽度探测失效需检查此处。出处：README「升级注意事项」。

!!! warning "Remote 标记依赖 dsh-typert-protocol 导出形状"
    Remote 标记采用手动装饰器上下文方式（`lib/index.js` 中 `markRemote`），不依赖 Node 装饰器语法；升级 dsh 时若 `dsh-typert-protocol` 的 `Remote` / `bindTypertRemote` 导出变化，需同步适配。出处：README「升级注意事项」、源码 `lib/index.js` 注释。

!!! warning "临时动态版与持久版会注册同名 Slot"
    临时动态版（fexp-1）与持久版会注册同名 Slot；持久版生效后应停止/移除临时版（重启后临时版自然消失），否则 Slot 冲突。出处：README「升级注意事项」。

!!! warning "Gateway 从方法源码解析参数名，禁用解构/默认值/rest"
    Gateway 从函数源码解析参数名作为 wire 名；方法签名必须是简单标识符参数，不能用解构、默认值或 rest。这是 Host 半区的方法编写约束。出处：源码 `lib/index.js` 顶部注释。

!!! warning "Client 必须用 ctx.get('remote.fileExplorer')，属性访问会抛错"
    Client 必须用 `ctx.get("remote.fileExplorer")` 取命名空间；属性访问 `ctx.remote.fileExplorer` 走 fiber 祖先链解析，对自挂载命名空间会抛错并导致面板条目崩溃退役。`inject` 也绝不能声明 `remote.fileExplorer`，否则静态注入会自锁。出处：README「架构（v2）」。

!!! warning "文件预览有大小上限（默认 512KB，上限 2MB）"
    `fsRead` 默认 `DEFAULT_MAX_BYTES = 512 * 1024`（512KB），可由调用方传 `maxBytes` 调整，下限 1KB，上限 `MAX_BYTES_CAP = 2 * 1024 * 1024`（2MB）；超出截断返回 `truncated: true`，二进制（含 `\0`）返回 `binary: true` 不显示文本。出处：源码 `lib/index.js`。

!!! warning "工作区自动跟随有约 1 秒延迟"
    切换会话/工作区后约 1 秒内自动切换到对应目录树（DOM 探测 + Host 信号双保险），非瞬时。出处：README「功能」。

!!! warning "零 React hooks，无 timer 服务"
    Client 半区零 React hooks（原生 DOM 渲染）；无 `timer` 服务 → 原生 `setInterval` + 清理。这限制了与依赖 React hooks 的其他 Client 插件复用组件的可能。出处：README「架构（v2）」。

---

## 3. 后续拓展思路

### 可二次开发的方向

- **文件编辑能力**：当前仅预览（`fsRead`），可扩展 `fsWrite` / `fsDelete` 方法，配合 diff 视图实现轻量编辑。
- **语法高亮**：源码 `lib/client.js` 的 `.fexp-pre` 当前是纯文本 `<pre>`，可接入 shiki / highlight.js 按扩展名高亮。
- **大文件流式读取**：把 `MAX_BYTES_CAP` 2MB 上限改为分块流式读取（前 N KB + 「加载更多」），避免截断。
- **工作区自动跟随即时化**：把约 1 秒延迟缩短为事件驱动（Host 信号一到位即切换，不再等 DOM 探测兜底）。
- **多 tab 预览**：预览区改为多 tab，支持同时打开多个文件对比。
- **文件搜索 / grep**：在目录树基础上加文件名搜索与内容 grep（依赖 Host 新增 `fsSearch` 方法）。

### 可对接的 DSH 能力

- **Typert Remote 桥**：本插件是「Client 自挂载命名空间 + Host `TypertRemoteService` 自动注册」的范本（v2 架构），可作为其他需要 Host ↔ Client 双向通信的持久插件参考实现。关键陷阱（`ctx.get` vs 属性访问、`inject` 不能含自挂载命名空间）已记录在 README，可直接复用。
- **skill**：当前 `dsh.client.inject` 含 `dsh-client-ui-slots` 但未声明 `contributes.skills`；可后续封装「打开文件浏览器」「跳转到指定文件」等操作为 Skill，由 Agent 自然语言触发。
- **hooks**：`agent/status` 与 `session/event` 事件监听是 hooks 的标准用法；可扩展为文件被选中时通过 hooks 把当前文件路径注入会话上下文。

### 与其它插件组合的可能性

- **dsh-file-explorer + dsh-web-preview-float**：file-explorer 负责目录树与文件跳转，web-preview-float 的代码窗负责 dev server 预览；两者互补形成 IDE 式侧栏 + 预览窗体验。注意两者都有文件树，需明确分工避免重复。
- **dsh-file-explorer + dsh-science-workbench**：用 file-explorer 浏览 `bio-projects/<name>/` 项目目录，查看 `code/` / `figures/` / `manifest.json` 等产物，与「分析工作台」tab 互补。
- **dsh-file-explorer + dsh-easyssh**：file-explorer 浏览本地工作区，easyssh 浏览远程服务器文件系统；两者组合可形成本地 + 远程双面板文件管理。
- **dsh-file-explorer + dsh-agent-plugins**：file-explorer 可作为已装入 Agent Plugins 包的源码浏览器，方便查看 `skills/*/SKILL.md` 与 `mcp.json` 内容。
