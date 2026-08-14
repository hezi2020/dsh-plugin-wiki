# DeepSeekHarnessRemoteGateway

> **插件名**：DeepSeekHarnessRemoteGateway（轻量级 DSH 远程网关 sidecar）
> **来源仓库**：<https://github.com/lbwnb666-ai/DeepSeekHarnessRemoteGateway>
> **许可证**：MIT（GitHub 仓库 License 标签为 MIT；本任务因克隆失败未取得 LICENSE 文件原文）
> **commit SHA**：缺失（克隆失败，未取得 HEAD SHA）

> ⚠️ 克隆失败，commit SHA 缺失，文档基于 GitHub 仓库描述编写（github.com 端口 443 连接超时，多次重试均失败；以下内容来自 GitHub 仓库网页 README）。

让 DeepSeek Harness 可以手机远程访问、操作的轻量 sidecar 网关。在保留 DSH 现有 Web UI 的前提下，为本地运行中的 DSH 增加一层远程访问能力：启动后自动生成随机公网 URL + 随机 6 位密码 + 二维码，手机扫码即可访问。支持 Windows / macOS / Linux。本仓库是独立 sidecar 服务，非标准 DSH 插件 bundle。

---

## 1. 使用指南

### 前置依赖

- 本地已启动 `dsh web` 并可经 `http://127.0.0.1:3080` 访问
- `cloudflared`（放到 `remote-gateway/bin/` 或确保系统 `PATH` 中可直接调用）
- Node.js 22+（一键启动器会自检；缺依赖时首次启动自动 `npm install`）
- 支持 Windows / macOS / Linux
- macOS / Linux 若把 cloudflared 放入 `bin/` 需先 `chmod +x`

### 安装命令

```bash
# 1. 先在本地启动 dsh web,确认可通过 http://127.0.0.1:3080 访问
# 2. 准备 cloudflared 放到 remote-gateway/bin/ 或确保 PATH 可用
# 3. 环境检查
npm run doctor

# 4. 按平台启动
#    Windows 资源管理器 / CMD: remote-gateway/start_Windows.bat
#    Windows 兼容别名: remote-gateway/start.bat
#    Windows PowerShell: remote-gateway/start.ps1
#    macOS / Linux 终端: remote-gateway/start_Mac_or_Linux.sh
#    macOS / Linux 兼容别名: remote-gateway/start.sh
#    macOS Finder 双击: remote-gateway/start.command

# 直接运行
node src/index.js
```

一键启动器会自动完成三件事：检查 Node.js 22+、缺依赖时首次启动自动 `npm install`、按当前 `config.json` 启动网关。

!!! warning "非标准 DSH 插件 bundle"
    本仓库为独立 sidecar 服务，非标准 DSH 插件 bundle；不通过 `dsh plugin add` 安装。仓库以 `topics/dsh-plugin` 标签声明插件化复用形态，但运行时是 sidecar 进程。出处：README「为什么做这个」「核心特点」段。

### 配置项

| 来源 | 字段 |
|---|---|
| `remote-gateway/config.json` | `server.bindAddress`（默认 `127.0.0.1`）、`server.bindPort`（默认 `8787`）、`upstream.origin`（默认 `http://127.0.0.1:3080`）、`upstream.loopbackMode`（默认 `null`）、`auth.password`（默认 `null`，每次启动随机生成 6 位）、`auth.sessionSecret`、`auth.cookieName`（默认 `dsh_remote_session`）、`auth.sessionTtlHours`（默认 168）、`auth.secureCookies`（默认 `false`）、`dsh.command`、`tunnel.enabled`（默认 `true`）、`tunnel.mode`（默认 `quick`）、`tunnel.cloudflaredPath`、`share.openOnStart`（默认 `true`） |
| 环境变量覆盖 | `REMOTE_GATEWAY_BIND_ADDRESS` / `REMOTE_GATEWAY_BIND_PORT` / `REMOTE_GATEWAY_UPSTREAM_ORIGIN` / `REMOTE_GATEWAY_UPSTREAM_LOOPBACK_MODE` / `REMOTE_GATEWAY_PASSWORD` / `REMOTE_GATEWAY_SESSION_SECRET` / `REMOTE_GATEWAY_COOKIE_NAME` / `REMOTE_GATEWAY_SESSION_TTL_HOURS` / `REMOTE_GATEWAY_SECURE_COOKIES` / `REMOTE_GATEWAY_DSH_COMMAND` / `REMOTE_GATEWAY_TUNNEL_ENABLED` / `REMOTE_GATEWAY_TUNNEL_MODE` / `REMOTE_GATEWAY_CLOUDFLARED_PATH` / `REMOTE_GATEWAY_SHARE_OPEN_ON_START` |

### 典型用法示例

