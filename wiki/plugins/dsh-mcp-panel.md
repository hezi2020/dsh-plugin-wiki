# dsh-mcp-panel

> **插件名**：dsh-mcp-panel（DSH MCP 客户端只读运行时管理面板）
> **来源仓库**：<https://github.com/PerryLink/dsh-mcp-panel>
> **许可证**：Apache-2.0（LICENSE 文件存在，Copyright © 2026 dsh-mcp-panel contributors）
> **commit SHA**：`a249ebb`（前 7 位）

DeepSeek Harness 官方 MCP 客户端的只读运行时管理面板——一眼看清每个 MCP 服务器的状态、工具、错误与重连计数，绝不改动你的配置。提供 `/mcp` 命令（模型可读、可日志重建，支持五语言）、Settings → 插件 → MCP 页签（只读视图：状态徽标、可展开工具清单、脱敏错误、探测结果）、面板探测按钮、可选被动探测、`/mcp <server> disable|enable` patch 建议（绝不写文件）与 `mcp_probe` 工具。对观测不到的字段如实显示 `unknown`，绝不猜测；同时给出让状态可观测的最小上游 seam 提案。

---

## 1. 使用指南

### 前置依赖

- DeepSeek Harness ≥ `0.1.0-rc.5`（peerDependencies 固定 `0.1.0-rc.6` 包线）
- Node `^22.19.0 || >=24.0.0`
- pnpm（git 通道安装经包的 `prepare` 脚本构建；`typescript` 与 `tsdown` 是 dependencies 而非 devDependencies，因为 pnpm 不安装 git 包的 devDependencies）
- peerDeps：`@deepseek-ai/cordis ^4.0.1`、`@deepseek-ai/cordis-plugin-loader ^1.0.2`、`@deepseek-ai/schemastery ^3.18.0`、`@deepseek-ai/dsh-commands 0.1.0-rc.6`、`@deepseek-ai/dsh-jobs 0.1.0-rc.6`、`@deepseek-ai/dsh-tools 0.1.0-rc.6`、`@deepseek-ai/dsh-typert-protocol 0.1.0-rc.6`

### 安装命令

```sh
# git 通道（经包的 prepare 脚本构建）
dsh plugin --profile web add github:PerryLink/dsh-mcp-panel#v0.2.0
# npm 通道（已发布产物，免构建放行）
dsh plugin --profile web add dsh-mcp-panel@0.2.0
```

重启（或让 web 面板热重载 `cordis.patch.yml`），然后：

```text
/mcp
/mcp everything tools
/mcp everything disable
```

示例输出：

```text
MCP servers (1):
- everything [mcp-everything] stdio node …/server-everything/dist/index.js
  | 13 tools | enabled | status: unknown (source: derived) | reconnects: — | last error: —
```

手动安装：把 `dsh-mcp-panel` 放进 profile 的 `node_modules`（或共享的 `$DSH_HOME/profiles/node_modules` 回退目录），并在 `cordis.patch.yml` 添加：

```yaml
- insert:
    - id: mcp-panel
      name: dsh-mcp-panel
      config:
        probeEnabled: true
        probeTimeoutMs: 10000
```

卸载：

1. 从 `cordis.patch.yml` 移除 `mcp-panel` 行（web 面板会热重载；其他面板重启）。
2. 从 profile 的 `node_modules`（或共享的 `profiles/node_modules` 回退目录）删除该包。
3. 用 `dsh web --dump-config` 确认没有残留的 `mcp-panel` 行。

### 配置项

| 来源 | 字段 |
|---|---|
| `cordis.patch.yml`（`mcp-panel` config） | `probeEnabled`（默认 `true`，是否注册 `mcp_probe` 工具，需要组合里有 `ctx.jobs`）、`probeTimeoutMs`（默认 `10000`，单次探测超时）、`maxProbes`（默认 `10`，面板展示的探测记录上限）、`refreshIntervalMs`（默认 `0`，建议的面板刷新间隔毫秒；`0` = 仅手动刷新）、`outputLanguage`（默认 `en`，`/mcp` 命令输出语言，可选 `en` / `zh` / `es` / `pt` / `hi`）、`passiveProbeEnabled`（默认 `false`，是否周期性后台探测 streamable-http 服务器）、`passiveProbeIntervalMs`（默认 `60000`，被动探测间隔毫秒） |

### 典型用法示例

- **`/mcp` 命令**：transport、目标、工具数、连接状态、最近错误、重连计数——模型可读、可日志重建，支持双语（`outputLanguage: en|zh` 等 5 种）。
- **设置 → 插件 → MCP 页签**：同一快照的只读视图：状态徽标、可展开工具清单、脱敏错误、探测结果。
- **面板探测按钮**：从页签对单个 streamable-http 服务器一键发起连通性探测；结果仍仅面板可见。
- **被动探测**：可选的每服务器后台可达性徽标，与连接状态严格分离展示。
- **`/mcp <server> disable|enable`**：应应用的 `cordis.patch.yml` 确切行——只是**建议**，绝不写文件。
- **`mcp_probe` 工具**：对 Streamable HTTP 端点的一次性连通性探测（后台 job），结果**仅面板可见**。
- **自动刷新**：宿主建议刷新间隔（`refreshIntervalMs`）；页签轮询并在后台隐藏时暂停。

### 重启生效说明

!!! tip "web 面板支持热重载 cordis.patch.yml"
    web 面板可热重载 `cordis.patch.yml`，无需重启；其他面板需重启。建议通过 `dsh web --dump-config` 确认 `mcp-panel` insert 是否生效且 id 唯一。

