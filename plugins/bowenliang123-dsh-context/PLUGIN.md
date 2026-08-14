# PLUGIN 元数据 — dsh-context

## 插件名称
dsh-context（DSH Context 洞察面板）

## 来源仓库 URL
https://github.com/bowenliang123/dsh-context

## 克隆时的 commit SHA
f13bddd（前 7 位）

## 功能描述（一句话）
Context 洞察面板：在 Web UI 中添加 Context tab（紧邻 Chat 与 Trajectory），可视化模型上下文窗口的六大类构成、逐请求历史、压缩/注入事件与每条消息的 token 成本，UI 双语（中文/English）跟随 dsh locale。

## 前置依赖
- DeepSeek Harness 任意可启动 `dsh web` 的版本（`web` profile 在首次使用时自动创建）
- 浏览器：官方 Web UI
- 从源码开发：pnpm（项目是 pnpm workspace root，`pnpm install` 不会向上走进父 workspace）
- 运行时无依赖（host 半与 client 半均零运行时依赖，devDeps 仅 esbuild / typescript / cordis / @types/react）

## 安装命令
```sh
dsh plugin --profile web add dsh-context
```
> 然后启动 web UI 并打开任一会话，**上下文 / Context** tab 会出现在 Chat 与 Trajectory 旁边：
> ```sh
> dsh web
> ```
> 从源码 checkout 运行 dsh 时，命令前需加 `pnpm`（如 `pnpm dsh plugin --profile web add dsh-context`）。
>
> 从仓库 checkout 开发安装：
> ```sh
> dsh plugin --profile <name> add .
> ```

## 配置项
| 来源 | 字段 |
|---|---|
| 源材料未提及 | 该插件为只读洞察面板，README 与 package.json 未声明用户可配置项；插件行为固定：tab 打开时每 2 秒刷新数据 |

## 已知限制
- **token 数为估算**：使用与 dsh 内置 tokenMeter 相同的固定密度启发式（~4 字符 ≈ 1 token），与 harness 自身统计对齐；只有在 provider 上报真实用量时才显示为 "actual"。出处：README「Usage」。
- **数据来源依赖会话事件日志**：实时会话直接从内存日志 `sessions.get(id).events` 折叠（不克隆、不读盘）；持久化会话回退到 `sessionQuery.readSession`。会话日志缺失或格式异常时面板无数据。出处：README「How it works」。
- **仅 Web profile**：插件 `dsh.client.platform: web`，只面向 `web` profile 的 Web UI。出处：package.json `dsh.client.platform`。
- **每 2 秒轮询刷新**：tab 打开时数据每 2 秒刷新一次；非实时推送，存在至多 2 秒延迟。出处：README「Usage」。
- **无 host 端用户配置项**：插件为只读洞察面板，README 与 package.json 未声明用户可配置项。出处：README、package.json。

## 本地运行状态
未实测安装（本任务仅克隆源码，未实际通过 dsh plugin 加载，亦未运行 pnpm test）

## 许可证
Apache-2.0（Copyright 2025 bowenliang123）
