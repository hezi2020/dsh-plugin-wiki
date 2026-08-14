# PLUGIN 元数据 — dsh-plugin-marketplace

## 插件名称
dsh-plugin-marketplace（DSH 插件市场）

## 来源仓库 URL
https://github.com/bradeGithub/DSH-Plugins-Marketplace

## 克隆时的 commit SHA
9c58125（前 7 位）

## 功能描述（一句话）
在 DSH Web GUI 设置页中以卡片列表展示 GitHub `dsh-plugin` topic 全部插件，支持一键安装 / 自动更新 / 版本检测 / 已安装识别，全程无需命令行。

## 前置依赖
- DSH Web profile（`dsh web` 可启动）
- 浏览器可访问 GitHub（静态索引走 jsDelivr CDN，兜底走 GitHub 搜索 API）
- 可选：`gh CLI`（手动触发 `update-registry.bat` / `update-registry.sh` 立即重建索引时需要）
- 可选：环境变量 `DSH_MARKETPLACE_ALLOWED_HOSTS`（追加允许的安装端点 Host 白名单）

## 安装命令
```sh
# 一键脚本（Windows PowerShell）
irm https://raw.githubusercontent.com/bradeGithub/DSH-Plugins-Marketplace/main/install.ps1 | iex

# 一键脚本（macOS / Linux）
curl -sL https://raw.githubusercontent.com/bradeGithub/DSH-Plugins-Marketplace/main/install.sh | bash
```
> 本插件位于 `~/.dsh/profiles/web/node_modules/dsh-plugin-marketplace/`，并通过 `~/.dsh/profiles/web/cordis.patch.yml` 注册（id: plugin-marketplace，name: dsh-plugin-marketplace）。安装完成后需重启 DSH（重新运行 `dsh web`）再刷新页面。

## 配置项
| 来源 | 字段 |
|---|---|
| 环境变量 | `DSH_MARKETPLACE_ALLOWED_HOSTS`（追加安装端点 Host 白名单，默认本机回环 / 局域网私有网段） |
| cordis.patch.yml | `- insert: { id: plugin-marketplace, name: dsh-plugin-marketplace }` |
| 运行时数据 | `~/.dsh/marketplace/installed.json`（已安装清单）、`~/.dsh/marketplace/cache/<owner>__<name>/`（克隆缓存） |

## 已知限制
- 安装端点无用户认证，防护依赖「本地网络隔离 + CSRF 头 + Host 白名单 + Origin 校验」——请勿将 DSH web 端口暴露到不可信网络。
- 版本检测仅对含 `package.json` 的 cordis 插件生效；skill / 预设 / 脚本类无版本概念。
- 静态索引两个源都不可用时才回退 GitHub 搜索 API，此时未认证限流 10 次/分钟，频繁点「刷新」可能触发限流。
- Skills 索引为全量索引（12000+ 仓库），`has_skill` 探测按 Core API 额度分批补齐，未探测的仓库显示「未验证」。
- 索引由 CI 每 2 小时增量拉取，每天 04:00 UTC 全量重建；新插件最迟两小时内进入索引。
- 安装脚本类插件的「已安装」判定基于缓存目录存在性，卸载后会重新显示为可安装。
- 插件代码修改后需重启 DSH 才能生效（Web profile 的 HMR 处于禁用状态）。
- 安装即信任该仓库：安装脚本会在机器上执行任意代码，市场会在执行前弹出确认。

## 本地运行状态
未实测安装（本任务仅克隆源码，未实际通过 dsh plugin 加载，亦未运行 install 脚本）

## 许可证
MIT（来源：package.json `license` 字段、README「许可」章节、LICENSE 文件）
