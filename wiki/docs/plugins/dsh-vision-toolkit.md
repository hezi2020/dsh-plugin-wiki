# dsh-vision-toolkit

> **插件名**：dsh-vision-toolkit（DSH Vision Toolkit，版本 v0.1.2）
> **来源仓库**：<https://github.com/Anionex/dsh-vision-toolkit>
> **许可证**：MIT（插件本体）；打包的 `agent-vision-toolkit` 快照保留上游 MIT 许可证（`vendor/agent-vision-toolkit/LICENSE`）
> **commit SHA**：`8d35621cf955d10d9a76a02cd7b5b946fcc769ad`（前 7 位 `8d35621`）

视觉工具套件 Profile Bundle：将 `agent-vision-toolkit` 引入 DeepSeek Harness，为纯文本 DSH 代理提供图片问答、OCR、UI 还原、grounding、pixel diff、Artifacts 等 10 个独立视觉工具。让纯文本 DSH 代理拥有"眼睛"，并保持视觉能力在 harness 内。

---

## 1. 使用指南

### 前置依赖

- DeepSeek Harness（Web 或 Headless profile），`pnpm` 可被 `dsh plugin` 调用
- Python 3.11 或更新（managed 模式创建隔离环境，无需手动安装上游 CLI/包）
- 首次 managed 运行时激活需要网络访问（除非 `runtime/requirements.lock` 中的包已在包缓存中）
- OpenAI 兼容视觉端点 + DSH Credential（用于 `vision_glance` / `vision_ground` / `vision_detect` 及非 split-only 的长截图 OCR）；本地工具无需该凭证
- Chrome / Chromium / Edge（仅 `vision_html_screenshot` 需要）；其余工具在无支持的浏览器时仍可用
- 输入图片须为 PNG/JPEG/GIF/WebP，位于会话工作区或显式配置的 `allowedDirs` 根下

### 安装命令

```sh
npx -p @deepseek-ai/dsh dsh plugin --profile web add github:Anionex/dsh-vision-toolkit
npx -p @deepseek-ai/dsh dsh plugin --profile headless add github:Anionex/dsh-vision-toolkit
```

!!! tip "重启 + 凭证配置"
    安装后重启长期运行的 Web profile。首次 managed 启动会校验打包的上游 manifest 并在 `DSH_HOME/cache/dsh-vision-toolkit` 下原子地准备隔离环境。

### 配置项

profile patch 可覆盖 provider 与限制（来源：README「Configure」章节）：

```yaml
- id: vision-toolkit
  config:
    provider:
      baseUrl: https://api.inferera.com/v1
      credential: VISION_API_KEY    # DSH Credential 引用，非密钥值
      model: gemini-3.6-flash
    language: zh                     # 视觉输出语言（zh/en）
    timeoutMs: 60000                 # 整操作截止（1000-600000 ms）
    maxImageBytes: 10485760          # 每张输入图编码字节上限
    maxImagePixels: 40000000         # 每张输入图解码像素上限
    concurrency: 4                   # 每会话并发（1-16）
    runtime:
      mode: managed                  # managed 用打包快照；external 仅接受精确 pin
    allowedDirs: []                  # 额外输入根目录（realpath 解析）
```

凭证设置：

```sh
dsh credentials set VISION_API_KEY
```

### 典型用法示例

**自然语言触发**：在对话中先让图片以工作区路径形式存在（用 DSH Paste Input 把文件复制进会话工作区），然后说：

```text
/vision-tools 帮我看一下 screenshot.png 里报了什么错
```

或直接让 Agent 调用具体工具。

**命令行 / 工具调用**：10 个 `vision_*` 工具的基础调用示例（来源：README「Usage patterns」）：

```text
vision_glance images=["screenshot.png"] query="What error is shown?"
vision_ground image="screenshot.png" target="the send button" preview=true
vision_detect image="screenshot.png" category="buttons" preview=true
vision_crop image="screenshot.png" region="1067,841,1108,881"
vision_trace image="icon.png" color=true output="icon.svg"
vision_pixel_diff original="reference.png" rebuilt="actual.png" runName="comparison"
vision_long_screenshot_ocr image="page.png" mode="general" jobs=2
vision_extract_foreground image="logo.png" mode="color"
vision_dominant_colors image="screen.png" region="0,0,600,300" top=8
vision_html_screenshot source="implementation.html" width=1200 height=720
```

常见工作流：`vision_ground` → `vision_crop` → `vision_glance`、`vision_ground` → `vision_crop` → `vision_trace`、参考图 → `vision_html_screenshot` → `vision_pixel_diff`。

### 重启生效说明

!!! tip "渐进式模型暴露"
    只有 `vision_toolkit_activate` 初始可见；10 个视觉执行 schema 为 Agent 作用域，需 Agent 调 `skill` 工具加载 `vision-tools` 后才挂载。直接 `/vision-tools` 注入 Skill 指令；若视觉工具仍缺失，指令要求一次 `vision_toolkit_activate` 调用。激活仅影响该 Agent，持续到 Agent 或插件被销毁。

---

## 2. 弊端与缺陷

