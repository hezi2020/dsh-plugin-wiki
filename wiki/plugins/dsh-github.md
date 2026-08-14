# dsh-github

> **插件名**：dsh-github（npm 包名 `@perrylink/dsh-github`）
> **来源仓库**：<https://github.com/PerryLink/dsh-github>
> **许可证**：Apache License 2.0
> **commit SHA**：前 7 位 `3164e84`

DSH 的 GitHub 集成 bundle 插件，补齐 DSH 与 Claude Code（`gh claude` / claude-code-action）、Codex（`@codex review`）之间的 GitHub 缺口：Agent 可读取 PR、审查 PR、开 PR、对 issue 评论与关闭、搜索；每次写操作均经 `ctx.approval` 人工批准，token 永不落日志。

---

## 1. 使用指南

### 前置依赖

- Node.js `^22.19.0 || >=24.0.0`（README 顶部徽标 + package.json `engines`）
- DSH 运行时 peerDependencies：`@deepseek-ai/cordis ^4.0.1`、`@deepseek-ai/dsh-credentials / dsh-llm / dsh-session / dsh-tools ^0.1.0-rc.5`
- GitHub Token：推荐写入 `$DSH_HOME/.credentials.yaml` 的 `GITHUB_TOKEN`（凭据缝读取），亦可走环境变量或本地 `gh` CLI
- git 源安装额外需要 `pnpm ≥10` 并在 profile 的 `pnpm-workspace.yaml` 中 `allowBuilds` 白名单

### 安装命令

```sh
# 1. npm registry（最简单，推荐）
dsh plugin --profile <name> add @perrylink/dsh-github

# 2. npm tarball（自带 lib/，无构建权限）
dsh plugin --profile <name> add ./dsh-github-0.4.0.tgz

# 3. git 源（需 prepare + allowBuilds，并 pin commit）
dsh plugin --profile <name> add "github:PerryLink/dsh-github#<sha>"

# 4. 本地开发
pnpm link --dir . && dsh plugin add @perrylink/dsh-github
```

git 源安装需在 `pnpm-workspace.yaml` 加入：

```yaml
allowBuilds:
  '@perrylink/dsh-github': true
```

### 配置项

| 来源 | 字段 |
|---|---|
| `$DSH_HOME/.credentials.yaml` | `GITHUB_TOKEN`（推荐，经凭据缝注入） |
| 环境变量 | `GITHUB_TOKEN` |
| `gh` CLI | 本地已登录的 token |
| profile `cordis.patch.yml` | `tokenSource`（`auto`/`credentials`/`env`/`gh`）、`tokenRef`、`defaultOwnerRepo`、`autoCommit`、`maxDiffChars`、`renderExcerptChars`、`maxComments`、`reviewJobTimeoutMs`、`maxReviewRecords`、`reviewMode`（`static`/`model`）、`modelReviewProvider`、`maxRetries`、`retryBaseMs`、`retryMaxWaitMs`、`apiBaseUrl`、`allowedActions`、`workspaceDir` |

`tokenSource: auto` 按「凭据缝 → 环境变量 → `gh` CLI」顺序逐操作解析；`allowedActions` 默认含 5 个写动作白名单（`pr.create`、`review.post`、`issue.create`、`issue.comment`、`issue.close`），白名单外的动作在 approval 前即被拒。

### 典型用法示例

```sh
# 创建 PR（需 approval）
/pr create "add dark mode"

# 后台审查 PR #42，用 job_output 读取结果
/review 42

# 帖评审评论（需 approval）
/review post github-review-1

# 开 issue（需 approval）
/issue open "crash on startup"
```

8 个工具：`pr_create`（write）、`gh_review`（read）、`review_post`（write）、`gh_issue`（read）、`issue_open`（write）、`issue_comment`（write）、`issue_close`（write）、`gh_search`（read）。验证安装：`dsh --profile <name> --dump-config` 应显示 `# == dsh-github` 段且无 FAILED 行。

### 重启生效说明

!!! tip "凭据缝 / profile 配置变更需重启"
    `GITHUB_TOKEN` 与 `cordis.patch.yml` 改动需重启 DSH 才生效；运行时 429 重试、`Retry-After` 退避、剩余配额回显都是即时行为。

---

## 2. 弊端与缺陷

