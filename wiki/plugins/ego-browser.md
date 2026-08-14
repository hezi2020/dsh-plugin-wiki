# ego-browser

> **插件名**：ego-browser（npm 包名 `@dsh-external/ego-browser`，私有内测）
> **来源仓库**：<https://github.com/dsh-external/ego-browser>（PRIVATE，内测生态）
> **许可证**：插件本体 MIT；内置运行时嵌入 CitroLabs/ego-lite（MIT）+ Linux 社区移植 PR #234
> **commit SHA**：前 7 位 `48480d8`

把 ego-lite（给 AI Agent 用的 Chromium 浏览器）接入 DeepSeek Harness：13 个结构化 `ego_*` 工具驱动浏览器，并配一套实时观察前端口——agent 在后台操作网页时，你能像看直播一样看到它正在浏览的每一个页面。Linux + Chrome 开箱即用，插件包内置 ego 运行时，无需克隆官方仓库、无需手动构建。

---

## 1. 使用指南

### 前置依赖

- Node.js `>= 22`（harness 环境自带）
- 任意 Chrome / Chromium / Brave / Edge（自动在 `PATH` 上发现，或经 `EGO_LINUX_CHROME` 指定；root 下自动用自带 wrapper + `--no-sandbox`）
- DSH + dshx（插件装载机制）
- 带图形界面的 DSH Web（观察窗需要浏览器页面显示；headless 会话仍可用 `ego_*` 工具，但观察窗是 no-op）
- peerDependencies：`@deepseek-ai/dsh-tools ^0.0.1`、`cordis ^4.0.0-rc.7`

### 安装命令

```sh
# tarball 或 git URL 均可
dshx install ego-browser ego-browser-plugin-0.2.0.tgz

# 验证
dshx list   # 应显示：[on] ego-browser
```

可选配置（`~/.dsh/config.yaml`，该插件条目下）：

```yaml
egoBin: /path/to/ego-browser       # 默认：插件内置 vendored CLI
defaultSpace: dsh-agent            # 动作工具未传 space 时使用的任务空间名
maxOutputBytes: 4194304            # 快照/JS 结果的 stdout 收集上限
graceMs: 15000                     # 进程树终止宽限（ms）
```

### 配置项

| 来源 | 字段 |
|---|---|
| `~/.dsh/config.yaml`（插件条目） | `egoBin`、`defaultSpace`、`maxOutputBytes`、`graceMs` |
| 环境变量 | `EGO_LINUX_CHROME`（指定 Chrome 路径）、`EGO_BROWSER_AUTO_ADAPT=0`（关掉环境自动适配） |
| 内置运行时 | `runtime/ego-browser`、`runtime/ego-linux`、`runtime/skills/ego-browser`（MIT 的 ego-lite，含 Linux PR #234，详见 `THIRD_PARTY_NOTICES.md`） |

`resolveEgoEnv` 自动探测 root（走自带 wrapper + `--no-sandbox`）、无显示器（自动 `headless`）；已设环境变量绝不被覆盖。观察窗 host 路由自动注册（`/api/ego/spaces`、`/api/ego/close`、`/api/ego/stream` SSE、`/api/ego/input`、`/api/ego/flush`），仅在有 HTTP server 时启用，headless 是安全的 no-op。

### 典型用法示例

13 个工具（前缀 `ego_`）：

| 工具 | 作用 |
|---|---|
| `ego_status` | 探测 ego-browser CLI 是否可用（实际运行 `--status`） |
| `ego_space_open` | 打开/复用任务空间（隔离浏览上下文，继承登录态），返回空间 id |
| `ego_space_close` | 完成/关闭任务空间（`keep: true` 保留页面给用户） |
| `ego_snapshot` | 当前页面语义树文本（带 `[ref=N, loc=...]` 选择器，供 click/fill 定位） |
| `ego_navigate` | 打开 URL 或切到已有 tab，等待加载（同任务复用当前 tab） |
| `ego_click` | 点击：CSS/xpath/loc/ref 选择器或视口坐标 |
| `ego_fill` | 向输入框键入文本 |
| `ego_js` | 在页面内求值 JS 表达式，返回可 JSON 序列化的结果 |
| `ego_cdp` | 原始 CDP 命令（如 `Page.handleJavaScriptDialog`） |
| `ego_screenshot` | 截图，返回 PNG 文件路径（可交给 vision 工具看图） |
| `ego_page_info` | 当前页 url/title/视口/滚动位置，或原生对话框状态 |
| `ego_wait` | 固定毫秒等待 |
| `ego_cli` | 逃生舱：原样运行任意 `ego-browser nodejs` heredoc 脚本 |

观察窗（v0.2.0 前端口）使用：右下角 🌐 常驻小球点开 → 主画面（滚轮缩放 / 拖动平移 / 双击复位）+ 顶部标签条 + 🕘 历史抽屉 + ⟳ 刷新。v0.5.0 起监控窗可直接用鼠标操作 agent 浏览器（普通滚轮 = 滚动 agent 页面；普通点按/拖动 = 点击/拖拽真实浏览器；Ctrl+滚轮 = 视图缩放）。

