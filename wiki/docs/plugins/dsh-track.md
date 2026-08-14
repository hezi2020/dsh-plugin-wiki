# dsh-track

> **插件名**：dsh-track（npm 包名 `@fakechris/dsh-track`，曾用名 dsh-involute）
> **来源仓库**：<https://github.com/dsh-external/dsh-track>（私有内测；README 与 AGENTS.md 明确「GitHub 仓库仍叫 dsh-external/dsh-track，本地目录名是 dsh-involute，两者是同一个仓库」，fakechris 是 npm scope owner）
> **许可证**：BSD-3-Clause（Copyright (c) 2026, dsh-external (dsh-track contributors)；package.json 标记 `private`，skill 元数据与 LICENSE 文件声明 BSD-3-Clause）
> **commit SHA**：前 7 位 `d0a3c10`

DeepSeek Harness 的嵌入式任务管理引擎——把「念头、决策、任务」变成结构化、可追溯、可折叠的数据。捕获零摩擦，决策留痕迹，任务有生命周期。数据全部在 harness 内部（session 事件 + storage KV），零外部依赖。架构是「Fat skill + thin harness」：决策判据与调用纪律在 `skills/dsh-track/SKILL.md`，harness 侧只注册工具与存储，不做判断。

---

## 1. 使用指南

### 前置依赖

- DSH 运行时 peerDependencies：`@deepseek-ai/dsh-session`、`dsh-storage`、`dsh-tools`、`dsh-llm`、`cordis`（均 `*`）
- DSH Web UI（client inject 4 个 `@deepseek-ai/dsh-client-*` 包，`platform: "web"`）
- 构建需 DSH 工具链：`scripts/dsh-env.mjs`（不能裸 tsc）
- 推荐安装协议 skill：`mkdir -p ~/.dsh/skills && cp -r skills/dsh-track ~/.dsh/skills/`

### 安装命令

```sh
# 1. 安装插件（npm 包，已发布，推荐）
npx -p @deepseek-ai/dsh dsh plugin --profile web add @fakechris/dsh-track

#    git 源（npm 不可达时的备选）：
#    npx -p @deepseek-ai/dsh dsh plugin --profile web add github:dsh-external/dsh-track
#    （或本地路径：... add /absolute/path/to/dsh-track）

# 2. 安装协议 skill（决策点 / 任务推进的调用纪律，装到默认扫描目录）
mkdir -p ~/.dsh/skills && cp -r skills/dsh-track ~/.dsh/skills/

# 3. 重启 dsh web（守护会自动拉起），工具自动挂载
dsh web
```

验证：浏览器打开面板（右下角 ◆ 按钮，或会话标签栏的 *Track* 标签页），看到「捕获想法」和「任务」两栏即安装成功。

### 配置项

| 来源 | 字段 |
|---|---|
| profile `cordis.patch.yml`（`track` 行，bundle patch 自动挂载） | 自动注册，无需手写 |
| DSH Web 客户端注入 | `@deepseek-ai/dsh-client-locale`、`-runtime`、`-ui-conversation`、`-ui-slots`（`platform: "web"`） |
| 协议 skill | `skills/dsh-track/SKILL.md`（fat skill：决策点判据、任务推进纪律、调用格式） |
| 面板配置（v0.4.0） | `⚙ 配置面板`（`/api/track/config`）：token 相似度阈值（近似重复归并）、生命周期 sweep、定时 sync 周级限额 |
| 环境变量（构建） | `DSH_SOURCE=slot-a DSH_TSCONFIG=tsconfig.worktree.json`（部署到 3080 正式版布局用） |

### 典型用法示例

核心工作流四步：

| 流程 | 做什么 | 入口 |
|---|---|---|
| **捕获** | 随时把念头丢进捕获墙；agent 规划时（todo_write）自动捕获，自动附带动机上下文 | `capture_thought` · 面板输入框 |
| **决策** | 遇到不可逆 / 风险 / 价值观 / 范围 / 验收决策时上报，用户轻决策回答，选择与理由落盘 | `report_decision_point` → `track_respond_decision` |
| **任务** | 把需求变成任务；声明会话在推进它，执行证据自动累计；状态机推进，`done` 必须用户确认 | `track_create_issue` → `track_attach_issue` → `track_update_issue_state` |
| **回顾** | 把过往会话折叠成任务候选；随时跳回任何条目的来源对话与原始 prompt | `track_sync_history` · 面板「↩ 对话」 |

11 个工具：`capture_thought`、`report_decision_point`、`track_respond_decision`、`track_list_decisions`、`track_create_issue`、`track_attach_issue`、`track_update_issue_state`、`track_issue_evidence`、`track_list_issues`、`track_sync_history`、`track_usage`、`track_backfill_captures`。

HTTP API（`/api/track/*`）：`captures` CRUD + 转任务、`issues` 列表/删除/证据、`decisions` 历史、`usage` 汇总、`funnel` 漏斗、`sync` 同步。

