# laoa-dshgf

> **插件名**：LaoA-dshGF（赛博女友 · Cyber Girlfriend）
> **来源仓库**：<https://github.com/zhulin025/LaoA-dshGF>
> **许可证**：MIT（Copyright (c) 2026 老A玩AI）；内嵌美术资产继承自 BuddyLiveGF/CodexGF，AI 生成非官方，商业再分发需独立审查权利
> **commit SHA**：`ba650a3`（前 7 位）

DSH Web Client 浏览器侧 UI 插件。在 `shell.background` 根槽位渲染全框架视频角色（不替换会话区、侧边栏或详情面板），由当前 Session 的活动事实驱动七种动画状态：`idle` / `listening` / `thinking` / `speaking` / `acting` / `approval` / `done`。两套皮肤（黑色赛博 / 暖白）按 Harness 解析后的外观自动切换——浅色用暖白，深色用黑色。WebM 视频以 data URL 内嵌进浏览器 bundle，不请求皮肤资源、不读取用户文件、不公开皮肤目录。插件不修改模型请求、不提供工具、不影响 KV Cache。

---

## 1. 使用指南

### 前置依赖

- DeepSeek Harness **源码 checkout**（必须包含 `shell.background` 根槽位；当前 npm 发布版本不含该槽位，故只能源码安装）。
- peer 依赖（`workspace:^`）：`@deepseek-ai/cordis`、`@deepseek-ai/dsh-client-runtime`、`@deepseek-ai/dsh-client-ui-layout`、`@deepseek-ai/dsh-client-ui-slots`、`@deepseek-ai/dsh-client-ui-theme`、`@deepseek-ai/dsh-invariants`、`@deepseek-ai/dsh-session`。
- 运行时：`react ^18.2.0`；构建：`tsdown`（仓库自带 `tsdown.config.ts`）。

!!! warning "依赖未发布的 shell.background 槽位，必须源码安装"
    README 明确「This release targets a DeepSeek Harness source checkout. The host background slot is not part of the currently published npm release, so installation is source-based」。即当前 npm 发布版本不含 `shell.background` 根槽位，无法用 `dsh plugin add` 一键安装，必须 clone 到 Harness 源码树内并手工改 patch / package.json / tsconfig。出处：README「Install in DeepSeek Harness」首段。

### 安装命令

```sh
cd /path/to/deepseek-harness
git clone https://github.com/zhulin025/LaoA-dshGF.git packages/client/ui-cyber-girlfriend
pnpm install
pnpm run build
pnpm dsh web
```

仍需手工在 `packages/bundle/web-app/cordis.patch.yml` 的 client plugin rows 下追加：

```yaml
- id: ui-cyber-girlfriend
  name: '@laoa-ai/dsh-client-ui-cyber-girlfriend'
```

并在 `packages/bundle/web-app/package.json` 加 `"@laoa-ai/dsh-client-ui-cyber-girlfriend": "workspace:^"`、更新 roster 名为 `@laoa-ai/dsh-client-ui-cyber-girlfriend`、在 `tsconfig.client.json` 加 `{ "path": "./packages/client/ui-cyber-girlfriend" }`。

### 配置项

| 来源 | 字段 |
|---|---|
| 无 | 插件无 settings；浅色外观自动选暖白皮肤，深色外观自动选黑色皮肤 |

### 典型用法示例

**自然语言触发**：本插件为常驻视觉浮层，无自然语言触发入口；不修改模型请求、不提供工具。

**状态映射逻辑**（由 `src/client/activity.ts` `girlfriendState` 投影）：

- `approval`：当前 Session `pendingInteraction === 'approval'`（等待审批）优先级最高。
- `listening`：当前 Session 有其它待交互（`pendingInteraction !== undefined`）；或会话非运行且 `composerPhase === 'active'`。
- `acting`：会话运行中且 `runningCalls.length > 0`（有工具调用进行）。
- `speaking`：会话运行中且 `conversation.partial` 非空（流式助手输出）。
- `thinking`：会话运行中的其它情形。
- `done`：会话非运行且 `summary.completed === true`。
- `idle`：以上都不匹配。

