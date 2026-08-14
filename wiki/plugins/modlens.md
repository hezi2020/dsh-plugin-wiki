# modlens

> **插件名**：modlens（@liustack/modlens）
> **来源仓库**：<https://github.com/liustack/modlens>
> **许可证**：MIT（作者 Leon Liu）
> **commit SHA**：`85ea866`（前 7 位）

🥇 全网第一个支持 DeepSeek Harness（dsh）的视觉插件。为纯文本模型（DeepSeek / GLM）外挂视觉，直接粘贴图片即可识别，无需先保存成文件再提供路径。5 个内置视觉 provider + 4 家可复用 CLI + 1 条故障转移链，返回结构化 JSON（全文转录 / 阅读顺序版面区块 / 实体关系列表），模型引用的是具体内容而非想象。

---

## 1. 使用指南

### 前置依赖

- DeepSeek Harness（dsh）profile（本包是原生 dsh 插件，不走 skill 流程）
- Node.js `>= 22.19`
- 视觉引擎（任选其一即可）：
  - 免费 Gemini API key（推荐默认，5-10 秒/次；https://aistudio.google.com）
  - 任意 OpenAI 兼容端点（key + baseUrl + model，如 qwen-vl / GLM / SiliconFlow / 自建网关）
  - Anthropic API key
  - Antigravity CLI（`agy`，免 key，浏览器登录一次，15-45 秒/次）
  - 已登录的 Claude Code（`claude-cli`，20-45 秒/次）
- 可选：本机其它 agent CLI 的登录态（Codex / OpenCode / Pi / Grok），按家授权后可复用

### 安装命令

DeepSeek Harness 用户不走 skill 流程，本包就是原生 dsh 插件：

```sh
npx -y @deepseek-ai/dsh plugin --profile web add @liustack/modlens@latest
```

