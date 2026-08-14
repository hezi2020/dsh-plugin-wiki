# PLUGIN 元数据 — anysearch-dsh

## 插件名称
anysearch-dsh（AnySearch DSH 插件，npm 包名 `@anysearch/anysearch-dsh`）

## 来源仓库 URL
https://github.com/anysearch-team/anysearch-dsh

## 克隆时的 commit SHA
2758d49（前 7 位）

## 功能描述（一句话）
AnySearch 面向 DeepSeek Harness 的官方网页搜索插件：驱动 Harness 原生 `web_search`，并提供能力发现（`anysearch_capabilities`）、垂直/参数化搜索（`anysearch_search`）、有界批量搜索（`anysearch_batch_search`），支持无 key 匿名访问与账号级 API Key。

## 前置依赖
- Node.js `^22.19.0 || >=24.0.0`
- pnpm 11.7（DSH 插件命令使用 pnpm 管理 profile 依赖，`pnpm` 必须位于 `PATH` 中）
- DeepSeek Harness（仍处于开发预览阶段，可能发布不兼容变更）
- Windows、Linux、macOS 使用相同安装命令；安装前确保 Node.js、`npx`、`pnpm` 均可从 `PATH` 直接运行
- peerDeps：`@deepseek-ai/cordis >=4.0.1-rc.1 <5`、`@deepseek-ai/dsh-credentials >=0.1.0-rc.6 <1`、`@deepseek-ai/dsh-tools >=0.1.0-rc.6 <1`、`@deepseek-ai/dsh-web >=0.1.0-rc.6 <1`

## 安装命令
```sh
npx -y @deepseek-ai/dsh plugin --profile web add @anysearch/anysearch-dsh
```
> 启动 DeepSeek Harness：
> ```sh
> npx -y @deepseek-ai/dsh web
> ```
> 快速体验不需要 API Key——未配置时使用 AnySearch 匿名额度。
>
> 更新：
> ```sh
> npx -y @deepseek-ai/dsh plugin --profile web update @anysearch/anysearch-dsh
> ```
> 移除：
> ```sh
> npx -y @deepseek-ai/dsh plugin --profile web remove @anysearch/anysearch-dsh
> ```

## 配置项
| 来源 | 字段 |
|---|---|
| `$DSH_HOME/.credentials.yaml`（默认 `~/.dsh/.credentials.yaml`） | `ANYSEARCH_API_KEY`（DSH 凭据引用；缺失时使用匿名访问；启动进程的 `ANYSEARCH_API_KEY` 环境变量优先级更高） |
| profile 用户配置层（覆盖随包 `id: web-search-anysearch`，保持 `id` 不变，完整替换 `config`） | `apiKeyEnv`（默认 `ANYSEARCH_API_KEY`，DSH 凭据引用）、`baseURL`（默认 `https://api.anysearch.com`，AnySearch API 基础地址）、`maxRenderedContentChars`（默认 `12000`，单次高级工具调用向模型展示的清洗正文字符上限） |

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

## 已知限制
- **DSH 仍处于开发预览阶段**：DeepSeek Harness 仍处于开发预览阶段，可能发布不兼容变更。出处：README「兼容性与限制」。
- **不提供 `anysearch_extract`**：本插件当前不提供 `anysearch_extract`。出处：README「兼容性与限制」。
- **DSH 设置页当前不提供第三方 Provider 凭据输入项**：请通过 DSH 管理的凭据文件或环境变量配置 API Key。出处：README「兼容性与限制」。
- **批量搜索限 1–5 个**：`anysearch_batch_search` 并发执行一至五个搜索，并保留单项失败；超过 5 个需多次调用。出处：README「提供什么」「工具」。
- **正文字符双重限制**：单次搜索的结构化正文累计不超过 200,000 字符，并向模型展示的字符数另行限制（默认 `maxRenderedContentChars: 12000`）。出处：README「提供什么」、README「配置」。
- **HTTP deadline 55 秒、高级工具预算 60 秒**：支持调用方取消、55 秒 HTTP deadline、60 秒高级工具预算；超时后请求失败。出处：README「提供什么」。
- **仅 Web profile**：插件 `dsh.bundle.patch` 形式安装到 `web` profile。出处：README「快速开始」。

## 本地运行状态
未实测安装（本任务仅克隆源码，未实际通过 dsh plugin 加载，亦未运行 pnpm run check）

## 许可证
MIT（LICENSE 文件存在）
