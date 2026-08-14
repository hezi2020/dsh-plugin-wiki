# dsh-archived-conversations

> **插件名**：hxyz-dsh-archived-conversations（归档对话查看 / archived-conversation-viewer）
> **来源仓库**：<https://github.com/hxyz486/dsh-archived-conversations>
> **许可证**：MIT（Copyright (c) 2025 hxyz486；仓库根 LICENSE 文件）
> **commit SHA**：`d00f90b`（前 7 位 `d00f90b`）

一个 DSH Web（Cordis）组合插件：在设置页查看归档会话，支持按工作区分组、一键恢复与彻底删除。刷新页面和重启 DSH 后依然保留。归档入口是侧边栏会话行菜单 →「归档」，归档后会话从列表消失进入归档集合，可在 设置 →「归档会话」中查看、恢复或删除。

---

## 1. 使用指南

### 前置依赖

- DSH Web（Cordis）宿主，需提供以下 inject 服务（`index.js` `inject` 声明）：
  - `workspaceRegistry`（归档集合/工作区）
  - `sessionQuery`（对话读取、标题快照、会话列表）
  - `sessionPersistence`（日志定位 `sp.locate`、`sp.list`）
  - `typert`（运行时 `ctx.typert.register` 注册严格 Typert 清单）
- 浏览器半场额外依赖（`client.js` 通过 `__ModuleLoader__.load` factory 注入）：
  - `connection.rpc`（`/api` 通道调用 `/api/archivedConversations/*`）
  - `slots`（`settings.section` 与 `settings.plugin.item` 槽位）
  - `sessions.refresh` / `workspaces.refresh`（删除/恢复后刷新侧栏基线）
  - `react`（由 `require('react')` 在 factory 内获取）
- peerDependencies：`@deepseek-ai/dsh-typert-protocol: *`、`zod: *`（由宿主或用户安装）
- 删除日志依赖 PowerShell：`subprocess.resolveExecutable('pwsh')` 或 `powershell`（Windows 环境下）

### 安装命令

本仓库无 `dsh.plugin.json`，也无 `dsh.bundle.patch` 字段；安装方式为手动 `mklink /J` + 编辑 `cordis.patch.yml`（来源：README「安装」）：

1. 将插件目录链接到 DSH profile 的 node_modules（Windows 示例）：

   ```powershell
   cmd /c mklink /J "C:\Users\AA\.dsh\profiles\node_modules\archived-conversation-viewer" "你的插件源码目录"
   ```

   或直接把本仓库克隆/复制到 `C:\Users\AA\.dsh\profiles\node_modules\archived-conversation-viewer`。

2. 在 `C:\Users\AA\.dsh\profiles\web\cordis.patch.yml` 中加入（若已有 `- insert:` 块则合并到其中）：

   ```yaml
   - insert:
       - id: archived-conversation-viewer
         name: 'archived-conversation-viewer'
   ```

3. 重启 DSH Web（`--profile web`），在 设置 → 插件 → 全部 中确认出现 `archived-conversation-viewer`。

### 配置项

无静态配置项。所有行为由源码常量决定：

| 来源 | 字段 |
|---|---|
| `cordis.patch.yml` | `id: archived-conversation-viewer`、`name: 'archived-conversation-viewer'`（insert 一行） |
| `package.json#dsh.client` | `platform: 'web'`（无 inject 列表） |
| `index.js` `inject` | `['workspaceRegistry', 'sessionQuery', 'sessionPersistence', 'typert']` |
| `typert.host.js` TYPERT | 4 个 invocation：`archivedConversations/list`、`/read`、`/restore`、`/deleteSession`（参数 `sessionId`，result schema `z.any()`） |
| `client.js` slots | `settings.section`（id: `archived-sessions`, order: 30, label: '归档会话'）、`settings.plugin.item`（id: `archived-conversations`, order: 30, label: '归档对话查看'） |
| 删除日志命令 | PowerShell `Remove-Item -LiteralPath <dir> -Recurse -Force`（cwd 为父目录，`stdio: 'ignore'` + maxBytes 4096/65536，graceMs 10000） |

### 典型用法示例

**使用入口**（来源：README「使用入口」）：

设置（左下角齿轮）→ **归档会话**

**功能操作**（来源：README「功能」、`client.js` UI 行为）：