装完即有 `read_image` 工具，选「(modlens vision)」模型变体即可直接粘贴识图。引擎配置在 `~/.modlens`，详见 [宿主接入](https://github.com/liustack/modlens/blob/main/docs/harness-setup.zh-CN.md)。

如果 dsh 提示 `declares no dsh.bundle`，是 pnpm 发布冷静期装了旧版，见 [故障排查](https://github.com/liustack/modlens/blob/main/docs/troubleshooting.zh-CN.md) 的一行命令修复。

### 配置项

| 来源 | 字段 |
|---|---|
| `~/.modlens/config.json`（0600 权限，`modlens config init/set/show` 管理） | `provider`（偏好，链继续兜底）、`gemini-api.apiKey`、`openai.baseUrl`/`openai.apiKey`/`openai.model`、`anthropic.apiKey`、`reuse.codex`/`reuse.opencode`/`reuse.pi`/`reuse.grok`（复用授权）、`proxy`、各 provider 的 `extraBody` |
| 环境变量 | `GEMINI_API_KEY`、`OPENAI_API_KEY`、`OPENAI_BASE_URL`、`ANTHROPIC_API_KEY`、`HTTPS_PROXY` |
| CLI 旋钮 | `modlens config set provider <name>`（偏好）、`modlens -p <name>`（钉死单个不回退） |

- 配置优先级：CLI flags > 环境变量 > `~/.modlens/config.json` > 内置默认。

### 典型用法示例

**直接粘贴**：选「(modlens vision)」模型变体（选择器有记忆，选一次就行）→ 粘贴图片 → 缩略图可见、所见即所得 → `read_image` 工具接手读图。

**给出路径**：正常聊天，给出图片路径，提问即可，skill 自动触发，答案基于读到的内容返回。

**复用本机 Claude Code**：在登录了订阅的 Claude Code 里用，`claude-cli` 开箱即可借它读图（20-45 秒/次，花的是 Claude 订阅额度）。

`openai` 是万能接口（不只是 OpenAI）：

```bash
modlens config set openai.baseUrl https://dashscope.aliyuncs.com/compatible-mode/v1   # qwen-vl
modlens config set openai.apiKey  <key>
modlens config set openai.model   qwen3-vl-plus
```

### 重启生效说明

!!! tip "装完即有 read_image 工具，选 (modlens vision) 变体即可粘贴识图"
    安装后即有 `read_image` 工具；选「(modlens vision)」模型变体（选择器有记忆）即可直接粘贴识图。引擎配置变更通过 `modlens config set` 即时生效，无需重启 dsh。出处：README「安装」「用法」、README.zh-CN.md「安装」。

---

## 2. 弊端与缺陷

!!! warning "仓库不接受 PR，贡献方式仅限提 issue 或 fork"
    仓库不接受 PR（作者独立维护，所有代码经本人审阅，这是可靠性的前提）；贡献方式仅限提 issue 或 fork。出处：README「Contributing」、README.zh-CN.md「参与方式」。

!!! warning "Antigravity CLI 在无桌面会话中大多被锁，需改用 Gemini key"
    Antigravity CLI 的浏览器登录 token 存在 OS keyring，在无桌面会话（cron / systemd / 无桌面 SSH）中大多被锁；需改用 Gemini key 路径（纯 HTTP，无桌面也可用）。出处：INSTALL.md「Path 2: Antigravity CLI」。

!!! warning "openai 路由是弱 schema 门控，弱网关会回显原始 schema"
    `openai` 路由用模板实例化 prompt + 形状校验（弱网关会把原始 schema 回显），是弱门控；其它三个 API provider 有 schema 强制（`--json-schema` / `responseJsonSchema` / forced tool call）。出处：AGENTS.md「Technical Approach」。

!!! warning "粘贴恢复依赖各 harness 内部存储，视为 best-effort"
    粘贴恢复（`modlens recover-paste`）依赖各 harness 的内部存储布局，视为 best-effort：支持 Claude Code 与 Pi（JSONL transcripts）、OpenCode（SQLite），检测到 Codex 则交给其磁盘临时文件；harness 升级后存储布局变化可能失效。出处：AGENTS.md「Paste recovery across harnesses」。

!!! warning "上游引擎使用受各自条款与额度约束，由使用者负责"
    上游引擎（Antigravity CLI、Gemini / OpenAI / Anthropic API、任意 OpenAI 兼容端点）的使用受各自条款与额度约束，由使用者负责；复用其它 CLI 的额度会在 `meta.warnings` 标明花的是谁的配额。出处：README「Disclaimer」、README.zh-CN.md「免责声明」。

---

## 3. 后续拓展思路

### 可二次开发的方向

- **Fork 派生**：仓库不接受 PR，但 MIT 协议下 fork 完全归你；可派生出更适合自建网关 / 私有视觉模型的版本。
- **更多视觉 provider**：当前 5 内置 + 4 可复用 CLI；可加 Groq、Together、Replicate 等视觉 provider，扩展故障转移链。
- **结果后处理**：当前返回结构化 JSON；可加结果后处理（如自动生成图片 alt 文本、自动归档到 Notion/Obsidian）。

### 可对接的 DSH 能力

- **`read_image` 工具**：已注册原生 `read_image` 工具，dsh 自动发现每条纯文本 DeepSeek/GLM 路由并加包装变体；可作为"自动路由发现"样例。
- **skills**：本包同时以 skill 形态支持 Claude Code / Codex / Pi / OpenCode；dsh 端是原生插件，skill 端是 skill 文件夹，可作为"一套代码多宿主"样例。
- **self-modification**：`modlens doctor` 体检 + `modlens config set` 配置可作为 self-modification 的自检样例——Agent 自主体检并配置视觉引擎。

### 与其它插件组合的可能性

- **modlens + dsh-image-subagent**：前者提供 `read_image` 工具直接读图，后者把图片投影为占位符并委托子代理；二者可互补——前者适合"主模型直接调用工具"，后者适合"主模型委托子代理"。
- **modlens + dsh-vision**：前者多 provider 链 + 结构化 JSON，后者单 provider（阿里云百炼）+ 纯文字描述；可让前者做主力，后者作为"轻量备用"。
- **modlens + dsh-imagecraft `image_vision`**：前者走多 provider 链，后者走 ChatGPT 订阅；可按配额/质量选择视觉后端。
