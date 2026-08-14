# dsh-session-hub

> **插件名**：dsh-session-hub（DSH 会话枢纽）
> **来源仓库**：<https://github.com/Asaiuta/dsh-session-hub>
> **许可证**：MIT（Copyright (c) 2026 dsh-session-hub contributors）
> **commit SHA**：`b4d1d40`（前 7 位）

一个界面，管所有机器的 DSH 会话。多台跑着 `dsh web` 的服务器会话汇进本机官方 Web UI 的工作区树——侧边栏零改动、对话区零替换；顺手把 Codex CLI / Claude Code / opencode 的历史对话也接进来。远端无需安装本插件，纯 `/api` 协议实现。

---

## 1. 使用指南

### 前置依赖

- 本机 DSH：实测 `@deepseek-ai/dsh@0.1.0-rc.6`；mainline 未逐 commit 跟踪
- Node：`^22.19 || >=24`（用到内置 `WebSocket` / `fetch`）
- 本机需要 pnpm（`dsh plugin` 把参数原样转发给 profile 目录里的 pnpm）
- 远端：任何能应答标准 `/api` 的 `dsh web`，**远端无需安装本插件**
- 浏览器：官方 Web UI，无版本约束
- 可选：SSH 私钥路径或 ssh agent（用于建立 SSH 隧道）

### 安装命令

```bash
dsh plugin --profile web add dsh-session-hub@alpha
```

装完**重启 `dsh web`**（用 `kill -TERM <pid>` 并等待退出，别用 `kill -9`——会在写入中途撕裂会话 zstd 日志），刷新页面。**设置 → 插件** 里出现 **会话枢纽** 标签页即成功。

备选安装方式：

```bash
# GitHub tarball（仓库已提交构建产物，无需本地构建）
dsh plugin --profile web add https://github.com/Asaiuta/dsh-session-hub/archive/refs/tags/v0.1.0-alpha.1.tar.gz

# 从源码安装
git clone https://github.com/Asaiuta/dsh-session-hub && cd dsh-session-hub
npm install && npm run build
dsh plugin --profile web add file:$(pwd)
```

### 配置项

| 来源 | 字段 |
|---|---|
| `cordis.yml` / `cordis.patch.yml` | `dataFile`（默认 `$DSH_HOME/plugins/dsh-session-hub.json`，服务器注册表持久化位置）、`trustedHosts`（默认仅环回，网关拦截的 `/api` 再校验白名单，SSH 隧道部署无需配置） |
| 环境变量 | `DSH_HOME`（影响注册表默认路径，默认 `~/.dsh`；插件不需要任何 API key 或令牌环境变量） |

配置示例：

```yaml
- id: dsh-session-hub
  config:
    dataFile: /srv/dsh-hub-servers.json
    trustedHosts: ['192.168.1.10:3080']
```

运行期 `/hub/events` 用的随机 token 每进程生成一次，只经快照下发给浏览器，不落盘。

### 典型用法示例

**最小可复现示例：一台远端 + 本机 hub + SSH 隧道。**

① 远端（假设 `10.0.0.5`）—— 什么都不用装，保持默认即可：

```bash
dsh web --port 3080          # 只监听环回，这也是当前唯一允许的绑定
```

② 本机 —— 只装插件并重启 `dsh web`。隧道不用自己建，下一步填好 SSH 信息，插件会自己开、自己保活。

③ 浏览器 `http://127.0.0.1:3080`：

1. **设置 → 插件 → 会话枢纽 → 添加服务器**，保持默认的 **SSH 隧道** 方式，填名称（如 `tencent`）、主机（如 `10.0.0.5`）、SSH 用户（如 `root`）、私钥路径（如 `~/.ssh/id_ed25519`，留空则用 ssh agent）、远端 dsh 端口（如 `3080`），点**测试**（返回远端 DSH 版本即通）→ **添加**。
2. 官方工作区树里出现名为 `tencent` 的分组，远端会话就在组内。
3. 点开任一会话 —— 官方对话区照常工作：历史、实时流、审批卡片、发送 / 取消 / 重命名。

**导入本机其他工具的会话（可选）**：**设置 → 插件 → 会话枢纽 → 外部会话**，按软件点「导入」：

| 软件 | 读取位置 |
|---|---|
| Codex CLI | `~/.codex/sessions/**/rollout-*.jsonl` |
| Claude Code | `~/.claude/projects/**/*.jsonl` |
| opencode | `~/.local/share/opencode/opencode.db` |

- 未点「导入」的软件，日志一个字节都不会被读。
- 勾选**自动**：每 60 秒增量跟进该软件新产生的会话；不勾选就只在你点刷新时更新。
- 导入的会话在树里**只读**；直接向它发消息会自动转成真实 DSH 会话（保留用户/助手对话，原只读副本隐藏）。

### 重启生效说明

!!! tip "插件安装/升级后必须重启 dsh web"
    装完插件后必须重启 `dsh web`（用 `kill -TERM <pid>` 并等待退出，别用 `kill -9`——会在写入中途撕裂会话 zstd 日志），刷新页面才会生效。环境变量变更同样需重启。

!!! tip "临时禁用与彻底移除"
    - **临时禁用**：从 profile 的 bundle 列表 / `cordis.patch.yml` 移除 `dsh-session-hub` 条目后重启。服务器注册表保留，重新启用即恢复。
    - **彻底移除**：移除条目并重启后，删掉 `$DSH_HOME/plugins/` 下的 `dsh-session-hub.json`（服务器注册表）和 `dsh-session-hub-imports.json`（导入解析缓存）。

---

