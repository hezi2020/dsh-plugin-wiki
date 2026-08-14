# Session 与 Trajectory 可观测性

DeepSeek Harness 的 session 是一个 **append-only 的事件日志**，是 agent 完整交互历史的唯一事实来源。Trajectory 视图、resume、fork、search、replay 都从同一事件流派生。本页介绍其结构与可用操作。

## Append-only Session 日志

一个 `Session` 是有类型的 `SessionEvent` 的只追加日志。**LLM 消息历史是从日志派生的，绝不单独存储**；replay 就是从同一批事件重新派生。

!!! tip "Model-visible ⟺ logged"
    任何到达模型请求的内容，都必须能从 session 日志重建——这是一条运行时不变量。因此一个新的"模型可见输入"必须对应一个新的 session 事件。

### 事件词汇表（`SessionEventMap`）

核心事件类型如下（合并可扩展：插件可通过声明合并追加事件类型）：

| 事件类型 | 说明 |
|---|---|
| `turn/start` / `turn/end` | 回合边界；`turn/end` 携带 `TurnEndReason`（completed/aborted/blocked/error/max-tokens/interrupted） |
| `step/start` / `step/end` | 步骤边界——一次模型调用加上它请求的工具执行 |
| `user/message` | 用户角色消息：直接人工输入、`agent.inject()` 注入上下文（文件变更通知、子目录 AGENTS.md、skill 内容、cron 通知等）、或目标延续轮次；`source` 字段区分三者 |
| `assistant/chunk` | 原始流式分片，保留 token 级回放保真度 |
| `assistant/message` | 一个步骤内组装好的助手消息（派生历史用此）；携带该步骤的 `usage`（token 计费） |
| `tool/call` → `tool/result` | 模型请求的工具调用及其模型可见结果；`callId` 配对二者 |
| `todo/write` | todo 列表整体快照（last-write-wins） |
| `request/header` | 下一次请求的完整头（call 配置 + 系统提示 + 工具 schema），日志内状态 |
| `request/context` | 路由的容量元数据，仅在 provider/model/capacity 变化时记录 |
| `session/end-seed` | 构造 seed 边界标记（resume/fork/replay 时写入） |

!!! note "Surface 类型"
    只有三种**产生消息**的事件类型（`SurfaceEventType`）：`user/message`、`assistant/message`、`tool/result`。它们携带 `surfaceOp`（`append` 或 `replace`）与 `sourceEventSeqs`，决定如何加入有序 surface。其余事件是结构性/日志性的，不进入派生历史。

### 派生历史：`deriveMessages()`

`Session.deriveMessages()` 把事件日志投影为模型看到的 `Message[]`：

- **缓存**：每个 surface node 首次见到时投影一次；surface 重写（`replace`）时重建。
- **冻结**：每次调用返回新数组，但其中 `Message` 对象是共享且深冻结的——无法通过投影改写日志。
- `assistant/chunk` **被跳过**（组装后的 `assistant/message` 才是权威）；空内容的 `assistant/message` 也被跳过。
- 注入上下文（非 `user` source 的 `user/message`）按时间顺序原样进入。

## Trajectory 视图：按 source 查看

Trajectory 视图基于 **session projection**（`ctx.sessionProjections`）——一个 capability seam，域插件注册纯函数单元，框架订阅一次 `session/event` 并把每个提交事件折叠过每个单元。

!!! info "框架驱动，域计算"
    框架订阅一次事件流并驱动 `apply`；域插件只持有数学（三个纯同步函数 `init`/`apply`/`view`），不持有订阅；客户端从不折叠域事件——它们只接收成品值。

按 **source** 查看意味着你可以按事件来源过滤：

- **用户输入** vs **注入上下文**（二者都是 `user/message`，由 `source` 区分）
- **模型回复** vs **原始流式分片**
- **工具调用与结果**（按工具名/调用 id 分组）
- **子代理调度**（通过 subagent 相关事件）
- **回合/步骤边界**与 **turn 结束原因**（`completed`/`aborted`/`error`/`max-tokens` 等）

