# dsh-token-monitor

> **插件名**：dsh-token-monitor
> **来源仓库**：<https://github.com/zhangzheng25/dsh-token-monitor>
> **许可证**：MIT
> **commit SHA**：`1b889bd`（前 7 位 `1b889bd`）

在 DSH「设置 → Token 用量」原生页面展示今日 / 7 天 / 30 天 token 总量、GitHub 风格 90 天贡献图与顶层会话数；实时监听 `llm/stream` 用量并按天桶持久化，启动时通过 `sessionQuery` 回填安装前的历史。

---

## 1. 使用指南

### 前置依赖

- Node.js `>= 20`（package.json `engines`）
- DSH web profile（`dsh.client.platform: web`，客户端 bundle 经 `window.__ModuleLoader__.load` 加载）
- Host 侧注入服务：`timer`、`webServer`（`inject: ['timer', 'webServer']`）
- 可选依赖：`sessionQuery` 服务（用于历史回填与会话统计；不可用时仅实时统计仍可工作）
- 环境变量 `DSH_HOME`（可选，默认 `~/.dsh`），数据写入 `$DSH_HOME/plugins/token-usage/data.json`

### 安装命令

```bash
dsh plugin --profile web add github:zhangzheng25/dsh-token-monitor
```

或本地目录：

```bash
dsh plugin --profile web add E:\path\to\dsh-token-monitor
```

> `dsh plugin` 会在 profile 目录中转发给 pnpm 安装，并自动调和 `dsh.profile.bundles`；包内 `cordis.patch.yml` 把插件行插入宿主组合，`dsh.client.platform: "web"` 让 web 外壳加载 `client/bundle.js`。**安装后需重启 DSH**，打开「设置 → Token 用量」即可。

### 配置项

本插件未暴露任何用户可配置项（`src/index.js` 中无 `Config` / `schema` 定义）。所有行为均为内置常量：

| 常量 | 值 | 含义 |
|---|---|---|
| `DAILY_KEEP_MS` | `91 * 86400 * 1000` | 按天桶保留 91 天，超期自动 prune |
| 防抖保存间隔 | 5000 ms | `scheduleSave` 触发后 5 秒落盘 |
| 强制 flush 间隔 | 60000 ms | 每 60 秒强制 `persist()` 一次 |
| 会话统计缓存 | 20000 ms | `buildSessionStats` 20 秒缓存 |
| 启动回填延迟 | 3000 ms | 启动后 3 秒后台触发一次 `backfill()` |
| 前端轮询 | 30 秒 | client 30 秒拉取一次 `/token-usage/snapshot` |

### 典型用法

**查看用量**：安装并重启 DSH 后，打开「设置 → Token 用量」（Settings → Token Usage）：

- 顶部指标卡显示今日 / 近 7 天 / 近 30 天 token 总量（中文万 / 亿单位）。
- 中部为近 90 天 GitHub 风格贡献图，按当日 token 量分 5 档颜色深浅；悬停查看当天明细（输入 / 输出 / 缓存 / 请求数）。
- 底部为顶层对话数（今日 / 7 天 / 30 天），副文字显示对应时段的模型请求次数。

**手动操作**：

- 「刷新 / Refresh」：立即拉取一次 `/token-usage/snapshot`。
- 「回填历史 / Backfill」：以 `?backfill=1` 请求 `/token-usage/snapshot`，触发 `backfill()` 扫描会话日志补齐安装前历史。

**数据来源**：

- 实时：`llm/stream` 瀑布流中 provider 上报的 `usage` chunk（`TokenUsage`），与 harness 自身会话统计同一口径。
- 历史：会话日志中 `assistant/message` 事件的 `usage` 字段，经 `ctx.sessionQuery` 读取（zstd 解压由 harness 内部处理，不会唤醒会话）。
- 会话数：`sessionQuery.listSessions()` 头部（`cwd` / `createdAt` / `delegationDepth`）；仅 `delegationDepth === 0` 计入对话。

### 重启生效说明

!!! tip "安装与升级需重启 DSH"
    插件 host 半在 `apply` 时注册 `llm/stream` 监听、`webServer` 路由与定时器，安装/升级后需重启 DSH 才能生效。运行时数据持久化在 `$DSH_HOME/plugins/token-usage/data.json`，重启不丢（按天桶保留 91 天）。

!!! tip "历史回填无需手动操作"
    启动 3 秒后会自动后台触发一次 `backfill()`；如需立即补齐，点击页面「回填历史」按钮即可。

---

## 2. 弊端与缺陷

