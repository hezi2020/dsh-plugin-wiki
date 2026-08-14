# dsh-better-sidebar

> **插件名**：dsh-better-sidebar（版本 0.10.0）
> **来源仓库**：<https://github.com/omdsh-dev/DSH-better-sidebar>
> **许可证**：MIT（Copyright (c) 2026 dsh-external）
> **commit SHA**：未收集（本目录无 PLUGIN.md 元数据，文档基于 README 与 `dsh.plugin.json` 编写）

一个插件，一套完整工作台：右侧栏 + 底部面板双工作台。文件管理、编辑预览、内嵌浏览器、真实终端、Git 面板、后台任务页一个插件全部搞定。支持 Tab 窗口随意拖拽，支持三方拓展注册新 Tab 页面和文件预览器。

---

## 1. 使用指南

### 前置依赖

- 已安装 DSH（`dsh web` 可运行）
- Node.js `>= 20`
- pnpm `>= 10`
- `@deepseek-ai/*` 已发布到 npm，`pnpm install` 直接解析、无需令牌
- !!! tip "node-pty 编译工具链"
    `node-pty` 优先预编译二进制，失败需编译工具链（Windows VS Build Tools / Linux make+g+++python3 / macOS Xcode CLT）。出处：README「平台支持」。

### 安装命令

**通过 npm 安装（推荐）**——插件已发布到 npm：`dsh-better-sidebar@0.10.0`（`@deepseek-ai/*` 依赖已对齐宿主实际版本 `^0.1.0-rc.6` / `@deepseek-ai/cordis@^4.0.1`，同版本单实例）。挂载仍走 profile + `cordis.patch.yml`，依赖来源换成 npm 包：

```text
1. ~/.dsh/profiles/web/package.json 的 dependencies 写 "dsh-better-sidebar": "^0.10.0"
2. ~/.dsh/profiles/web/cordis.patch.yml 追加：
   - insert:
       - id: better-sidebar
         name: 'dsh-better-sidebar'
3. 在 ~/.dsh/profiles/web 执行 pnpm install
4. 重启 DSH 并硬刷新（Cmd/Ctrl+Shift+R）验证
```

**从源码安装**：把下面提示词整段发给 DSH 即可自动完成克隆、构建、注册与安装：

```text
请帮我把 dsh-better-sidebar 插件安装到我的 web profile（插件 = VSCode 风格右侧侧边栏，仓库 https://github.com/omdsh-dev/DSH-better-sidebar）：

1. 克隆并构建：
   git clone https://github.com/omdsh-dev/DSH-better-sidebar.git ~/Code/DSH-better-sidebar
   cd ~/Code/DSH-better-sidebar && pnpm install && pnpm build
2. 注册到 web profile：
   a. ~/.dsh/profiles/web/package.json 的 dependencies 加 "dsh-better-sidebar": "link:<第 1 步克隆目录的绝对路径>"
   b. ~/.dsh/profiles/web/cordis.patch.yml 追加：
      - insert:
          - id: better-sidebar
            name: 'dsh-better-sidebar'
3. 在 ~/.dsh/profiles/web 执行 pnpm install
4. 重启 DSH 并硬刷新（Cmd/Ctrl+Shift+R）验证
```

!!! tip "等价于 dsh plugin add"
    安装 = 依赖登记（等价 `dsh plugin --profile web add link:<路径>`）+ 一行挂载行。DSH 以 npm 包启动（如 `npx -p @deepseek-ai/dsh@0.1.0-rc.6 dsh web`）同样可用（v0.4.3 起实测验证）。

### 配置项

设置页「侧边卡片」分区按注册表渲染功能清单（小卡片网格，高亮 = 启用），每项可独立开/关；二级设置（子代理自动展开、终端工具、底部面板首展自动开终端、沙箱开关等）经齿轮按钮在原生弹窗中编辑。

### 典型用法示例

**自然语言触发**：本插件以 UI 交互为主，但终端工具可被模型调用（可选为模型注入 8 个 `terminal_*` 工具）。对话中可说：

```text
在侧边栏打开 src/index.ts，帮我看看 git 当前变更
```

**UI / 命令行触发**：

- 资源管理器：懒加载目录树（根 = 会话 cwd），点击在侧边栏打开，行尾 `@文件` 引用到输入框。
- 编辑与预览：CodeMirror 6 多语言高亮 + `Ctrl/Cmd+S` 原子保存；图片 / Markdown / HTML（沙箱 iframe）/ PDF / Word / Excel / PPT 内联预览。
- 浏览器：内嵌网页浏览 tab（多开），沙箱 iframe 运行，可临时解锁。
- 终端：xterm.js + node-pty 真实 shell（每会话 3 个 UI 上限），Tab 保活重连回放。
- Git 面板：真 diff + VSCode 式 diff tab、懒加载历史、右键暂存/放弃/提交/还原/捡取。
- 后台任务页：主会话完整 agent 拓扑 + 后台任务（bash/pwsh 类型徽标 + 退出码）。
- 底部面板：独立的第二个工作台，首次展开自动开一个新终端。

**快捷键**：

| 操作 | 按键 |
|---|---|
| 保存编辑 | `Ctrl/Cmd + S` |
| Git 提交 | `Ctrl + Enter` |
| 关闭 Tab | 鼠标中键 |
| 拆分/合并分栏 | 拖 Tab 到分栏边缘 / 中间 |
| 引用文件到输入框 | 悬浮行尾 `@文件` 按钮 |
| 复制文件路径 | 右键行 → 复制相对/绝对地址 |

### 重启生效说明

