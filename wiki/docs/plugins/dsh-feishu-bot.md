# dsh-feishu-bot

> **插件名**：dsh-feishu-bot（飞书私聊前端）
> **来源仓库**：<https://github.com/TingRuDeng/dsh-feishu-bot>
> **许可证**：MIT（Copyright (c) 2025 dengtingru）
> **commit SHA**：`32908a7`（前 7 位）

飞书（Lark）私聊前端：从飞书驱动、监控、审批本地 DeepSeek Harness agent，与 Web GUI 在同一进程内共享实时与冷会话。状态：M1 code-complete（60 个测试），pending live acceptance。

---

## 1. 使用指南

### 前置依赖

- DeepSeek Harness（README 标注已验证 `0.1.0-rc.5`）
- Node.js `^22.19 || >=24`
- 可选 peer 依赖（optional）：`@deepseek-ai/cordis` `^4.0.1`
- 运行时依赖：`@larksuiteoapi/node-sdk`、`zod`，以及多个 `link:../deepseek-harness/packages/...` 指向本地 DSH 源码包
- 飞书应用（长连接模式）：
    - 订阅 `im.message.receive_v1` 事件，授权 `im:message.p2p_msg:readonly`
    - 审批卡片需启用 `card.action.trigger` 回调
    - 每次改动后发布应用版本

### 安装命令

```sh
dsh plugin --profile web add /path/to/dsh-feishu-bot
dsh --profile web --dump-config
# 期望出现 "# == dsh-feishu-bot" 层，含两行（feishu-gateway + feishu-bridge）
```

凭证：在 dsh credentials service 读取处设置 `FEISHU_APP_ID` / `FEISHU_APP_SECRET`，仓库内不放任何密钥。

### 配置项

| 来源 | 字段 | 默认 | 说明 |
|---|---|---|---|
| gateway | `appIdRef` / `appSecretRef` | `FEISHU_APP_ID` / `FEISHU_APP_SECRET` | 凭证引用名，由 dsh credentials service 解析 |
| bridge | `allowedOpenIds` | `[]` | 允许绑定的飞书 open_id 白名单；空 = fail-closed 拒绝所有人 |
| bridge | `allowedWorkspaces` | `[]` | 允许 `/ls`/`/use`/`/new` 的工作区根；空 = 拒绝所有 `/new` |
| bridge | `freshnessMs` | `600000` | 会话新鲜度判定窗口 |
| bridge | `cardThrottleMs` | `1000` | 卡片发送节流 |
| Profile Patch | `defaultWorkspace` | — | `/new` 不带 cwd 时的默认工作区根 |

部署值（`allowedOpenIds`、`allowedWorkspaces`、`defaultWorkspace`）应放在 profile 自己的 patch 层（`~/.dsh/profiles/<name>/cordis.patch.yml`），在该 bundle 层之后应用。默认值 fail-closed：空白名单拒绝所有发送者，空工作区列表拒绝所有 `/new`。

### 私聊命令

| 命令 | 说明 |
|---|---|
| `/new [cwd]` | 在允许的工作区下创建会话并绑定 |
| `/ls` | 按工作区分组的编号会话列表 |
| `/use <sessionId\|n>` | 绑定已有会话（按 id 或 `/ls` 编号） |
| `/status` | 查看当前绑定状态 |
| `/release` | 释放当前绑定 |
| `/help` | 帮助 |

纯文本消息进入已绑定会话；回复分段返回。

### 重启生效说明

!!! tip "部署值放 profile patch 层，bundle 层保持 fail-closed 默认"
    `allowedOpenIds` / `allowedWorkspaces` / `defaultWorkspace` 等部署值写在 profile 自己的 `cordis.patch.yml`（`~/.dsh/profiles/<name>/cordis.patch.yml`），在该 bundle 层之后应用即可覆盖默认。bundle 层始终保留空数组默认值，确保误装到未配置 profile 时 fail-closed。出处：`cordis.patch.yml` 注释。

---

## 2. 弊端与缺陷

!!! warning "绑定聊天即把会话内容上传到飞书服务器，无出站过滤"
    绑定聊天会将该会话对话上传到飞书（腾讯/字节运营的服务器），assistant 回复——包括模型选择打印的源码、文件内容、命令输出或密钥——逐字发送；命令回复包含绝对本地路径与 session id。插件无出站内容过滤，信任边界完全由"谁可绑定"决定。出处：README「Data exposure model」。

