# 贡献流程与约定

本页说明在 dsh 仓库贡献代码的必读材料、Pre-release 阶段立场、文档与 agent 工作流约定。仓库无独立 `CONTRIBUTING.md`，贡献流程基于根 `AGENTS.md` 与 `docs/development.md` 整理。

!!! warning "改 `packages/` 前必读 `docs/architecture.md`"
    `AGENTS.md` 开篇即规定：**修改 `packages/` 下任何代码前，必须先读 `docs/architecture.md`**。该文件是架构权威，覆盖组合机制、core 包、loop、seam、扩展点。新行为挂扩展点；改 `agent-loop` 必须同步更新它。

## 开发前必读

| 顺序 | 材料 | 作用 |
|---|---|---|
| 1 | `docs/architecture.md` | 改 `packages/` 前必读；架构有序地图 |
| 2 | `docs/AGENTS.md` | 文档标准：结构、tier、写作规则、字数预算、slop 清单 |
| 3 | `docs/development.md` | 贡献者设置、日常 workflow、CI 概要 |
| 4 | `docs/testing.md` | 测试策略与各层规则 |
| 5 | `docs/defensive-patterns.md` | 涉及生命周期/并发/子进程/teardown 前必读 |
| 6 | `packages/AGENTS.md` | 包级规则，补充仓库级约定 |
| 7 | `vendor/AGENTS.md` | 改 vendored 代码前必读；本地修改必须记日志 |

`AGENTS.md` 的「Conventions」段是仓库级硬规则，`packages/AGENTS.md` 是包级补充；两者共同约束贡献。

## Pre-release 立场：foundation over blast radius

`AGENTS.md` 顶部声明：

> **Remove this section at the first tagged release.** With no external consumers, prefer the correct foundation over compatibility shims: rename or repackage freely and update every reference together. Backends reject old on-disk formats.

含义：

- **当前无外部消费者**，优先正确的基础而非兼容垫片。
- **可自由重命名/重打包**，并同步更新所有引用。
- **后端拒绝旧磁盘格式**——不维护读取旧格式的代码。

两条具体格式策略：

| 格式 | 策略 |
|---|---|
| SQLite | 用单调 `SCHEMA_VERSION`；后端拒绝旧格式 |
| `dsh-session` | `SESSION_FORMAT_VERSION` 保持 `0`，**无兼容承诺**；只有结构性格式变更才 bump |

!!! note "何时移除该段"
    `AGENTS.md` 明确：**首次打 tag release 时移除该段**。在那之前，不要为旧格式写迁移垫片。

## 文档约定

文档遵循 `docs/AGENTS.md`，核心规则：

### 一个事实一个家（tier 分类）

| Tier | 职责 | 不属于这里 |
|---|---|---|
| 根 `AGENTS.md` | 常驻指令：每次会话需要的规则，每条 1-3 行并 link 其家 | 故事、示例、情境流程、复述 |
| 子树 `AGENTS.md`（`packages/`、`examples/`、`docs/`、`.agents/notes/`） | 该子树特定指令 | 根文件已承载的仓库级规则 |
| `architecture.md` | 有序地图：组合、core 包、loop、seam、扩展点 | 类型定义（→ subsystems）、包细节（→ README）、决策 rationale（→ Agent Notes） |
| `subsystems/` | 每个子系统一页：类型定义、语义、生成的 Cordis API | 行为叙述（→ architecture.md） |
| Agent Notes | 活跃决策记录：why、what-was-given-up、required verification | 迁移计划、验收清单、已发布后的 spec-speak |
| `postmortem/` | 事故故事——唯一允许战史叙述的 tier | — |
| `cookbook/` | 带编号验证步骤的 how-to | 设计 rationale（→ Agent Note） |
| `user/` | 文档网站发布的产品向指南 | 生成的参考表、贡献者流程、决策历史 |
| 包 README | 包契约：config、语义、限制、扩展点、Model Experience | JSDoc 复述、生成 catalog 复述 |
| `development.md` | 贡献者设置、日常 workflow、CI 概要 | runtime/version rationale（→ Agent Notes）、漂移的命令清单 |

### 写作规则（节选）

- **记录当前状态，不记录变更历史**：避免「previously/now/no longer」、PR、commit、stack 位置；命名活机制。变更故事放 commit/PR/Agent Note/postmortem。
- **每个非平凡变更在同一个 PR 里至少包含一个 Agent Note**：更新 owning note 或新增；只有机械/局部编辑豁免。
- **一段一个物理行**（`verify-md-wrap`）：用编辑器软换行。
- **fenced `ts` 块必须可编译**（`doc-typecheck`）；类型声明粘贴用 ` ```ts type-equiv `，body 剥离的 public class 用 ` ```ts public-api `，注册到 manifest 防漂移。
- **配对一起更新**：术语引导、单遍 active-agent 工作重定位首注、保留未触散文、重录；`dsh-translate-docs` 仅用户显式调用。
- **JSDoc 与注释陈述完整契约，非推理记录**：保留行为、失败、时序、所有权、模态、异常、后果；删除叙述、测试 walkthrough、review 分析、代码复述。