- **查看归档会话**：侧边栏会话行菜单 →「归档」后，会话从列表消失，进入归档集合；在设置页可看到按工作区分组的归档列表。
- **按工作区分组**：列表按工作区（含「未分组」）分组，可单独展开/收缩，也可一键全部展开/收起；列表区域可上下滚动。
- **查看对话全文**：点击会话行可展开查看完整对话记录（用户/助手/工具消息，带 seq 与时间戳）。
- **恢复**：点「恢复」按钮把会话从归档集合移出，重新出现在侧边栏；按会话 cwd 匹配工作区路径则挂回原工作区，否则保持"未分组"。
- **删除**：点「删除」按钮（首次点击切换为"确认删除？"，再次点击才执行）彻底清除——移除归档记录、分组归属和本机会话日志目录（`session.jsonl.zstd`），需两次确认，不可恢复。

**Host Remote 端点**（来源：`typert.host.js` TYPERT）：

| 端点 | 参数 | 返回 |
|---|---|---|
| `/api/archivedConversations/list` | 无 | `{ groups: [{ workspaceId, title, path, sessions: [{ sessionId, title, createdAt, orphan }] }] }` |
| `/api/archivedConversations/read` | `sessionId` | `{ sessionId, events: [{ seq, time, kind: 'user'/'assistant'/'tool', text }] }` 或 `{ error }` |
| `/api/archivedConversations/restore` | `sessionId` | `{ ok: true }` 或 `{ error }` |
| `/api/archivedConversations/deleteSession` | `sessionId` | `{ ok: true, note? }` 或 `{ error }` |

### 重启生效说明

!!! tip "组合插件：刷新页面与重启 DSH 后均保留"
    本插件是组合插件（cordis.patch.yml insert），刷新页面与重启 DSH 后均保留；浏览器半场通过 `__DSH_BOOT__` 在页面启动时加载，宿主半场在 dsh 启动时挂载。来源：README 顶部、`index.js` 顶部注释。

!!! tip "删除/恢复后会主动刷新侧栏基线"
    删除或恢复操作完成后，浏览器半场会主动调用 `sessions.refresh()` 与 `workspaces.refresh()`，让 DSH 侧栏的会话列表与工作区基线立即重新拉取，避免被删会话短暂残留在「未分组」（等价于一次 F5 的效果）。来源：`client.js` refreshBaselines 注释。

!!! tip "归档会话面板带刷新按钮"
    面板顶部有「刷新」按钮，可手动重新拉取归档列表；列表区域 max-height 55vh 可上下滚动，方便浏览大量归档会话。来源：`client.js` ArchivedManager UI。

---

## 2. 弊端与缺陷

!!! warning "删除依赖 PowerShell，非 Windows 或未安装时无法彻底删除"
    `deleteSession` 通过 `subprocess.resolveExecutable('pwsh')` 或 `powershell` 调用 `Remove-Item -LiteralPath <dir> -Recurse -Force` 删除日志目录；非 Windows 环境（macOS/Linux）或未安装 PowerShell 时返回 "找不到 PowerShell，无法删除日志文件"，归档记录会保留但日志无法清除。出处：`index.js` deleteSession 中 `sub.resolveExecutable` 调用链。

!!! warning "运行中的会话无法删除"
    `agent.status === 'running'` 时 `deleteSession` 返回错误"该会话正在运行中（正在处理消息），日志文件被占用，无法彻底删除。请等它结束，或先用「恢复」把它移出归档。"；用户需等待 turn 结束或先恢复再删除。出处：`index.js` deleteSession 顶部 agent 状态检查。

!!! warning "驻留进程摘除失败需重启 DSH"
    会话进程仍驻留（idle）且 `sessions.detachEntered` 内部失败时，返回错误"该会话的进程仍驻留在 DSH 中且无法自动释放（内部摘除失败：<detail>）。请重启 DSH 后再删除，或先用「恢复」把它移出归档。"；这是 fail-safe 设计，避免删除时日志文件被占用。出处：`index.js` deleteSession catch 分支。

!!! warning "删除不可恢复，UI 设两次确认但执行后不可逆"
    删除操作会清除归档记录、分组归属和本机会话日志目录（`session.jsonl.zstd`）；UI 设有两次确认（首次点击切换为"确认删除？"，再次点击才执行），但一旦确认执行不可逆。出处：README「功能」、`client.js` del 函数、`index.js` deleteSession。

!!! warning "包名与目录名/patch id 不一致，易混淆"
    `package.json` 的 `name` 为 `hxyz-dsh-archived-conversations`，但 README 标题与 `cordis.patch.yml` insert id 使用 `archived-conversation-viewer`，本地克隆目录名为 `hxyz486-dsh-archived-conversations`（含 GitHub 用户名前缀）；用户安装时需注意 node_modules 目录名（`archived-conversation-viewer`）、patch id（`archived-conversation-viewer`）与 npm 包名（`hxyz-dsh-archived-conversations`）的对应关系。出处：`package.json` name、README 标题、README「安装」示例。

