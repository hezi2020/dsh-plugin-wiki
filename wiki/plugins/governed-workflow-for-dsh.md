# governed-workflow-for-dsh

> **插件名**：governed-workflow-for-dsh（npm 包名 `dsh-governed-workflow`）
> **来源仓库**：<https://github.com/zcx369658780/governed-workflow-for-dsh>
> **许可证**：MIT（Copyright (c) 2026 Chenxin Zhang）
> **commit SHA**：前 7 位 `0250cbf`

独立第三方社区插件（与 DeepSeek 无隶属、赞助或背书关系）。策略强制、证据优先的 DSH 治理工作流：把 GPT 下发、builder 执行的开发工作流迁到 DSH——权威 GitHub 任务下发、agent builder 在专用分支实现、reviewer 独立验收。运行时插件让工作流不变式不可绕过，配 `governed-builder` Skill 做指令级引导。

---

## 1. 使用指南

### 前置依赖

- Node.js `^22.19.0 || >=24.0.0`（package.json `engines`）
- DSH 运行时 peerDependencies：`@deepseek-ai/cordis ^4.0.1`、`@deepseek-ai/dsh-session ^0.1.0-rc.6`、`@deepseek-ai/dsh-tools ^0.1.0-rc.6`
- 运行时依赖：`@deepseek-ai/schemastery 3.18.1`
- 包管理器：`pnpm@11.7.0`（package.json `packageManager`）
- git 源安装：pnpm ≥10 首次需 `allowBuilds` 条目

### 安装命令

```sh
# 从 npm（发布后）
dsh plugin --profile demo add dsh-governed-workflow

# 从 git checkout（TypeScript 源经 prepare 脚本构建；pnpm >=10 首次需 allowBuilds 条目）
dsh plugin --profile demo add github:zcx369658780/governed-workflow-for-dsh
```

### 配置项

| 来源 | 字段 |
|---|---|
| profile `cordis.patch.yml`（`governed-workflow` 行） | `authority`：`taskId`、`source`（`config`）、`repository`（`owner/repo`）、`baselineRef`（如 `main`）、`baselineSha`（40 位 commit SHA） |
| profile / `--patch` 覆盖 | 按行 id 覆盖 authority 配置 |

`config` 提供的 reference provider 在加载时观察 authority（`UNINITIALIZED → AUTHORITY_OBSERVED`）；不可用/无效 authority fails closed 并保持生命周期不变。无 secrets、credentials 或个人机器路径进入快照。

### 典型用法示例

```yaml
# 编辑 profile 的 cordis.patch.yml，配置权威任务
- id: governed-workflow
  config:
    authority:
      taskId: issue-5
      source: config
      repository: owner/repo
      baselineRef: main
      baselineSha: 0123456789abcdef0123456789abcdef01234567
```

工作流不变式（V0.4）：当 agent 试图调用 DSH `bash` 工具时，若没有 accepted authority 或治理处于终态（`BLOCKED` / `COMPLETED` / `REVIEW_PENDING`），`ctx.tools.guard()` 单调拒绝。证据事件（`governance/authority-observed`、`governance/authority-rejected`、`governance/lifecycle-transition`）以 non-surface events 追加到显式 `Session`，按序列顺序投影回放用于审计。

### 重启生效说明

!!! tip "authority 配置变更需重启 DSH"
    `authority` 配置改动需重启 DSH 才生效；authority 在加载时观察，运行中不会重读。fails closed 设计：authority 不可用即保持生命周期不变，不会自动放行。

---

## 2. 弊端与缺陷

!!! warning "V0.4 阶段，仅实现首个运行时强制切片"
    当前仅实现 monotonic `ctx.tools.guard()` 拒绝无 accepted authority 或治理处于终态时的 DSH `bash` 工具调用。Git/path/GitHub 强制尚未实现——bash 之外的写路径（如文件写入、git 操作、GitHub API 调用）当前不受 guard 保护。出处：README「Status」、「Architecture」。

!!! warning "durable evidence reload 仍 upstream-blocked"
    当前 DSH 无法标记这些治理事件 `ignorable`，也无外部事件类型的公开运行时注册；DSH 一方持久化 load/resume 会拒绝包含它们的日志——即使装了本插件。内存内 append/replay 可用，但重启后无法恢复治理状态。这是上游能力阻塞，非本插件可解。出处：README「Evidence · Durable-reload-limitation」、docs/dsh-compatibility.md。

!!! warning "证据事件为 non-surface events，审计依赖序列投影"
    `governance/authority-observed`、`governance/authority-rejected`、`governance/lifecycle-transition` 不添加任何 model-visible 消息，按序列顺序投影回放用于审计；记录是 append-only，`flush()` 请求 DSH 持久化 checkpoint（无持久化后端时为 no-op）。审计链不可见模型上下文，需主动查事件日志。出处：README「Evidence」。

!!! warning "独立第三方社区项目，与 DeepSeek 无隶属"
    README 顶部明确声明「Independent community plugin for DeepSeek Harness. Not affiliated with or endorsed by DeepSeek.」；商标见 TRADEMARK_NOTICE.md。无官方背书，依赖 DSH 上游能力（如 ignorable 事件标记）推进才能解阻塞。出处：README 顶部声明、TRADEMARK_NOTICE.md。

---

## 3. 后续拓展思路

### 可二次开发的方向

- **Git/path/GitHub 强制落地**：当前仅 bash guard，可扩展为 git 写操作（commit/push）、文件路径写、GitHub API 调用的 guard，形成全写路径治理。
- **durable reload 破局**：推动 DSH 上游开放外部事件类型的 `ignorable` 标记与运行时注册；或本插件改用 `ctx.storage` KV 存治理状态（参考 dsh-track 做法），绕开 session 事件持久化限制。
- **多 authority 协议**：当前单 authority，可扩展为多 authority（如多 reviewer 并行验收、多 builder 分支隔离），形成团队级治理工作流。

### 可对接的 DSH 能力

- **hooks**：`ctx.tools.guard()` 已是 hook 形态，可扩展 `governance/lifecycle-transition` 事件触发外部 IM 推送（如治理进入 `BLOCKED` 时通知 reviewer）。
- **skill**：`governed-builder` Skill（README 提及）做指令级引导，把「不可逆 / 风险 / 范围 / 验收」决策判据写进 SKILL.md，统一 builder 行为。
- **self-modification**：evidence append-only + 序列投影是 self-modification 的「不可篡改审计链」范例；Agent 自主修改代码前必须先经 authority 观察与 guard 放行。

### 与其它插件组合的可能性

- **governed-workflow + dsh-track**：dsh-track 的决策账本记录「为什么这么做」，governed-workflow 的 evidence 记录「是否被允许这么做」；组合形成「决策可追溯 + 行为可治理」双层工作流。
- **governed-workflow + dsh-github**：把 dsh-github 的 PR 创建/issue 关闭纳入 guard 治理——无 accepted authority 时拒绝 `pr_create`，与 bash guard 形成 GitHub 写路径治理。
- **governed-workflow + dsh-clawrouter**：dsh-clawrouter 的强模型评审是「命令级」审查，governed-workflow 是「工作流级」治理；组合形成「工作流不变式 + 命令级强模型审查」的双重防线。
