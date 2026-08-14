# dsh-context

> **插件名**：dsh-context（DSH Context 洞察面板）
> **来源仓库**：<https://github.com/bowenliang123/dsh-context>
> **许可证**：Apache-2.0（Copyright 2025 bowenliang123）
> **commit SHA**：`f13bddd`（前 7 位）

DeepSeek Harness 的 Context 洞察面板：在 Web UI 中添加 Context tab（紧邻 Chat 与 Trajectory），让模型上下文窗口的构成与演化变得可观察——六大类构成、逐请求历史、压缩/注入事件、逐消息 token 成本。UI 双语（中文/English）自动跟随 dsh locale。

---

## 1. 使用指南

### 前置依赖

- DeepSeek Harness 任意可启动 `dsh web` 的版本（`web` profile 在首次使用时自动创建）
- 浏览器：官方 Web UI
- 从源码开发：pnpm（项目是 pnpm workspace root，`pnpm install` 不会向上走进父 workspace）
- 运行时无依赖（host 半与 client 半均零运行时依赖）

### 安装命令

一行命令，从任意 DeepSeek Harness 安装中执行（`web` profile 是 `dsh web` 启动的 profile，首次使用时自动创建）：

```sh
dsh plugin --profile web add dsh-context
```

然后启动 web UI 并打开任一会话，**上下文 / Context** tab 会出现在 Chat 与 Trajectory 旁边：

```sh
dsh web
```

从源码 checkout 运行 dsh 时，命令前需加 `pnpm`：

```sh
pnpm dsh plugin --profile web add dsh-context
```

从仓库 checkout 开发安装：

```sh
dsh plugin --profile <name> add .
```

### 配置项

| 来源 | 字段 |
|---|---|
| 源材料未提及 | 该插件为只读洞察面板，README 与 package.json 未声明用户可配置项；插件行为固定：tab 打开时每 2 秒刷新数据 |

### 典型用法示例

打开任一会话，点击 Chat 与 Trajectory 右侧的 **上下文 / Context**。tab 打开时数据每 2 秒刷新；切换会话即切换到该会话的日志视图（含历史持久化会话）。

- **总览条**：六大类（system prompt / tool schemas / 你的消息 / 注入上下文 / 助手回复 / 工具结果）的堆叠条，按模型上下文窗口缩放（灰色轨道为剩余 headroom），下方列出最贵的前 5 个 tool schema。
- **历史**：每个模型请求一条堆叠条（比按 turn 更细），带 Y 轴刻度与网格线。点击任一条查看完整分解，包括 **provider 上报**的 prompt/output token（与估算并列）。✂ 标记压缩/裁剪发生位置——可观察条柱下降。
- **Context 事件**：压缩、工具输出裁剪、skill 注入（如 `Skill injected (code-review)`）、插件 context 注入、模型切换——每条带 token delta 与时间戳。
- **消息**：当前模型可见面，逐消息显示 token 成本。

操作技巧：**悬停**历史条查看快速 tooltip；**点击**它把分解钉在图表下方。总览条按模型上下文窗口缩放，~13% 满即 ~13% 窗口已被占用。

### 重启生效说明

!!! tip "无需重启即可生效"
    dsh-context 作为 dsh bundle 发布（npm 包含 `dsh.bundle` manifest 与 `dsh.client` manifest），无构建步骤、无需重启——一行命令安装进 `web` profile（或任意用 `dsh --profile <name>` 启动的 profile）。`dsh-context` loader 行激活 host 半，web app 拾取包的 `./client` bundle 并为每个会话视图添加 **上下文 / Context** tab。

---

## 2. 弊端与缺陷

!!! warning "token 数为估算，非 provider 真实计量"
    估算使用与 dsh 内置 tokenMeter 相同的固定密度启发式（~4 字符 ≈ 1 token），与 harness 自身统计对齐；只有在 provider 上报真实用量时才显示为 "actual"。估算与真实用量可能存在偏差。出处：README「Usage」。

!!! warning "数据来源依赖会话事件日志"
    实时会话直接从内存日志 `sessions.get(id).events` 折叠（不克隆、不读盘）；持久化会话回退到 `sessionQuery.readSession`。会话日志缺失或格式异常时面板无数据。出处：README「How it works」。

!!! warning "每 2 秒轮询刷新，非实时推送"
    tab 打开时数据每 2 秒刷新一次；非实时推送，存在至多 2 秒延迟。出处：README「Usage」。

!!! warning "仅面向 web profile，不提供 host 端用户配置项"
    插件 `dsh.client.platform: web`，只面向 `web` profile 的 Web UI；README 与 package.json 未声明用户可配置项。出处：package.json `dsh.client.platform`、README。

---

## 3. 后续拓展思路

### 可二次开发的方向

- **阈值告警**：当前面板只展示历史与构成，可扩展为当某类（如 tool schemas）占比超过阈值时触发告警，避免上下文预算被无声吃光。
- **压缩策略建议**：基于历史压缩事件与 token delta，可扩展为建议何时该压缩、压缩哪类内容（如裁剪哪些 tool result），从可观察迈向可建议。
- **跨会话对比**：当前仅展示单会话，可扩展为多会话上下文预算对比视图，找出"耗 token 大户"会话。
- **导出报告**：可把 Context 历史与事件导出为 JSON/CSV，便于离线分析与团队复盘。

### 可对接的 DSH 能力

- **skill**：可把"查看某会话上下文构成""导出 context 报告"封装为 DSH Skill，由 Agent 自然语言触发；Agent 在回答中可引用 context 占比数据。
- **hooks**：压缩/注入事件可经 hooks 触发外部记录，与 dsh-context 的事件流形成双写保障。
- **self-modification**：dsh-context 让上下文演化"可观察"，可作为 self-modification 的反馈回路——Agent 基于真实 context 占比决定是否主动压缩、切换模型或裁剪工具结果。

### 与其它插件组合的可能性

- **dsh-context + dsh-auto-memory**：auto-memory 的项目笔记与每日日志作为"注入上下文"的一部分，可在 dsh-context 中观察其对 context 预算的占用，反向调优记忆注入策略。
- **dsh-context + dsh-session-hub**：会话枢纽聚合多机远端会话后，dsh-context 可对比不同机器上同类会话的 context 构成差异，定位环境差异。
- **dsh-context + dsh-mcp-panel**：MCP 工具的 schema 是 tool schemas 类的重要来源，二者组合可定位"哪个 MCP 工具的 schema 最耗 token"，为精简 MCP 提供依据。
- **dsh-context + dsh-notification-center**：当 context 占比超过阈值（如 90%）时由通知中心推送浏览器通知，避免用户错过压缩时机。
