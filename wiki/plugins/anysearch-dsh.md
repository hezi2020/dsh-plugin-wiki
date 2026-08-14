# anysearch-dsh

> **插件名**：anysearch-dsh（AnySearch DSH 插件，npm 包名 `@anysearch/anysearch-dsh`）
> **来源仓库**：<https://github.com/anysearch-team/anysearch-dsh>
> **许可证**：MIT（LICENSE 文件存在）
> **commit SHA**：`2758d49`（前 7 位）

AnySearch 面向 DeepSeek Harness 的官方网页搜索插件：将 AnySearch 接入 DeepSeek Harness，既驱动 Harness 原生 `web_search`，也提供能力发现、垂直搜索和有界批量搜索。支持无 key 匿名访问与账号级 API Key，按需提供清洗后的网页正文，支持调用方取消、55 秒 HTTP deadline、60 秒高级工具预算、响应校验和不会向重定向目标泄露凭据的安全策略。

---

## 1. 使用指南

### 前置依赖

- Node.js `^22.19.0 || >=24.0.0`
- pnpm 11.7（DSH 插件命令使用 pnpm 管理 profile 依赖，`pnpm` 必须位于 `PATH` 中）
- DeepSeek Harness（仍处于开发预览阶段，可能发布不兼容变更）
- Windows、Linux、macOS 使用相同安装命令；安装前确保 Node.js、`npx`、`pnpm` 均可从 `PATH` 直接运行

### 安装命令

将插件安装到 `web` profile：

```sh
npx -y @deepseek-ai/dsh plugin --profile web add @anysearch/anysearch-dsh
```

启动 DeepSeek Harness：

```sh
npx -y @deepseek-ai/dsh web
```

快速体验不需要 API Key——未配置时使用 AnySearch 匿名额度。

更新：

```sh
npx -y @deepseek-ai/dsh plugin --profile web update @anysearch/anysearch-dsh
```

移除：

```sh
npx -y @deepseek-ai/dsh plugin --profile web remove @anysearch/anysearch-dsh
```

### 配置项

| 来源 | 字段 |
|---|---|
| `$DSH_HOME/.credentials.yaml`（默认 `~/.dsh/.credentials.yaml`） | `ANYSEARCH_API_KEY`（DSH 凭据引用；缺失时使用匿名访问；启动进程的 `ANYSEARCH_API_KEY` 环境变量优先级更高） |
| profile 用户配置层（覆盖随包 `id: web-search-anysearch`，保持 `id` 不变，完整替换 `config`） | `apiKeyEnv`（默认 `ANYSEARCH_API_KEY`）、`baseURL`（默认 `https://api.anysearch.com`）、`maxRenderedContentChars`（默认 `12000`，单次高级工具调用向模型展示的清洗正文字符上限） |

配置示例：

```yaml
- id: web-search-anysearch
  config:
    apiKeyEnv: ANYSEARCH_API_KEY
    baseURL: https://api.anysearch.com
    maxRenderedContentChars: 12000
```

- 随包提供的 profile 层会自动将 AnySearch 设为现有 `ctx.web` Provider，并挂载高级工具，默认无需修改。
- 插件会在每次操作时解析受管凭据，轮换凭据后下一次请求即生效，无需重启 DSH。
- 不要使用不同 ID 新增第二个 AnySearch Provider。

