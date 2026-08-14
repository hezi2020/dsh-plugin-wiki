# w769721503-dsh-plugin-store

> **插件名**：dsh-plugin-store（DSH 插件商店）
> **来源仓库**：<https://github.com/w769721503/dsh-plugin-store>
> **许可证**：MIT（Copyright (c) 2026 w769721503）
> **commit SHA**：`13e8ce5`（前 7 位）

一个 DeepSeek Harness 插件：在「设置 → 插件」里新增一个**插件商店** Tab，浏览、搜索、筛选并**一键安装/卸载** `dsh-plugin` 生态插件。联网目录从 GitHub `topic:dsh-plugin` 拉取，按 Star 分片查询再合并，可加载全部（当前约 1760+ 个）。

---

## 1. 使用指南

### 前置依赖

- Node.js `>= 18`（README 徽章标注）
- DSH Web profile（`dsh.client.platform = web`）
- 宿主 peer 依赖：`react ^18.2.0`、`@deepseek-ai/cordis ^4.0.1`、`@deepseek-ai/dsh-client-locale ^0.1.0-rc.6`、`@deepseek-ai/dsh-client-runtime ^0.1.0-rc.6`、`@deepseek-ai/dsh-client-ui-settings ^0.1.0-rc.6`，可选 `@deepseek-ai/dsh-host-webserver ^0.1.0-rc.6`
- 仓库已提交 `lib/` 构建产物，`github:owner/repo` 安装时无需构建；改动 `src/` 后需重新 `npm run build` 并提交

### 安装命令

```bash
dsh plugin --profile web add github:w769721503/dsh-plugin-store
```

安装后**重启 DSH**，打开「设置 → 插件 → 插件商店」。

### 配置项

| 来源 | 字段 | 默认值 | 说明 |
|---|---|---|---|
| 环境变量 | `GITHUB_TOKEN` | 空 | 可选 GitHub Token，未认证搜索 10 次/分钟，认证后 30 次/分钟。建议配置以完整加载全部插件 |
| 环境变量 | `DSH_PLUGIN_STORE_TOKEN` | 空 | 同 `GITHUB_TOKEN` 的备用变量名（源码 `src/index.ts` 兜底读取） |
| 环境变量 | `DSH_PLUGIN_STORE_PROFILE` | `web` | 安装目标 profile 名 |
| 环境变量 | `DSH_HOME` | `~/.dsh` | DSH 主目录路径（源码 `src/install.ts`） |

### 典型用法示例

**自然语言触发**：本插件为 DSH Web 设置面板的可视化扩展，无自然语言触发入口。

**界面交互**（来源：README「功能」「界面」）：

- **联网目录**：从 GitHub `topic:dsh-plugin` 拉取插件，按 Star 分片查询再合并（搜索接口单查询上限 1000 条，分片可绕过）。
- **卡片列表**：类型标签徽章、`作者/仓库名`、简介、Star 数、发布日期。
- **搜索**：按名称、简介、标签、作者实时过滤。
- **筛选**：
  - 功能分类（下拉框）：全部分类 / 界面增强 / 通知 / 工作流自动化 / 开发辅助 / 知识学习 / 其他工具。
  - 类型标签（单行横向滚动，带实时计数）：全部类型 / 已收录 / **已安装** + 18 个类型标签。
- **排序**：GitHub Stars / 最近添加 / 最近更新 / 名称。
- **分页**：每页 10 / 30 / 50（默认 10），页码按钮 + 跳页输入框。
- **一键安装**：卡片「安装」在宿主机执行 `pnpm add github:<owner>/<repo>`，并把声明 `dsh.bundle` 的依赖写进 profile 的 bundle 列表。
- **手动安装**：标题栏「手动安装」按钮弹出输入框，粘贴 GitHub 链接即可自动识别并安装。
- **卸载**：已安装插件卡片按钮变为「卸载」，点击执行 `pnpm remove` 并移出 bundle 列表。
- **查看详情**：跳转插件仓库的 GitHub 页面。
- 安装/卸载**成功或失败都在顶部横幅提示**。

### 重启生效说明

!!! tip "安装/卸载均需重启 DSH 才生效"
    安装/卸载只写入依赖与 bundle 列表，需重启 DSH 才挂载/移除。源码 `src/install.ts` 注释明确说明：「Activation still requires a DSH restart.」