!!! tip "为什么 raw chunk 也持久化"
    持久化后端必须无损保存每个事件，**包括 `assistant/chunk`**——`seq` 必须连续，chunk 不能从 canonical 日志中过滤掉。这是持久化契约的硬性要求。

## Resume / Fork / Search / Replay

四种操作都基于同一事件流，没有独立的"历史副本"机制。

### Resume（恢复）

恢复一个 session = 用其持久化事件日志作为构造 seed 创建 live session：

- `ctx.sessions.create(id, { seed, meta })` 是底层 replay/fork 原语。
- seed 事件在构造时被验证与快照；`firstLiveSeq` 标记本次生命周期开始写入的位置。
- 构造后立即写入 `session/end-seed` 作为 seed 边界的持久投影。
- 已以 `session/end-seed` 结尾的 seed 不会被重新标记，故重新打开未改动的 session 不会让日志增长。

### Fork（分叉）

`ctx.sessions.fork(source, boundary?, childSessionId?)` 创建 live 子 session：

- 接受 live `Session` 对象或 live `SessionId`。
- `boundary` 是**包含性**的源事件 seq，缺省为源当前最后事件。
- 选定前缀必须**结束在开放回合之外**（否则拒绝，不静默裁剪）。
- 子 session 拥有深克隆的 seed 事件与子元数据（`parentSession`、`seedLength`、继承的 `cwd`）。

!!! note "显式 boundary"
    显式 `boundary` 让调用者从任何稳定的回合间位置分叉——包括某个 `turn/end` 或之后的独立日志事件——即使源已有更新事件或当前回合开放。API 拒绝结束在开放回合内的前缀，而非静默裁剪。

### Search（搜索）

搜索能力由 `dsh-session-query-sqlite`（基于 SQLite 的 session 查询）等持久化插件提供，扫描持久化的事件日志。Session 查询是只读的，作用于存储的事件流。

### Replay（回放）

Replay = **重新派生**：从同一批事件重新走一遍 `deriveMessages()` 与 projection fold。

- 由于消息历史是派生的，replay 不需要"重放模型调用"，只是重新投影日志。
- raw `assistant/chunk` 保留 token 级保真度，使 UI 回放与原始流一致。
- `request/header` 的最新快照可重建请求头；`foldRequestHeader(events)` 选择最新快照。

## 持久化与崩溃恢复

持久化是 session 日志的兄弟关注点（由独立的 persistence seam 提供，如 `dsh-session-persistence-jsonl`）：

- 后端必须**无损**持久化每个事件，包括 `assistant/chunk`，`seq` 连续。
- 后端可选择自己的存储编码，只要 `load` 返回精确的追加事件。
- 所有 `event.data` 必须是 JSON 可序列化的；`Session.append` 在源头强制，坏事件永不入日志。
- 崩溃恢复会关闭遗留的开放 `turn`（合成 `interrupted` 原因），但保留崩溃前记录的事件。

!!! warning "格式版本无兼容承诺"
    预发布阶段 `SESSION_FORMAT_VERSION` 保持为 `0`，**无兼容承诺**。后端拒绝旧的磁盘格式；旧版 v0 日志中的 legacy `request/header-delta` 事件会在 seed/append/load 边界被拒绝，而非不完整回放。

## 跨工具的相关操作

架构文档中"行为去向"表里与 session 直接相关的操作：

| 目标 | 机制 |
|---|---|
| Fork 一个 live session | `ctx.sessions.fork(source, boundary?, childSessionId?)` |
| 添加模型可见上下文 | `agent.inject()`——落入下一个被接纳的请求 |
| 添加持久 session 状态 | 扩展 `SessionEventMap`，从日志渲染与回放 |
| 生成 session 标题 | 注册唯一的 `ctx.sessionTitle` provider |

## 下一步

- [Web UI 使用指南](web-ui.md) —— Trajectory 视图的入口
- [运行时模式](runtime-modes.md) —— 不同模式产生不同工具事件
- [配置与 Profile](configuration.md) —— 持久化与 session 查询插件在 profile 中的位置
- [CLI 命令](cli.md) —— headless 模式跑的就是一次全新持久化 session
