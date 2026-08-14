# dsh-clawrouter

> **插件名**：dsh-clawrouter
> **来源仓库**：<https://github.com/BlockRunAI/dsh-clawrouter>
> **许可证**：MIT
> **commit SHA**：前 7 位 `a824aef`

给 DeepSeek Harness Agent 加「二脑」：当 agent 提议 `rm -rf ~` 这类危险命令时，强模型（默认 `anthropic/claude-opus-5`）先读一遍，给出 allow / deny / ask 判定，由真实工具执行器强制而非 prompt 约束。同时注册 BlockRun provider 路由，70 个模型从一个钱包可达，无账号、无 API key、无信用卡，按请求付 USDC over x402。

---

## 1. 使用指南

### 前置依赖

- Node.js `^22.19 || >=24`（package.json `engines`）
- DSH 运行时 peerDependencies：`@deepseek-ai/cordis >=4.0.1`、`dsh-commands`、`dsh-credentials`、`dsh-launch-environment`、`dsh-llm`、`dsh-tools`（均 `>=0.1.0-rc.6`）
- 运行时依赖：`@blockrun/llm ^3.13.1`、`@deepseek-ai/schemastery ^3.18.1`
- EVM 钱包密钥（环境变量 `BASE_CHAIN_WALLET_KEY` 或经 credentials service 引用）：认证是钱包签名而非 API key
- 钱包需在 Base 链上有 USDC 余额（$5 覆盖数千次调用）

### 安装命令

```sh
dsh plugin --profile web add dsh-clawrouter
export BASE_CHAIN_WALLET_KEY=0x...   # 或经 credentials service 存储引用
```

钱包密钥来源：
- 已跑过 BlockRun 工具：`~/.blockrun/.session`（SDK）或 `~/.openclaw/blockrun/wallet.key`（ClawRouter）；`export BASE_CHAIN_WALLET_KEY=$(cat ~/.blockrun/.session)`
- 无钱包：`npx -y @blockrun/clawrouter` 生成一个并打印地址，发送几 USDC 到 Base，再 export key

本插件不会自动读取这两个文件——credentials seam 防止「无人配置的凭据悄悄 shadow 用户已配置的」，只读取你指定的 reference。

### 配置项

| 来源 | 字段 |
|---|---|
| profile `cordis.patch.yml`（`blockrun-llm` 行，provider route） | `provider`（`blockrun`）、`walletKeyEnv`（`BASE_CHAIN_WALLET_KEY`，凭据引用）、`apiUrl`（`https://blockrun.ai/api`）、`timeoutMs`（`300000`）、`auxiliaryModel`（off，harness 维护调用用便宜模型）、`requestFeeUsd`（`0.002`） |
| profile `cordis.patch.yml`（`blockrun-review` 行，gate） | `enabled`（`false`）、`reviewerProvider`（`blockrun`）、`reviewerModel`（`anthropic/claude-opus-5`）、`timeoutMs`（`30000`）、`onReviewerFailure`（`ask`，`deny` 用于无人值守）、`extraRules`（`[]`，`{name, pattern, tools}`） |

挂载 route 不改默认模型：`dsh-base` 保持 `deepseek-official`，此 route 仅在你显式请求时使用。`auxiliaryModel` 只影响 harness 标记为 maintenance 的调用（compaction、session titles），对话请求永不重定向。

### 典型用法示例

启用 review gate（`cordis.patch.yml`）：

```yaml
- id: blockrun-review
  config:
    enabled: true
    reviewerModel: anthropic/claude-opus-5
    # 自定义规则示例
    extraRules:
      - name: no-prod-deploy
        pattern: "deploy\\s+--env[= ]prod"
```

评审 verdict 行为：

| Verdict | 发生什么 |
|---|---|
| safe | 进入正常 permission chain，不动 |
| dangerous | **拒绝**，附 agent 可处理的理由 |
| uncertain | **升级给你** —— 正常 approval prompt |

它只收窄不清除：reviewer 放行的调用仍走你已有的每个 sandbox / permission / approval gate；升级也 defer 给它们——更严的策略会拒绝时你得到的是拒绝而非 approval prompt。

内置规则仅 flag：递归删除、原始磁盘写、fork bomb、`curl … | sh`、force-push、hard reset、`chmod 777`、`sudo`、触碰 `~/.ssh`/`~/.aws`/`/etc/passwd`，以及非 `rm` 拼写的破坏（`git clean -fdx`、`find … -delete`、`git checkout -- .`、`terraform destroy`、`npm publish`）。读、编辑、构建永不评审。提及命令不等于运行命令（`grep -rn "rm -rf" docs/` 不 flag），写一个也不 flag（Makefile 含 `rm -rf build` 是普通工作）。

命令：

- `/spend`：报告本 route 进程启动以来的开销（总数 / 每模型 / token 与平价费分离），按请求数非 token 计价。
- `/review <diff/plan/conclusion>`：用同一强模型评审你贴的素材。

### 重启生效说明

!!! tip "walletKeyEnv 旋转即时生效，gate 配置需重启"
    `walletKeyEnv` 是凭据引用，每次请求按引用解析——旋转密钥在下一个调用即生效；`blockrun-review` 的 `enabled` / `reviewerModel` / `extraRules` 改动需重启 DSH 才生效。`auxiliaryModel` 同理需重启。

