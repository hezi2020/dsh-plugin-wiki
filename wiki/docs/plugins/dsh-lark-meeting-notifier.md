# dsh-lark-meeting-notifier

> **插件名**：dsh-lark-meeting-notifier（飞书会议提醒）
> **来源仓库**：<https://github.com/yeruizhi/dsh-lark-meeting-notifier>
> **许可证**：MIT（Copyright (c) 2026 yeruizhi）
> **commit SHA**：`1518825`（前 7 位）

DSH 工作区右侧悬浮框，列出今天剩余的飞书会议，多闹钟提前闪烁提醒（黄/橙/红随紧迫度），让你埋头写代码时不会错过会议。会议室名称从飞书日历的「会议室」资源参会人读取；点击会议记录关闭当前提醒（关闹钟），单条「✕」移除提醒（本地持久化，不动飞书日历真实日程）。

---

## 1. 使用指南

### 前置依赖

- Node.js（`package.json` 未声明 engines）
- DeepSeek Harness（web profile）
- [`@larksuite/cli`](https://www.npmjs.com/package/@larksuite/cli)（命令名 `lark-cli`）已安装并完成应用配置
- lark-cli 以 **user 身份**授权 `calendar:calendar:readonly` scope（bot 身份看不到个人日历）
- Host 执行 lark-cli 需 `sandboxPolicy: { mode: 'danger-full-access' }`（读配置 + 联网）

### 安装命令

```sh
dsh plugin --profile web add github:yeruizhi/dsh-lark-meeting-notifier
```

然后重启 `dsh web`（或 `npx @deepseek-ai/dsh web`），页面右侧出现「🕐 会议」小胶囊。

#### lark-cli 初始化与授权

```bash
# 1. 安装 lark-cli
npm install -g @larksuite/cli
lark-cli --version    # 应输出 lark-cli version x.y.z

# 2. 初始化应用配置（打开授权链接或扫码）
lark-cli config init

# 3. 授权日历读取权限（user 身份，最小 scope）
lark-cli auth login --scope "calendar:calendar:readonly"
# 必须用 user 身份（--as user），bot 身份看不到个人日历

# 4. 验证
lark-cli auth status --json --verify
# 确认 identity=user、verified=true
```

### 配置项

| 字段 | 默认 | 说明 |
|---|---|---|
| `leadMinutes` | `[20, 10, 5]` | 多选（分钟），每个提前量是一个独立闹钟 |
| `autoStop` | `true`（开） | 提醒将在 30 秒后自动停止闪烁 |
| `autoExpand` | `true`（开） | 提醒时自动展开面板 |
| `refreshSeconds` | `30` | 刷新间隔（30 / 60 / 120） |
| `roomNameStyle` | `full`（完整） | 会议室名显示（完整 / 简短） |

配置存于浏览器 localStorage `dsh.meeting.config`，隐藏的会议 id 列表存于 `dsh.meeting.hidden`。Host 路由：`GET /dsh-lark-meeting/list?day=today|tomorrow`、`GET /dsh-lark-meeting/health`。

### 典型用法示例

- **展开/收起**：点击右侧「🕐 会议 N」胶囊。
- **会议条目**：时间段、标题（有视频会议可点击打开）、组织人、会议室。
- **关闭提醒**：会议闪烁时点击该条目（关闹钟）。
- **移除提醒**：点条目右侧 ✕（仅本地，不动飞书日历）。
- **明日**：今日会议清空时，展开面板头部出现「明日」，点击加载明天的会议。

### 故障排查

| 现象 | 原因 | 解决 |
| --- | --- | --- |
| 面板显示「lark-cli 未安装」 | 缺少 `@larksuite/cli` | `npm install -g @larksuite/cli` |
| 面板显示「飞书未授权或缺少日历权限」 | 未授权 / scope 缺失 / 登录态过期 | `lark-cli auth login --scope "calendar:calendar:readonly"` |
| 列表为空 | 今天确实没有剩余会议 | `lark-cli calendar +agenda --as user` 核对 |

### 重启生效说明

!!! tip "安装后需重启 dsh web"
    插件通过 `cordis.patch.yml` 注入一行（Host 半部 + Client 半部由同一 bundle 挂载），`dsh plugin add` 后需重启 `dsh web` 才会在页面右侧加载悬浮框。客户端配置（提醒提前量、刷新间隔等）改完即时生效（localStorage），无需重启。出处：README「安装」、`package.json` dsh.client.immediately。

---

## 2. 弊端与缺陷

!!! warning "必须 user 身份授权，bot 身份看不到个人日历"
    `lark-cli auth login --scope "calendar:calendar:readonly"` 必须以 user 身份（`--as user`）完成，bot 身份看不到个人日历；若误用 bot 身份授权，面板会显示「飞书未授权或缺少日历权限」。出处：README「前置条件」。

!!! warning "Host 执行 lark-cli 需 danger-full-access 沙箱"
    `index.js` 中 `ctx.shell.resolve` 使用 `sandboxPolicy: { mode: 'danger-full-access', workspaceRoot: '/' }`，因 lark-cli 需读配置文件 + 联网访问飞书 API。这意味着 Host 侧 lark-cli 子进程不受沙箱限制，信任边界等同于 lark-cli 本身。出处：README「技术要点」、`index.js`。

!!! warning "单条 ✕ 移除提醒只写本地，不同步飞书日历"
    移除提醒仅写 localStorage `dsh.meeting.hidden`，不会动飞书日历里的真实日程——会议仍在日历中，只是本插件不再提醒。若在另一台机器或清掉 localStorage 后会重新出现。出处：README 顶部功能列表。

!!! warning "过期会议自动移除，仅显示今天剩余"
    开始时间已过的会议自动移除；面板仅显示今天剩余会议，今日清空后才出现「明日」入口。无法查看后天及以后的会议，也无法回看已结束会议。出处：README 顶部功能列表。

!!! warning "会议室名取自 type=resource 参会人，缺失则留空"
    会议室名通过 `lark-cli calendar events get --need-attendee` 取 `type=resource` 参会人的 `display_name`；重复日程实例用 `recurring_event_id`，例外实例用 `event_id`。若会议未配置资源参会人，会议室字段为空——这是飞书日历数据本身的限制，非插件可补。出处：README「技术要点」、`index.js`。

!!! warning "lark-cli 登录态过期需手动重授权"
    lark-cli 的 user 登录态过期后，面板会显示「飞书未授权或缺少日历权限」，需手动重新执行 `lark-cli auth login --scope "calendar:calendar:readonly"`；插件不会自动续期或提示除面板文案外的告警。出处：README「故障排查」。

---

## 3. 后续拓展思路

### 可二次开发的方向

- **多日视图与议程**：当前仅今日 + 明日，可扩展为可滚动多日视图或按周/按日切换，复用现有 `fetchMeetings(day)` 与 `/list?day=` 路由。
- **系统级通知**：闪烁仅限 DSH Web 面板，浏览器标签页失焦或最小化时易被忽略。可对接浏览器 Notification API 或桌面通知，会议临近时弹系统通知。
- **与飞书日历双向同步**：当前「✕ 移除」只本地隐藏，可增加"在飞书日历拒绝该会议"的可选动作（需更大 scope），让提醒关闭与日历状态一致。

### 可对接的 DSH 能力

- **shell (ctx.shell)**：本插件是 `ctx.shell.resolve` + `ctx.shell.run` 调用外部 CLI（lark-cli）的样例，展示了 `sandboxPolicy`、`timeoutMs`、`stdoutMaxBytes` 等参数用法，可被其他需要"Host 调外部 CLI + Client 拉结果"的插件借鉴。
- **webServer 路由 + Client fetch**：Host 注册 `/dsh-lark-meeting/list` 与 `/health` 两条 exact 路由，Client 用 `fetch` 拉取——这是 DSH Host↔Client 通信的标准模式之一，比走完整 tool 调用更轻。
- **slots (shell.overlay / settings.section)**：Client 半部通过 `ctx.slots.inject('shell.overlay', ...)` 注入右侧悬浮框、`ctx.slots.inject('settings.section', ...)` 注入设置项，是 DSH 客户端扩展点的典型用法。

### 与其它插件组合的可能性

- **dsh-lark-meeting-notifier + dsh-feishu-bot**：两者同属飞书生态，可共享同一飞书应用与凭证。会议临近时，dsh-feishu-bot 的 agent 私聊可自动收到「15 分钟后有会议，是否暂停长任务」的提示；会议结束后恢复，形成"会议-agent"联动。
- **dsh-lark-meeting-notifier + dsh-todo-freshness-guard**：Guard 的提醒/阻塞与会议提醒都是打断式通知，可统一一套优先级——会议临近时降低 Guard 的打断强度（或临时放宽 `blockAfterCalls`），避免临近开会时 Agent 被 Guard 卡死。
- **dsh-lark-meeting-notifier + dsh-agy**：dsh-agy 的长任务可能跨越多个会议时段，会议提醒面板可与 agy 账号轮换日志对齐，便于事后复盘"某次 429 限流是否发生在会议期间网络抖动"。