!!! tip "client 与 host 改动区分重启策略"
    仅 client（`src/client/*`）改动 → 硬刷新即可；含 host（`src/index.ts`、`src/config.ts` 等）改动 → 重启 DSH + 硬刷新。出处：README「更新」章节。

---

## 2. 弊端与缺陷

!!! warning "Office/PPTX 预览内联进 client bundle 约 23MB，首次加载较慢"
    Office/PPTX 预览内联进 client bundle（约 23MB），首次加载较慢。客户端懒加载虽已把 Office/终端/代码编辑器按需分块，但 Office/PPTX 仍较重。出处：README「已知限制」、`docs/plans/2026-08-12-lazy-chunks-design.md`。

!!! warning ".xlsx 预览不保留单元格样式"
    `.xlsx` 预览不保留单元格样式（SheetJS 社区版限制）。出处：README「已知限制」。

!!! warning "Git 无 push/pull/fetch，无文件 watcher"
    Git 面板无 push/pull/fetch；无文件 watcher（需手动刷新）；工具行内文件打开按钮不可拦截。出处：README「已知限制」。

!!! warning "终端 Tab 拖到另一分栏会重挂载（shell 重开）"
    终端 Tab 拖到另一分栏会重挂载，shell 重开，原会话状态丢失。出处：README「已知限制」。

!!! warning "浏览器沙箱无登录态，部分站点登录需走弹窗"
    浏览器沙箱无登录态/第三方 Cookie 受限，部分站点登录需走弹窗；被 `X-Frame-Options` / `frame-ancestors` 拒绝嵌入的站点（如 arxiv.org）显示原因面板；iframe 内部跳转不进后退栈。出处：README「已知限制」。

!!! warning "HTML 预览渲染的是已保存文件，不反映未保存草稿"
    HTML 预览渲染的是已保存文件，不反映未保存草稿，需先保存再预览。出处：README「已知限制」。

!!! warning "移动端（<768px）无底部面板"
    移动端（<768px）无底部面板：进入窄屏时其标签页一次性并入右侧栏（迁移后回桌面仍保留在右侧栏），桌面端的底部面板只在宽视口下可用；移动端底部首展自动开终端不触发。出处：README「已知限制」。

!!! warning "node-pty 失败需编译工具链"
    `node-pty` 优先预编译二进制，失败需编译工具链（Windows VS Build Tools / Linux make+g+++python3 / macOS Xcode CLT），无工具链环境安装受阻。出处：README「平台支持」。

!!! warning "plugin-registry 与 profile 双通道会双挂载"
    同时启用 plugin-registry 与 profile 通道会双挂载（Node 半挂两次、页面两个侧边栏），切换通道前必须先移除另一通道的挂载。出处：README「通过 plugin-registry 安装」折叠块。

!!! warning "沙箱默认开启，关闭后内容与界面同源"
    HTML 预览与浏览器 tab 默认在不透明源沙箱 iframe 中渲染；设置页可按功能关闭沙箱（默认关闭该设置，带警告文案）——关闭后内容与界面同源，仅建议对完全可信内容使用。出处：README「安全」。

---

## 3. 后续拓展思路

### 可二次开发的方向

- **文件 watcher 与 Git 远程操作**：补齐 README「已知限制」中缺失的文件 watcher（自动刷新）与 Git push/pull/fetch，让 Git 面板成为完整 SCM。
- **Office 预览外置化**：把 23MB 的 Office/PPTX 预览从 client bundle 内联改为按需 CDN/外部加载，进一步压缩启动体积。
- **终端 Tab 跨分栏保活**：修复"终端 Tab 拖到另一分栏会重挂载"的限制，实现 shell 会话跨分栏迁移。

### 可对接的 DSH 能力

- **服务化（ctx.betterSidebar）**：从 v0.4.0 起暴露 `ctx.betterSidebar` 服务，其他插件可 `registerTab` / `registerFileViewer` 注册侧边栏页面与文件预览器（内置 7 tab + 9 viewer 也走同一服务，吃自己的狗粮）。出处：README「服务化」、`AGENTS.md`。
- **subagent**：后台任务页展示主会话完整 agent 拓扑，点击直达执行记录，新子代理自动展开——对接 subagent 拓扑真相。
- **jobs**：后台任务页同页显示后台任务（bash/pwsh 类型徽标 + 退出码），通过读会话事件日志回放 `job_output`，不干扰模型的 `job_output`。
- **tools**：可选为模型注入 8 个 `terminal_*` 工具，让 Agent 直接操作真实终端。
- **i18n**：界面文案跟随 DSH 的 `ctx.locale`（`@deepseek-ai/dsh-client-locale`），词典注册在 `betterSidebar` 命名空间，切换语言无需刷新。
- **hooks**：终端会话、Git 提交等可经 hooks 触发外部通知或自动化。

### 与其它插件组合的可能性

- **dsh-better-sidebar + dsh-vision-toolkit**：better-sidebar 的 HTML 预览 tab 与 vision-toolkit 的 `vision_html_screenshot` 互补，形成"编辑-预览-像素验证"闭环；也可为 vision-toolkit 的 Artifact 注册专用的 SVG/图片预览 viewer。
- **dsh-better-sidebar + dsh-agent-teams**：better-sidebar 的子代理拓扑 tab（`subagent` 内置 tab）展示 agent 拓扑真相，与 agent-teams 的团队活动面板互补——前者看进程语义，后者看团队语义。
- **dsh-better-sidebar + dsh-web-ui**：二者右侧面板功能重叠，可分工——better-sidebar 主编辑/终端/Git/浏览器，web-ui 主看板/皮肤/移动端/SSH，避免重复挂载。
