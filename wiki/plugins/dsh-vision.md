# dsh-vision

> **插件名**：dsh-vision
> **来源仓库**：<https://github.com/sjakdhasdh/dsh-vision>
> **许可证**：MIT（Copyright (c) 2026 dsh-vision contributors）
> **commit SHA**：`285f9ae`（前 7 位）

> 注意：本插件与 Wiki 已收录的 `dsh-vision-toolkit` 不是同一仓库。

给 DeepSeek Harness 里**没有原生识图能力的模型**（如 deepseek-v4-flash）加上识图工具。把本地图片或网络图片 URL 交给视觉大模型（默认阿里云百炼 `qwen3.7-flash`），返回中文文字描述。

---

## 1. 使用指南

### 前置依赖

- DeepSeek Harness（dsh）Web profile
- Node.js（构建用 TypeScript；运行时只用 Node 内置 `fetch`，零额外运行时依赖）
- `@deepseek-ai/cordis` ^4.0.1（peer，运行期由 DSH 提供）
- `@deepseek-ai/dsh-tools` 0.1.0-rc.6（依赖，注入 `tools` 服务）
- 视觉模型 API Key（默认阿里云百炼 DashScope，获取：https://bailian.console.aliyun.com/）
- 可选：对 `dsh-llm-deepseek` 打补丁以让用户直接粘贴图片（见下文「配合图片上传」）

### 安装命令

```sh
pnpm install && pnpm run build
# 在插件父目录执行：
dsh plugin --profile web add ./dsh-vision
# 重启 dsh，然后新建会话即可使用 vision 工具
```

### 配置项

| 来源 | 字段 |
|---|---|
| 环境变量 | `DASHSCOPE_API_KEY`、`VISION_MODEL`（默认 `qwen3.7-flash-2026-07-15`）、`DASHSCOPE_BASE_URL`（默认 `https://dashscope.aliyuncs.com/compatible-mode/v1`） |
| profile 补丁层 `~/.dsh/profiles/<name>/cordis.patch.yml` | `config.apiKey`、`config.model`、`config.baseURL`、`config.maxTokens`（默认 1024） |

- 配置优先级：插件 config > 环境变量 > 默认值。

### 典型用法示例

模型会自动调用 `vision` 工具，参数：

| 参数 | 必填 | 说明 |
|---|---|---|
| `image` | ✅ | 本地图片绝对路径（如 `C:\a.png`）或 http(s) URL |
| `prompt` | ❌ | 识别要求，默认"请详细描述这张图片的内容" |

profile 补丁层配置示例：

```yaml
- id: dsh-vision
  config:
    apiKey: sk-xxx
    model: qwen3.7-flash-2026-07-15
    baseURL: https://dashscope.aliyuncs.com/compatible-mode/v1
```

### 重启生效说明

!!! tip "新建会话即可使用 vision 工具"
    安装后重启 dsh，新建会话即可在模型工具集中看到 `vision` 工具；环境变量与 config 变更需重启 dsh。出处：README「安装」「配置」。

---

## 2. 弊端与缺陷

!!! warning "不解决用户直接粘贴图片的准入问题，需打核心补丁"
    DeepSeek Harness 默认的 DeepSeek adapter 声明模型纯文本，上传图片会被 `MODEL_DOES_NOT_SUPPORT_IMAGES` 拦截。要让用户直接粘贴图片（图片块渲染为 `[图片附件: sha256:...]` 标记），需要对 `dsh-llm-deepseek` 打一个小补丁（改 `modelInfo()` / `resolveModel()` 的 `inputModalities`、`assertTextOnly()` 改为 no-op、`flattenText()` 渲染图片块为占位文本）。出处：README「提示：配合图片上传」、PATCHES.md。

!!! warning "每次 npm install 后需重新应用核心补丁"
    核心补丁打在 `node_modules/@deepseek-ai/dsh-llm-deepseek/lib/index.js` 上，每次 `npm install`（node_modules 被覆盖）后需重新应用本补丁；否则用户粘贴图片又会被拦截。出处：PATCHES.md 末尾提示。

!!! warning "默认视觉模型为阿里云百炼，需自行申请 Key"
    默认视觉模型为阿里云百炼 `qwen3.7-flash-2026-07-15`，需要自行申请 DashScope API Key；未配置 Key 时工具调用会抛错并提示获取地址（https://bailian.console.aliyun.com/）。出处：src/index.ts `execute` 内 `apiKey` 检查、README「配置」。

!!! warning "视觉结果是纯文字描述，精细空间精确度受限"
    视觉结果是纯文字描述，非真实图片；精细的空间精确度受限于视觉模型本身所报告的内容。出处：README「特性」、src/index.ts `output` schema。

!!! warning "请求超时 60 秒，HTTP 错误抛出前 300 字"
    请求超时 60 秒（`AbortSignal.timeout(60_000)`）；视觉模型 HTTP 错误会抛出状态码与响应前 300 字，长响应可能被截断。出处：src/index.ts `execute` 内 `fetch` 与错误处理。

---

## 3. 后续拓展思路

### 可二次开发的方向

- **改用官方 bundle 形态发布**：当前需 `pnpm build` + `dsh plugin add ./dsh-vision`，可改为 `dsh.bundle.patch` 形态，用 `dsh plugin --profile web add dsh-vision` 一键安装，降低门槛。
- **多视觉模型路由**：当前单一 baseURL + model；可扩展为按图片类型/大小路由到不同视觉模型（如截图走快模型、密集图表走强模型）。
- **结果缓存**：相同图片 + 相同 prompt 的结果可按 sha256 缓存，避免重复调用视觉模型。

### 可对接的 DSH 能力

- **`defineTool`（`@deepseek-ai/dsh-tools`）**：已用此注册 `vision` 工具；可作为"工具插件模板"样例（package.json description 即写 "a DeepSeek Harness plugin (tool template)"）。
- **`ctx.tools.register`**：工具注册返回 disposer，卸载即清理；可作为"可卸载工具"样例。
- **self-modification**：`vision` 工具可作为 self-modification 的感知样例——Agent 自主判断"当前模型无原生视觉"并调用本工具。

### 与其它插件组合的可能性

- **dsh-vision + dsh-image-subagent**：前者提供 `vision` 工具直接读图，后者把图片投影为占位符并委托视觉子代理；二者可互补——前者适合"主模型直接调用工具"，后者适合"主模型委托子代理"。
- **dsh-vision + dsh-imagecraft `image_vision`**：前者走阿里云百炼，后者走 ChatGPT 订阅；可让用户按配额/质量选择视觉后端。
- **dsh-vision + dsh-gui-customization**：前者纯工具，后者纯外观；可组合为"视觉能力 + 主题美化"的全套方案。