---

## 2. 弊端与缺陷

!!! warning "不会让 DeepSeek 更便宜，主循环走此路由反而更贵"
    chat 按 provider 成本 + 平价 $0.001/请求计费，BlockRun 不计 DeepSeek 缓存命中折扣，主循环走此路由比直连 DeepSeek 更贵。建议主循环保留 DeepSeek key，本路由用于 DeepSeek 做不到的事（Claude/GPT/Gemini/Grok 评审）。出处：README「Honest notes · This will not make DeepSeek cheaper」。

!!! warning "free tier 是 smoke test 不是 workhorse"
    免费 NVIDIA 模型可能用 prompt 做服务改进，不要指向私有代码库，绝不作 reviewer。出处：README「Honest notes · The free tier is a smoke test」。

!!! warning "不记录 session 事件，也不写 ~/.blockrun/cost_log.jsonl"
    harness 拒绝 build 不知道的事件类型，out-of-repo 插件无法标记 ignorable，故不写 session 事件；也不写 `~/.blockrun/cost_log.jsonl`（那是 `@blockrun/llm` 的 `LLMClient` 写的，本 adapter 用的 streaming client 只在内存追踪 spend）。查钱包余额是唯一权威。出处：README「Known limitations · This plugin does not record what it spends」。

!!! warning "图片被拒绝（UNSUPPORTED），vision 计划中"
    图片内容经此路由 fail 为 `UNSUPPORTED` 而非静默丢弃；vision 能力计划中但未实现。出处：README「Known limitations · Images are refused」。

!!! warning "smart routing (blockrun/auto) 未接，须 pin model id"
    虚拟模型须报告单一 context window，harness 据 catalog 声明值算 compaction；报大会溢出，报小会过早 compact。当前须 pin model id；`auxiliaryModel` 已移动昂贵维护调用，那才是省钱所在。出处：README「Known limitations · Smart routing」。

!!! warning "compaction 可能过早触发，catalog 声明值小于实测"
    此 route 报告 gateway model catalog 声明的 context window；实测 `openai/gpt-4.1-nano` 接受 450037 token prompt 但 catalog 只声明 128000；harness 据声明值算 compaction，会话可能在模型仍能吃下整个 prompt 时就 compact。本插件据 catalog 而非猜测更高值（over-claim 会把过早 compact 换成静默溢出）。已报上游。出处：README「Known limitations · Compaction may fire earlier」。

!!! warning "链接安装会拉 devDependencies 导致 instanceof LlmError 跨两份副本失败"
    链接 checkout（`dsh plugin add /path/to/dsh-clawrouter`）会把本包 devDependencies 拉进 profile，给 `@deepseek-ai/dsh-llm` 第二份副本；`instanceof LlmError` 跨两份副本失败，harness 把每个 failure 报为 `UNKNOWN` 而非真实 code。测试 error code 应从 packed tarball（`npm pack`）而非 link。出处：README「Development」末尾。

!!! warning "reviewer 只看 flagged 工具调用，不看整个仓库"
    评审只在 flagged 调用上触发，30s 上限；reviewer 只看被 flag 的工具调用本身，不看你的整个仓库上下文，理解范围受限。出处：README「Honest notes · The reviewer sees the flagged tool call」。

---

## 3. 后续拓展思路

### 可二次开发的方向

- **vision 接入**：当前图片被拒绝（UNSUPPORTED），可扩展图片内容块通道，让 reviewer 能看截图（如 ego-browser 的 `ego_screenshot` 输出）做视觉评审。
- **smart routing 破局**：解决「虚拟模型须报告单一 context window」的矛盾——可按 turn 动态选择模型并在 compaction 时报告当前候选的最小窗口，避免过早 compact。
- **spend 持久化**：当前 spend 只在内存追踪；可推动 DSH 上游开放外部事件 ignorable 标记后写 session 事件，或本插件自维护 KV（参考 dsh-track / TokenLedger）。

### 可对接的 DSH 能力

- **hooks**：`ctx.tools.guard()` 形态可扩展为 `approval/decided` 事件触发外部记录；`extraRules` 可经 hooks 动态注入。
- **skill**：把「评审一段 diff/plan/conclusion」封装为 DSH Skill，让 Agent 自然语言触发 `/review`。
- **self-modification**：review gate 是「self-modification 的安全闸」——Agent 自主修改代码前，强模型先审危险命令，防止 self-modification 误删家目录（README 引用 discussion #461 的真实事故）。

### 与其它插件组合的可能性

- **dsh-clawrouter + dsh-github**：`reviewMode: "model"` 的子代理走 blockrun 路由用 Claude 评审 PR，主循环保持 DeepSeek 控成本；`/review` 命令复用 blockrun 的强模型评审 PR diff。
- **dsh-clawrouter + governed-workflow-for-dsh**：dsh-clawrouter 是命令级强模型审查，governed-workflow 是工作流级治理；组合形成「工作流不变式 + 命令级强模型审查」双重防线。
- **dsh-clawrouter + TokenLedger**：dsh-clawrouter 的 `/spend` 报告 blockrun 路由开销，TokenLedger 覆盖 DSH 直接 provider + 中转站对账；组合形成全链路成本视图（主循环 DeepSeek + blockrun 评审 + 中转站对账）。