## 2. 弊端与缺陷

!!! warning "Alpha 状态，仅在单一环境验证过"
    Alpha（`0.1.0-alpha.1`）：核心链路已实机验证（网关路由 / 官方 UI 桥接 / 实时帧注入 / 审批应答 / 跨机对话），但仅在单一环境（Windows 本机 + 腾讯云 Linux，SSH 隧道）验证过，配置格式与安全边界仍可能变化。Alpha 期间：配置格式、路由表、`/hub/events` 帧协议在 1.0 前可能破坏性变更。出处：README 顶部 WARNING、README「环境要求」。

!!! warning "必须 SSH 隧道，不存在暴露公网的选项"
    当前 dsh（0.1.0-rc.6）拒绝把 Web 服务绑到环回以外——`--host 0.0.0.0` 被 CLI 挡下（*"would expose remote code execution to the network"*），LAN IP 连配置校验都过不了。远端必须保持默认环回监听，由隧道把它带到本机环回；这意味着不存在把 3080 暴露公网的选项，上游已经先一步堵死了。出处：README「快速开始 → 为什么一定要隧道」。

!!! warning "模型同步会读取并推送 API Key 到远端"
    模型同步功能会读取本机 `$DSH_HOME/.credentials.yaml` 明文（仅用于提取 `llm-*` 命名空间 `apiKeyEnv` 引用的密钥值），并在远端未配置该引用时经 `credentials.set` 写入远端（唯一的密钥出站方向，隧道/HTTPS 下加密）。密钥从不随响应回传，hub 也不落盘密钥副本。若不想自动推送密钥，可在服务器配置中不启用模型同步（或拆掉该服务器的 `llm-*` 命名空间）。出处：README「它访问什么 → 凭据」。

!!! warning "导入会话只读，发消息会自动转成真实会话"
    导入的会话在树里只读；直接向它发消息会自动转成真实 DSH 会话（保留用户/助手对话，原只读副本隐藏）。用户需意识到向历史会话发消息将创建新会话而非续接原会话。出处：README「核心能力 → 导入其他工具的会话」「导入本机其他工具的会话」。

!!! warning "无自动化测试套件，依赖实机冒烟"
    当前无自动化套件；冒烟路径（网关合并去重、SSE 三重鉴权、跨机实时对话、审批应答、self-loop 拒绝）为实机手动验证。回归保障薄弱。出处：README「开发」。

!!! warning "重启必须用 SIGTERM，kill -9 会撕裂会话日志"
    装完或升级后重启 `dsh web` 必须用 `kill -TERM <pid>` 并等待退出，别用 `kill -9`——会在写入中途撕裂会话 zstd 日志。运维操作失误风险存在。出处：README「安装」。

!!! warning "审批不自动放行，自环/未授权源一律拒绝"
    设计不变量——不中继特权域、审批一律人工应答（插件不做自动放行）、自环/未授权源一律拒绝。添加服务器报 `self-loop` 即 baseUrl 指向 hub 自身。出处：README「常见问题」「许可证与安全」。

!!! warning "SSH 私钥读取风险"
    SSH 隧道条目会按填写的路径读取私钥（仅用于建立那条隧道），密钥内容不落盘、不外传、不写进插件配置——配置里只存路径。留空则走 ssh agent，插件完全不接触密钥材料。私钥路径配置错误或权限不当仍有泄露风险。出处：README「它访问什么 → SSH 密钥」。

!!! warning "实时流断开需手动观察"
    实时流断开时 LIVE 徽标变灰，SSE 自动重连；发送后 900ms 无实时事件自动回退历史重载。但用户需主动观察徽标状态才能察觉断流。出处：README「常见问题」。

---

## 3. 后续拓展思路

### 可二次开发的方向

- **多环境矩阵验证**：当前仅在 Windows + 腾讯云 Linux 单一组合验证过，可扩展到 macOS、其他 Linux 发行版、跨云厂商组合，建立自动化冒烟套件覆盖网关合并去重、SSE 三重鉴权、跨机实时对话等关键路径。
- **隧道方式扩展**：当前仅支持 SSH 隧道（直连地址模式需用户自己开 `ssh -L`），可增加对 WireGuard、Tailscale、frp 等隧道方式的内置支持，降低用户配置负担。
- **导入工具扩展**：当前支持 Codex CLI / Claude Code / opencode 三种工具的会话导入，可扩展支持更多 AI 工具（如 Cursor、Aider 等）的历史会话。

### 可对接的 DSH 能力

- **skill**：可把"添加服务器""导入外部会话""切换远端会话"等高频操作封装为 DSH Skill，由 Agent 自然语言触发。
- **hooks**：远端会话的审批请求可经 hooks 触发外部通知（如 IM 推送），避免用户长时间盯屏。
- **self-modification**：模型配置增量同步机制可视为 self-modification 的雏形——Agent 自动补齐远端缺的模型配置；可进一步扩展为远端会话能力的自动调优。

### 与其它插件组合的可能性

- **dsh-session-hub + dsh-notification-center**：远端会话完成、报错、等待批准时由通知中心触发浏览器通知 + 音效，避免用户错过远端关键事件。
- **dsh-session-hub + dsh-attention-notifier**：远端会话需要审批时通过任务栏提醒，比浏览器通知更难错过。
- **dsh-session-hub + dsh-auto-memory**：跨机聚合的会话历史可沉淀到 auto-memory 的项目笔记层，形成跨机器的项目级记忆。
- **dsh-session-hub + dsh-context**：远端会话的 Context 洞察面板可用于对比不同机器上模型上下文窗口的构成差异。