!!! tip "面板数据不更新时调高 refreshIntervalMs"
    面板数据不更新？把 `mcp-panel` 配置行的 `refreshIntervalMs` 设为正值（如 `5000`）自动轮询；`0` = 仅手动刷新。

---

## 2. 弊端与缺陷

!!! warning "只读，绝不写任何配置文件，enable/disable 仅建议"
    只读。绝不写任何配置文件；`disable`/`enable` 只是打印建议，由你自行应用。用户若期望"点击 disable 即生效"会失望，需手动复制建议行到 `cordis.patch.yml`。出处：README「诚实契约」「你能得到什么」。

!!! warning "不伪造状态，无上游数据显示 unknown"
    不伪造状态。无上游数据的连接字段显示 `unknown` / `—`，并标注 `statusSource: derived`；在上游 seam 落地前属预期。用户看到 `unknown` 是常态而非异常。出处：README「诚实契约」「故障排查」。

!!! warning "依赖上游 mcp/status seam 提案，完整状态可观测需上游落地"
    `@deepseek-ai/dsh-mcp-client` 的连接状态是私有的——只有日志；本插件已实现上游提案的消费侧（类型化的 `mcp/status` 事件 + `mcpStatus` 查询服务，运行时特性探测），但完整状态可观测需上游落地。在上游 seam 落地前，部分字段永远 `unknown`。出处：README 顶部引言、AGENTS.md `src/upstream.ts`。

!!! warning "探测仅对 streamable-http 服务器，其他 transport 不支持"
    `mcp_probe` 工具与面板探测按钮只对 Streamable HTTP 端点发起一次性连通性探测；其他 transport（如 stdio）不支持探测。出处：README「你能得到什么」「权限与数据」。

!!! warning "探测结果仅面板可见，不进模型上下文"
    探测细节只进设置页签，不进模型上下文；`/mcp` 输出是模型可读面。模型无法直接读取探测结果，需用户人工转述。出处：README「诚实契约」。

!!! warning "probeEnabled 依赖 ctx.jobs，缺失则工具不注册"
    是否注册 `mcp_probe` 工具需要组合里有 `ctx.jobs`；缺失则工具不注册，用户无感知地丢失探测能力。出处：README「配置」。

!!! warning "凭据仅内存持有用于探测，凭据配置错误仍有泄露风险"
    插件仅在内存中持有用户所配置 MCP 服务器的凭据用于探测请求；它们从不进入日志或快照；URL 查询串凭据、userinfo 密码、header 值、Bearer token、JWT 在渲染前全部清洗；配置中的 `headers` 从不进入任何快照。但凭据配置错误（如写在 URL 但未脱敏前被外部进程读取）仍有泄露风险。出处：README「安全」「诚实契约」。

!!! warning "git 通道安装需构建，typescript/tsdown 是 dependencies"
    git 通道安装经包的 `prepare` 脚本构建；`typescript` 与 `tsdown` 是 dependencies 而非 devDependencies，因为 pnpm 不安装 git 包的 devDependencies。这导致 npm 安装时也会拉入 `typescript`/`tsdown`，体积偏大。出处：package.json `dependencies`、AGENTS.md「Build」。

---

## 3. 后续拓展思路

### 可二次开发的方向

- **推动上游 `mcp/status` seam 落地**：README 明确给出[上游提案](docs/upstream-proposal.md)，本插件已实现消费侧；推动上游落地后，所有 `unknown` 字段可变为真实状态，从根本上解决可观测缺口。
- **enable/disable 一键应用**：当前 `disable`/`enable` 仅打印建议行；可扩展为支持一键应用 patch（需用户确认 + 写文件权限），降低手动复制出错风险。
- **多 transport 探测**：当前探测仅对 streamable-http；可扩展为支持 stdio、SSE 等 transport 的探测，覆盖更多 MCP 服务器类型。
- **历史趋势与告警**：可增加连接状态、重连计数的历史趋势图与阈值告警，从可观察迈向可预警。

### 可对接的 DSH 能力

- **skill**：可把"查看 MCP 状态""探测 MCP 服务器""生成 disable patch"封装为 DSH Skill，由 Agent 自然语言触发；Agent 在回答中可引用 `/mcp` 输出。
- **hooks**：连接状态变化、重连事件可经 hooks 触发外部记录或通知（如通知中心推送 MCP 服务器掉线告警）。
- **self-modification**：基于历史重连频率与错误统计，Agent 可自主学习哪些 MCP 服务器不稳定，主动建议 disable 或调整探测间隔。

### 与其它插件组合的可能性

- **dsh-mcp-panel + anysearch-dsh**：AnySearch 也可作为 MCP 工具暴露，dsh-mcp-panel 可统一管理 AnySearch 与其他 MCP 工具的运行时状态——这是 anysearch-dsh 文档中已建议的组合。
- **dsh-mcp-panel + dsh-web-search-exa**：本插件的匿名 MCP 路径本身就是 MCP 客户端，dsh-mcp-panel 可观察 Exa MCP 的连接状态与限流情况。
- **dsh-mcp-panel + dsh-context**：dsh-context 可观察 MCP 工具 schema 在 context 预算中的占比，dsh-mcp-panel 提供工具清单，二者组合可定位"哪个 MCP 工具的 schema 最耗 token"，为精简 MCP 提供依据——这是 dsh-context 文档中已建议的组合。
- **dsh-mcp-panel + dsh-notification-center**：MCP 服务器掉线、重连超阈值时由通知中心推送浏览器通知 + 音效，避免用户长时间使用掉线的 MCP 服务器。
- **dsh-mcp-panel + dsh-attention-notifier**：MCP 服务器需要介入（如 OAuth 授权）时通过任务栏提醒，比浏览器通知更难错过。
