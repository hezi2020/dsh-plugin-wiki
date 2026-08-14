# dsh-attention-notifier

> **插件名**：dsh-attention-notifier（DSH Attention Notifier，任务栏注意力提醒判定端）
> **来源仓库**：<https://github.com/zdjmrq/dsh-attention-notifier>
> **许可证**：MIT（Copyright (c) 2026 zdjmrq）
> **commit SHA**：`94a01ff`（前 7 位）

给 DeepSeek Harness 添加"微信式"任务栏注意力提醒的持久化 Cordis 插件（宿主半/判定端）。当会话需要你介入（审批/提问挂起超过 1 秒）或一轮工作完成（agent running → idle）时，把状态聚合到 `GET /dsh-attention` JSON 端点，由桌面壳（如 dsh-shell）呈现为任务栏闪烁（闪几轮后常驻淡红，微信新消息同款）。只做判定、不碰 UI、不发布任何服务；作为 agent preset 的一行加载，随 DSH 重启自动生效。

---

## 1. 使用指南

### 前置依赖

- DeepSeek Harness（dsh）已安装，宿主组合层（Web 组合 patch）可加载 Cordis 插件
- 宿主服务：`webServer`、`agents`、`timer`（插件 `inject: ['webServer', 'agents', 'timer']`，加载器会等这些服务就绪后才激活）
- 推荐配合桌面壳 [zdjmrq/dsh-shell](https://github.com/zdjmrq/dsh-shell) 呈现任务栏闪烁（preload 桥 + 页面轮询 + 任务栏闪烁）

### 安装命令

插件挂载在 Web 组合的 patch 层，DSH 启动时自动加载，所有预设、所有会话自动生效，无需在每个预设里加行，也无需任何"启用"操作：

```powershell
# 1. 把 attention-plugin.mjs 放到 ~/.dsh/plugins/（没有就新建）
New-Item -ItemType Directory -Path "$env:USERPROFILE\.dsh\plugins" -Force
Copy-Item attention-plugin.mjs "$env:USERPROFILE\.dsh\plugins\"

# 2. 编辑 ~/.dsh/profiles/web/cordis.patch.yml，把内容 [] 替换为：
# - insert:
#     - id: attention-notifier
#       name: 'file:///C:/Users/<你的用户名>/.dsh/plugins/attention-plugin.mjs'

# 3. 重启 DSH（关壳重开，或重启 pnpm dsh web）
```

备选：按预设安装——只想给特定预设加提醒时，把 `attention-plugin.mjs` 复制进该预设目录，并在其 `agent.cordis.yml` 末尾追加：

```yaml
- id: attention-notifier
  name: './attention-plugin.mjs'
```

### 配置项

| 来源 | 字段 |
|---|---|
| 源材料未提及 | 该插件为判定端，无用户可配置项；行为固定：审批/提问挂起超过 1 秒视为"需要介入"，agent running → idle 视为"一轮完成" |

### 典型用法示例

- **验证端点**：
  ```powershell
  Invoke-WebRequest http://127.0.0.1:3080/dsh-attention
  # {"intervention":false,"running":false,"completedId":0,"completedAt":0,"stats":{...}}
  ```
  - `stats.sessions` 应为 1（本会话已挂载）；
  - 提问/审批挂起时 `intervention` 变为 `true`，`stats.questions/approvals` 递增；
  - 一轮工作结束后 `completedId` 递增。
- **呈现侧"你不在"判定（以 dsh-shell 为例）**：
  - 窗口失焦/最小化，或聚焦但超过 8 秒没有任何操作（鼠标/键盘/滚轮/触摸）；
  - 回到对话（窗口聚焦，或窗口内任意操作）立即熄灭；
  - 完成事件若发生在你正活跃地看着窗口时，视为已看到，不闪。

### 重启生效说明

!!! tip "安装后必须重启 DSH"
    安装/修改 `cordis.patch.yml` 后必须重启 DSH（关壳重开，或重启 `pnpm dsh web`）才能生效；无其他步骤。作为持久化 Cordis 插件，重启后随 DSH 自动加载。

!!! tip "Windows 下 name 必须用 file:/// 绝对 URL"
    Windows 下 `name` 必须用 `file:///` 绝对 URL：`C:/...` 形式会被 Node ESM 当作 scheme 为 `c:` 的 URL 而拒绝导入，导致启动失败。务必使用 `file:///C:/Users/<你的用户名>/.dsh/plugins/attention-plugin.mjs` 形式。

---

## 2. 弊端与缺陷

!!! warning "只做判定，不呈现 UI，依赖桌面壳"
    插件只判定状态并输出 `GET /dsh-attention` JSON 端点，不碰任何 UI；任务栏闪烁需配合桌面壳（如 dsh-shell）的 preload 桥 + 页面轮询实现。无桌面壳时插件端点无人消费，提醒无法呈现。出处：README「功能」「工作原理」。

!!! warning "1 秒轮询补线，存在至多 1 秒延迟"
    启动时 agent 尚未创建，1 秒轮询持续补线新出现的根 agent（新会话/恢复会话都会产生新 agent 对象）、清理已销毁的 agent；存在至多 1 秒延迟。出处：README「工作原理」、`attention-plugin.mjs` 注释。

!!! warning "审批/提问挂起阈值固定 1 秒，不可配置"
    `HOSTAGE_MS = 1000` 硬编码，机器秒答的审批不会误报，但阈值不可配置；用户无法根据自己节奏调整。出处：`attention-plugin.mjs` 第 27 行。

!!! warning "Windows 下 name 必须用 file:/// 绝对 URL，配置错误会启动失败"
    Windows 下 `name` 必须用 `file:///` 绝对 URL：`C:/...` 形式会被 Node ESM 当作 scheme 为 `c:` 的 URL 而拒绝导入，导致启动失败。用户路径配置错误会直接启动失败。出处：README「安装」、`attention-plugin.mjs` 注释。

!!! warning "硬依赖宿主三个服务，服务异常时不生效"
    硬依赖 `webServer`、`agents`、`timer`，加载器会等这些服务就绪后才激活；服务异常时插件不生效，且无明显错误提示。出处：`attention-plugin.mjs` 第 71 行。

!!! warning "只观察不代答，waterfall 一律调用 next()"
    监听 `approval/request` 与 `tools/execute`（介入）只观察不代答，waterfall 一律调用 `next()`；这是设计纪律但意味着插件不会改变任何审批流，纯被动判定。出处：README「工作原理」、`attention-plugin.mjs` 第 105-132 行。

---

## 3. 后续拓展思路

### 可二次开发的方向

- **阈值可配置化**：当前 `HOSTAGE_MS = 1000` 硬编码，可扩展为通过 `cordis.patch.yml` 或环境变量配置，适配不同用户节奏。
- **多端点呈现**：当前仅输出 `GET /dsh-attention` JSON 端点，可扩展为支持 SSE/WebSocket 推送，降低桌面壳轮询压力，提升实时性。
- **事件分类细化**：当前只判定"需要介入"与"一轮完成"两类，可扩展为区分审批/提问/工作完成/报错等更多事件类型，让呈现侧能差异化提醒。
- **跨平台桌面壳**：当前推荐 dsh-shell 呈现，可扩展为支持 macOS/Linux 桌面通知（如 notification center、libnotify），实现跨平台任务栏提醒。

### 可对接的 DSH 能力

- **skill**：可把"查询当前 attention 状态""重置 stats 计数"封装为 DSH Skill，由 Agent 自然语言触发自诊断。
- **hooks**：attention-notifier 本身就是 hooks 的判定端——`agent/status`、`approval/request`、`tools/execute` 事件已被消费；可与其他插件的 hooks 联动，如完成事件触发 auto-memory 的每日反思。
- **self-modification**：基于 `stats` 自诊断计数（approvals/questions/completions），Agent 可自主学习用户的工作节奏（如"用户经常在 1 秒内秒答审批"），动态调整 `HOSTAGE_MS` 阈值。

### 与其它插件组合的可能性

- **dsh-attention-notifier + dsh-notification-center**：任务栏提醒 + 浏览器通知双通道，前者覆盖切到其他应用的场景，后者覆盖切到其他浏览器标签页的场景，互补兜底——这是 dsh-notification-center 文档中已建议的组合。
- **dsh-attention-notifier + dsh-session-hub**：会话枢纽聚合多机远端会话后，attention-notifier 可判定远端会话的介入需求，配合桌面壳实现跨机任务栏提醒。
- **dsh-attention-notifier + dsh-auto-memory**：auto-memory 的"离开超过 1 小时再打开显示欢迎回来"机制可与 attention-notifier 的"你不在"判定联动，统一用户离开/回归的感知逻辑。
- **dsh-attention-notifier + dsh-shell**：这是 README 明确推荐的组合——attention-notifier 做判定端，dsh-shell 做呈现端，二者通过 `GET /dsh-attention` 端点解耦。