### 重启生效说明

!!! tip "host 改动需重启 dsh web，client 改动硬刷新即可"
    部署到 3080 正式版布局时：主目录 `pnpm run build` 后把 `lib/` 同步进 slot profile 的 vendored 副本；3080 从该副本加载。client 改动硬刷新即可，host 改动需重启 3080（kill 前写 HANDOFF）。

---

## 2. 弊端与缺陷

!!! warning "私有内测，package.json 标记 private 且未声明 license 字段"
    README「License」段明确「私有插件仓库（package.json 标记 `private`）」；package.json 未声明 `license` 字段，只有 skill 元数据与 LICENSE 文件声明 BSD-3-Clause。这意味着 npm 公开分发受限，且许可证状态需从 LICENSE 文件而非 package.json 推断。出处：README「License」、package.json（无 license 字段、private: true）。

!!! warning "业务数据不写 session 自定义事件，受 harness 拒读约束"
    2026-08-11 起 harness 对未知事件类型会拒读整份日志；插件业务数据（Capture / Issue / Decision / Usage）只存 `ctx.storage` KV（跨会话独立），观察会话只走官方事件流只读不写。这是刻意设计约束，限制了「把任务事件直接写入 session 日志做时间线」的可能。出处：README「架构 · 设计约束」、AGENTS.md。

!!! warning "done / canceled 永不自动达成，必须用户确认"
    状态机证据驱动，`done` / `canceled` 必须带 `confirmed_by_user=true`，系统永不自动标 done。这避免了误关任务，但自动化流程（如无人值守的 Agent 自主完成）必须有人工确认环节，无法真正无人闭环。出处：README「核心工作流 · 任务」、工具清单 `track_update_issue_state`。

!!! warning "lib 产物必须提交，新增 @deepseek-ai/* 依赖须三处同改"
    git 源/CI 不跑构建，官方推荐提交 `lib/`；新增 `@deepseek-ai/*` 依赖必须三处同改（tsconfig paths、vitest alias、ab-config relink），漏一处生产即 `ERR_MODULE_NOT_FOUND`。开发者门槛高，协作易踩坑。出处：AGENTS.md「发布」「AB 快照扩展」。

!!! warning "npm publish 永远留本地，CI 无法发布"
    npm 要求 IP 信任 + 硬件 2FA 指纹，CI 无法发布；GitHub Actions 仅做 tag 验证与打包产物。发布流程非自动化，依赖维护者本地环境。出处：AGENTS.md「发布」、README v0.4.0 changelog「npm 发布走本地（IP 信任 + 硬件 2FA）」。

!!! warning "定时 sync 有周级 v1 限额"
    自动维护机制的 sync 有周级配额限制（v1），大规模历史折叠可能受配额限制需分批。出处：README v0.4.0 changelog「定时 sync（周级 v1 限额）」。

---

## 3. 后续拓展思路

### 可二次开发的方向

- **任务事件写入 session 日志的破局**：当前受 harness 拒读未知事件约束，业务数据只能存 KV；待 DSH 上游开放外部事件 ignorable 标记后，可把任务生命周期事件写入 session 日志，形成统一时间线。
- **无人值守的自动确认策略**：`done`/`canceled` 必须人工确认是无人工闭环的瓶颈；可扩展「白名单自动确认」（如只读任务的 done、低风险 canceled）策略，在保留安全边界的前提下支持有限自动化。
- **跨工作区任务聚合**：当前任务存 `ctx.storage` 单工作区 KV；可扩展为跨工作区聚合视图，让多项目任务统一看板。

### 可对接的 DSH 能力

- **skill**：`skills/dsh-track/SKILL.md` 已是 fat skill 形态，可把「上报决策点」「创建任务」封装为更高层 skill（如「PR 评审决策」「重构任务拆解」）。
- **hooks**：`capture_thought` 事件可经 hooks 触发外部 IM 推送（如内测群通知）；`track_update_issue_state` 的 `done` 事件可触发 dsh-github 自动关 PR。
- **self-modification**：`track_sync_history` 把过往会话折叠成任务候选，可作为 self-modification 的「历史行为复盘 → 自动生成改进任务」入口。

### 与其它插件组合的可能性

- **dsh-track + dsh-github**：把 dsh-github 的 PR 评审、issue 关闭等决策接入 dsh-track 决策账本，让 PR 决策可追溯；`track_update_issue_state` 的 `done` 触发 dsh-github 关 PR。
- **dsh-track + TokenLedger**：dsh-track 自身有 LLM 用量账本（`track_usage`），TokenLedger 覆盖 DSH 全量；组合形成「track 自身开销 vs 全局开销」双层账本，按任务维度归因 token 成本。
- **dsh-track + dsh-file-explorer**：dsh-track 的「↩ 对话」跳回原始 prompt 时，自动在 dsh-file-explorer 中高亮定位该 prompt 涉及的源文件，形成「决策 → 文件」双向跳转。