可选 API Key 配置：访问 [anysearch.com](https://anysearch.com) 注册并登录，前往 [API Keys](https://www.anysearch.com/console/api-keys) 获取，写入 `$DSH_HOME/.credentials.yaml`：

```yaml
ANYSEARCH_API_KEY: "as_sk_your_key"
```

### 典型用法示例

**工具表**：

| 使用场景 | Harness 工具 |
|---|---|
| 普通网页搜索 | `web_search` |
| 查看可用领域和标签 | `anysearch_capabilities` |
| 垂直或参数化搜索 | `anysearch_search` |
| 一次执行一至五个搜索 | `anysearch_batch_search` |

对于普通提示词，让 Harness 自动选择工具即可——模型可以先读取实时领域和参数定义，再执行专门搜索。

可以检查最终组合配置，输出中不会出现真实凭据值：

```sh
npx -y @deepseek-ai/dsh --profile web --dump-config
```

### 重启生效说明

!!! tip "凭据轮换无需重启 DSH"
    插件会在每次操作时解析受管凭据，轮换凭据后下一次请求即生效，无需重启 DSH。安装/更新/移除插件后需重启 `dsh web` 才生效。启动进程的 `ANYSEARCH_API_KEY` 环境变量优先级高于凭据文件。

---

## 2. 弊端与缺陷

!!! warning "DSH 仍处于开发预览阶段，可能发布不兼容变更"
    DeepSeek Harness 仍处于开发预览阶段，可能发布不兼容变更；插件可能随 DSH 升级而失效。出处：README「兼容性与限制」。

!!! warning "不提供 anysearch_extract"
    本插件当前不提供 `anysearch_extract`；用户若需网页正文提取能力需另寻方案。出处：README「兼容性与限制」。

!!! warning "DSH 设置页当前不提供第三方 Provider 凭据输入项"
    请通过 DSH 管理的凭据文件（`$DSH_HOME/.credentials.yaml`）或环境变量配置 API Key；非技术用户配置门槛较高。出处：README「兼容性与限制」。

!!! warning "批量搜索限 1–5 个，超过需多次调用"
    `anysearch_batch_search` 并发执行一至五个搜索，并保留单项失败；超过 5 个需多次调用，无法一次性完成大批量搜索。出处：README「提供什么」「工具」。

!!! warning "正文字符双重限制，长文展示受限"
    单次搜索的结构化正文累计不超过 200,000 字符，并向模型展示的字符数另行限制（默认 `maxRenderedContentChars: 12000`）；长文会被截断，模型可能丢失关键信息。出处：README「提供什么」、README「配置」。

!!! warning "HTTP deadline 55 秒、高级工具预算 60 秒"
    支持调用方取消、55 秒 HTTP deadline、60 秒高级工具预算；超时后请求失败，复杂搜索可能超时。出处：README「提供什么」。

!!! warning "匿名访问有额度限制"
    插件可以使用 AnySearch 匿名额度，无需 API Key；但匿名额度有限，高频使用需配置账号级 API Key。出处：README「快速开始」「可选 API Key」。

---

## 3. 后续拓展思路

### 可二次开发的方向

- **补齐 `anysearch_extract`**：当前不提供 `anysearch_extract`，可补齐网页正文提取能力，与 `anysearch_search` 形成完整搜索-提取闭环。
- **批量搜索上限提升**：当前批量搜索限 1–5 个，可扩展为支持更大批量（如分页拉取、流式返回），覆盖大批量搜索场景。
- **凭据管理 GUI**：DSH 设置页当前不提供第三方 Provider 凭据输入项，可扩展为支持在设置页直接配置 API Key，降低非技术用户门槛。
- **结果缓存与去重**：可增加搜索结果缓存与去重机制，避免重复搜索浪费额度，提升响应速度。

### 可对接的 DSH 能力

- **skill**：可把"搜索 X""批量搜索多个查询""查看可用领域"封装为 DSH Skill，由 Agent 自然语言触发；Agent 在回答中可引用搜索结果。
- **hooks**：搜索完成、搜索失败事件可经 hooks 触发外部记录（如写入工作日志），形成搜索行为审计轨迹。
- **self-modification**：基于搜索历史与命中率统计，Agent 可自主学习最优搜索策略（如优先使用垂直搜索还是普通搜索），主动调整 `maxRenderedContentChars` 等参数。

### 与其它插件组合的可能性

- **anysearch-dsh + dsh-web-search-exa**：同为 DSH 的 web search provider，可对比 AnySearch 与 Exa 的搜索质量与额度策略，按需切换 `providerId`。
- **anysearch-dsh + dsh-context**：dsh-context 可观察搜索结果作为"工具结果"类在 context 预算中的占比，反向调优 `maxRenderedContentChars` 与批量搜索数量。
- **anysearch-dsh + dsh-auto-memory**：auto-memory 的项目笔记可记录常用搜索领域与标签，形成项目级搜索偏好；Agent 据此自动选择垂直搜索领域。
- **anysearch-dsh + dsh-mcp-panel**：AnySearch 也可作为 MCP 工具暴露，dsh-mcp-panel 可统一管理 AnySearch 与其他 MCP 工具的运行时状态。
- **anysearch-dsh + dsh-notification-center**：批量搜索完成、搜索报错时由通知中心推送浏览器通知 + 音效，避免用户长时间等待。
