# dsh-web-search-exa

> **插件名**：dsh-web-search-exa（DSH Exa 网页搜索提供方，npm 包名 `@tonydua/dsh-web-search-exa`）
> **来源仓库**：<https://github.com/TonyDua/dsh-web-search-exa>
> **许可证**：MIT（LICENSE 文件存在）
> **commit SHA**：`083706b`（前 7 位）

为 DeepSeek Harness（dsh）提供零配置的 Exa 网页搜索：无需 API key——一个 `ctx.web` seam 的 `WebSearchProvider`，内置匿名 MCP 兜底（`mcp.exa.ai/mcp`，有限流）+ 带 key 的 REST 路径（`POST /search`，额度更高）。配 `EXA_API_KEY` 后自动升级 REST，行为不变；可与官方 `@deepseek-ai/dsh-web-search-exa` 通过 `providerId` 开关共存（不撞 id、无黑箱覆盖）。

---

## 1. 使用指南

### 前置依赖

- Node.js `>=18`（package.json `engines.node`；README badge 也标 `>=18`）
- DeepSeek Harness（dsh）已安装并初始化 profile
- peerDeps：`@deepseek-ai/cordis ^4.0.1-rc.1`、`@deepseek-ai/dsh-settings ^0.1.0-rc.6`、`@deepseek-ai/dsh-web ^0.1.0-rc.6`（由 profile 提供）
- 运行时依赖：`@deepseek-ai/schemastery ^3.18.1`
- 可选：`EXA_API_KEY` 环境变量或 `apiKey` 配置字段（升级到 REST 路径）

### 安装命令

一条命令从 npm 安装（v0.1.3+ 自带 `dsh.bundle` manifest——bundle patch 会自动插入 provider 行，无需手动改 patch）：

```powershell
dsh plugin --profile web add @tonydua/dsh-web-search-exa
```

重启 `dsh web` 生效。

- **无 API key 时**：官方 DeepSeek 搜索提供方不可用，seam 会自动选中本插件——完全零配置。
- **配了 key 时**：需在 `$DSH_HOME/profiles/web/cordis.patch.yml`（在 bundle patch 之后应用）里显式选中 Exa：

```yaml
- id: web
  name: '@deepseek-ai/dsh-web'
  config:
    searchProvider: exa
```

或用环境变量 `$DSH_WEB_SEARCH_PROVIDER=exa` 在运行时选中。

本地开发目录：

```powershell
dsh plugin --profile web add ../plugins/dsh-web-search-exa
```

合并进 `$DSH_HOME/profiles/web/cordis.patch.yml`（持久生效）：

```yaml
- id: web-search-exa
  name: '@tonydua/dsh-web-search-exa'
  config:
    apiKeyEnv: EXA_API_KEY
- id: web
  name: '@deepseek-ai/dsh-web'
  config:
    searchProvider: exa
```

### 配置项

| 来源 | 字段 |
|---|---|
| `$DSH_HOME/profiles/web/cordis.patch.yml`（本插件 `config`） | `providerId`（默认 `exa`，与官方包共存时改 `exa-anon` 等唯一字符串）、`apiKey`（默认未设置，Exa API 密钥字面值，`role('secret')`）、`apiKeyEnv`（默认 `EXA_API_KEY`）、`apiURL`（默认 `https://api.exa.ai/search`，REST 搜索端点）、`mcpURL`（默认 `https://mcp.exa.ai/mcp`，Exa 托管 MCP 端点）、`searchType`（默认 `auto`，可选 `auto` / `keyword` / `neural`）、`numResults`（默认未设置）、`highlightsPerResult`（默认 `1`） |
| 环境变量 | `EXA_API_KEY`（由 `apiKeyEnv` 读取）、`DSH_WEB_SEARCH_PROVIDER`（运行时选中提供方 id） |

完整配置表：

| 配置键 | 默认值 | 含义 |
|---|---|---|
| `providerId` | `exa` | 注册进 `ctx.web` 的提供方 id。仅当本包与官方包同时安装时才需要改。 |
| `apiKey` | 未设置 | Exa API 密钥字面值。为空/缺失时启用匿名 MCP 路径。 |
| `apiKeyEnv` | `EXA_API_KEY` | 未设置字面 `apiKey` 时读取的环境变量名。 |
| `apiURL` | `https://api.exa.ai/search` | REST 搜索端点（仅带 key 的路径使用）。 |
| `mcpURL` | `https://mcp.exa.ai/mcp` | Exa 托管 MCP 端点（匿名路径使用）。 |
| `searchType` | `auto` | REST 检索模式：`auto` / `keyword` / `neural`。 |
| `numResults` | 未设置 | 请求未携带 `maxResults` 时的默认结果数。 |
| `highlightsPerResult` | `1` | REST 路径每个结果请求的 highlight 句子数。 |

### 典型用法示例

- **零配置匿名搜索**：装好后无 key 即可使用，seam 自动选中本插件；模型侧的 `web_search` 工具无需改任何配置。
- **配 key 升级 REST**：配置 `EXA_API_KEY` 环境变量或 `apiKey` 字段，并在 `cordis.patch.yml` 里 `searchProvider: exa` 显式选中，提供方自动切到 REST 路径获得更高额度。
- **与官方包共存**：给本包一个不同 id（如 `providerId: exa-anon`），在 `web` seam 上 `searchProvider: exa-anon` 显式选中；若还想用官方包，再配 `searchProvider: exa` 切换。

### 重启生效说明