!!! warning "强依赖 timer 与 webServer，sessionQuery 为可选"
    `inject: ['timer', 'webServer']`，二者缺一插件无法加载；`sessionQuery` 为可选依赖，缺失时回填与对话统计返回 0（实时统计仍工作）。出处：`src/index.js` `inject` 与 `backfill` / `buildSessionStats` 中 `ctx.get('sessionQuery')` 判空、README「数据来源」。

!!! warning "历史回填只覆盖 91+7 天窗口"
    `backfill()` 中 `windowStart = Date.now() - DAILY_KEEP_MS`，并跳过 `header.createdAt < windowStart - 7d` 的会话；早于约 98 天的用量不会被回填。出处：`src/index.js` `backfill` 中 `windowStart` 与 7 天 slack 跳过逻辑。

!!! warning "实时捕获 best-effort，单次用量可能静默丢失"
    `ctx.on('llm/stream', ...)` 内对 `recordUsage` 做 try/catch，注释明确"accounting must never break the stream"。极端情况下单次用量丢失但模型调用不受影响，UI 无感知。出处：`src/index.js` `ctx.on('llm/stream', ...)` 内的 try/catch 与注释。

!!! warning "持久化为 JSON 直写无并发锁"
    `persist()` 直接 `fs.writeFileSync` 覆写 `data.json`，无文件锁；多进程同时写同一 `DSH_HOME` 会互相覆盖。DSH 通常单进程，但多 profile 并行时需注意。出处：`src/index.js` `persist()`。

!!! warning "会话统计仅数顶层会话，子代理不计入"
    `buildSessionStats` 仅统计 `header.delegationDepth === 0` 的会话；subagent 内部会话不计入"对话数"。用户若期望看到所有会话需知此口径。出处：`src/index.js` `buildSessionStats`、README「会话统计」。

!!! warning "持久化失败仅 logger.warn，UI 无感知"
    `persist()` 失败仅 `ctx.logger.warn('token-usage persist failed: ...')`，UI 不会提示；磁盘满或权限问题时数据可能只活在内存，重启后丢失。出处：`src/index.js` `persist()` 的 catch。

!!! warning "回填去重依赖 backfilledUntil 游标，中断窗口下次仍重扫"
    `backfill()` 以 `ev.time > backfilledUntil` 跳过已统计事件。若回填中途异常（被外层 catch 吞掉），`backfilledUntil` 仍会推进到 `Date.now()`；若在推进前异常，则下次会重新扫描同一窗口（重复统计由游标防住，但耗时增加）。出处：`src/index.js` `backfill` 中 `backfilledUntil = Date.now()` 的位置与外层 try/catch。

!!! warning "客户端 bundle 手工编写，无构建步骤"
    `client/bundle.js` 为手工编写以匹配 `client-modules` bundle 协议，无构建/类型检查；修改前端需手动维护该文件。出处：README「开发」、`client/bundle.js`。

---

## 3. 后续拓展思路

### 可二次开发的方向

- **配置化阈值与保留期**：把 `DAILY_KEEP_MS`、轮询间隔、缓存 TTL 等抽成 `Config`（schemastery），让用户按需调整保留期与刷新频率。
- **多模型 / 多 workspace 维度**：当前按天桶为全局聚合，可扩展为按 model / workspace（`cwd`）分组，支持按工作区或模型查看用量分布。
- **导出与告警**：增加 CSV/JSON 导出按钮，并在某天用量超阈值时经 hooks 触发通知（如 IM 推送）。
- **回填并发与增量索引**：`backfill()` 当前串行 `readSession`，会话量大时较慢；可改为并发读取并维护增量索引，避免每次全量扫描。

### 可对接的 DSH 能力

- **settings.section slot**：本插件是 `slots.inject('settings.section')` 注册原生设置页的范例，可作为其它"仪表盘型"插件的模板。
- **llm/stream waterfall**：`ctx.on('llm/stream', ...)` 是"旁路统计"模式的范例——必须 `next()` 并原样转发 chunk，避免影响模型调用，可复用于其它需要旁路观测的插件。
- **sessionQuery**：展示了如何在不唤醒会话的前提下读取会话日志做回填与统计，可作为历史数据型插件的参考。
- **webServer.register**：`/token-usage/snapshot` 是 host→client 静态 bundle 模式的范例（plain fetch，无 `harness.handle`）。

### 与其它插件组合的可能性

- **dsh-token-monitor + dsh-better-sidebar**：把用量指标卡或迷你贡献图作为 better-sidebar Tab 常驻侧栏，无需进入设置页即可一眼查看当日用量。
- **dsh-token-monitor + 计费 / 预算类插件**：以本插件的按天桶为数据源，叠加价格表与预算阈值，做超支告警与月度成本报表。
- **dsh-token-monitor + dsh-np-ppt**：用本插件的用量数据生成"我的 token 用量月报"PPTD，由 dsh-np-ppt 编译成 PPTX 汇报。