### 字数预算

`scripts/doc-budgets.manifest.json` 设常驻文档上限；`pnpm run verify-doc-budgets` 拒绝超额或缺失文件。门禁红了：

1. **重定位**属于其他 tier 的内容；
2. **压缩**属于这里但可更短的内容；
3. **提高上限**仅当文字确实需要空间，并在 PR justify manifest diff。

目标：根 `AGENTS.md` ≤ 1,600 词；`architecture.md` ≤ 1,800；子树 `AGENTS.md` ≤ 600（`packages/AGENTS.md` ≤ 650、`docs/AGENTS.md` ≤ 1,250）；`packages/README.md` ≤ 600。在或低于目标时保留至少 5% headroom。

### Slop 清单（审计时要猎杀的）

- 同一规则在多处复述（grep 特征短语，留一个家，其余 link）。
- 叙述历史或战史（「previously」「now」「used to」「renamed」「was moved」、PR、commit）。
- 实现状态注解（「implemented!」「future: …」）。
- 手工复述 catalog、JSDoc、或测试/包/状态清单（当源或生成器权威时）。
- 推理记录：逐步实现叙述、显然分支证明、测试 walkthrough、被拒本地替代。
- 段落墙：一段承载多条规则与括号离题。
- 强调通胀：到处 bold/CAPS/「critically」。
- `implemented/` Agent Note 里的 spec-speak（「should」、迁移计划、验收清单）。

### 交叉引用

用相对 Markdown 路径链仓库引用，**绝不**裸文件名或 Agent Note 编号。`verify-md-links` 拒绝缺失目标与死 `#fragment` 锚点。

## 贡献流程

仓库无独立 `CONTRIBUTING.md`，流程基于 `AGENTS.md` 与 `docs/development.md`：

### 首次设置

```sh
pnpm install      # 配置 worktree-local Lefthook 与翻译配对 merge driver
pnpm run typecheck  # 首次克隆后跑一次；成功即设置完成
```

若 `postinstall` 被跳过（如依赖从缓存恢复），手动装 hook：

```sh
node scripts/install-lefthook.mjs
```

### 日常 workflow

1. **挑最小覆盖变更面的检查**：行为用聚焦测试；输出用 snapshot；文档用 `doc-sync`；发布路径用 build/hygiene + built smoke；provider 行为用真实 API e2e。
2. **不要默认跑全套**：CI 拥有穷尽覆盖与平台矩阵。
3. **覆盖率门禁是 `test:coverage`，不是 `test`**。
4. **推送前用 `dsh-pre-push-checks` skill 跑相关检查**，只报告跑过的命令。
5. `gh stack sync` 后立即验证；检查不过不合并。

### Git 集成

Lefthook 配置在 `lefthook.yml`，作为快速本地检查点：

| Hook | 作用 |
|---|---|
| `pre-commit` | 校验 staged 配对记录、用 `.oxlintrc.staged.json` 验证并修复 staged 文件（一次有界重试）、按需重生成 `THIRD_PARTY_NOTICES.md`、检查 staged diff 空白错误、跑 vendor manifest guard |
| `pre-merge-commit` | 在 Git 创建自动 merge commit 前做同样的 index-backed 配对检查 |
| `pre-push` | 跑 `pnpm run typecheck`（完成 Host lib 阶段含生成的 Typert 契约，再跑 Client TS 检查） |

vendor manifest guard 检查 `vendor/*/src` 改动是否伴随 `vendor/README.md` manifest 更新。

hook 故意**不**跑测试、snapshot、文档检查、build、hygiene——贡献者跑一次相关检查，CI 拥有穷尽覆盖。可选 `pnpm run check:all` 跑完整本地 gate（独立于 Git hook，非 agent 指令）。

### PR 历史与标签

- **刻意选择 PR 历史**：拆分独立改动；传播前先修引入 PR。
- 独立 PR 与官方 stack 可在 review 后 merge-forward 或 rebase。
- 重写用 `--force-with-lease`，remote 移动时 abort，**绝不**裸 `--force`；进行中的 merge-forward 在拿新 base 前保留其 checkpoint。
- **标签**：一个 PR `kind/*`，所有 material `area/*`，加 native Issue Type。

### TODO 标记

按紧迫度用三个 comment tag 之一：

| 标记 | 紧迫度 | 含义 |
|---|---|---|
| `FIXME` | 最高 | 应阻塞新 release；除非 reviewer 明确同意否则不带着它发布 |
| `TODO` | 中 | 应尽快修，一旦有资源 |
| `XXX` | 最低 | 可能某天修；无承诺 |

### 文件结尾

文件以恰好一个尾换行结束；`git diff --cached --check`（pre-commit）gate 它。

## Agent 工作流遵循 `AGENTS.md`

agent 在该仓库工作时遵循根 `AGENTS.md` 的全部规则。关键点：

