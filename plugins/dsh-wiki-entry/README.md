# dsh-wiki-entry

DeepSeek Harness Wiki 入口插件：在 Web UI 右上角会话头部工具槽注册「Wiki」入口，首次点击时自动启动本地 Wiki 静态服务器（端口 8099，`/wiki` 前缀）并打开。

## 功能

- **右上角 Wiki 入口**：会话头部 utilities 槽位注册，未运行时点击自动启动 Wiki 服务器并新标签页打开
- **持久化开关**：设置 → 插件 → 可配置 中提供「Wiki 入口」卡片开关，状态持久化到 `wiki-entry` settings 命名空间（settings.yaml），重启与刷新后保持
- **自动启动**：插件启用时随 Harness 启动自动拉起 Wiki 服务器（best-effort，首次点击也会确保拉起）

## 安装

```bash
# 本地路径或 npm 包名（bundle 安装）
dsh plugin --profile web add <this-package>
```

bundle patch 将本插件挂入宿主组合；包内 `dsh.client` 声明使浏览器端在每次页面加载时进入 Web boot 图。

## 配置

| 配置项 | 默认值 | 说明 |
|---|---|---|
| `wikiRoot` | `./wiki` | Wiki 检出根目录（相对 DSH 工作目录），静态站点位于 `<root>/site`；可配置为绝对路径 |
| `port` | `8099` | Wiki 服务器监听端口 |
| `prefix` | `/wiki` | 站点 URL 前缀 |

> 提示：`wikiRoot` 默认为相对路径，实际运行时会基于 DSH 进程工作目录解析为绝对路径，也可通过插件配置显式指定。

## 工作原理

- **宿主端**（`src/index.ts`）：注册 `wiki-entry` settings 命名空间、`/wiki-api/status`、`/wiki-api/open`、`/wiki-api/set-enabled` 三条 webServer 路由；通过宿主 `subprocess` 服务拉起 `node serve.mjs`（`<wikiRoot>/serve.mjs`），服务器在插件停止/重载后仍持续运行
- **浏览器端**（`src/client/index.tsx`）：渲染入口 pill 与设置卡片，通过同源 `/wiki-api/*` 路由读写持久化开关

## 许可

MIT