# PLUGIN 元数据 — dsh-plugin-market

## 插件名称
dsh-plugin-market（dsh plugin marketplace CLI）

## 来源仓库 URL
https://github.com/6kongbai/dsh-plugin-market

## 克隆时的 commit SHA
6d27df8（前 7 位）

## 功能描述（一句话）
dsh plugin marketplace CLI：在命令行浏览、安装、卸载来自 GitHub `dsh-plugin` topic 的社区 bundle 插件，安装时 pin 到 commit 并写审计日志。

## 前置依赖
- Node `^22.19 || >=24`
- pnpm
- 预发布 harness 包：`@deepseek-ai/dsh-app-boot@0.1.0-rc.6`、`@deepseek-ai/dsh-home-paths@0.1.0-rc.6`
- 可选：`GITHUB_TOKEN`（提升匿名 GitHub API 限流额度）

## 安装命令
```sh
# from npm (once published)
npm i -g dsh-plugin-market

# or straight from GitHub now
npm i -g github:6kongbai/dsh-plugin-market
```

## 配置项
| 来源 | 字段 |
|---|---|
| CLI 选项 | `--profile`, `-p <name>`（目标 profile，默认 `web`） |
| 环境变量 | `DSH_PLUGIN_MARKET_PROFILE`（覆盖默认 profile） |
| 环境变量 | `GITHUB_TOKEN`（提升匿名 GitHub API 限流） |
| CLI 选项 | `--yes`, `-y`（跳过安装/卸载确认） |

## 已知限制
- v0.1.0 仅发布 CLI；Web GUI 侧边栏面板因上游 Typert 生成器限制被阻塞（`@deepseek-ai/dsh-typert-generator` 只识别来自源项目引用的 `@Remote` 服务，不识别已安装 npm 包），客户端半体位于 `packages/market-client/`（置于 pnpm workspace 之外），待 Typert 支持树外插件后接入。
- 签名校验与 allowlist 尚未实现——`dsh.bundle` 当前无签名机制，安装社区插件即下载并执行任意代码。
- 仅支持声明了 `dsh.bundle.patch` 的仓库；未声明的在 `search` 中标记为不可安装。
- 安装需当前用户权限执行第三方代码，安装前展示 `owner` / `stars` / `updated_at` / `license` 与第三方代码警告。

## 本地运行状态
未实测安装（本任务仅克隆源码，未实际执行 npm i -g 或 pnpm build）

## 许可证
MIT（来源：package.json `license` 字段、README「License」章节、LICENSE 文件）
