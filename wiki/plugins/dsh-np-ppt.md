# dsh-np-ppt

> **插件名**：dsh-np-ppt（DSH NP-PPT 演示文稿专家）
> **来源仓库**：<https://github.com/z953218350/dsh-np-ppt>
> **许可证**：MIT
> **commit SHA**：`13faece`（前 7 位 `13faece`）

DSH 原生 PPT 演示文稿专家插件：内置 PPTD DSL 引擎、9 大视觉风格体系、55173 所见即所得可视化编辑器服务、Python-PPTX 高保真离线编译内核与一键导出 PPTX。Agent 提到"做 PPT / 演示文稿 / 幻灯片 / PPTD / 55173"时即由本插件协作。

---

## 1. 使用指南

### 前置依赖

- DSH web profile（`dsh.client.platform: web`，需注入 `@deepseek-ai/dsh-client-runtime`）
- 运行时依赖：`schemastery ^3.18.0`；TypeScript 源码依赖 `@deepseek-ai/cordis` types
- Python 3（编译内核）：`py -3` / `python3` / `python` 任一可用；首次运行会自动 `pip install --user` 安装 `pyyaml` 与 `python-pptx`
- 浏览器打开 `http://127.0.0.1:55173/` 进行可视化编辑

### 安装命令

推荐方式（README 原文使用本地路径 `link:`）：

```bash
dsh plugin --profile web add link:<项目路径>
```

pnpm workspace 根目录下可能需附加 `-w`：

```bash
dsh plugin --profile web add -w link:<项目路径>
```

GitHub 形式对齐：

```sh
dsh plugin --profile web add github:z953218350/dsh-np-ppt
```

> 安装后需重启 web profile（在 `dsh web` 终端 `Ctrl+C` 后重新执行 `dsh web`）。

### 配置项

来自 `src/index.ts` 的 `Config` 接口（profile patch 层注入）：

| 字段 | 类型 | 默认值 | 含义 |
|---|---|---|---|
| `enabled` | boolean | `true` | 设为 `false` 则整个插件 `apply` 直接返回，不注入提示、不启动服务 |
| `announceToAgent` | boolean | `true` | 是否向 system prompt 注入 `plugin:dsh-np-ppt` 引导段落（order=205） |
| `port` | number | `55173` | 55173 编辑器服务端口（仅 `autoStartServer=true` 时使用） |
| `autoStartServer` | boolean | `false` | 是否在插件加载时自动启动 55173 编辑器服务 |

注入的 Agent 引导文本（`NP_PPT_GUIDANCE`）会告知 Agent：本机已安装本插件，用户提到"做PPT / 演示文稿 / 幻灯片 / PPTD / 55173"时即指本插件。

### 典型用法

**1. 对话驱动生成**：在 DSH Web GUI 中切换到 **PPT 演示文稿专家** 预设（`presets/preset.yml`，name=`PPT 演示文稿专家`，order=5），直接对话：

> 帮我用科技蓝风格做一份 8 页的《微服务架构重构技术方案》

**2. 本地可视化编辑与导出**：

1. 浏览器打开 `http://127.0.0.1:55173/`（服务由 `pptServeTool` 或 `autoStartServer` 启动）；
2. 点击「打开 PPTD 文件夹」，授权选择包含 `deck.pptd` 的项目目录；
3. 在页面中直接修改文字、排版；
4. 点击右上角「导出」-> 选择 PPT -> 点击「下载」，触发本地 Python-PPTX 编译并下载 PPTX；选择「图片」则保持原生图片切图下载。

**3. 命令行直接编译**（在 PPTD 项目目录下）：

```bash
# Windows
py -3 <项目路径>/compiler/export_pptx.py deck/deck.pptd --output deck/deck.pptx --force
# macOS / Linux
python3 <项目路径>/compiler/export_pptx.py deck/deck.pptd --output deck/deck.pptx --force
```

**4. Agent 工具调用**：插件导出 `pptExportTool`（参数 `{ manifestPath, outputPath?, transition?, force? }`）与 `pptServeTool`（参数 `{ port?, action?: 'start' | 'status' }`），可被 Agent 直接调用。

### 重启生效说明

!!! tip "安装与配置变更需重启 web profile"
    安装后需在 `dsh web` 终端 `Ctrl+C` 后重新执行 `dsh web` 才能加载插件。`enabled` / `announceToAgent` / `port` / `autoStartServer` 均在 `apply` 时读取，修改后同样需要重启。`pptServeTool` 启动后端口持续占用，模块级 `activeServer` 单例不会随插件重载而关闭。

---

## 2. 弊端与缺陷

!!! warning "编译内核强依赖本地 Python 3"
    `findPython()` 依次尝试 `py -3` / `python3` / `python`，三者皆不可用时导出直接返回 `Python not found. Please install Python 3.`。无 Python 环境（如纯前端容器）无法导出 PPTX。出处：`src/service.ts` `findPython` 与 `handleExport`、`compiler/export_pptx.py` 顶部。

!!! warning "首次运行需联网 pip 安装 pyyaml / python-pptx"
    `compiler/export_pptx.py` 在 import 失败时会 `pip install --user` 自动安装 `pyyaml` 与 `python-pptx`，需要联网与可写的 user site；离线或受限环境会失败。出处：`compiler/export_pptx.py` 顶部 import fallback。

