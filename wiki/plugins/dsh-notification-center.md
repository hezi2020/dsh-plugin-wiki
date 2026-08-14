# dsh-notification-center

> **插件名**：dsh-notification-center（DSH 通知中心插件，npm 包名 `@lyhalal/dsh-notification-center`）
> **来源仓库**：<https://github.com/610la/dsh-notification-center>
> **许可证**：MIT（package.json 声明；仓库未包含 LICENSE 文件）
> **commit SHA**：`60610d5`（前 7 位）

DSH 的通知中心：对话/任务完成后自动在浏览器弹出系统通知并播放提示音效——切到别的窗口也不会错过。内置 21 种提示音效，每类事件（对话完成、子任务完成、Workflow 完成、后台任务完成、等待批准、报错停止、超长截断、被阻塞、其他原因、手动停止/打断）独立配置音效类型/自定义文件/自定义 URL/音量/开关。设置自动保存，刷新不丢失。

---

## 1. 使用指南

### 前置依赖

- DeepSeek Harness（dsh）已安装并可启动 `dsh web`
- 浏览器：官方 Web UI，需用户授权浏览器通知权限
- peerDeps：`react ^18.2.0`、`@deepseek-ai/cordis ^4.0.1`、`@deepseek-ai/dsh-client-runtime >=0.1.0`、`@deepseek-ai/dsh-client-ui-slots >=0.1.0`、`@deepseek-ai/dsh-client-connection >=0.1.0`（由 profile 提供）

### 安装命令

一条命令即可（推荐）：

```bash
dsh plugin --profile web add @lyhalal/dsh-notification-center
```

重启 DSH 后生效，浏览器端自动加载，无需其他配置。

手动方式（等价）：在 DSH 项目目录 `npm install @lyhalal/dsh-notification-center`，并在 host 的 `cordis.yml` 的 `plugins` 下加一行：

```yaml
plugins:
  - from: '@lyhalal/dsh-notification-center'
```

### 配置项

| 来源 | 字段 |
|---|---|
| GUI（设置 → 通知中心） | 总开关：浏览器通知、完成音效、通知权限、浏览器通知测试、冷却间隔；事件：对话完成、子任务完成、Workflow 完成、后台任务完成、等待批准；停止原因：报错停止、超长截断、被阻塞、其他原因、手动停止/打断；每类事件可设：音效类型（21 种内置 / 静音 / 自定义文件 / 自定义 URL）、音量、开关 |
| 输入栏左侧 🔔 | 快速开关「浏览器通知 / 完成音效」、授权通知权限、测试 |

- 设置自动保存，刷新不丢失。
- 模型请求权限/批准时立即提醒（不受冷却限制）。
- 手动停止/打断生成默认不通知。

### 典型用法示例

- **快速开关**：输入栏左侧 🔔 图标可快速开关「浏览器通知 / 完成音效」、授权通知权限、测试。
- **完整配置**：设置 → 通知中心：
  - **总开关**：浏览器通知、完成音效、通知权限、浏览器通知测试、冷却间隔。
  - **事件**：对话完成、子任务完成、Workflow 完成、后台任务完成、等待批准。
  - **停止原因**：报错停止、超长截断、被阻塞、其他原因、手动停止/打断。
  - 每个分类点开后可设置：**音效类型**（21 种内置 / 静音 / 自定义文件 / 自定义 URL）、**音量**、**开关**；选择音效时立即试听。
- **卸载**：`dsh plugin --profile web remove @lyhalal/dsh-notification-center`

### 重启生效说明

!!! tip "安装后重启 DSH 生效"
    安装/卸载后需重启 DSH 才生效；浏览器端自动加载，无需其他配置。设置项调整实时保存，刷新不丢失。

!!! tip "首次使用需授权浏览器通知权限"
    首次使用请点「授权」或点「测试」，浏览器会弹出通知权限询问；允许后才会弹出系统通知。

!!! tip "音效需页面内有任意一次点击后才会响"
    受浏览器自动播放策略限制，音效需用户与页面有过任意一次点击交互后才会播放；冷启动后第一次音效可能不响。

---

## 2. 弊端与缺陷

!!! warning "需用户主动授权浏览器通知权限"
    首次使用需用户主动点「授权」或「测试」让浏览器弹出询问；未授权则无法弹出系统通知。用户若忽略此步骤将收不到任何通知。出处：README「提示」。

!!! warning "音效受浏览器自动播放策略限制"
    音效需要页面内有任意一次点击后才会响（浏览器自动播放策略）；冷启动后首次触发的音效可能不响，需先与页面交互。出处：README「提示」。

!!! warning "手动停止/打断默认不通知，需手动开启"
    手动停止/打断生成默认不通知；用户若希望此类事件也提醒，需在「停止原因 → 手动停止/打断」手动打开，否则会错过手动停止事件。出处：README「提示」「功能一览」。

!!! warning "仅面向 web profile"
    插件 `dsh.client.platform: web`，只面向 `web` profile 的 Web UI；其他 profile 不适用。出处：package.json `dsh.client.platform`。

!!! warning "仓库未包含 LICENSE 文件"
    GitHub 仓库未提交 LICENSE 文件，但 package.json 声明 `license: MIT`。法律有效性可能存在瑕疵，使用者需自行确认。出处：仓库文件清单、package.json。

---

## 3. 后续拓展思路

### 可二次开发的方向

- **跨设备通知推送**：当前仅浏览器系统通知，可扩展为支持移动端推送（如通过 Web Push API 或第三方推送服务），让离开电脑后也能收到通知。
- **通知模板自定义**：当前通知内容固定，可扩展为支持自定义通知标题/正文模板（如包含会话名、任务摘要），提升信息密度。
- **通知历史与统计**：可增加通知历史记录与统计面板（如本周完成次数、报错次数），用于工作复盘。
- **音效包市场**：21 种内置音效可扩展为支持音效包导入/分享，社区贡献主题音效包。

### 可对接的 DSH 能力

- **skill**：可把"测试通知""切换音效""查看通知历史"封装为 DSH Skill，由 Agent 自然语言触发。
- **hooks**：通知中心本身就是 hooks 的消费端——可与其他插件的 hooks 联动，如 auto-memory 的每日反思完成、session-hub 的远端审批等待等事件触发通知。
- **self-modification**：基于通知历史统计，Agent 可自主学习用户的工作节奏（如"用户经常错过下午 3 点的通知"），主动调整通知音量或冷却间隔。

### 与其它插件组合的可能性

- **dsh-notification-center + dsh-session-hub**：远端会话完成、报错、等待批准时由通知中心推送浏览器通知 + 音效，避免用户错过远端关键事件——session-hub 的跨机审批等待是通知中心的天然触发源。
- **dsh-notification-center + dsh-auto-memory**：auto-memory 的每日反思生成完成、日历事项到期可触发通知，避免用户错过关键反思与 deadline。
- **dsh-notification-center + dsh-attention-notifier**：浏览器通知 + 任务栏提醒双通道，前者覆盖切到其他浏览器标签页的场景，后者覆盖切到其他应用的场景，互补兜底。
- **dsh-notification-center + dsh-context**：当 dsh-context 检测到 context 占比超过阈值时触发通知，提醒用户及时压缩。
