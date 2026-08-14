# dsh-plugin-token-billing

> **插件名**：dsh-plugin-token-billing（DSH Token 计费 / 用量仪表盘）
> **来源仓库**：<https://github.com/yzgwowcn/dsh-plugin-token-billing>
> **许可证**：MIT（Copyright (c) 2026 yzgwowcn）；图标来自 Lucide（ISC）
> **commit SHA**：`bca611c`（前 7 位）

DeepSeek Harness 官方类型双端（Host + Browser）持久化插件。Host 端通过 Cordis 插件注册 settings 命名空间与私有 RPC 通道 `/token-billing`，浏览器端按 `window.__ModuleLoader__.load` 官方 bundle 格式注入。内置 DeepSeek 官方峰谷价 + 缓存折扣价目表，按每条请求的真实 usage 与请求时刻计价；右侧常驻用量仪表盘与输入框下方的会话计费行同步刷新。

---

## 1. 使用指南

### 前置依赖

- DeepSeek Harness 主目录（`$DSH_HOME`，如 `K:\software\DSH\.dsh`），含 `profiles/node_modules/@deepseek-ai/*` 官方包
- peer 依赖：`@deepseek-ai/dsh-settings`、`@deepseek-ai/dsh-credentials`、`@deepseek-ai/schemastery`
- DeepSeek API Key（用于读取账户余额；用 `credentialRef("DEEPSEEK_API_KEY")` 解析）

!!! warning "非 dsh plugin add 标准安装路径"
    本插件未声明 `dsh.bundle` manifest，`package.json` 的 `dsh.client` 仅声明浏览器 bundle，README「安装」一节给出的是「拷贝到 `profiles/node_modules/@local/...` + 手动追加 `cordis.patch.yml` 行 + 重启」的人工流程，**不**能通过 `dsh plugin add` 一键安装。出处：README「安装」、`package.json`（无 `dsh.bundle` 字段）。

### 安装命令

```powershell
# 1. 拷贝本包到部署依赖目录（与官方 @deepseek-ai/* 同级）
$dst = "$env:DSH_HOME\profiles\node_modules\@local\dsh-plugin-token-billing"
Copy-Item -Recurse . $dst

# 2. 在 $DSH_HOME\profiles\web\cordis.patch.yml 顶层 YAML 数组中追加：
#    - insert:
#        - id: token-billing
#          name: '@local/dsh-plugin-token-billing'

# 3. 重启 harness，打开 Web 界面即可看到右侧仪表盘与计费行
```

> 浏览器 bundle 的 id 必须等于包名（`@local/dsh-plugin-token-billing`）；若未来发布到 npm，可改名为正式 scope 并同步目录名。

### 配置项

| 来源 | 字段 |
|---|---|
| 设置面板（持久化到 `settings.yaml`，namespace = `token-billing`） | `enabled`（默认 `true`）、`monthlyBudget`（¥，0=不限）、`sessionBudget`（¥，0=不限）、`warnRatio`（0~1，默认 `0.8`） |
| 内置价目表（源码 `lib/index.js`） | `deepseek-v4-flash` / `deepseek-v4-pro` 的新旧档与峰谷价；旧模型 `deepseek-chat` / `deepseek-reasoner` 按官方历史价；未匹配模型走 FALLBACK 价并标 `*` |

- 计费时段切换锚点：`ERA_BOUNDARY_MS = Date.UTC(2026, 7, 16, 16, 0, 0)`（即 2026-08-17 00:00 +08）；之前的请求按旧价，之后按峰谷价（高峰 = 北京时间 9-12 / 14-18 点，闲时半价）。
- 余额缓存有效期 30 秒，仪表盘缓存 15 秒，均由 `session/event` 失效。

### 典型用法示例

**自然语言触发**：本插件为常驻 UI 仪表盘，无自然语言触发入口；Agent 不可调用计费数据。

**Web 界面入口**：

- **设置 → 插件 → Token 计费**：开关 + 月度 / 会话预算 + 告警阈值（保存即生效，持久化到 `settings.yaml`）。
- **输入框下方一行**：本会话费用、输入 / 输出 token、账户余额；悬停查看按模型拆分（含高峰 / 闲时 / 旧价）与余额明细；点击刷新。
- **每条助手消息动作条**：显示该回合费用（挂在回合最后一条助手消息上，避免与产物清单冲突）。
- **右侧常驻面板**（鼠标移出自动收起，平滑动画）：账户余额、余额曲线（30 天 / 一周 / 24 小时，坐标轴 / 十字线 / 缩放）、最近对话（可展开、时间 / 花费排序）、开销热力图（GitHub 风格，近 16 周）、时段消费（近 14 天）、模型花费（全部会话汇总）、刷新按钮。
- **侧边栏底部按钮**：用量仪表盘开关；超预算时按钮上脉冲红点提醒。