- **30 秒上手**：本地启动 `dsh web` → 准备 `cloudflared` → `npm run doctor` → 按平台启动脚本 → 手机扫二维码 + 输入 6 位密码（README「30 秒上手」段）。
- **默认行为**：启动后自动在 `127.0.0.1:8787` 启动本地 HTTP 网关 → 未配置密码时自动生成随机 6 位密码 → cloudflared 可用时自动启动 Quick Tunnel → 终端打印临时公网 URL / 密码 / 二维码 → 在 `runtime/share.html` 生成本地分享页 → 默认自动在桌面打开分享页（README「默认行为」段）。
- **健康检查**：`GET /_gateway/health` 返回网关状态、上游探测结果、当前公网 URL 与当前生效密码（README「健康检查接口」段）。
- **Doctor 自检**：`npm run doctor` 检查 Node.js 版本、`config.json` 可解析性、上游 DSH 可达性、`cloudflared` 是否能被发现、依赖是否已安装、当前密码模式是固定还是随机（README「Doctor 自检」段）。

### 重启生效说明

!!! tip "配置变更需重启网关"
    `config.json` 改动需重启网关进程；环境变量覆盖同样需重启。`auth.password` 为 `null` 时每次启动都会生成新随机密码，固定密码需手动填入 `config.json`。

---

## 2. 弊端与缺陷

!!! warning "工作区切换需先在电脑端打开"
    当前远程状态下，无法直接从手机端主动打开本地尚未打开的工作区；如需切换工作区，仍需先在电脑端打开目标工作区，再从远程端继续访问和切换。出处：README「当前限制 / 工作区切换」段。

!!! warning "Quick Tunnel 非固定域名形态"
    默认隧道模式是 `quick`，会生成一个随机的 `*.trycloudflare.com` 地址；适合临时分享和插件分发，但不是固定域名部署的最终形态。出处：README「重要说明 / Quick Tunnel 模式」段。

!!! warning "不自提供 TLS 证书能力，不要求固定公网域名"
    网关不自提供 TLS 证书能力，不要求固定公网域名；TLS 由 Cloudflare Quick Tunnel 隐式提供，离开 Quick Tunnel 模式需用户自行解决 TLS。出处：README「它不做什么」段。

!!! warning "macOS / Linux 桌面环境缺 xdg-open 时不自动打开分享页"
    如果桌面环境没有 `xdg-open`，网关仍可正常启动，只是不会自动打开分享页，需手动打开输出的分享页路径。出处：README「macOS/Linux 说明」段。

!!! warning "cloudflared 二进制需自行准备"
    `cloudflared` 二进制需用户自行放到 `remote-gateway/bin/`（Windows: `cloudflared.exe`；macOS/Linux: `cloudflared`）或确保系统 PATH 可用；缺失则 Quick Tunnel 不可用，仅本地回环访问。出处：README「`cloudflared` 二进制」段。

!!! warning "克隆失败，源码细节未独立校验"
    本任务因 github.com 端口 443 连接超时，多次重试克隆均失败；以上内容来自 GitHub 仓库网页 README，未对源码文件做独立核对。出处：本任务克隆失败记录。

---

## 3. 后续拓展思路

### 可二次开发的方向

- **固定域名部署形态**：从 Quick Tunnel 升级到 named tunnel + 自有域名 + 自签 / Let's Encrypt 证书，作为固定域名部署的最终形态。
- **工作区远程切换**：补齐「手机端主动打开本地尚未打开的工作区」能力，需在网关层增加与 dsh workspace API 的双向通信。
- **多 DSH 实例路由**：让单个网关反向代理多个本地 DSH 实例，按路径 / 子域名路由，便于多工作区并行。
- **会话审计与回放**：在网关层记录远程会话的关键操作（不含敏感内容），便于审计与回放。

### 可对接的 DSH 能力

- **plugin**：README 提到 sidecar 形态「更适合插件化复用，也更容易发布到 `topics/dsh-plugin`」；可考虑把网关启动 / 配置封装为 DSH 插件，由 DSH 配置驱动。
- **hooks**：在远程登录、工作区切换、隧道断开等事件上挂 hooks，触发外部通知或日志。
- **skill**：写一个 DSH Skill 让 Agent 自然语言管理远程网关（如「开一个临时远程会话」「关闭远程访问」），封装启动脚本与健康检查。

### 与其它插件组合的可能性

- **DeepSeekHarnessRemoteGateway + deepseek-harness-desktop (antinomie1)**：桌面壳在回环端口运行 `dsh web`，正好是 RemoteGateway 期望的上游；两者天然搭配，桌面壳用户可一键启用远程网关。
- **DeepSeekHarnessRemoteGateway + dsh-net-proxy**：让网关反向代理上游 DSH 时走 dsh-net-proxy 配置的代理出口，便于在受限网络环境下游到上游。
- **DeepSeekHarnessRemoteGateway + dsh-notification**：把网关的「新远程登录」「隧道断开」等事件桥接到 dsh-notification，桌面端即时收到系统通知。