!!! tip "安装后必须重启 dsh web"
    安装/配置变更后必须重启 `dsh web` 才生效。`cordis.patch.yml` 里的 `config` 字段调整也需重启。环境变量 `EXA_API_KEY` / `DSH_WEB_SEARCH_PROVIDER` 在启动时读取，运行时不可变。

!!! tip "运行时单例兼容性"
    `@deepseek-ai/dsh-tools` 是 dsh 的运行时单例包，一个 profile 中必须解析到同一份物理包实例。如果 profile 中的其他第三方插件把 `@deepseek-ai/dsh-tools` 错误声明成普通嵌套依赖，应先修正该插件的依赖声明，或让 profile 的包管理器统一解析到共享实例，再排查搜索错误。否则 dsh agent loop 可能在 provider 被调用前就因 `Cannot read properties of undefined (reading 'prepare')` 失败。

---

## 2. 弊端与缺陷

!!! warning "匿名 MCP 有限流，HTTP 429 会报错"
    无 key 时走 Exa 免费匿名托管 MCP（`mcp.exa.ai/mcp`），完全不携带凭据但有限流；HTTP 429 会以 `WEB_PROVIDER_ERROR` 呈现，并提示配置 API key（配置后自动切换到 REST 路径）。高频使用必须配 key。出处：README「工作原理」「常见问题」。

!!! warning "配 key 后需显式选中 Exa，不会自动切换"
    配了 key 时需在 `cordis.patch.yml` 里显式 `searchProvider: exa`，或用 `$DSH_WEB_SEARCH_PROVIDER=exa` 环境变量；不会自动切换到 Exa。用户若以为配 key 即生效会困惑。出处：README「安装」。

!!! warning "与官方包共存需显式配置 providerId，否则启动报错"
    两个包默认在 `ctx.web` 下注册相同的 provider id（`exa`），cordis 插件名也都是 `web-search-exa`；seam 会拒绝重复 id（`WEB_DUPLICATE_PROVIDER`），不改配置就把两个包装进同一个 profile 会在启动时报错。没有黑箱覆盖——共存必须显式配置。出处：README「与官方包共存」。

!!! warning "Web UI 无设置入口，配置门槛较高"
    本版本的配置入口在 profile 补丁层，不在 Web UI——没有可编辑的界面入口；需通过 `cordis.patch.yml` 或环境变量配置。客户端卡片计划在下一版本提供。非技术用户配置门槛较高。出处：README「在 Web 面板中的呈现」。

!!! warning "运行时单例兼容性陷阱"
    `@deepseek-ai/dsh-tools` 是 dsh 的运行时单例包，一个 profile 中必须解析到同一份物理包实例；如果其他第三方插件把 `@deepseek-ai/dsh-tools` 错误声明成普通嵌套依赖，可能导致 dsh agent loop 在 provider 被调用前就因 `Cannot read properties of undefined (reading 'prepare')` 失败。出处：README「运行时单例兼容性」。

!!! warning "Node 引擎版本声明不一致"
    README badge 标 `>=18`，package.json `engines.node` 也标 `>=18`；但 DSH 0.1.0-rc.6 通常要求 Node 22.19+ 或 24+。低版本 Node 可能因 DSH 本身要求而无法运行。出处：package.json `engines`、README badge。

---

## 3. 后续拓展思路

### 可二次开发的方向

- **Web UI 配置卡片**：README 明确承诺下一版本提供注册到 `settings.plugin.item` slot 的客户端卡片，绑定 `web-search-exa` 命名空间，让所有字段可在 Settings → Plugins 实时编辑。这是最直接的下一步。
- **`web_fetch` 能力补齐**：当前插件只提供搜索能力，可补齐 `web_fetch` 提供方，形成搜索-抓取闭环。
- **结果缓存与去重**：可增加搜索结果缓存与去重机制，避免重复搜索浪费 MCP/REST 额度，提升响应速度。
- **多提供方自动 failover**：当前 `providerId` 切换需手动配置；可扩展为支持匿名 MCP → REST 自动 failover（如检测到 429 自动切换到 REST 路径），无需用户干预。

### 可对接的 DSH 能力

- **skill**：可把"用 Exa 搜索 X""切换到 REST 路径""查看当前 provider 状态"封装为 DSH Skill，由 Agent 自然语言触发。
- **hooks**：搜索完成、429 限流事件可经 hooks 触发外部记录或通知（如通知中心推送限流告警）。
- **self-modification**：基于搜索历史与限流频率统计，Agent 可自主学习何时该升级到 REST 路径，主动建议用户配置 `EXA_API_KEY`。

### 与其它插件组合的可能性

- **dsh-web-search-exa + anysearch-dsh**：同为 DSH 的 web search provider，可通过 `providerId` 开关并存，按查询类型选择更优提供方（如学术搜索用 Exa，通用搜索用 AnySearch）。
- **dsh-web-search-exa + dsh-context**：dsh-context 可观察搜索结果作为"工具结果"类在 context 预算中的占比，反向调优 `numResults` 与 `highlightsPerResult`。
- **dsh-web-search-exa + dsh-notification-center**：429 限流、搜索报错时由通知中心推送浏览器通知 + 音效，避免用户长时间等待。
- **dsh-web-search-exa + dsh-auto-memory**：auto-memory 的项目笔记可记录常用搜索类型（keyword/neural）与最佳 `searchType`，形成项目级搜索偏好。
- **dsh-web-search-exa + dsh-mcp-panel**：本插件的匿名 MCP 路径本身就是 MCP 客户端，dsh-mcp-panel 可统一管理其与其它 MCP 工具的运行时状态。
