# dsh-workspace-search

> **插件名**：dsh-workspace-search
> **来源仓库**：<https://github.com/tsonglew/dsh-workspace-search>
> **许可证**：MIT
> **commit SHA**：`fc2ebaa`（前 7 位 `fc2ebaa`）

为 DeepSeek Harness web GUI 提供 VS Code 风格的工作区关键字搜索：以 Search 标签页注册进 `dsh-better-sidebar`，覆盖文件名与文件内容检索，支持 include/exclude glob、正则、大小写切换，命中行带行号展示并可一键打开到 better-sidebar 内置编辑器。

---

## 1. 使用指南

### 前置依赖

- Node.js `>= 22`（package.json `engines`）
- 运行时 peer 依赖：`@deepseek-ai/cordis >= 4.0.1`、`@deepseek-ai/schemastery >= 3.18.1`
- 宿主插件：`dsh-better-sidebar >= 0.4.0`（必须先安装并暴露 `ctx.betterSidebar`，否则前端 Tab 无法注册）
- 浏览器侧需要平台种子模块 `react` 与 `@deepseek-ai/dsh-client-ui-primitives`（client.js 直接 require）

### 安装命令

```sh
dsh plugin --profile web add github:tsonglew/dsh-workspace-search
```

> README 原文示例为本地路径 `./plugins/dsh-workspace-search`，此处按统一约定改写为 GitHub 形式。`dsh-better-sidebar >= 0.4.0` 必须先行安装。

### 配置项

所有字段可选，经 profile patch 层注入（schema 由 `@deepseek-ai/schemastery` 定义在 `lib/index.js`）：

| 字段 | 类型 | 默认值 | 含义 |
|---|---|---|---|
| `maxFiles` | number | 5000 | 单次搜索扫描文件数硬上限 |
| `maxMatches` | number | 300 | 单次搜索内容命中总数硬上限 |
| `maxLineLength` | number | 300 | 单行命中报告的最大长度（超出截断并以 `…` 标记） |
| `maxFileBytes` | number | 1048576（1 MiB） | 超过该大小的文件跳过内容扫描 |

profile patch YAML 示例：

```yaml
- id: workspace-search
  config:
    maxFiles: 5000
    maxMatches: 300
    maxLineLength: 300
    maxFileBytes: 1048576
```

### 典型用法

**Web GUI 触发**：在 `dsh-better-sidebar` 中打开新的 **Search** Tab，输入关键字后：

- 输入框右侧三个开关依次为：`Aa`（区分大小写）、`.*`（正则模式）、`⌄`（展开 include / exclude 过滤器）。
- include / exclude 输入框接受逗号分隔的 glob（如 `src/**/*.ts, *.md`、`**/vendor/**, *.min.js`），支持 `**`、`*`、`?`、`{a,b}`。
- 状态条会实时显示 `N files · M matches`，并在截断时追加 `· file scan truncated` 或 `· matches truncated`。
- 命中按文件分组，点击文件行展开/收起；点击具体命中行调用 `ctx.betterSidebar.openTab({ type: 'editor', path, title })` 在侧栏编辑器打开该文件。

**RPC 通道**：宿主侧通过 `ctx.connection.rpc.handle('/workspace-search', ..., { authority: 'loopback' })` 注册 `search` endpoint，接受 `{ root, query, caseSensitive?, regex?, include?, exclude? }`。出处：`lib/index.js` `searchEndpoint`。

### 重启生效说明

!!! tip "配置变更需重启或重载插件"
    `maxFiles` / `maxMatches` / `maxLineLength` / `maxFileBytes` 在插件 `apply` 时通过 `Config` 注入并闭包到 `searchEndpoint`；修改 profile patch 后需重启 DSH 或重载该插件才能生效。include / exclude / 大小写 / 正则等查询参数是前端运行时状态，无需重启。

---

## 2. 弊端与缺陷

!!! warning "强依赖 dsh-better-sidebar >= 0.4.0"
    前端 Tab 经 `ctx.betterSidebar.registerTab` 注册、命中行经 `ctx.betterSidebar.openTab` 打开；若未先安装 `dsh-better-sidebar >= 0.4.0`，Tab 不会出现，命中也无法打开。出处：README「Install」「How it works」、`lib/client.js` apply。

