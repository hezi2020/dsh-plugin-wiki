# dsh-net-proxy

> **插件名**：dsh-net-proxy（DeepSeek Harness 网络代理插件）
> **来源仓库**：<https://github.com/mafeis/dsh-net-proxy>
> **许可证**：MIT（Copyright (c) 2026 mafeis）
> **commit SHA**：`5c9d097`（前 7 位）

让 agent 自己发起的网络请求（`web_search` / `web_fetch` / 外部 API）走你配置的 HTTP / HTTPS-CONNECT / SOCKS5 代理，配置持久化于 `$DSH_HOME/net-proxy.json`，启动即自动生效，并提供可视化设置页。服务端手写转发，无第三方代理依赖。

---

## 1. 使用指南

### 前置依赖

- DeepSeek Harness（dsh web）
- DSH 客户端 UI 原语：`@deepseek-ai/dsh-client-ui-primitives`、`@deepseek-ai/schemastery`（peerDependencies，package.json）
- React（client inject）

### 安装命令

```bash
dsh plugin --profile web add github:mafeis/dsh-net-proxy
```

安装后重启 `dsh web`，在 **设置 → 网络代理** 里启用并填写代理地址（如 `127.0.0.1:7890`）。

也可手动在 profile 的 `cordis.patch.yml` 加入：

```yaml
- insert:
    - id: net-proxy
      name: 'dsh-net-proxy'
```

### 配置项

| 来源 | 字段 |
|---|---|
| `$DSH_HOME/net-proxy.json` | `enabled`（默认 `false`）、`protocol`（`http` 含 CONNECT 隧道 / `socks5`，默认 `http`）、`host` / `port`（默认 `127.0.0.1` / `7890`）、`username` / `password`（可选认证）、`noProxy`（默认 `["127.0.0.1","localhost","::1"]`） |
| 设置页路由 | `/_dsh/net-proxy`（同源读写，改动即时生效，无需重启） |

### 典型用法示例

- **启用 HTTP 代理**：设置页填 `127.0.0.1:7890` 并勾选启用；agent 的 `web_search` / `web_fetch` / 外部 API 请求将走该代理。
- **启用 SOCKS5 代理**：`protocol` 选 `socks5`，填代理地址。
- **排除内网直连**：默认 `noProxy` 排除本地回环，需要可手动追加内网网段。
- **带认证的代理**：填 `username` / `password`。

### 重启生效说明

!!! tip "配置改动即时生效，无需重启"
    设置页经同源路由 `/_dsh/net-proxy` 读写 `net-proxy.json`，改动即时生效、无需重启；首次安装插件本身仍需重启 `dsh web`。出处：README 顶部描述、「安装」段。

---

## 2. 弊端与缺陷

!!! warning "仅作用于 agent 自身发起的请求"
    插件包装的是 agent 进程的全局 `fetch`，仅作用于 agent 自己发起的 `web_search` / `web_fetch` / 外部 API 请求，不影响 DSH 进程其它网络出口（如 DSH 自身的更新检查、插件市场拉取等）。出处：README 顶部描述、「服务端」段。

!!! warning "noProxy 默认仅排除本地回环"
    `noProxy` 默认值为 `["127.0.0.1","localhost","::1"]`，仅排除本地回环；如果内网有其他网段（如 `192.168.*` / `10.*`）需走直连，必须手动追加。出处：README「配置字段（net-proxy.json）」表。

!!! warning "服务端手写转发，无第三方代理库兜底"
    服务端手写转发 HTTP / HTTPS-CONNECT / SOCKS5，无第三方代理依赖；这意味着边界 case（特殊代理握手、非标准认证、TLS 中间人证书）需自行验证，没有成熟代理库的兼容性兜底。出处：README「服务端」段。

---

## 3. 后续拓展思路

### 可二次开发的方向

- **PAC / 域名规则路由**：在 `noProxy` 之外引入 PAC 脚本或按域名规则的路由策略，让不同目标走不同代理。
- **代理链 / 多跳**：支持代理链（HTTP → SOCKS5 多跳），满足更复杂的网络拓扑需求。
- **请求观测面板**：在设置页加一个请求观测面板，实时显示 agent 经代理发出的请求与响应状态，便于排查。
- **代理健康检查**：定期探测代理可达性，代理失效时自动降级或告警。

### 可对接的 DSH 能力

- **hooks**：在请求前后挂 hooks，记录请求 URL / 状态码 / 耗时，输出到会话日志或通知。
- **skill**：写一个 DSH Skill 让 Agent 自然语言切换代理配置（如「切到 SOCKS5」「关闭代理」），封装 `/_dsh/net-proxy` 的写操作。
- **self-modification**：让 Agent 根据请求失败模式自动调整 `noProxy` 列表或重试策略。

### 与其它插件组合的可能性

- **dsh-net-proxy + jacobian**：让 Jacobian 远程 MCP 走 dsh-net-proxy 配置的代理，便于在内网受限环境下接入远程数学后端。
- **dsh-net-proxy + PerryLink-dsh-github**：让 dsh-github 的 API 调用（如克隆 / PR 拉取）经代理出口，统一 GitHub 访问路径。
- **dsh-net-proxy + dsh-vision-toolkit**：让 vision-toolkit 调用远程视觉模型 API 时走代理，统一外部模型访问出口。
