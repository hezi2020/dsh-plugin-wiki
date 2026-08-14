# dsh-imagecraft

> **插件名**：dsh-imagecraft
> **来源仓库**：<https://github.com/SPYQWER1/dsh-imagecraft>
> **许可证**：MIT（Copyright (c) 2026 dsh-imagegen contributors）
> **commit SHA**：`98c4923`（前 7 位）

DeepSeek Harness 的图像生成与图像理解——由你的 ChatGPT 订阅驱动，无需 `OPENAI_API_KEY`。注册两个模型工具：`image_gen`（通过 ChatGPT Codex 后端生成位图）与 `image_vision`（用多模态模型描述/回答图片问题，让纯文本模型获得"视觉"）。两个工具都复用 ChatGPT 登录态（与官方 Codex CLI 相同的 OAuth 凭据），传输层零 npm 依赖，仅用 Node 内置 `https`。

---

## 1. 使用指南

### 前置依赖

- DeepSeek Harness（插件以 preset 本地 Cordis 插件形式运行）
- Node.js `>= 22`（传输脚本）
- ChatGPT 订阅登录态（任选其一）：
  - `codex login` 生成的 `~/.codex/auth.json`（推荐）
  - DSH 凭据 `OPENAI_CODEX_API_KEY` / `OPENAI_CODEX_REFRESH_TOKEN`
- `@deepseek-ai/cordis` ^4.0.1、`@deepseek-ai/dsh-tools` ^0.1.0-rc.6（均 optional peer，bundle 安装时从 harness 安装解析）

### 安装命令

仓库以 **bundle** 形态发布：装进 profile 后工具注册在 host 注册表，**该 profile 的所有会话**都能用。

```bash
# 从 git 安装（无构建步骤，无需 pnpm allowBuilds 授权）
dsh plugin --profile web add github:SPYQWER1/dsh-imagecraft

# 或发布到 npm 后
dsh plugin --profile web add dsh-imagecraft
```

然后重启该 profile（`dsh web` / `dsh --profile web`），所有会话即可见这两个工具。卸载：`dsh plugin --profile web remove dsh-imagecraft`。git 安装建议固定 commit（`github:SPYQWER1/dsh-imagecraft#<sha>`），避免后续推送静默改变安装内容。

### 配置项

| 来源 | 字段 |
|---|---|
| 环境变量 / DSH 凭据 | `OPENAI_CODEX_API_KEY`（→ `CODEX_ACCESS_TOKEN`）、`OPENAI_CODEX_REFRESH_TOKEN`（→ `CODEX_REFRESH_TOKEN`） |
| `~/.codex/auth.json` | `codex login` 生成的 OAuth 凭据（推荐） |
| 工具参数 | `image_gen`：`prompt`/`out`/`size`/`format`/`model`；`image_vision`：`image`/`question`/`model` |

- 认证优先级：DSH 凭据环境变量 → `~/.codex/auth.json`；遇 HTTP 401 自动刷新 access token 一次并原子写回 `~/.codex/auth.json`（0600）。

### 典型用法示例

直接用自然语言让模型调用工具：

- *"生成一个鲸鱼图标"* → `image_gen`
- *"看看这个图片讲了什么：output/photo.png"* → `image_vision`

`image_gen` 参数：

| 参数 | 类型 | 说明 |
|---|---|---|
| `prompt` | string（必填） | 详细描述（主体、风格、构图、配色、约束） |
| `out` | string | 相对工作区的输出路径。默认 `output/imagegen/<时间戳>.png` |
| `size` | string | `1024x1024`、`1536x1024`、`1024x1536`、`2048x2048`、`2048x1152` 或 `auto`（默认） |
| `format` | string | `png`（默认）、`jpeg`、`webp` |
| `model` | string | ChatGPT 后端模型，默认 `gpt-5.5` |

`image_vision` 参数：