!!! warning "远程工具强依赖视觉 API 凭证"
    `vision_glance` / `vision_ground` / `vision_detect` 及非 split-only 的长截图 OCR 需 OpenAI 兼容视觉端点 + DSH Credential；凭证缺失时这些工具不可用（本地工具仍可用）。出处：PLUGIN.md 前置依赖、README「Requirements」。

!!! warning "P2 稳定 ctx.visionToolkit 服务刻意不发布"
    P2 的稳定 `ctx.visionToolkit` 服务刻意不发布，直到有独立插件成为真实消费者；当前无 capability-discovery API 或 provider 生态。出处：PLUGIN.md 已知限制、README「Project status and scope」。

!!! warning "图片走 DSH 原生模型附件通道会被纯文本模型拒绝"
    图片若走了 DSH 原生模型附件通道（非 Paste Input），纯文本模型会先拒绝；需用 DSH Paste Input 把文件复制进会话工作区并以路径表示。出处：PLUGIN.md 已知限制、README「Troubleshooting」。

!!! warning "vision_html_screenshot 仅接受授权本地 html/htm，禁用网络访问"
    `vision_html_screenshot` 仅接受授权的本地 `.html` / `.htm` 文件，禁用网络访问；无法直接截取在线 URL。出处：PLUGIN.md 已知限制、README「Security and execution model」。

!!! warning "远程视觉提示把图片内文本/指令归类为不可信内容"
    远程视觉提示把图片内可见文本/指令归类为不可信内容；衍生描述、标签、OCR 只能作为视觉证据而非可执行指令。出处：PLUGIN.md 已知限制、README「Security and execution model」。

!!! warning "仅保留最近一次成功的 vision_glance 结果"
    仅保留最近一次成功的 `vision_glance` 结果供即时复用；失败与其他会话不共享，无跨会话视觉缓存。出处：PLUGIN.md 已知限制、README「Security and execution model」。

!!! warning "macOS 可能弹出 keychain 对话框"
    macOS 可能弹出 keychain 对话框（建议用当前构建适配器，勿重置登录 keychain）。出处：PLUGIN.md 已知限制、README「Troubleshooting」。

!!! warning "不在当前产品范围内的能力"
    Web 上传、拖拽、摄像头/视频/音频/文档摄入、交互式框编辑、自动 GUI 点击、服务集群、模型路由、模型投票、跨会话视觉缓存均不在当前产品范围。出处：PLUGIN.md 已知限制、README「Project status and scope」。

!!! warning "external 模式要求精确 pin"
    external 模式仅接受与打包 manifest 匹配的导出快照或 `c27d1a300962b553c0884993c575cd3e819465ce` 的干净 Git checkout；修改的跟踪文件与未跟踪文件会被拒绝。出处：README「Managed and external runtimes」。

---

## 3. 后续拓展思路

### 可二次开发的方向

- **成为 P2 ctx.visionToolkit 的真实消费者**：插件明确等待独立插件消费内部 capability 形状后才会发布稳定服务；可编写一个视觉增强插件率先消费，推动 P2 落地。出处：README「Project status and scope」。
- **跨会话视觉缓存层**：当前仅保留最近一次 `vision_glance` 结果，可在外部加一层按图像哈希 + 查询哈希的跨会话缓存，降低重复调用成本。
- **交互式框编辑器**：当前不在产品范围内的"交互式框编辑"可作为独立 Artifacts 编辑插件开发，配合 `vision_ground` / `vision_detect` 的像素盒输出做人工校正。

### 可对接的 DSH 能力

- **skill**：10 个视觉工具经 `vision-tools` Skill 渐进式暴露，是 DSH skill 机制的典型样例。
- **credentials**：API Key 经 DSH Credentials 注入，运行时解析到子进程环境，日志/错误/Artifact 元数据不含密钥。
- **artifacts**：crop/trace/OCR/pixel diff/foreground/HTML 渲染产出描述性 Artifact，Web 客户端可预览/下载/本地打开。
- **subprocess**：所有上游进程经 `ctx.subprocess` 用 argv 向量调用，继承调用者取消，共享一个硬操作截止时限。
- **Web Settings**：provider URL、Credential 引用、模型、语言、超时、字节/像素限制、并发、运行时模式等经 Web Settings 管理，健康检查/连接测试/版本检查为管理性操作不进入 Agent schema。

### 与其它插件组合的可能性

- **dsh-vision-toolkit + dsh-agent-teams**：组合视觉多智能体——研究员成员用 `vision_glance` / `vision_ground` 看图，工程师成员用 `vision_html_screenshot` + `vision_pixel_diff` 做视觉回归，队长汇总对比报告。
- **dsh-vision-toolkit + dsh-better-sidebar**：better-sidebar 的 HTML 预览 tab 与本插件的 `vision_html_screenshot` 互补，前者实时预览已保存文件，后者截屏后做像素级比对，形成"编辑-预览-像素验证"闭环。
- **dsh-vision-toolkit + dsh-web-ui Git 图谱**：UI 还原工作流产出（HTML/CSS）经 web-ui 右侧面板预览，配合 `vision_pixel_diff` 做参考图-实现图量化验收。