!!! warning "allowedWorkspaces 只管会话绑定，不限制 agent 能读什么"
    `allowedWorkspaces` 控制飞书能绑定/列出/创建哪些会话，但不限制已绑定会话的 agent 能读什么。harness 沙箱只隔离写（读在所有模式下都是 OS 用户级），agent 被要求读工作区外文件并复述时，回复会像其他内容一样上传。读隔离需 OS 级隔离（专用用户账户），而非本插件配置。出处：README「Data exposure model」。

!!! warning "M1 code-complete，未完成线上验收"
    状态为 M1 代码完成（60 个测试通过），pending live acceptance，尚未完成真实飞书线上验收，不建议用于生产关键流程。出处：README 顶部 Status。

!!! warning "dependencies 用 link: 指向本地 DSH 源码包，独立发布前需替换"
    `@deepseek-ai/dsh-agent`、`dsh-session`、`dsh-llm`、`dsh-credentials`、`dsh-user-approval` 等以 `link:../deepseek-harness/packages/...` 声明，要求本地存在 `deepseek-harness` 源码检出与该插件同级；作为独立 npm 包安装/发布前需作者替换为真实版本号，否则 `pnpm install` 会因 link 目标缺失而失败。出处：`package.json` dependencies。

!!! warning "fail-closed 默认拒绝所有人，误装即锁死"
    bundle 层默认 `allowedOpenIds: []` 与 `allowedWorkspaces: []`，未在 profile patch 配置白名单时，所有发送者被拒绝、所有 `/new` 被拒绝。这是安全设计，但误装到未配置 profile 会表现为"插件装了却完全不可用"。出处：`cordis.patch.yml` 注释。

!!! warning "消息体不进插件日志，故障排查受限"
    插件自身日志与审计只记录 id 与哈希，消息体不落盘；飞书 SDK 失败日志经 redactor 过滤请求/响应体。安全上有益，但排查"消息内容为何不对"类问题时缺少本地证据，需依赖飞书侧日志。出处：README「Data exposure model」。

---

## 3. 后续拓展思路

### 可二次开发的方向

- **出站内容过滤**：README 明确"无出站内容过滤"是核心风险，可在 bridge 的 outbound 投影层增加可配置的脱敏/拦截规则（如正则屏蔽密钥、禁发工作区外路径），把"信任边界"从"谁可绑定"扩展到"可发什么"。
- **群聊与多对一会话**：当前仅私聊（`p2p_msg:readonly`），可扩展群聊场景，支持团队共享一个 agent 会话或按 @ 提及路由到不同会话。
- **审批卡片富交互**：基于 `card.action.trigger` 回调扩展更多审批类型（文件写入确认、命令执行确认、长任务中止），把"远程审批"做成完整的工作流。

### 可对接的 DSH 能力

- **user-approval**：插件已依赖 `@deepseek-ai/dsh-user-approval`，可将飞书审批卡片作为 DSH 统一审批通道之一，与 Web GUI 审批互为补充。
- **session-persistence**：与 Web GUI 共享会话依赖 `dsh-session-persistence`，可作为"多前端共享同一会话存储"的样例，验证冷会话恢复语义。
- **credentials**：`FEISHU_APP_ID` / `FEISHU_APP_SECRET` 经 dsh credentials service 引用而非明文配置，是 DSH 凭证引用机制的标准用法。

### 与其它插件组合的可能性

- **dsh-feishu-bot + dsh-todo-freshness-guard**：Guard 触发提醒/阻塞时，飞书 bot 把"Agent 已 N 步未更新 Todo"作为审批卡片推送给用户，远程决定是否手动放行，避免无人值守时 Agent 被 Guard 卡死。
- **dsh-feishu-bot + dsh-plugin-device-info**：飞书远程驱动本地 agent 时，用 `win_battery` / `win_processes` 让 agent 自报主机状态（电量、内存、进程），便于远程判断是否暂停重负载。注意 `includeSerialNumber` 在内容外发到飞书的场景应设为 `false`。
- **dsh-feishu-bot + dsh-lark-meeting-notifier**：两者都基于飞书生态，可共享同一飞书应用与凭证；会议提醒面板与 agent 私聊可在同一飞书工作台内联动——会议临近时自动暂停 agent 长任务并在会议结束后恢复。