!!! warning "不导出 ./typert，只能由 index.js 运行时注册一次"
    `typert.host.js` 注释明确写"package intentionally does NOT export './typert'：dsh-typert-loader 会重复注册相同 invocations，注册表拒绝重复端点"——意味着 typert 清单只能由 `index.js` 在运行时通过 `ctx.typert.register(TYPERT)` 注册一次，不能走 `dsh-typert-loader` 自动注册路径；若 dsh 升级 typert 注册机制，本插件需同步调整。出处：`typert.host.js` 顶部注释。

!!! warning "恢复时按 cwd 路径匹配工作区，跨平台路径风格可能不匹配"
    恢复会话时若 `header.cwd` 匹配某工作区路径则重新挂回原工作区，否则保持"未分组"；路径归一化用 `[\\/]+` → `\` 并 lowercase，主要面向 Windows 路径风格；macOS/Linux 路径分隔符为 `/`，归一化后路径分隔符仍是 `\`，可能与工作区 path 不匹配导致会话挂不回原工作区。出处：`index.js` restore 中 `norm` 函数。

!!! warning "无 npm 发布，只能本地 mklink /J 或复制安装"
    仓库未发布到 npm，无 `dsh plugin --profile web add <pkg>` 形式的安装命令；必须手动 `mklink /J` 或复制到 `~/.dsh/profiles/node_modules/archived-conversation-viewer`，并编辑 `cordis.patch.yml`；升级需手动拉取新版本覆盖。出处：README「安装」、`package.json`（无 `publishConfig`、`files` 字段）。

---

## 3. 后续拓展思路

### 可二次开发的方向

- **跨平台删除日志**：当前 `deleteSession` 依赖 PowerShell（仅 Windows 友好）；可扩展为优先尝试 Node.js 原生 `fs.rm` 或 `fsPromises.rm`，PowerShell 作为 Windows 上的兜底（避免 DSH 宿主无控制台时新开命令行窗口）。
- **批量恢复/删除**：当前 UI 仅支持逐个会话操作；可增加多选 + 批量恢复/批量删除（批量删除时尤其需要二次确认）。
- **搜索与筛选**：归档列表当前仅按工作区分组；可增加按标题/时间/会话内容搜索，以及按时间范围筛选。
- **导出归档会话**：当前仅支持查看/恢复/删除；可增加"导出为 Markdown / JSON"功能，便于归档会话的离线保存与分享。
- **自动归档策略**：当前归档由用户手动触发；可配置"超过 N 天未活动的会话自动归档"策略。
- **npm 发布与 dsh plugin add**：当前仅支持本地安装；发布到 npm 后可支持 `dsh plugin --profile web add hxyz-dsh-archived-conversations` 形式安装，降低安装门槛。

### 可对接的 DSH 能力

- **Typert Remote 服务**：已注册 `archivedConversations` Remote 服务（`list` / `read` / `restore` / `deleteSession` 4 个 invocation），通过严格 Typert 清单在 `/api/archivedConversations/*` 端点暴露；其他 DSH 工具或插件可直接 RPC 调用这些端点。
- **settings.section 槽位**：已注册进设置页 `settings.section`（id: `archived-sessions`, order: 30），是设置页的一个新分区；其他插件可复用同款模式在设置页增加分区。
- **settings.plugin.item 槽位**：已注册插件卡片（id: `archived-conversations`, order: 30），在 设置 → 插件 → 全部 中展示插件状态卡片。
- **workspaceRegistry / sessionQuery / sessionPersistence**：通过这三个宿主服务访问归档集合、会话查询与日志定位；这是 DSH 宿主的核心数据访问能力，可被其他会话管理类插件复用。

### 与其它插件组合的可能性

- **dsh-archived-conversations + dsh-dynamic-island**：归档/恢复操作可在灵动岛显示状态（如"恢复会话中…"→"恢复完成"），给归档操作以即时反馈；删除时可在岛内显示"删除中…"→"已删除"小票。
- **dsh-archived-conversations + dsh-fleet-audit**：dsh-fleet-audit 扫描凭据文件权限时，可把归档会话日志目录（`session.jsonl.zstd`）纳入扫描范围，确保归档日志权限不过宽。
- **dsh-archived-conversations + dsh-group-photo**：合影墙的"永久纪念版" `archive/index.html` 与归档会话概念相似；可考虑把归档会话导出为静态纪念版（类似合影墙的 export-archive.js）。
- **dsh-archived-conversations + dsh-github-login**：归档会话若涉及 GitHub 操作，可在恢复时检查 GitHub 登录态是否仍有效（通过 `~/.dsh/github-auth.json`），失效则提示重新登录。
