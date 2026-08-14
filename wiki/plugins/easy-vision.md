# easy-vision

> **插件名**：easy-vision
> **来源仓库**：<https://github.com/Koreyer/easy-vision>
> **许可证**：MIT（Copyright (c) 2026）
> **commit SHA**：`966273c`（前 7 位）

一个 DeepSeek Harness 工具插件，让仅支持文本的智能体能"看懂"本地图片。它注册一个面向模型的 `describe_image` 工具：读取文件并通过魔数（magic bytes）自动识别真实格式（PNG / JPEG / GIF / WebP），即使扩展名错误也能正确识别；将图片（base64 data URI）通过 chat completions 发送给 OpenAI 兼容视觉模型，返回详细文字描述，或可选写入 Markdown 文件。

---

## 1. 使用指南

### 前置依赖

- DeepSeek Harness（dsh）profile
- Node.js `>= 22`
- `@deepseek-ai/cordis` `>=4.0.0`（peer，运行期由 DSH 提供，无需额外安装）
- OpenAI 兼容视觉模型端点（需接受 base64 `image_url` data URI）

### 安装命令

从 npm 安装（发布到 npm 后推荐）：

```powershell
dsh plugin --profile web add easy-vision
```

等同于在 profile 目录下直接跑 pnpm：

```powershell
cd "$env:DSH_HOME\profiles\web"
pnpm add easy-vision
```

从本地 tarball 安装（尚未发布 / 不发布时）：

```powershell
cd "$env:DSH_HOME\profiles\web"
pnpm add "D:\path\to\easy-vision-0.1.0.tgz"
```

### 配置项

| 来源 | 字段 |
|---|---|
| patch 层 `cordis.patch.yml` 的 `config` | `baseUrl`（源码默认 `https://lanyiapi.com/v1`）、`model`（源码默认 `gpt-5.5`）、`apiKeyEnv`（源码默认 `LANYI_API_KEY`）、`timeoutMs`（默认 `120000`） |
| API Key | 按 `apiKeyEnv` 解析：先查环境变量，再回退到 `$DSH_HOME/.credentials.yaml` 同名 key |

> 注：README 配置表中 `model` 默认值标注为 `agnes-2.5-flash`、`apiKeyEnv` 默认值标注为 `AGNES_API_KEY`，与源码 `src/index.js` 实际默认值（`gpt-5.5`、`LANYI_API_KEY`）不一致；以源码为准。

patch 层挂载示例：

```yaml
- insert:
    - id: easy-vision
      name: easy-vision
      config:
        baseUrl: https://example.com/v1
        model: your-vision-model
        apiKeyEnv: EASY_VISION_API_KEY
        timeoutMs: 120000
```

### 典型用法示例

`describe_image` 工具参数：

- `path`（必填）— 图片的本地绝对路径（PNG/JPEG/GIF/WebP，真实格式由魔数自动识别，即使扩展名错误也能识别）。
- `prompt`（可选）— 指定要提取的重点（例如提取 UI 布局/配色、描述人物、OCR 文字）。
- `outFile`（可选）— 用于写入描述的 `.md` 文件绝对路径；必要时会自动创建父目录。

工具描述会告诉模型：当用户要求查看 / 浏览 / 描述 / 分析 / 识读一张图片时自动调用它，并能识别自然语言意图（例如「描述一下 / 看一下 / 分析这张图」）——用户**无需**指定工具名。

### 重启生效说明

!!! tip "patch 层热重载，新会话即可用工具"
    保存 `cordis.patch.yml` 即可——DSH 会热重载 `cordis.patch.yml` 的改动，新会话即可把 `describe_image` 工具暴露给模型。如果 profile 在这几步之前就已经启动，请重启该 profile（或打开新会话），以便工具 schema 能被模型使用。出处：README.zh.md「安装」「配置」。

---

## 2. 弊端与缺陷

!!! warning "README 配置表与源码默认值不一致"
    README 配置表中 `model` 默认值标注为 `agnes-2.5-flash`、`apiKeyEnv` 默认值标注为 `AGNES_API_KEY`，与源码 `src/index.js` 实际默认值（`gpt-5.5`、`LANYI_API_KEY`）不一致；用户若依赖 README 默认值会配错模型与 key 名。出处：README.zh.md「配置」、src/index.js `DEFAULT_MODEL` / `resolveApiKey`。

!!! warning "需要 OpenAI 兼容且接受 base64 image_url data URI 的端点"
    需要一个 OpenAI 兼容且接受 base64 `image_url` data URI 的端点；不满足的端点会失败。出处：README.zh.md「已知限制」。

!!! warning "API key 未接入 DSH 自身的 provider 路由"
    API key 从环境变量或 `$DSH_HOME/.credentials.yaml` 读取；并未接入 DSH 自身的 provider 路由，无法复用 DSH 已配置的视觉模型凭据。出处：README.zh.md「已知限制」、src/index.js `resolveApiKey`。

!!! warning "视觉结果是纯文字，精细空间精确度受限"
    视觉结果是纯文字——描述并非真实图片，因此精细的空间精确度受限于视觉模型本身所报告的内容。出处：README.zh.md「已知限制」。

!!! warning "Config 为 null，配置项校验在 apply 内手动完成"
    `Config = null`（schemastery-free：plain validation in apply），配置项校验在 `apply` 内手动完成；缺少 schema 层的默认值/类型校验，配置错误只能在运行时暴露。出处：src/index.js `Config` 注释。

---

## 3. 后续拓展思路

### 可二次开发的方向

- **统一 README 与源码默认值**：修正 README 配置表的 `model` / `apiKeyEnv` 默认值，与源码一致；或反向修正源码默认值与 README 一致。
- **接入 DSH provider 路由**：当前 API key 独立解析，可接入 DSH 自身的 provider 路由，复用已配置的视觉模型凭据。
- **支持网络图片 URL**：当前仅本地路径；可扩展支持 http(s) URL，对标 dsh-vision。

### 可对接的 DSH 能力

- **`ctx.tools.register`**：已用此注册 `describe_image` 工具；可作为"零依赖纯 ESM Cordis 插件"样例（无 npm 运行时依赖）。
- **`cordis.patch.yml` 热重载**：已利用 DSH 热重载特性；可作为"patch 层挂载"样例。
- **self-modification**：`outFile` 写 Markdown 的能力可作为 self-modification 产物样例——Agent 自主生成图片描述文档。

### 与其它插件组合的可能性

- **easy-vision + dsh-vision**：前者注册 `describe_image`（OpenAI 兼容），后者注册 `vision`（阿里云百炼）；二者可互补，按用户已有的视觉模型 API 选择。
- **easy-vision + modlens**：前者单一 OpenAI 兼容端点，后者多 provider 链 + 结构化 JSON；可让前者作为"轻量单端点"备选。
- **easy-vision + dsh-image-subagent**：前者主模型直接调用工具读图，后者主模型委托视觉子代理；可按主模型是否支持工具调用选择方案。
