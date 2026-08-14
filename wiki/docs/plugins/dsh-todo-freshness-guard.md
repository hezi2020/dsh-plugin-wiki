# dsh-todo-freshness-guard

> **插件名**：dsh-todo-freshness-guard（DSH 待办新鲜度守卫）
> **来源仓库**：<https://github.com/lamost423/dsh-todo-freshness-guard>
> **许可证**：MIT（Copyright (c) 2026 DeepSeek；衍生部分遵守 DeepSeek Harness MIT 许可，见 NOTICE）
> **commit SHA**：`8d7a23c`（前 7 位）

DSH 仓库外 Guard。Agent 在长任务中可能持续调用工具却不更新未完成的 `todo_write` 列表，导致用户看到的计划与真实执行状态脱节。本插件先提醒模型重新同步完整 Todo 列表；列表继续过期时，再阻塞普通工具调用。`todo_write` 与外层 `run_code` 始终可用。

---

## 1. 使用指南

### 前置依赖

- DeepSeek Harness `0.1.0-rc.6`（仅兼容该版本）
- Node.js `^22.19.0 || >=24.0.0`
- 可选 peer 依赖（均 optional）：`@deepseek-ai/cordis`、`@deepseek-ai/dsh-agent`、`@deepseek-ai/dsh-invariants`、`@deepseek-ai/dsh-llm`、`@deepseek-ai/dsh-session`、`@deepseek-ai/dsh-tools`
- 运行时依赖：`@deepseek-ai/schemastery`

### 安装命令

```sh
# 1. 安装兼容版本的 DSH CLI
npm install --global @deepseek-ai/dsh@0.1.0-rc.6

# 2a. 从 Release 压缩包安装（推荐）
dsh plugin --profile web add https://github.com/lamost423/dsh-todo-freshness-guard/releases/download/v0.1.1/dsh-todo-freshness-guard-0.1.1.tgz

# 2b. 或从工作副本安装
git clone https://github.com/lamost423/dsh-todo-freshness-guard.git
cd dsh-todo-freshness-guard
corepack enable
pnpm install --frozen-lockfile
pnpm build
dsh plugin --profile web add .

# 3. 启动
dsh web

# 移除
dsh plugin --profile web remove dsh-todo-freshness-guard
```

### 配置项

| 字段 | 默认 | 约束 | 说明 |
|---|---|---|---|
| `reminderAfterCalls` | `5` | 正整数 | 达到时向模型注入一次提醒，要求重新同步完整 Todo 列表 |
| `blockAfterCalls` | `8` | 正整数，必须大于 `reminderAfterCalls` | 超过后拒绝普通工具，直到新的完整 `todo_write` 替换旧列表 |

- 后加载的 Profile 或命令行 Patch 可覆盖这两个值。
- 原生调用与 Code Mode SDK 子调用共用计数器。
- `todo_write` 始终可用；外层 `run_code` 始终可用（保证 Code Mode 能调用 `todo_write`）。
- Todo 列表为空或全部完成时，约束自动关闭。

### 典型用法示例

**触发场景**：Agent 在长任务中连续调用工具（读文件、跑命令）却迟迟不更新 `todo_write`。

- 第 5 次（`reminderAfterCalls`）非记账类工具调用后，Guard 向模型注入一条提醒，要求重新同步完整 Todo 列表。
- 若模型仍不更新，第 8 次（`blockAfterCalls`）后普通工具被拒绝，Agent 被迫先调用 `todo_write` 重新同步状态。
- Code Mode 下 SDK 子调用同样计数；`todo_write` 与外层 `run_code` 不受阻塞，保证恢复通道畅通。

### 验证

```sh
pnpm check                                     # typecheck + test + build
pnpm pack --pack-destination /tmp              # 验证发布压缩包
```

测试覆盖原生模式、Code Mode、并发重置、Loader 组合、发布压缩包 Bundle 契约，以及通过官方 DSH `0.1.0-rc.6` 完成真实 Web 启动。

### 重启生效说明

!!! tip "配置变更需重启 profile"
    `reminderAfterCalls` / `blockAfterCalls` 通过 `cordis.patch.yml` 注入，修改 Profile Patch 或命令行 Patch 后需重启 `dsh web` 生效。Todo 列表为空或全部完成时约束自动关闭，无需手动调整。

---

## 2. 弊端与缺陷

!!! warning "仅兼容 DSH 0.1.0-rc.6，跨版本升级需重新验证"
    peer 依赖锁在 `>=0.1.0-rc.6 <0.2.0` 区间，DSH 升级到 0.2.x 或更高版本时本 Guard 可能失效，需作者重新发版对齐。出处：README「Compatibility / 兼容范围」、`package.json` peerDependencies。

!!! warning "社区预览版，非稳定发布"
    当前状态为 community preview，API 与行为可能随反馈调整，不建议用于不可中断的关键流程。出处：README「Compatibility / 兼容范围」。

!!! warning "Guard 介入期间普通工具被拒，可能阻塞 Agent"
    超过 `blockAfterCalls` 后普通工具会被拒绝直到 `todo_write` 重新同步。若 Agent 陷入"不更新 Todo 却需调用工具完成工作"的死循环（例如模型不理解提醒语义），会被本 Guard 阻塞；`todo_write` 与 `run_code` 始终可用是唯一的恢复通道。出处：README「Behavior / 行为」。

!!! warning "不修复文件系统 Write 工具的同类问题"
    本插件只针对 `todo_write` 状态长期不更新；文件系统 Write 工具的同类新鲜度问题不在范围内。出处：README「Behavior / 行为」末尾声明。

---

## 3. 后续拓展思路

### 可二次开发的方向

- **阈值自适应**：当前 `reminderAfterCalls` / `blockAfterCalls` 为静态阈值，可改为按任务类型/会话长度动态调整——短任务用更紧的阈值，长重构任务适当放宽，减少误阻塞。
- **可观测性**：在 DSH Web 增加一个轻量指示器，展示当前 Session 的非记账工具计数、是否已触发提醒/阻塞，让用户看到 Guard 介入时机，而非只看到工具被拒。
- **多 Guard 组合**：将"提醒 + 阻塞"骨架抽象为通用 Guard 模式，复用到其他需要"状态过期即介入"的场景（如长任务中 `plan` 长期不更新、`context` 长期不压缩）。

### 可对接的 DSH 能力

- **hooks**：Guard 触发提醒/阻塞时可经 hooks 推送外部通知（如飞书/Slack 提醒"Agent 已 N 步未更新 Todo"），让长任务的失控可见化。
- **invariants**：本 Guard 本质是对 Agent 行为的不变量约束，可与 `@deepseek-ai/dsh-invariants` 体系对齐，沉淀为可声明式配置的不变量规则。

### 与其它插件组合的可能性

- **dsh-todo-freshness-guard + dsh-feishu-bot**：飞书 bot 可将 Guard 的"已提醒/已阻塞"事件作为审批卡片推送给用户，远程决定是否手动放行某次工具调用，避免 Agent 在无人值守时被 Guard 卡死。
- **dsh-todo-freshness-guard + dsh-lark-meeting-notifier**：会议提醒闪烁与 Guard 阻塞都是"打断式提醒"，可统一一套闪烁/通知优先级策略，避免会议临近时 Guard 还在阻塞关键工具调用。