!!! warning "服务端导出同步阻塞且硬超时 30 秒"
    `/api/export` 用 `execFileSync` 同步执行 Python 编译，`timeout: 30000`；超大型 PPTD 或慢机环境可能超时返回 500，且阻塞 Node 事件循环。出处：`src/service.ts` `handleExport` 中 `execFileSync(..., { timeout: 30000 })`。

!!! warning "编辑器服务为模块级单例，端口占用处理粗糙"
    `activeServer` / `activeServerUrl` 为模块级变量，同进程内重复调用 `pptServeTool` 直接返回"已在运行中"，不会重启或换端口；`EADDRINUSE` 时仅返回"端口已在运行编辑器服务"但不会复用既有服务。出处：`src/tools.ts` `activeServer` 与 `pptServeTool`。

!!! warning "字体锁定为微软雅黑，跨平台可能不一致"
    编译器硬编码 `FONT_NAME_CN="微软雅黑"` / `FONT_NAME_EN="Microsoft YaHei"` 并 `noAutofit` 锁定。非 Windows 系统若未安装该字体，PPTX 在 PowerPoint / Keynote 中打开时字体回退效果可能与预期不同。出处：`compiler/export_pptx.py` `FONT_NAME_CN/EN`、README「高保真离线原生编译内核」。

!!! warning "/neo-ppt/ 反向代理 kimi.com 并注入拦截脚本，强依赖外部站点"
    `createEditorServer` 对 `/neo-ppt/` 路径反向代理 `https://www.kimi.com`，并改写 `//statics.` 为 `https://statics.`、注入点击拦截脚本以劫持"下载"按钮。该机制依赖 kimi.com 可访问且页面结构与按钮 class 未变，否则导出拦截失效。出处：`src/service.ts` `createEditorServer` 中 `pathname.startsWith('/neo-ppt/')` 分支。

!!! warning "预设复制失败被静默吞掉"
    `ensurePresetInstalled()` 把 `presets/preset.yml` / `presets/agent.cordis.yml` 复制到 `~/.dsh/.agent-presets/np-ppt/`，整个过程包裹在 `try {} catch {}` 中，失败时无任何日志，用户可能不知道预设未就位。出处：`src/index.ts` `ensurePresetInstalled`。

!!! warning "55173 服务仅监听 127.0.0.1，无鉴权"
    编辑器服务默认 `host='127.0.0.1'`，无任何鉴权；本机任意进程均可访问 `/api/export` 触发 Python 编译（接受任意 manifestContent 与 pages 写入临时目录）。共享主机或非可信本机环境存在被滥用的风险。出处：`src/service.ts` `startEditorServer` 与 `handleExport`。

!!! warning "导出临时文件无显式清理"
    `handleExport` 每次导出都在 `mkdtempSync(tmpdir(), 'pptd-export-')` 下创建临时目录写入 manifest/pages 并编译，未在响应结束后清理，长期使用会残留临时文件。出处：`src/service.ts` `handleExport`。

---

## 3. 后续拓展思路

### 可二次开发的方向

- **服务端导出改异步 + 队列**：将 `/api/export` 由 `execFileSync` 改为 `execFile` 异步执行并配合任务队列与 SSE/WebSocket 进度回传，避免阻塞事件循环、突破 30 秒超时。
- **多字体 / 跨平台字体策略**：把 `FONT_NAME_CN/EN` 改为可配置，并按平台自动回退（macOS 用 PingFang SC、Linux 用 Noto Sans CJK），保证跨平台视觉一致。
- **预设复制失败显式化**：`ensurePresetInstalled()` 失败时通过 `ctx.logger` 输出告警，或在 system prompt 引导中提示用户手动复制。
- **临时目录清理**：在 `handleExport` 响应结束后 `rm -rf` 临时目录，或在启动时清理历史 `pptd-export-*` 残留。

### 可对接的 DSH 能力

- **systemPrompt.section**：本插件已是 `systemPrompt.section` 注入引导段落的范例（order=205），可复用同一机制为其它"专家型"插件声明能力。
- **Agent Tools**：`pptExportTool` / `pptServeTool` 是导出给 Agent 直接调用的工具样例，可作为"本地服务 + 工具封装"模式的模板。
- **presets**：`presets/agent.cordis.yml` 提供完整 Agent 配置（persona、工具、plan mode），可作为其它专家预设的对照。

### 与其它插件组合的可能性

- **dsh-np-ppt + dsh-better-sidebar**：把 55173 编辑器或 PPTD 文件树接入 better-sidebar Tab，在侧栏内浏览与编辑 `.page` 文件，再一键导出。
- **dsh-np-ppt + dsh-workspace-search**：用工作区搜索快速定位 `deck.pptd` / `*.page` 中的关键字（如某页标题、某风格名），辅助大型 PPTD 项目的导航。
- **dsh-np-ppt + 视觉类插件**：导出 PPTX 后由视觉类插件对每页截图做像素级 diff / OCR 校验，自动核对"所见即所得"编辑器与最终 PPTX 是否一致。
