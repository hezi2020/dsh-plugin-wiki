# tokenledger

> **插件名**：TokenLedger（npm 包名 `dsh-tokenledger`）
> **来源仓库**：<https://github.com/zh667/TokenLedger>
> **许可证**：MIT（`src/usage.js` 折叠逻辑改编自 dsh-usage-stats MIT，详见 NOTICE）
> **commit SHA**：前 7 位 `ddc4493`

统计 DeepSeek Harness 的 Token 消耗，并和 New API、Sub2API 中转站的实际扣费对账。TokenLedger 存在的理由是其它实现都缺的那一半：你的用量记录里没有「这笔钱花在哪个中转站」，所以永远对不上中转站的账单。它把 `(中转站, Provider, 模型)` 作为一等维度记录下来，再去读两个站自己的账单 API，把两边并排放，并明确标注这次比对的证据等级（request / aggregate / summary），拒绝不可比的比对。

---

## 1. 使用指南

### 前置依赖

- Node.js `>= 22`（package.json `engines`）
- DSH 运行时（peerDependencies 通过 cordis.patch.yml 注入）
- DSH 会话日志访问能力（`sessionPersistence.readFrom(id, seq)`）
- 零运行时依赖：SQLite 用 Node 内置的 `node:sqlite`；126 个测试用 `node --test`
- 早期开发中：已作为 DSH 插件在真实 DSH 中跑通全链路；Web UI 页面尚未完成，也未发布 npm

### 安装命令

```bash
# 唯一一条命令
dsh plugin --profile web add github:zh667/TokenLedger
```

`dsh plugin` 转发给 pnpm；因本包声明 `dsh.bundle`，DSH 会自动登记进 `dsh.profile.bundles`，bundle patch 随即自动挂载插件行——不需要改 `package.json`，也不需要手写任何 YAML。零配置即可用：所有调用归到 `direct`，按天按模型的报表已经是对的。

想要中转站维度，在该 profile 的 `cordis.patch.yml` 加三行：

```yaml
- id: tokenledger
  config:
    relays:
      my-route: https://relay.example.com/v1   # 短形式
      # 或长形式：
      # my-route:
      #   baseUrl: https://relay.example.com/v1
      #   id: my-label
      #   type: sub2api
```

`my-route` 是 `dsh-llm-pi-ai` 的 `config.providers` 下的键名，即每条 assistant 消息上 `AssistantProvenance.provider` 的值。卸载：`dsh plugin --profile web remove dsh-tokenledger`。

### 配置项

| 来源 | 字段 |
|---|---|
| profile `cordis.patch.yml`（`tokenledger` 行） | `relays`（中转站映射，键为 provider route 名，值为 baseUrl 字符串或 `{baseUrl, id, type}` 长形式） |
| 自动识别 | 站点 id（Base URL 精确 origin）、中转站软件类型（newapi / sub2api，零凭证指纹识别） |
| 不可配置 | `direct`（无 relay 配置时的默认归集）、按天按模型按站点的报表口径 |

凭证只存引用，不存值；需要区分同一域名下的多把 key 时用不可逆指纹（`credentialFingerprint`）打标签。API Key 不进 URL、不进日志、不进用量行、不进诊断报告。

### 典型用法示例

```js
import { foldUsage, bySite, byModel } from "dsh-tokenledger";
import { RelaySiteRegistry, createSiteResolver } from "dsh-tokenledger/relay-sites";

const registry = new RelaySiteRegistry([
  { id: "nine", type: "newapi",  baseUrl: "https://api.relay-one.example/v1" },
  { id: "sub",  type: "sub2api", baseUrl: "https://api.relay-two.example" },
]);

// DSH 的 provider 路由 → 它配置的 Base URL
const resolveSite = createSiteResolver(registry, {
  relayA:   "https://api.relay-one.example/v1/chat",
  official: "https://api.deepseek.com",
});

const days = foldUsage(sessionEvents, { resolveSite });

bySite(days);              // 按中转站汇总——对账用的 DSH 侧数字
byModel(days, {}, "nine");  // 只看某个站的模型分布
```

DSH 报表命令：`/tokenledger`（已实现）。

### 重启生效说明

!!! tip "改完 relay 配置需重启 DSH"
    `cordis.patch.yml` 的 `relays` 配置改动需重启 DSH 生效；但站点 id 与软件类型指纹识别是运行时自动探测的，新增 relay 后只需重启即可自动识别。历史归属永不重写——改了某 provider 的 Base URL 只影响之后的调用。

---

## 2. 弊端与缺陷

