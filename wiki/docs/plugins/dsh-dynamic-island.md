# dsh-dynamic-island

> **插件名**：dsh-dynamic-island（DSH 灵动岛）
> **来源仓库**：<https://github.com/YLifeOnlyOnce/dsh-dynamic-island>
> **许可证**：MIT（仓库根 LICENSE 文件；`package.json` `license: MIT`）
> **commit SHA**：`37e909e`（前 7 位 `37e909e`）

给 DeepSeek Harness 的一只小玻璃伙伴——Agent 思考时它轻轻呼吸，干活时它微微脉动，要动你的东西之前，它还会先礼貌地问你一声。Apple Liquid Glass 风格的灵动岛概念原型：把 Agent 的内心活动——思考、工具调用、审批、异常、完成——变成一块轻量、可读、带一点点陪伴感的小屏幕，趴在屏幕边缘。它**不是**一只和任务无关的桌宠，每一次形态变化都来自真实的 Harness 状态。

---

## 1. 使用指南

### 前置依赖

- React `^18.2.0 || ^19.0.0`、react-dom 同版本（peerDependencies，由宿主或用户安装）
- dsh 客户端运行时（`@deepseek-ai/dsh-client-runtime`、`@deepseek-ai/dsh-client-locale`、`@deepseek-ai/dsh-client-ui-slots`、`@deepseek-ai/dsh-client-ui-model-selection`，由 `package.json#dsh.client.inject` 声明，由 Web GUI 提供）
- dsh Web GUI 的 `shell.overlay` 浮层槽（ui-layout 专门为全屏浮层预留的加性 list 槽，z-index 20、点击穿透、目前零注册者）
- 开发期：Node.js、Vite 8、oxlint

### 安装命令

```sh
# 直接装进 Harness（web profile）
dsh plugin --profile web add dsh-dynamic-island
dsh --profile web          # 重启 → 岛浮现在 GUI 右上角，可拖拽、位置记忆

# 或作为普通依赖（开发/引用浏览器半场）
npm install dsh-dynamic-island

# 本地开发：从源码装
npm run build:plugin       # 产出 lib/client.js
dsh plugin --profile web add /path/to/this-repo
```

仓库根即双面包插件包：`package.json` 声明 `dsh.bundle.patch → ./cordis.patch.yml`、`dsh.client { platform: 'web', inject: [...] }`、`exports["./client"] → lib/client.js`。`dsh plugin --profile web add <pkg>` 一条命令安装，重启 dsh 生效。

`cordis.patch.yml` 内容（来源：仓库根 `cordis.patch.yml`）：

```yaml
- insert:
    - id: ui-dynamic-island
      name: 'dsh-dynamic-island'
```

### 配置项

无静态配置项。所有行为由源码常量与 dsh 平台模块注入决定：

| 来源 | 字段 |
|---|---|
| `cordis.patch.yml` | `id: ui-dynamic-island`、`name: 'dsh-dynamic-island'`（insert 一行） |
| `package.json#dsh.client` | `platform: 'web'`、`inject: ['@deepseek-ai/dsh-client-runtime', '@deepseek-ai/dsh-client-locale', '@deepseek-ai/dsh-client-ui-slots', '@deepseek-ai/dsh-client-ui-model-selection']` |
| `src/client/index.js` apply | `ctx.slots.inject('shell.overlay', ...)` 注册（order: 100，locale: 'island'，store: createIslandStore） |
| `src/client/locales.js` | zh / en 字典（NS = 'island'） |
| 拖拽位置记忆 | 由 `src/hooks/useDraggable.js` 持久化（刷新后保留） |

### 典型用法示例

**演示模式**（来源：README「跑起来」）：

```sh
npm install
npm run dev
```

打开 Vite 打印的地址，底部 `灵动岛演示` 栏可切换八种心情：

