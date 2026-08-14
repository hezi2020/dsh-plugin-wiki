# dsh-web-preview-float

> **插件名**：dsh-web-preview-float（包名 `@dsh-external/dsh-web-preview-float`）
> **来源仓库**：<https://github.com/WJNCT55555/dsh-web-preview-float>
> **许可证**：MIT
> **commit SHA**：`eca22dd56ccef767e85e99baced54ebf7940cd07`（前 7 位 `eca22dd`）

DSH Web UI 的悬浮预览插件：在浏览器里挂两个**独立、可拖拽、可拉伸、可缩小**的悬浮窗，让你在等待模型回复或改代码时实时预览项目，类似 Google AI Studio。

- **预览窗**：`<iframe>` 直连项目 dev server，URL 自动从项目 `package.json` 脚本探测（Vite→5173、Next/CRA→3000、Astro→4321，可手改）。
- **代码窗**：工作区文件树 + 只读代码预览（懒加载目录，点文件看内容）。

只依赖官方扩展点（`ctx.webServer` / `ctx.fs` / `ctx.sandboxPolicy` + 自包含 DOM portal），不改 DSH 核心，可作为独立插件发布。

---

## 1. 使用指南

### 前置依赖

- Node.js 22+（构建期 `@types/node@^22.20.0`）
- DSH Web profile（`dsh.plugin.json` 声明 `engines.dsh >= 0.0.1`）
- peer 依赖：
  - `@deepseek-ai/cordis@^4.0.1-rc.1`（vendored 包，不在 npm 上；本地开发需 `link:` 指向 harness checkout 的 `vendor/cordis`）
  - `react@^18.2.0`
  - `react-dom@^18.2.0`
- 构建期：`typescript@^6.0.3`、`tsdown@^0.22.2`、`vitest@^4.1.8`、`jsdom@^25.0.0`、`@testing-library/react@^16.1.0`

### 安装命令

作为 profile 的 patch 层安装（DSH 官方插件市场 / bundle 机制）。该插件自带 `cordis.patch.yml`，会插入：

```yaml
- id: dsh-web-preview-float
  name: '@dsh-external/dsh-web-preview-float'
```

从源码构建后安装：

```bash
git clone https://github.com/WJNCT55555/dsh-web-preview-float.git
cd dsh-web-preview-float
pnpm install
pnpm run typecheck
pnpm run test
pnpm run build      # 产出 lib/index.js（node 半）+ lib/client.js（浏览器半）
# 然后通过 dsh plugin --profile <profile> add file:. 或 bundle 机制装入 profile
```

安装后重启 `dsh web`，浏览器里会出现两个悬浮窗。

### 配置项

| 来源 | 字段 |
|---|---|
| `dsh.plugin.json` | `id`、`version`、`main`、`description`、`engines.dsh`（`>=0.0.1`）、`contributes.tools`（空数组）、`contributes.skills`（空数组）、`client.main`（`./lib/client.js`） |
| `package.json` 的 `dsh.bundle` | `patch`（`./cordis.patch.yml`） |
| `package.json` 的 `dsh.client` | `platform: web` |
| 运行时 | 无独立配置项；dev server URL 由项目 `package.json` 的 `dev`/`start` 脚本自动探测，可在预览窗输入框手动覆盖 |

dev server 端口探测规则（源码 `src/index.ts` `detectPort`）：

- 显式 `--port=<n>` 或 `--port <n>` 或 `-p=<n>` 或 `-p <n>`：使用该端口
- 脚本含 `next` 或 `react-scripts`：3000
- 脚本含 `astro`：4321
- 其他（含 Vite）：5173
- 探测失败兜底：`http://localhost:5173`

### 典型用法示例

**预览窗**：打开 DSH Web 后，预览窗会自动调用 `/__web_preview_fs?dev=` 探测项目 dev server URL；如未启动则显示 `http://localhost:5173` 占位。在输入框手动输入 URL 并按回车或点「打开」即可切换。

**代码窗**：左侧懒加载工作区文件树（点目录展开，点文件加载内容），右侧 `<pre>` 显示纯文本。文件 >256KB 时显示「文件过大，无法预览」。

**文件系统路由**（node 半，源码 `src/index.ts`）：

```
GET /__web_preview_fs?list=<path>   # 列出一层目录（缺省 path 用 workspaceRoot）
GET /__web_preview_fs?read=<path>   # 读取文本文件（>256KB 返回 tooLarge）
GET /__web_preview_fs?dev=<path>    # 探测 dev server URL（缺省 path 用 workspaceRoot）
```

路径必须位于 `sandboxPolicy.workspaceRoot` 内，否则返回 403。

### 重启生效说明

!!! tip "安装后需重启 dsh web"
    安装该插件后需重启 `dsh web`，浏览器里才会出现两个悬浮窗。client 半通过 `createRoot` 挂载到 `document.body`，dispose 时自动 unmount 并移除宿主 `div`。

!!! tip "预览窗 URL 可手动覆盖"
    dev server URL 自动探测仅基于 `package.json` 脚本字符串启发式；若实际端口不同，可在预览窗输入框手动输入并回车提交，无需改源码。

