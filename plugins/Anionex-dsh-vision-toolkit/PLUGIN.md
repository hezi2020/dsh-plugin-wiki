# PLUGIN 元数据 — dsh-vision-toolkit

## 插件名称
dsh-vision-toolkit（DSH Vision Toolkit，版本 v0.1.2）

## 来源仓库 URL
https://github.com/Anionex/dsh-vision-toolkit

## 克隆时的 commit SHA
8d35621cf955d10d9a76a02cd7b5b946fcc769ad（前 7 位：8d35621）

## 功能描述（一句话）
视觉工具套件 Profile Bundle：将 agent-vision-toolkit 引入 DeepSeek Harness，为纯文本 DSH 代理提供图片问答、OCR、UI 还原、grounding、pixel diff、Artifacts 等 10 个独立视觉工具。

## 前置依赖
- DeepSeek Harness（Web 或 Headless profile），`pnpm` 可被 `dsh plugin` 调用
- Python 3.11 或更新（managed 模式创建隔离环境，无需手动安装上游 CLI/包）
- 首次 managed 运行时激活需要网络访问（除非 `runtime/requirements.lock` 中的包已在包缓存中）
- OpenAI 兼容视觉端点 + DSH Credential（用于 `vision_glance`/`vision_ground`/`vision_detect` 及非 split-only 的长截图 OCR）；本地工具无需该凭证
- Chrome / Chromium / Edge（仅 `vision_html_screenshot` 需要）；其余工具在无支持的浏览器时仍可用
- 输入图片须为 PNG/JPEG/GIF/WebP，位于会话工作区或显式配置的 `allowedDirs` 根下

## 安装命令
```sh
dsh plugin --profile web add github:Anionex/dsh-vision-toolkit
dsh plugin --profile headless add github:Anionex/dsh-vision-toolkit
```
> 安装后重启长期运行的 Web profile。首次 managed 启动会校验打包的上游 manifest 并在 `DSH_HOME/cache/dsh-vision-toolkit` 下原子地准备隔离环境。

## 配置项
profile patch 可覆盖 provider 与限制：

| 字段 | 默认值 | 说明 |
|---|---|---|
| `provider.baseUrl` | `https://api.inferera.com/v1` | OpenAI 兼容 base URL |
| `provider.credential` | `VISION_API_KEY` | DSH Credential 引用（非密钥值） |
| `provider.model` | `gemini-3.6-flash` | 多模态模型名 |
| `language` | `zh` | 视觉输出语言（zh/en） |
| `timeoutMs` | `60000` | 整操作截止（1000-600000 ms） |
| `maxImageBytes` | `10485760` | 每张输入图编码字节上限 |
| `maxImagePixels` | `40000000` | 每张输入图解码像素上限 |
| `concurrency` | `4` | 每会话并发（1-16） |
| `runtime.mode` | `managed` | managed 用打包快照；external 仅接受精确 pin |
| `runtime.agentVisionToolkitPath` | 未设置 | external 模式必填 |
| `runtime.python` | 未设置 | Python 3.11+ 解释器覆盖 |
| `allowedDirs` | `[]` | 额外输入根目录（realpath 解析） |

凭证设置：`dsh credentials set VISION_API_KEY`

## 工具列表（10 个 vision_* 工具）
`vision_glance`（远程）、`vision_ground`（远程+可选本地预览）、`vision_detect`（远程+可选本地预览）、`vision_trace`（本地 vtracer）、`vision_crop`（本地 Pillow）、`vision_pixel_diff`（本地 NumPy/Pillow）、`vision_long_screenshot_ocr`（本地分块+远程 OCR）、`vision_extract_foreground`（本地提取）、`vision_dominant_colors`（本地色彩分析）、`vision_html_screenshot`（本地 Chrome 系）

## 已知限制
- 仅 `vision_toolkit_activate` 初始可见；10 个视觉执行 schema 为 Agent 作用域，需 Agent 调 `skill` 工具加载 `vision-tools` 后才挂载。
- P2 的稳定 `ctx.visionToolkit` 服务刻意不发布，直到有独立插件成为真实消费者。
- 不在当前产品范围内的能力：Web 上传、拖拽、摄像头/视频/音频/文档摄入、交互式框编辑、自动 GUI 点击、服务集群、模型路由、模型投票、跨会话视觉缓存。
- 图片若走了 DSH 原生模型附件通道（非 Paste Input），纯文本模型会先拒绝；需用 DSH Paste Input 把文件复制进会话工作区并以路径表示。
- `vision_html_screenshot` 仅接受授权的本地 .html/.htm 文件，禁用网络访问。
- 远程视觉提示把图片内可见文本/指令归类为不可信内容。
- 仅保留最近一次成功的 `vision_glance` 结果供即时复用；失败与其他会话不共享。
- macOS 可能弹出 keychain 对话框（建议用当前构建适配器，勿重置登录 keychain）。
- 健康检查、连接测试、版本检查为管理性 Web Settings 操作，不进入 Agent schema。

## 本地运行状态
未实测安装（本任务仅克隆源码，未实际通过 dsh plugin 加载）

## 许可证
MIT（插件本体）；打包的 agent-vision-toolkit 快照保留上游 MIT 许可证（vendor/agent-vision-toolkit/LICENSE）