!!! warning "早期开发中，Web UI 与 npm 发布尚未完成"
    已作为 DSH 插件在真实 DSH 中跑通全链路；Web UI 页面尚未完成（⬜），也未发布 npm（⬜）；原生 settings 页面待需求触发才做（触发条件是「有人说报表能用但想点筛选器的时候」）。出处：README 顶部状态声明、「状态」表、「原生页面为什么还没做」。

!!! warning "request 级对账对任何站都不可达"
    DSH 的会话日志不记录供应商的 request id，所以就算站点给了也没法逐笔 join；当前最高只能到 `aggregate` 级。出处：README「对账引擎 · 等级取两侧较弱的那个」。

!!! warning "dsh-session 等 npm latest 标签过期"
    宿主侧依赖的 `dsh-session`、`dsh-session-persistence` 等 npm `latest` 标签还停在 `0.0.1-rc.1`，真正在用的版本在 `next` 上；`npm view <包> version` 读的是 `latest`，会给出过期数字。出处：README「原生页面为什么还没做」中的「顺带一个坑」。

!!! warning "会话日志是 zstd 多帧拼接，直接读文件会静默少算"
    会话日志每次 flush 一帧，单次 `zstdDecompressSync` 只解第一帧然后静默返回一小部分；一个 11.9 KB 的文件看起来只有一行。必须按 `28 B5 2F FD` 帧头逐帧解——README 强烈建议走 `sessionPersistence.readFrom()` 而非直接读文件。出处：README「端到端实测」中的「另外发现一个坑」。

!!! warning "Sub2API 有两个费用口径，差 30%"
    Sub2API 同时暴露 `cost`（标价）与 `actual_cost`（实扣），实测同一批流量 `cost: 0.33138075`、`actual_cost: 0.231966525`，差 30%。合并成「费用」要么虚报要么把折扣藏掉，对账层必须原样带出两个值交给用户决定问哪一个。出处：README「两个站的账单形状差多少」。

!!! warning "币种绝不换算，缺失值是 null 不是 0"
    估算是 CNY、扣费是 USD，是两个事实；编汇率相减等于伪造用户来查的那个数。缺失的值是 `null` 不是 `0`（零是一个测量结果）。混合报表取最弱等级，否则一个只有 summary 的站会被当成已验证的看。出处：README「对账引擎」四条规则。

!!! warning "采集器扫描而非订阅，任何失败都降级"
    采集器扫描而非订阅（订阅会把这段代码放进请求热路径，且插件没运行时写入的一切会永久丢失，重启后静默少算）；任何失败（日志损坏、数据库锁住、上游改形状）全部降级成计数 + 一条日志 + 跳过该会话。出处：README「作为 DSH 插件安装」末尾。

---

## 3. 后续拓展思路

### 可二次开发的方向

- **原生 settings 页面落地**：当前只有文字报表，待需求触发（用户说「想点筛选器」）时把筛选从敲参数变成点击；增量唯一是交互，文字报表已能回答全部问题。
- **更多中转站软件适配器**：当前覆盖 New API / Sub2API；可扩展 VoAPI、One API 等同源分叉（共享路由，一个适配器常能覆盖一整支），扩大对账覆盖面。
- **request 级对账破局**：DSH 会话日志不记录供应商 request id 是 request 级不可达的根因；可推动 DSH 上游在 `AssistantProvenance` 上加 request id，或本插件在 provider adapter 层自行注入并回写。

### 可对接的 DSH 能力

- **hooks**：采集器扫描可改为 hooks 触发——`session/flush` 事件触发增量 checkpoint，减少扫描轮询成本（但需注意订阅模式的风险）。
- **skill**：把「对账某个中转站」「导出 CSV 报表」封装为 DSH Skill，让 Agent 自然语言触发月度对账。
- **self-modification**：`foldUsage` 的双事件源 / 替换语义 / 路由归因逻辑改编自 dsh-usage-stats，可作为 self-modification 的「在已有实现上修最易漏的三条坑」范例。

### 与其它插件组合的可能性

- **TokenLedger + dsh-track**：dsh-track 自己有 LLM 用量账本（track 引擎调用的 LLM 费用单独计量）；TokenLedger 覆盖 DSH 全量。组合可形成「track 自身开销 vs 全局开销」的双层账本。
- **TokenLedger + dsh-clawrouter**：dsh-clawrouter 的 `/spend` 报告 blockrun 路由的开销；TokenLedger 覆盖 DSH 直接 provider 路由 + 中转站对账。组合可形成「主循环 DeepSeek + blockrun 强模型评审 + 中转站对账」的全链路成本视图。
- **TokenLedger + dsh-github**：dsh-github 的 `reviewMode: "model"` 子代理开销可被 TokenLedger 归集到「PR 评审」维度，形成「每条 PR 评审花了多少 token」的成本归因。