!!! warning "仅 web profile 可用，依赖宿主注入的种子模块"
    package.json 声明 `dsh.client.platform: web`；`lib/client.js` 通过 `window.__ModuleLoader__.load` 注册并直接 `require("react")` 与 `require("@deepseek-ai/dsh-client-ui-primitives")`。若宿主未注入这两个种子模块，前端 bundle 加载即失败。出处：package.json `dsh.client`、`lib/client.js` 顶部。

!!! warning "RPC 通道仅 loopback 可调用"
    `/workspace-search` endpoint 注册时声明 `{ authority: 'loopback' }`，仅在本地回环信任围栏内可调用，远端会话无法直接发起搜索。出处：`lib/index.js` apply 中 `ctx.connection.rpc.handle(..., { authority: 'loopback' })`。

!!! warning "遍历硬编码跳过一批目录与符号链接，且隐藏文件全跳"
    `SKIP_DIRS` 硬编码跳过 `.git`、`node_modules`、`.hg`、`.svn`、`dist`、`build`、`.next`、`target`；所有以 `.` 开头的隐藏文件/目录一律跳过；符号链接一律跳过。无法通过配置改为不跳过。出处：`lib/index.js` `SKIP_DIRS` 与 `walkFiles`。

!!! warning "二进制判定按前 8192 字节是否含 NUL，可能误判"
    `looksBinary` 仅检查前 8192 字节是否含 NUL 字节：含即视为二进制并跳过内容扫描。可能误判含 NUL 的合法文本文件（如带嵌入数据的 JSON / 部分日志）。出处：`lib/index.js` `looksBinary`。

!!! warning "扫描硬上限会截断，截断仅以状态条文字提示"
    达到 `maxFiles` / `maxMatches` 即停止扫描，响应中如实标记 `truncatedFiles` / `truncatedMatches`，前端仅以状态条文字提示。用户若不留意，可能误以为搜索结果完整。出处：`lib/index.js` `searchEndpoint`、`lib/client.js` 状态条。

!!! warning "glob 语法为 VS Code 风格子集，非法模式静默忽略"
    自实现的 `globToRegExp` 支持 `**`、`*`、`?`、`{a,b}`，但不合法的模式会被 `compileGlobs` 静默忽略（无任何提示），与 VS Code 行为一致但易让用户误以为过滤生效。出处：`lib/index.js` `globToRegExp` / `compileGlobs`。

!!! warning "root 必须为绝对路径，空时回退到 process.cwd()"
    `searchEndpoint` 要求 `root` 为绝对路径，否则返回 `absolute-path-required`；为空时回退到 `process.cwd()`，因此宿主进程的工作目录会影响默认搜索范围。出处：`lib/index.js` `searchEndpoint`。

---

## 3. 后续拓展思路

### 可二次开发的方向

- **支持 ripgrep / git grep 后端**：当前为纯 Node.js 实现，超大型工作区扫描较慢；可引入 `rg` 或 `git grep` 作为可选后端，并在前端保持相同的响应契约。
- **replace / 批量替换**：在已有搜索骨架上增加 `replace` endpoint 与前端替换预览，向 VS Code 的 Replace in Files 靠拢。
- **保存搜索 / 历史记录**：将查询、include / exclude、开关状态持久化到 localStorage，跨会话复用常用查询。
- **更精细的 skip 规则**：把 `SKIP_DIRS` 与隐藏文件跳过改为可配置，支持 `.dshsearchignore` 之类的项目级忽略文件。

### 可对接的 DSH 能力

- **better-sidebar**：本插件已是 better-sidebar 的 Tab 样例，可作为模板扩展出 Outline、Problems 等更多 VS Code 风格 Tab。
- **connection.rpc**：`/workspace-search` 是 loopback RPC 通道的范例，可复用同一骨架注册 `/workspace-symbol`、`/workspace-rename` 等通道。
- **hooks**：搜索命中后可通过 hooks 触发外部通知或日志归档。

### 与其它插件组合的可能性

- **dsh-workspace-search + dsh-better-sidebar**：天然组合，本插件即为后者的 Search Tab；可与 better-sidebar 内置的文件树 / 编辑器形成 VS Code 式侧栏体验。
- **dsh-workspace-search + Agent 工具调用**：把 `/workspace-search` 的 `search` endpoint 包装成 Agent 可调用的工具，让 Agent 在长会话中按关键字快速定位工作区文件，而非每次都 `Glob` + `Grep`。
- **dsh-workspace-search + 代码索引类插件**：先由本插件做关键字粗筛，再交给符号索引类插件做精确符号跳转，分层提升大型工作区的可导航性。