---

## 2. 弊端与缺陷

!!! warning "代码窗只读，不支持编辑"
    代码窗为只读，不提供编辑能力；仅用于查看。出处：README「说明」、源码 `src/client/CodeView.tsx`（仅 `readFile`，无写入路径）。

!!! warning "二进制 / 超大文件（>256KB）无法预览"
    文件超过 `MAX_READ_BYTES = 256 * 1024`（256KB）时返回 `{tooLarge: true}`，UI 显示「文件过大，无法预览」。出处：源码 `src/index.ts` 常量与 `?read=` 分支、`src/client/CodeView.tsx` 错误分支。

!!! warning "无语法高亮，纯文本 <pre> 显示"
    语法高亮未做，代码以纯文本 `<pre>` 显示；README 提到「后续可加 shiki」但当前未实现。出处：README「说明」、源码 `src/client/CodeView.tsx`。

!!! warning "悬浮窗位置 / 大小不持久化"
    悬浮窗位置与大小状态仅在 React `useState` 内存中，刷新页面后回到默认位置（`initialX/Y/W/H`）。无 localStorage 或后端持久化。出处：源码 `src/client/FloatingWindow.tsx`。

!!! warning "文件系统访问受 workspaceRoot 限制"
    路径必须位于 `sandboxPolicy.workspaceRoot` 内，否则返回 403 `{error: 'outside workspace'}`。无法预览工作区外的文件。出处：源码 `src/index.ts` `allowed()` 函数。

!!! warning "路由仅三种查询参数，缺参返回 400"
    `/__web_preview_fs` 仅接受 `?list=` / `?read=` / `?dev=` 三种查询参数；缺参返回 400 `{error: 'missing list, read, or dev parameter'}`。出处：源码 `src/index.ts` handler 末尾。

!!! warning "@deepseek-ai/cordis 是 vendored 包，不在 npm 上"
    本地开发需把 `package.json` 里 `devDependencies` 的 `link:` 指向你的 harness checkout 的 `vendor/cordis`；不能直接 `pnpm install` 拉到。出处：README「开发」说明。

!!! warning "包未发布到 npm"
    `package.json` 标记 `private: true`，未发布到 npm，只能从源码构建后装入 profile。出处：`package.json` `private: true`。

!!! warning "预览窗假定 dev server 已在探测端口启动"
    预览窗默认 URL 为 `http://localhost:5173`，假定项目 dev server 已在该端口启动；若未启动则 iframe 加载失败，无重试或健康检查机制。出处：源码 `src/client/PreviewWindow.tsx` `DEFAULT_URL`。

---

## 3. 后续拓展思路

### 可二次开发的方向

- **语法高亮**：README 已点名「后续可加 shiki」，可在 `CodeView.tsx` 的 `<pre>` 处接入 shiki，按文件扩展名选语言。
- **悬浮窗状态持久化**：把 `FloatingWindow` 的 `pos` / `size` / `collapsed` 状态同步到 `localStorage`，刷新后恢复。
- **大文件分块读取**：将 `MAX_READ_BYTES` 上限改为分块流式读取（如前 256KB + 「加载更多」），避免一刀切拒绝。
- **dev server 健康检查**：探测 URL 后先 `fetch(url, {mode: 'no-cors'})` 探活，未启动时在工具栏提示「dev server 未启动」而非让 iframe 静默失败。
- **多框架端口探测扩展**：当前 `detectPort` 仅覆盖 Vite/Next/CRA/Astro；可扩展 Nuxt（3000）、SvelteKit（5173）、Remix（3000）等更多框架启发式。

### 可对接的 DSH 能力

- **官方扩展点**：本插件是「只依赖官方扩展点、不改 DSH 核心」的范本——`ctx.webServer.register` 注册路由、`ctx.fs` 读文件、`ctx.sandboxPolicy` 取工作区根、`ctx.effect` 管理 dispose。可作为其他纯扩展点插件的参考实现。
- **skill**：`dsh.plugin.json` 的 `contributes.skills` 当前为空数组；可后续封装「打开预览窗」「跳转到指定文件」等操作为 Skill，由 Agent 自然语言触发。
- **hooks**：可在文件被选中时通过 hooks 触发 Agent 上下文注入（如把当前查看的文件路径加入会话上下文）。

### 与其它插件组合的可能性

- **dsh-web-preview-float + dsh-agent-plugins**：用 `dsh-agent-plugins` 装入外部 Agent Plugins 包，再用本插件预览其源码或运行效果。
- **dsh-web-preview-float + Zalpha263-dsh-file-explorer**：本插件的代码窗是简化版文件树；若与功能更完整的 file-explorer 插件组合，可让 file-explorer 负责编辑 / 操作，本插件专注 dev server 预览。
- **dsh-web-preview-float + 任一前端框架 dev server**：本质是「iframe 预览 + 文件查看」，可服务于任何带 dev server 的前端项目，不限于 DSH 自身开发。