!!! warning "不注册自定义会话事件，审计链只能复用宿主官方事件"
    插件刻意不附加自定义 session 事件类型——宿主 `KNOWN_SESSION_EVENT_TYPES` 不认识的外部事件会令插件卸载后会话日志不可读。审计只能走 `tool/result`、`command/run`、`approval/asked`+`approval/decided` 等官方事件。出处：README「Architecture · Model-visible ⇔ logged」、「Known limitations」。

!!! warning "默认静态分析器零 token 但规则硬编码"
    `reviewMode: "static"`（默认）走 `src/review.ts` 硬编码规则（密钥、Google API key、调试产物、eval、TODO、长行、超大改动），零 token、可复现但规则固定；`reviewMode: "model"` 把截断 diff 交给 `ctx.subagents` 一次性子代理，消耗 token，且要求 seam 与 provider 存在，缺失会 fail loud。出处：README「Known limitations」、「Tools · review」。

!!! warning "评审报告与 job 记录均为进程内，重启即失"
    `/review` 的评审报告按 job id 存于插件内存，生命周期跟随宿主 job registry；`maxReviewRecords`（默认 50）封顶，最早的已结束记录优先淘汰。进程重启后历史报告不可恢复。出处：README「Known limitations · Jobs and records are process-local」。

!!! warning "npm latest dist-tag 过期，裸装 dsh-tools 会拿到旧版"
    插件声明 `^0.1.0-rc.5` peer 范围以匹配 `dsh-base` 提供的 profile closure，开发钉 `0.1.0-rc.6`；README 明确警告「禁止用 `npm i @deepseek-ai/dsh-tools` 裸安装」，否则会拿到过期的 `latest` 标签版本。出处：README「Known limitations · npm latest dist-tags are stale」。

!!! warning "/pr create 默认不 commit/push，git 身份与 worktree 由其它插件负责"
    `autoCommit` 默认 `false`；即使开启，commit+push 也走 bash 工具自己的审批门，dsh-github 不管理 git 身份（dsh-git-identity 负责）和 worktree（dsh-worktree 负责）。出处：README「Security boundaries」第 3 条。

!!! warning "帖评论插值 diff 文件名是固有信任权衡"
    `review_post` 帖评论时会插值来自 diff 的文件名（非可信仓库内容）；`formatPostBody` 做反引号 + HTML 转义防 Markdown 注入，但仍是固有风险。issue/PR body、评论、搜索结果读自 GitHub 是外部不可信内容，会进入模型上下文。出处：README「Security boundaries」第 4、5 条。

!!! warning "CI/GitHub Action 配套仓库尚未实现"
    `dsh-github-action`（类 claude-code-action / codex-action 的 headless review→comment 循环）为规划中的 v2 配套仓库，未实现。出处：README「Known limitations · CI / GitHub Action」。

---

## 3. 后续拓展思路

### 可二次开发的方向

- **自定义 review 规则注入点**：当前 `src/review.ts` 硬编码静态分析规则，可扩展为插件级规则注册器，让团队按仓库语言栈（Rust clippy、Java SpotBugs）追加规则而无需改主仓库。
- **GitHub Action 形态落地**：把 v2 配套 `dsh-github-action` 真正实现，形成 headless review→comment 循环，对标 claude-code-action / codex-action。
- **PR 评论 → issue 自动归档**：把 `review_post` 的 inline 评论与 `issue_close` 串成状态机，评审通过即自动关 PR 关联 issue。

### 可对接的 DSH 能力

- **hooks**：`tools/pre-execute` 审批门已是 hook 形态，可扩展 `approval/decided` 事件触发外部 IM 推送。
- **skill**：把「审查 PR」封装为 fat skill，把 `reviewMode: "model"` 的子代理调用纪律写进 SKILL.md，统一评审语气。
- **self-modification**：`pr_create` 让 Agent 自主开 PR，结合 `gh_review` 形成「Agent 自审 + 自开 PR」闭环，可探索 self-modification 的 PR 工作流。

### 与其它插件组合的可能性

- **dsh-github + dsh-git-identity**：dsh-github 不管 git 身份，组合 dsh-git-identity 才能闭环 `/pr create` 全链路（identity → commit → push → PR）。
- **dsh-github + dsh-track**：把 PR 评审、issue 关闭等事件接入 dsh-track 的决策账本，让 PR 决策可追溯。
- **dsh-github + dsh-clawrouter**：`reviewMode: "model"` 用的子代理可走 dsh-clawrouter 注册的 blockrun 路由，让评审用强模型（Claude Opus）而主循环保持 DeepSeek。