- **确认**状态点「批准 / 暂不」，看小岛瞬间同步反映结果；
- 点「查看过程」展开岛内活动流：工具卡带退出码、耗时，还能一键复制命令；
- 点「清单」展开完整任务清单（三态勾选）；目标进度环显示 goal 轮次；
- **执行**态可点「停止」，**异常**态可点「重试」，**阻塞**态可点「解除阻塞」，**上限**态可点「继续」；
- 按住岛任意空白处可**拖拽**到任意位置（位置会记住，刷新后仍在）；
- 按 **⌘K**（或 Ctrl+K）打开命令面板，输入过滤、↑↓ 选择、↵ 执行；
- 点「▶ 自动演示」完整看一遍 待命 → 思考 → 执行 → 确认（自动批准）→ 完成 的弧线，按 **Esc** 随时收起。

**八种心情 ↔ DSH 信号映射**（来源：README「它怎么和 DeepSeek Harness 对话」）：

| 岛的心情 | DSH 信号 | 色调 |
|---|---|---|
| `idle` 待命 | `agent/status: idle` | slate |
| `thinking` 思考 | `agent/status: running`、`step/start`、`assistant/chunk`（reasoning-delta） | aqua |
| `working` 执行 | `tool/call` → 对应的 `tool/result`（含 `error` / `meta`） | mint |
| `approval` 确认 | 输入区有待处理的审批 | coral |
| `complete` 完成 | `turn/end` 成功结束 + `assistant/message.usage` | lime |
| `alert` 异常 | `tool/result` error、`agent/request-error`、`turn/end {error}` | amber |
| `blocked` 阻塞 | `turn/end {blocked}` | violet |
| `max-tokens` 上限 | `turn/end {max-tokens}` | rose |

### 重启生效说明

!!! tip "安装后需重启 dsh web 生效"
    `dsh plugin --profile web add <pkg>` 后需重启 `dsh --profile web`，浏览器半场才会被 `dsh-client-modules` 装配进 `window.__DSH_BOOT__`，岛浮现在 GUI 右上角。来源：README「集成进 DSH」、`docs/integration.md` §一。

!!! tip "拖拽位置会持久化"
    按住岛任意空白处可拖拽到任意位置，位置会记住，刷新后仍在（由 `src/hooks/useDraggable.js` 持久化）。来源：README「跑起来」。

!!! tip "尊重 prefers-reduced-motion 与无障碍"
    灵动岛尊重 `prefers-reduced-motion`，不单靠颜色表达状态，审批按钮永远是真实可点的按钮（非伪按钮）。来源：README「你会喜欢它的理由」。

---

## 2. 弊端与缺陷

!!! warning "状态：高保真设计原型，尚未完成真实 GUI 联调"
    README 顶部明确写"Status: a high-fidelity design prototype"——为 DSH 设计、打磨、验证灵动岛形态的地方，之后才会变成真正的插件。路线图最后一项 "Real-GUI integration pass (live-bridge on-device check + retry/continue/unblock/approve wired to real remotes)" 仍为未完成 `[ ]`。当前可演示但实机集成未完成。出处：README 顶部 Status、Roadmap。

!!! warning "shell.overlay 是 root 作用域，拿不到框架注入的 sessionId / useSession"
    `shell.overlay` 是 root 作用域，拿不到框架注入的 `sessionId` / `useSession` 标准件——需要自己用全局座的 `useSessions` 找到当前会话，再经 `ctx.sessions.binding(id).session.projections.faceOf(key)` 订阅投影，或用 uSES 桥（`web-react` 的 `bindSnapshotSelector`）绑定快照；还要自洽处理「无会话 / 多会话」边角。出处：`docs/integration.md` §三 关键约束。

!!! warning "流式预览只能走快照，不能直接订阅 assistant/chunk"
    原始 `assistant/chunk` 不进 `ctx.remote`（仅 allowlist 宿主事件），只能走快照 `partial`（PartialAssistant 正文）+ `runningCalls`；这意味着灵动岛的流式预览有快照批处理延迟，非原始事件流的实时逐 token。出处：`docs/integration.md` §三 数据通道表。

!!! warning "files/checks 无投影源，结果小票字段不完整"
    结果小票的"文件 / 检查"两项暂无投影源，TODO 标注"从 chat 节点 deliverables 派生"——当前结果小票可能只显示 tokens / 用时，不显示文件与检查项。出处：`docs/integration.md` §三 数据通道表。

