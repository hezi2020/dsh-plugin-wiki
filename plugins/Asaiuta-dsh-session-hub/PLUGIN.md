# PLUGIN 元数据 — dsh-session-hub

## 插件名称
dsh-session-hub（DSH 会话枢纽）

## 来源仓库 URL
https://github.com/Asaiuta/dsh-session-hub

## 克隆时的 commit SHA
b4d1d40（前 7 位）

## 功能描述（一句话）
多服务器 DSH 会话聚合与原生操控：把多台跑着 `dsh web` 的远端机器以及 Codex CLI / Claude Code / opencode 的历史会话汇进本机官方 Web UI 的工作区树，对话区零替换、远端无需安装本插件。

## 前置依赖
- 本机 DSH：实测 `@deepseek-ai/dsh@0.1.0-rc.6`；mainline 未逐 commit 跟踪
- Node：`^22.19 || >=24`（用到内置 `WebSocket` / `fetch`）
- 本机需要 pnpm（`dsh plugin` 把参数原样转发给 profile 目录里的 pnpm）
- 远端：任何能应答标准 `/api` 的 `dsh web`，**远端无需安装本插件**
- 浏览器：官方 Web UI，无版本约束
- 可选：SSH 私钥路径或 ssh agent（用于建立 SSH 隧道）

## 安装命令
```bash
dsh plugin --profile web add dsh-session-hub@alpha
```
> 装完**重启 `dsh web`**（用 `kill -TERM <pid>` 并等待退出，别用 `kill -9`——会在写入中途撕裂会话 zstd 日志），刷新页面。
> **设置 → 插件** 里出现 **会话枢纽** 标签页即成功。
>
> 备选安装方式：
> - GitHub tarball：`dsh plugin --profile web add https://github.com/Asaiuta/dsh-session-hub/archive/refs/tags/v0.1.0-alpha.1.tar.gz`
> - 从源码：`git clone https://github.com/Asaiuta/dsh-session-hub && cd dsh-session-hub && npm install && npm run build && dsh plugin --profile web add file:$(pwd)`

## 配置项
| 来源 | 字段 |
|---|---|
| `cordis.yml` / `cordis.patch.yml` | `dataFile`（默认 `$DSH_HOME/plugins/dsh-session-hub.json`，服务器注册表持久化位置）、`trustedHosts`（默认仅环回，网关拦截的 `/api` 再校验白名单） |
| 环境变量 | `DSH_HOME`（影响注册表默认路径，默认 `~/.dsh`） |

配置示例：
```yaml
- id: dsh-session-hub
  config:
    dataFile: /srv/dsh-hub-servers.json
    trustedHosts: ['192.168.1.10:3080']
```

- 运行期 `/hub/events` 用的随机 token 每进程生成一次，只经快照下发给浏览器，不落盘。
- 插件不需要任何 API key 或令牌环境变量。

## 已知限制
- **Alpha 状态**：核心链路已实机验证（网关路由 / 官方 UI 桥接 / 实时帧注入 / 审批应答 / 跨机对话），但仅在单一环境（Windows 本机 + 腾讯云 Linux，SSH 隧道）验证过；配置格式与安全边界在 1.0 前可能破坏性变更。
- **必须 SSH 隧道**：当前 dsh（0.1.0-rc.6）拒绝把 Web 服务绑到环回以外——`--host 0.0.0.0` 被 CLI 挡下（*"would expose remote code execution to the network"*），LAN IP 连配置校验都过不了；不存在把 3080 暴露公网的选项。
- **远端必须保持环回监听**：`dsh web --port 3080` 只监听环回，这是当前唯一允许的绑定。
- **模型同步会读取并推送密钥**：模型同步功能会读取本机 `$DSH_HOME/.credentials.yaml` 明文，并在远端未配置该引用时经 `credentials.set` 写入远端（唯一的密钥出站方向）；密钥从不随响应回传，hub 也不落盘密钥副本。若不想自动推送密钥，可在服务器配置中不启用模型同步。
- **导入会话只读**：导入的会话在树里只读；直接向它发消息会自动转成真实 DSH 会话。
- **无自动化测试套件**：当前无自动化套件；冒烟路径（网关合并去重、SSE 三重鉴权、跨机实时对话、审批应答、self-loop 拒绝）为实机手动验证。
- **审批不自动放行**：审批一律人工应答，插件不做自动放行；自环/未授权源一律拒绝。
- **重启 dsh web 必须用 SIGTERM**：`kill -9` 会在写入中途撕裂会话 zstd 日志。
- **不碰项目文件**：插件从不写入你的项目目录，也不改动任何工具的原始日志。
- **导入日志需逐软件手动开启**：未在设置里点「导入」的软件，其日志一个字节都不会被读。

## 本地运行状态
未实测安装（本任务仅克隆源码，未实际通过 dsh plugin 加载，亦未运行 npm start）

## 许可证
MIT（Copyright (c) 2026 dsh-session-hub contributors）