!!! tip "建议配置 GITHUB_TOKEN 以完整加载"
    未配置 `GITHUB_TOKEN` 时可能被 GitHub 限流而只加载部分插件（高星优先，界面会标注「限流，部分」）。

---

## 2. 弊端与缺陷

!!! warning "全量抓取受 GitHub 限流影响"
    全量抓取约 22 次搜索请求；未配置 `GITHUB_TOKEN` 时可能被限流而只加载部分（高星优先，界面会标注「限流，部分」）。出处：README「说明与限制」。

!!! warning "topic:dsh-plugin 含非 DSH 插件噪声"
    `dsh-plugin` 主题下含不少非 DSH 插件仓库（设计工具、桌面客户端、skill 集等）。「已收录」标签用启发式近似「可安装的 DSH 插件」（topics 含 `dsh`/`deepseek-harness`，或仓库名以 `dsh-` 开头等），非权威口径。出处：README「说明与限制」。

!!! warning "只有声明 dsh.bundle.patch 的包才能真正成为 bundle"
    只有声明 `dsh.bundle.patch` 的 npm 包才会成为真正的 profile bundle；其它仓库安装时会如实报错。出处：README「说明与限制」、源码 `src/install.ts` 的 `inspectRepo` 与 `runInstall`。

!!! warning "分类/类型标签为启发式，非权威分类"
    功能分类 / 类型标签由内置关键词表（`src/categories.ts`）从 topics、语言、名称、简介派生，可按需调整；可能误判。出处：README「说明与限制」、源码 `src/categories.ts`。

!!! warning "Host 端缓存 TTL 实际为 30 分钟"
    README 描述「宿主端缓存 10 分钟」，但源码 `src/index.ts` 中 `CACHE_TTL_MS = 30 * 60 * 1000` 实际为 30 分钟；以源码为准。出处：源码 `src/index.ts`、README「功能」。

!!! warning "安装命令直接 spawn pnpm，依赖宿主 PATH"
    安装/卸载通过 `node:child_process.spawn('pnpm', ...)` 直接调用宿主 `pnpm`（Windows 下用 `shell: true` 解析 `pnpm.cmd`）。若宿主未安装 pnpm 或不在 PATH 中，安装/卸载会失败。出处：源码 `src/install.ts` 的 `pnpmRun`。

---

## 3. 后续拓展思路

### 可二次开发的方向

- **多 profile 切换支持**：当前 profile 名通过 `DSH_PLUGIN_STORE_PROFILE` 环境变量固定，可在 UI 中提供下拉切换，让用户在不重启的情况下浏览/管理多个 profile。
- **离线缓存与增量更新**：当前缓存为全量 JSON 文件（`plugin-store-cache.json`），可加入 ETag / `If-Modified-Since` 或基于 `pushed_at` 的增量更新，减少全量抓取次数与限流压力。
- **分类规则可配置化**：`src/categories.ts` 的关键词规则目前硬编码，可暴露为用户可编辑的配置文件，让社区贡献分类规则。
- **更新检测增强**：源码 `recordInstall` 已记录 `pushedAt` 基线，可在 UI 中显式标记「有更新」并提供一键升级按钮。

### 可对接的 DSH 能力

- **hooks**：安装/卸载事件可经 hooks 通知其他 bundle（如刷新 skill 索引、同步配置等）。
- **skill**：可将「一键安装指定仓库」封装为 Skill，由 Agent 自然语言触发「帮我装一个 XXX 插件」。
- **self-modification**：商店本身就是 self-modification 的产物——通过 UI 触发对 profile `package.json` 与 `dsh.profile.bundles` 的写入。

### 与其它插件组合的可能性

- **dsh-plugin-store + dsh-llm-oauth**：商店可作为 OAuth 类 LLM 提供商插件的发现入口，安装后由 dsh-llm-oauth 完成 OAuth 配置，形成「发现 → 安装 → 配置」闭环。
- **dsh-plugin-store + dsh-provider-model-configurator**：商店安装 provider 类插件后，由 model-configurator 一键应用预设模型挡位，减少手动配置。
- **dsh-plugin-store + dsh-launcher**：dsh-launcher 作为桌面壳可内嵌商店 UI，让桌面端用户也能浏览与安装插件。
