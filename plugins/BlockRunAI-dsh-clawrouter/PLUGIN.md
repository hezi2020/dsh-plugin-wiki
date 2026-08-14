# PLUGIN 元数据 — dsh-clawrouter

## 插件名称
dsh-clawrouter（DSH 强模型审查门 + BlockRun 多模型路由）

## 来源仓库 URL
https://github.com/BlockRunAI/dsh-clawrouter

## 克隆时的 commit SHA
前 7 位：`a824aef`

## 功能描述（一句话）
给 DSH Agent 加「二脑」：危险命令执行前由强模型（默认 `anthropic/claude-opus-5`）审查，给出 safe / dangerous / uncertain 判定，由真实工具执行器强制；并注册 BlockRun provider 路由，70 个模型一个钱包（无账号、无 API key，按请求付 USDC over x402）。

## 前置依赖
- Node.js `^22.19 || >=24`（package.json `engines`）
- DSH 运行时 peerDependencies：`@deepseek-ai/cordis >=4.0.1`、`dsh-commands`、`dsh-credentials`、`dsh-launch-environment`、`dsh-llm`、`dsh-tools`（均 `>=0.1.0-rc.6`）
- 运行时依赖：`@blockrun/llm ^3.13.1`、`@deepseek-ai/schemastery ^3.18.1`
- EVM 钱包密钥（环境变量 `BASE_CHAIN_WALLET_KEY` 或经 credentials service 引用）：认证是钱包签名而非 API key
- 钱包需在 Base 链上有 USDC 余额（$5 覆盖数千次调用）

## 安装命令
```sh
dsh plugin --profile web add dsh-clawrouter
export BASE_CHAIN_WALLET_KEY=0x...   # 或经 credentials service 存储引用
```

钱包密钥来源：
- 已跑过 BlockRun 工具：`~/.blockrun/.session`（SDK）或 `~/.openclaw/blockrun/wallet.key`（ClawRouter）；`export BASE_CHAIN_WALLET_KEY=$(cat ~/.blockrun/.session)`
- 无钱包：`npx -y @blockrun/clawrouter` 生成一个并打印地址，发送几 USDC 到 Base，再 export key

本插件不会自动读取这两个文件——credentials seam 防止「无人配置的凭据悄悄 shadow 用户已配置的」，只读取你指定的 reference。

## 配置项
| 来源 | 字段 |
|---|---|
| profile `cordis.patch.yml`（`blockrun-llm` 行，provider route） | `provider`（`blockrun`）、`walletKeyEnv`（`BASE_CHAIN_WALLET_KEY`，凭据引用）、`apiUrl`（`https://blockrun.ai/api`）、`timeoutMs`（`300000`）、`auxiliaryModel`（off，harness 维护调用用便宜模型）、`requestFeeUsd`（`0.002`） |
| profile `cordis.patch.yml`（`blockrun-review` 行，gate） | `enabled`（`false`）、`reviewerProvider`（`blockrun`）、`reviewerModel`（`anthropic/claude-opus-5`）、`timeoutMs`（`30000`）、`onReviewerFailure`（`ask`，`deny` 用于无人值守）、`extraRules`（`[]`，`{name, pattern, tools}`） |

挂载 route 不改默认模型：`dsh-base` 保持 `deepseek-official`，此 route 仅在你显式请求时使用。`auxiliaryModel` 只影响 harness 标记为 maintenance 的调用（compaction、session titles），对话请求永不重定向。

## 已知限制
- **不会让 DeepSeek 更便宜**：chat 按 provider 成本 + 平价 $0.001/请求计费，BlockRun 不计 DeepSeek 缓存命中折扣，主循环走此路由比直连 DeepSeek 更贵；建议主循环保留 DeepSeek key，本路由用于 DeepSeek 做不到的事（Claude/GPT/Gemini/Grok 评审）。
- **free tier 是 smoke test 不是 workhorse**：免费 NVIDIA 模型可能用 prompt 做服务改进，不要指向私有代码库，绝不作 reviewer。
- **评审消耗一次模型调用**：只在 flagged 调用上触发，30s 上限。
- **reviewer 只看 flagged 工具调用，不看整个仓库**。
- **图片被拒绝而非静默丢弃**：图片内容经此路由 fail 为 `UNSUPPORTED`；vision 计划中。
- **reasoning-effort 选择被拒绝**而非静默忽略。
- **abort 后立即停止交付，但 in-flight HTTP 请求本身不被取消**：直到 `@blockrun/llm` 接受 `AbortSignal`；socket 在 SDK 自己的 timeout 关闭。
- **不记录 session 事件**：harness 拒绝 build 不知道的事件类型，out-of-repo 插件无法标记 ignorable，故不写 session 事件；也不写 `~/.blockrun/cost_log.jsonl`（那是 `@blockrun/llm` 的 `LLMClient` 写的，本 adapter 用的 streaming client 只在内存追踪 spend）。查钱包余额是唯一权威。
- **smart routing (`blockrun/auto`) 未接**：虚拟模型须报告单一 context window，harness 据 catalog 声明值算 compaction；报大会溢出，报小会过早 compact。当前须 pin model id。
- **compaction 可能过早触发**：此 route 报告 gateway model catalog 声明的 context window；实测 `openai/gpt-4.1-nano` 接受 450037 token prompt 但 catalog 只声明 128000；harness 据声明值算 compaction，会话可能在模型仍能吃下整个 prompt 时就 compact。已报上游，本插件据 catalog 而非猜测更高值。
- **context overflow 按请求大小而非错误文本检测**：真实 overflow 网关返回 `{"message":"API request failed"}`，provider 措辞被 sanitize，文本检测器匹配不到；400 后请求大于模型声明 window 即视为 overflow 以触发 compaction 恢复。
- **prior-turn reasoning 不回传**：DeepSeek thinking-mode 指南要求 `reasoning_content` 在 tool-call turn 返回，但此 route 服务 70 个模型的多个 vendor，某家要的字段另一家可能拒；reasoning model 的多步 tool use 可能略降级。
- **链接安装会拉 devDependencies 导致 `instanceof LlmError` 跨两份副本失败**：harness 把每个 failure 报为 `UNKNOWN` 而非真实 code；测试 error code 应从 packed tarball（`npm pack`）而非 link。

## 本地运行状态
未实测安装（本任务仅克隆源码，未实际通过 dsh plugin 加载或运行 npm test）

## 许可证
MIT（来源：LICENSE 文件、package.json `license: "MIT"`、README「License」）