- **Host 沙箱失败**：当必需命令因沙箱阻止 credential/network/IPC/file watching/嵌套 `sandbox-exec` 失败时，**用最窄 host 提权原样重试**，再诊断认证或项目失败。要求沙箱证据；**绝不绕过真实测试失败或被测产品沙箱**。
- **Registrations are effects**：每个贡献走 `ctx.effect()` / `ctx.on()`；registry 的 `register()` 返回 disposer。
- **Runtime invariants 断言 owned relationship**：检查权威事件流或可变数据，而非 service/method 存在、plugin metadata/effect、固定纯示例。无合理关系时，解释过的空 companion 是正确的。
- **类型化事件用 declaration merging**：事件 JSDoc 需 `@mode` 与 payload `@param`；scoped key 缺席 payload 需 `@dshScopeScan unsupported`。`SessionEventMap` 成员默认 read-required。
- **Switch on discriminant tag**：closed union 以 `assertNever` 结束；merge-extensible union fall through 有文档的 default。
- **Waterfall listener 必须调 `next()`**。
- **Model-visible ⟺ logged**。
- **Plugin, not loop change**：新行为上扩展点；改 `agent-loop` 需更新 `docs/architecture.md`。
- **Capability seam = Service Definition + Service Provider + Consumer**，三角色完整，永不单一角色；只在角色独立演化时拆分。
- **偏好维护的依赖而非手写**（当它们真正删除自有代码与测试时）。
- **包边界处 explicit > implicit**：defaulting 是 owning 实现里显式的 `resolve(request): Spec` 步骤，非 `run()` 里隐藏的 `?? default`。
- **插件里无硬编码 tunable**：部署变量是已校验的 `Config` field，可从 cordis.yml 改。
- **误配置大声失败**：load 时能自包含则 load 时失败，否则在最早可解析点；绝不静默跳过缺失 referent。
- **跨边界不透明 id 用 branded**（`Branded<B>` from `dsh-brand`），非裸 `string`。
- **typed same-process 边界信任 TypeScript**：不为静态接口要求的值加运行时校验/降级/敌意输入测试；只在 parser/config、queued、model/tool JSON、durable/file、worker、process、wire 边界校验。
- **源码面 vs 产物面，永不混**：静态 gate 与测试通过 tsconfig `paths` 解析 workspace 导入到 `src`，干净树上通过；消费 built `lib/` 的 gate 显式声明该依赖。
- **保持 compiler face 显式**：每包用一个 aggregate，`api/remotes` 例外；repo-wide 程序 seed 一个 face config，永不根 solution。
- **空 `catch` 命名它吞了什么**及为什么没别的能到达它；`try` 保持一句。
- **不为代码显然的事实加注释**。
- **并行值偏好对称**；未解释的不对称通常暗示漏抽。
- **测试描述行为，不描述正确性**：改过时行为连测试一起改；在 PR 里解释 why。
- **非平凡变更必须同 PR 含 Agent Note**；只有机械/局部编辑豁免。归档 note 冻结，**永不**编辑或当现权威。

## 类型安全与文档

- 一切在 `strict: true` + `noImplicitAny` 下编译；每个剩余 `any` 解释为何 narrowing 不可行。
- 每个模块与 export 有简洁 JSDoc 描述其非显然契约；函数式 export 含 `@param`/`@returns`，由 `verify-export-jsdoc` 强制。
- heritage-declared member、plugin-protocol slot、constructor 的文档留在声明的 Service Definition/protocol/class。

## 编辑这些指令

`CLAUDE.md` 在根、`packages/`、`examples/` 处 symlink `AGENTS.md`——**编辑真文件**。保持每条规则自包含同时链接高层文档。clarity 存活时可压缩；当所需内容确实需要更多空间时 raise `verify-doc-budgets` 上限。

## Vendoring 策略

`vendor/` 包是 pin 的源码副本（manifest 含上游 SHA 在 `vendor/README.md`）。

- 通过该处 sync 流程更新；re-apply 或 retire 已记录的本地修改；重跑 `pnpm run test && pnpm run build`。
- **不要随意编辑 `vendor/*/src/`**：每条与上游的分歧必须详尽记在 `vendor/README.md` 的「Local modifications」。
- `vendor/*/tsconfig.json` 是例外（为 monorepo build 重新生成），可为 type-checking 策略改动而触碰。

## 延伸阅读

- 仓库规则权威：`deepseek-harness/AGENTS.md`
- 文档标准：`deepseek-harness/docs/AGENTS.md`
- 贡献者日常：`deepseek-harness/docs/development.md`
- 包级规则：`deepseek-harness/packages/AGENTS.md`
- 防御模式：`deepseek-harness/docs/defensive-patterns.md`
- Vendored 策略：`deepseek-harness/vendor/README.md` 与 `vendor/AGENTS.md`
- Agent Note 范围：`deepseek-harness/.agents/notes/README.md`
- 散文标准：`.agents/skills/dsh-prose-standard/SKILL.md`
- 文档标准 skill：`.agents/skills/dsh-doc-standards/SKILL.md`
- 推送前检查 skill：`.agents/skills/dsh-pre-push-checks/SKILL.md`
