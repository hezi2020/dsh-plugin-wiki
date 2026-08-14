# PLUGIN 元数据 — dsh-notification-center

## 插件名称
dsh-notification-center（DSH 通知中心插件，npm 包名 `@lyhalal/dsh-notification-center`）

## 来源仓库 URL
https://github.com/610la/dsh-notification-center

## 克隆时的 commit SHA
60610d5（前 7 位）

## 功能描述（一句话）
DSH 的通知中心：对话/任务完成、报错、超长截断、被阻塞、等待批准等事件触发浏览器系统通知 + 21 种内置提示音效，每类事件独立配置（音效类型/自定义文件/自定义 URL/音量/开关）。

## 前置依赖
- DeepSeek Harness（dsh）已安装并可启动 `dsh web`
- 浏览器：官方 Web UI，需用户授权浏览器通知权限
- peerDeps：`react ^18.2.0`、`@deepseek-ai/cordis ^4.0.1`、`@deepseek-ai/dsh-client-runtime >=0.1.0`、`@deepseek-ai/dsh-client-ui-slots >=0.1.0`、`@deepseek-ai/dsh-client-connection >=0.1.0`（由 profile 提供）

## 安装命令
```bash
dsh plugin --profile web add @lyhalal/dsh-notification-center
```
> 重启 DSH 后生效，浏览器端自动加载，无需其他配置。
>
> 手动方式（等价）：在 DSH 项目目录 `npm install @lyhalal/dsh-notification-center`，并在 host 的 `cordis.yml` 的 `plugins` 下加一行：
> ```yaml
> plugins:
>   - from: '@lyhalal/dsh-notification-center'
> ```

## 配置项
| 来源 | 字段 |
|---|---|
| GUI（设置 → 通知中心） | 总开关：浏览器通知、完成音效、通知权限、浏览器通知测试、冷却间隔；事件：对话完成、子任务完成、Workflow 完成、后台任务完成、等待批准；停止原因：报错停止、超长截断、被阻塞、其他原因、手动停止/打断；每类事件可设：音效类型（21 种内置 / 静音 / 自定义文件 / 自定义 URL）、音量、开关 |
| 输入栏左侧 🔔 | 快速开关「浏览器通知 / 完成音效」、授权通知权限、测试 |

- 设置自动保存，刷新不丢失。
- 模型请求权限/批准时立即提醒（不受冷却限制）。
- 手动停止/打断生成默认不通知。

## 已知限制
- **需用户授权浏览器通知权限**：首次使用请允许浏览器通知权限，点「授权」或点「测试」时浏览器会弹出询问。出处：README「提示」。
- **音效需页面内有任意一次点击后才会响**：受浏览器自动播放策略限制，音效需用户与页面有过交互后才会播放。出处：README「提示」。
- **手动停止/打断默认不通知**：手动停止/打断生成默认不通知；需要的话需在「停止原因 → 手动停止/打断」手动打开。出处：README「提示」「功能一览」。
- **仅 Web profile**：插件 `dsh.client.platform: web`，只面向 `web` profile 的 Web UI。出处：package.json `dsh.client.platform`。
- **仓库未包含 LICENSE 文件**：GitHub 仓库未提交 LICENSE 文件，但 package.json 声明 `license: MIT`。出处：仓库文件清单、package.json。

## 本地运行状态
未实测安装（本任务仅克隆源码，未实际通过 dsh plugin 加载，亦未运行 npm run build）

## 许可证
MIT（package.json 声明；仓库未包含 LICENSE 文件）