**皮肤选择**：`skinForColorScheme('light') → 'white'`，`skinForColorScheme('dark') → 'black'`；订阅 `theme/change` 事件，主题切换即时换肤。

### 重启生效说明

!!! tip "主题切换即时换肤，无需重启"
    浏览器端通过 `ctx.on('theme/change', ...)` 订阅主题快照变化，浅色 ↔ 深色切换时立即重选皮肤。安装阶段（patch / package.json / tsconfig 修改）需 `pnpm install` + `pnpm run build` + `pnpm dsh web` 重启进程后才加载新 bundle。

---

## 2. 弊端与缺陷

!!! warning "仅支持 Web 界面，headless / ACP / JSON-RPC 无角色界面"
    浮层只组合进随附的 Web Client；headless、ACP、JSON-RPC profile 没有角色界面。出处：README「Known Limitations and Deferred Work」、README.zh「已知限制与暂缓工作」。

!!! warning "固定皮肤目录，不接受第三方皮肤"
    只接受内置黑白两套皮肤；刻意不提供导入、删除、第三方 manifest 和任意资源路径。希望自定义皮肤的用户无扩展点可用。出处：README「Known Limitations and Deferred Work」。

!!! warning "美术资产为 AI 生成非官方作品，商业再分发需独立审查权利"
    `NOTICE.md` 明确：角色视频资产复制自 BuddyLiveGF（其 Object Live 工作源自 CodexGF 与 Fei-Away/Codex-Dream-Skin，均见 MIT），属于 AI 生成非官方美术；MIT License 仅覆盖源代码，不授予商标或美术权利，商业再分发前需要独立审查权利。出处：`NOTICE.md`、README 末段、README.zh「已知限制与暂缓工作」。

!!! warning "依赖未发布的 shell.background 槽位，安装门槛高"
    `shell.background` 根槽位不在当前 npm 发布版本中，必须源码安装并手工修改 Harness 源码树的 patch / package.json / tsconfig；非源码部署的用户无法使用。出处：README「Install in DeepSeek Harness」首段、`src/client/index.ts` `ctx.slots.inject('shell.background', ...)`。

!!! warning "package.json 标注 0.1.0-rc.5，仍在 RC 阶段"
    `package.json` `version: "0.1.0-rc.5"`，尚未发 1.0 稳定版。出处：`package.json` `version` 字段。

---

## 3. 后续拓展思路

### 可二次开发的方向

- **皮肤扩展点**：当前固定黑白两套皮肤是有意为之的安全设计；可考虑加入"受信任皮肤目录 + manifest 校验"机制，在保持安全边界的前提下开放第三方皮肤。
- **更多平台 surface**：把角色浮层适配到 headless / ACP / JSON-RPC profile（如 TUI 内嵌 ASCII / Sixel，或独立桌面宠物窗口），扩展可见场景。
- **交互触发**：当前角色只读 Session 状态；可让角色作为入口（点击角色 → 跳到当前 Session / 触发常用动作），从纯装饰升级为轻交互层。

### 可对接的 DSH 能力

- **shell.background 槽位**：本插件是该槽位的首批样例之一；待 host API 在 npm 发布版本中开放后，安装门槛将大幅降低。
- **theme**：已订阅 `theme/change`，主题切换即时换肤；可继续联动 DSH 的动态主题（如按时段自动切换）。
- **sessions**：通过 `ctx.sessions` 派生活动状态，是 session 列表与会话快照的纯只读消费者，可作其它状态可视化插件的参考实现。

### 与其它插件组合的可能性

- **LaoA-dshGF + dsh-notification**：角色 `done` / `approval` 状态可与桌面通知联动，让"角色摆出等待姿势"与"系统通知"互为补充。
- **LaoA-dshGF + dsh-pet / whale-girl**：同类桌面宠物 / 视觉角色插件并存可能视觉冲突；建议二选一或分配不同屏幕区域。
- **LaoA-dshGF + dsh-ux / dsh-skin**：主题与皮肤切换插件可触发本插件换肤；组合使用时需注意主题切换的优先级与一致性。