### 重启生效说明

!!! tip "面板内开关 / 预算修改即时生效"
    设置面板的开关、月度预算、会话预算、告警阈值经私有 RPC `set-state` 写入 `settings.yaml`，无需重启 harness 即可生效。`dsh.plugin` / `cordis.patch.yml` 行变更需重启。`session/event` 触发缓存失效，新会话事件后下一次面板刷新即看到最新数据。

---

## 2. 弊端与缺陷

!!! warning "私有包未发布到 npm"
    `package.json` 标记 `"private": true`，scope 为 `@local/`，未发布 npm；只能通过拷贝到 `profiles/node_modules/@local/...` 的方式安装。出处：`package.json` `"private": true`、README「安装」。

!!! warning "settings 网关白名单导致开关必须走私有 RPC"
    官方 settings 网关只暴露硬编码白名单内的命名空间，第三方插件的命名空间不会被浏览器 settingsScope 读到；本插件因此自建 `/token-billing` RPC 通道读写开关与预算（host 端再写 `settings.yaml`），未走官方网关。出处：README「技术要点」、`lib/index.js` `ctx.effect` 注释。

!!! warning "余额曲线为按消费倒推的估算，未计入充值记录"
    余额曲线锚定当前余额，按每日 / 每小时消费倒推历史余额，未读取充值流水；若有充值，曲线会高估历史余额。出处：README「计价说明」、`lib/client.js` 余额曲线区块注释「按消费估算，未含充值」。

!!! warning "未匹配模型走 FALLBACK 单价，结果标 `*`"
    价目表只覆盖 `deepseek-v4-flash` / `deepseek-v4-pro` / `deepseek-chat` / `deepseek-reasoner`；其他模型按 `FALLBACK = { in: 2.0, cacheRead: 0.5, out: 8.0 }` 估算并打 `*` 标记，金额非官方价。出处：`lib/index.js` `RATES` / `FALLBACK`、`lib/client.js` 显示逻辑。

!!! warning "旧模型无峰谷定价，统一按历史价"
    `deepseek-chat` / `deepseek-reasoner` 价目表只有 `old` 档，未配置 `peak` / `offpeak`，无论请求时刻都按历史价计；与 2026-08-17 后切换的峰谷机制不一致。出处：`lib/index.js` `RATES` 表、`ratesFor` 函数 `if (!entry.peak) return ... entry.old`。

!!! warning "README 自述「目前自用」，稳定性按个人需求打磨"
    README 顶部声明本项目为作者自用，功能与稳定性按个人需求打磨；生产环境采用前需自行评估。出处：README 顶部 warning。

---

## 3. 后续拓展思路

### 可二次开发的方向

- **价目表外置 / 自动同步**：把内置 `RATES` 改为从 DeepSeek 官方价目页或配置文件拉取，避免官方调价后需改源码重发包。
- **多 provider 计费**：当前价目表只覆盖 DeepSeek；可扩展为按 `provider` 路由不同价目表（如对接第三方 OpenAI 兼容 provider），支持多账号聚合看板。
- **充值流水接入**：余额曲线目前只按消费倒推；接入 DeepSeek 充值 API 或本地记账后可绘制真实余额曲线。

### 可对接的 DSH 能力

- **settings 网关白名单演进**：若官方 settings 网关放开第三方命名空间，可去掉私有 RPC 中转，直接走 `settingsScope`，简化双端通信。
- **hooks**：预算告警可经 hooks 触发外部通知（IM 推送 / Bark / 桌面通知）。
- **self-modification**：仪表盘的预算阈值可让 Agent 自主调节（如「本月超支后自动收紧会话预算」）。

### 与其它插件组合的可能性

- **dsh-plugin-token-billing + dsh-cost-meter / dsh-balance-meter**：同类计费 / 余额插件并存可能造成数据冲突或界面拥挤；可考虑抽取共享价目表 RPC 服务，多面板复用同一份聚合结果。
- **dsh-plugin-token-billing + dsh-notification**：把「超预算标红」事件经 dsh-notification 推送桌面通知，离开屏幕也能感知。
- **dsh-plugin-token-billing + dsh-automation / dsh-routines**：在闲时段自动跑批任务，由本插件的峰谷价感知保证预算估算精度。