### 重启生效说明

!!! tip "登录态需重新登录（DSH 强杀重启后）"
    Chrome 运行期 Cookie 仅在优雅关闭时落盘；DSH 强杀重启会导致运行期登录丢失，需重新登录（扫码即可）。配置项改动需重启 DSH 生效；`runtime/` 内置运行时随包自带，重启不丢失。

---

## 2. 弊端与缺陷

!!! warning "私有内测，严禁公开分发"
    README 顶部声明本项目属于 DeepSeek Harness 内测生态，仅限 dsh-external 组织内测成员使用；严禁公开、外发、镜像或分发到任何非授权位置，仓库必须保持 PRIVATE，不发布到 npm/公共 registry，不创建公开 fork 或镜像。出处：README 顶部「保密声明」。

!!! warning "Windows 宿主稳定性弱于 macOS"
    插件层面（Chrome 探测、状态路径、观察窗服务）已做 v0.4.0 跨平台适配，但底层 ego-lite 宿主仍是非 Windows 官方支持的社区移植，Windows 下复杂多步流程的宿主稳定性可能略弱于 macOS。出处：README「已知限制 · Windows」。

!!! warning "Linux 是未合并的社区 PR，非官方支持"
    Linux 是 ego-lite 未合并的社区 PR（#234）；macOS 仍是 ego-lite 官方唯一支持平台。未合并的宿主在跨 CLI 调用间可能丢失 tab/空间状态（空白 tab、偶发 EPIPE），插件已内置 `ensureRealTab`、快照重试、EPIPE 容错，但复杂多步流程可能仍需重试。出处：README「已知限制 · 官方支持状态 / 宿主可靠性」。

!!! warning "登录态仅在优雅关闭时落盘，强杀即丢"
    Chrome 运行期 Cookie 仅在优雅关闭时落盘，DSH 强杀重启会导致运行期登录丢失（需重登）；这是 Chrome 内核行为，插件无法在运行期强制落盘。出处：README「已知限制 · 登录态持久化」、「观察窗 · 登录态说明」。

!!! warning "快照非 macOS 内核级，复杂 iframe/画布降级"
    Linux 宿主用 CDP `DOMSnapshot.captureSnapshot` 重建语义树（refs 忠实、内容可读），但非 macOS 内核级快照，复杂 iframe/画布场景可能降级。出处：README「已知限制 · 快照质量」。

!!! warning "输出 schema 宽松，客户端以实际返回为准"
    输出 schema 为宽松的 `additionalProperties: true` 结构，客户端渲染以实际返回值为准，无强类型契约。出处：README「已知限制 · 输出 schema」。

---

## 3. 后续拓展思路

### 可二次开发的方向

- **macOS 内核级快照补齐**：当前 Linux 走 CDP `DOMSnapshot` 降级方案，待 ego-lite 官方合并 PR #234 后跟进 macOS 内核级快照能力，提升复杂 iframe/画布场景保真度。
- **登录态持久化增强**：在 DSH 优雅关闭钩子里主动调用 Chrome `flush` 落盘，缓解强杀丢失问题；或在观察窗新增「主动保存登录」按钮（v0.5.0 已加 `/api/ego/flush`，可进一步自动化）。
- **任务空间命名空间与配额**：当前 `defaultSpace` 单一，可扩展为多任务空间配额 + 自动回收，避免 agent 长会话累积过多 tab。

### 可对接的 DSH 能力

- **skill**：`runtime/skills/ego-browser/SKILL.md` 已是 DSH Skill 形态，可把「打开 URL → 快照 → click → fill」封装为高层 skill（如「在 X 站点比价」「在 Y 站点抢票」），让 Agent 自然语言触发。
- **hooks**：`ego_navigate` / `ego_click` 事件可经 hooks 触发外部记录（如把 agent 浏览轨迹写入 dsh-track 的捕获墙）。
- **vision**：`ego_screenshot` 返回 PNG 路径，可直接交给 DSH vision 工具链（vision_glance / vision_extract_foreground）做页面合规性校验或 captcha 识别。

### 与其它插件组合的可能性

- **ego-browser + dsh-track**：把 agent 的浏览轨迹自动捕获进 dsh-track 捕获墙，每条 `ego_navigate` 携带动机上下文，形成「浏览决策可追溯」的工作流。
- **ego-browser + dsh-github**：用 `ego_*` 工具操作 GitHub Web 界面（处理需要真人会话的 PR review 交互、CI 日志翻页），补齐 dsh-github 纯 REST API 无法覆盖的 Web 交互场景。
- **ego-browser + dsh-clawrouter**：`ego_captcha` 调用走 dsh-clawrouter 的 blockrun 路由用强模型识别人机验证，主循环保持 DeepSeek 控成本。