!!! warning "live-bridge 重试/继续动作面待接"
    重试（`session.prompt` queue/steer）与继续动作的回执链路在 `live-bridge` 中标注为"待接"——当前 `重试` / `继续` 按钮在演示中可点但未接真实远端，真实 GUI 中可能无效。出处：`docs/integration.md` §三 数据通道表、README Roadmap。

!!! warning "npm 发布物未包含 LICENSE 文件"
    `package.json` `files` 字段只发布 `lib/client.js`、`cordis.patch.yml`、`src/index.js`，未把 LICENSE 列入发布物——npm 包级别可能缺 LICENSE 文件，下游用户法律意义上拿不到完整 MIT 文本。出处：`package.json` `files` 字段。

!!! warning "强依赖 dsh Web GUI 的 shell.overlay 槽位与平台模块表"
    灵动岛强依赖 dsh Web GUI 的 `shell.overlay` 浮层槽与 `@deepseek-ai/dsh-client-*` 平台模块；dsh 版本不匹配（如 `shell.overlay` 槽位改名、平台模块 API 变更）将导致插件无法挂载。出处：`src/client/index.js` apply、`docs/integration.md` §二。

---

## 3. 后续拓展思路

### 可二次开发的方向

- **完成真实 GUI 联调**：README 路线图最后一项明确"Real-GUI integration pass (live-bridge on-device check + retry/continue/unblock/approve wired to real remotes)"——把 `live-bridge` 的重试/继续/解除阻塞/审批动作面接上真实远端，并在真实 dsh web 中验证无会话/多会话/事件流断开/HMR 重载边角。
- **files/checks 投影源补全**：当前结果小票的"文件 / 检查"无投影源，可从 chat 节点 `deliverables` 派生（`docs/integration.md` §三 已标 TODO）。
- **多会话切换**：当前 `shell.overlay` 是 root 作用域，需自洽处理多会话；可扩展为"会话切换器"形态，岛内显示当前会话标签，点击切换。
- **主题/配色可配置**：八种心情的色调目前写死在 `src/data/moods.js`；可扩展为用户自定义主题（深色/浅色/节日）。
- **收纳与展开动画细化**：当前 Liquid Glass 动画已较丰富，可进一步加入"鼠标悬停预览""长按展开详情"等微交互。

### 可对接的 DSH 能力

- **shell.overlay 槽位**：已注册进 `shell.overlay`（`src/client/index.js` apply），是该槽位的首个注册者；后续 dsh 可在该槽位叠加更多浮层（如 toast、状态胶囊），通过 `order` 字段自排序。
- **ctx.sessions.currentProvideInfo**：订阅会话快照 + 投影（goal、todos、tokenUsage、contextPressure、permissions）作为数据源；这是 dsh 客户端运行时的标准能力，可被其他浮层插件复用。
- **i18n（locale）**：已通过 `ctx.locale.register(NS, { zh, en })` 注册字典（NS = 'island'），支持中英双语；可扩展更多语言。
- **command palette（⌘K）**：已实现命令面板，可对接 dsh 的命令注册机制，把 dsh 内置命令（如 `/new`、`/model`）纳入岛内命令面板。

### 与其它插件组合的可能性

- **dsh-dynamic-island + dsh-onebot**：dsh-onebot 把 QQ 消息接入 dsh Agent；灵动岛可扩展"消息到达"心情（如收到 QQ 私聊/群聊 @ 时岛轻微脉动），让用户在桌面即可感知 QQ 通道活动。
- **dsh-dynamic-island + dsh-fleet-audit**：dsh-fleet-audit 跑凭据审计时，灵动岛可显示"working"心情并在结果小票中展示"权限过宽文件数 / 泄漏数"，把安全审计可视化。
- **dsh-dynamic-island + dsh-group-photo**：合影墙入镜事件可作为岛的"complete"心情载荷，岛内展示"已入镜：<昵称>"小票，与合影墙联动。
- **dsh-dynamic-island + dsh-archived-conversations**：归档/恢复会话操作可在岛内显示状态（如"恢复会话中…"→"恢复完成"），给归档操作以即时反馈。