| 参数 | 类型 | 说明 |
|---|---|---|
| `image` | string（必填） | 图片路径（png/jpeg/webp/gif），相对工作区或绝对路径 |
| `question` | string | 可选焦点问题；默认输出完整描述 |
| `model` | string | 默认 `gpt-5.5` |

### 重启生效说明

!!! tip "bundle 安装后重启 profile，所有会话即可见工具"
    仓库以 bundle 形态发布，装进 profile 后工具注册在 host 注册表，**该 profile 的所有会话**都能用；安装后需重启该 profile（`dsh web` / `dsh --profile web`）。出处：README「安装」、README.zh-CN.md「安装」。

---

## 2. 弊端与缺陷

!!! warning "依赖非公开 API，OpenAI 可能随时变更或限制"
    `chatgpt.com/backend-api/codex/responses` 是官方 Codex CLI 使用的内部端点，**不是**文档化的公开 API——OpenAI 可能随时变更或限制；一旦变更，本插件可能失效。出处：README「Caveats」、README.zh-CN.md「注意事项」。

!!! warning "生图消耗 ChatGPT 套餐的 Codex-usage 计量配额"
    生图消耗 ChatGPT 套餐的 **Codex-usage** 计量配额；用户需关注配额消耗。出处：README「Caveats」、README.zh-CN.md「注意事项」。

!!! warning "按 OpenAI 服务条款，请勿搭建面向公众的图像生成服务"
    按 OpenAI 服务条款，请勿用 ChatGPT 订阅搭建面向公众的图像生成服务；商业用途受限。出处：README「Caveats」、README.zh-CN.md「注意事项」。

!!! warning "image_gen 不支持透明背景输出与已有图片编辑"
    `image_gen` 不支持透明背景输出（建议用 chroma-key 背景 + 本地抠图替代）；不支持编辑/变换已有图片（无输入图片支持）。出处：tools.js `genTool` description。

!!! warning "image_vision 调用前需验证文件存在，不要猜测内容"
    `image_vision` 的 `image` 必须是已存在的文件（png/jpeg/webp/gif），工作区相对或绝对路径——调用前需验证文件存在，不要猜测内容；模型自行 OCR 或读图片字节是被禁止的，必须用本工具。出处：tools.js `visionTool` description。

---

## 3. 后续拓展思路

### 可二次开发的方向

- **接入更多后端**：当前仅 ChatGPT 订阅；可扩展支持 OpenAI API（需 `OPENAI_API_KEY`）、Azure OpenAI、自建网关，降低对非公开 API 的依赖。
- **图片编辑能力**：当前 `image_gen` 不支持编辑已有图片；可加 `image_edit` 工具（基于参考图改图）。
- **批量生成与画廊**：当前单次生成；可加批量生成与结果画廊视图。

### 可对接的 DSH 能力

- **`ctx.tools.register`（`@deepseek-ai/dsh-tools`）**：已用此注册两个工具；可作为"bundle 形态多工具注册"样例。
- **`credentials` 服务**：已用 DSH 凭据服务解析 `OPENAI_CODEX_API_KEY` / `OPENAI_CODEX_REFRESH_TOKEN`；可作为"复用宿主凭据服务"样例。
- **`shell` 服务**：传输脚本经 `shell.resolve` / `shell.run` 执行；可作为"宿主自有传输层"样例。

### 与其它插件组合的可能性

- **dsh-imagecraft + dsh-vision**：`image_vision` 走 ChatGPT 订阅，`vision` 走阿里云百炼；可按配额/质量选择视觉后端。
- **dsh-imagecraft + modlens**：`image_vision` 走 ChatGPT 订阅纯文字描述，modlens 走多 provider 链结构化 JSON；可让前者做"快速描述"，后者做"结构化证据"。
- **dsh-imagecraft + dsh-xiapan-media**：`image_gen` 走 ChatGPT 订阅，`xiapan_image_generate` 走虾盘云 gpt-image-2；可按配额/可用性选择生图后端，且后者还提供视频生成。
