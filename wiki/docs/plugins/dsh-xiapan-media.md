# dsh-xiapan-media

> **插件名**：dsh-xiapan-media（dsh-xiapan-vision / dsh-xiapan-image / dsh-xiapan-video）
> **来源仓库**：<https://github.com/dongsheng123132/dsh-xiapan-media>
> **许可证**：MIT（Copyright (c) 2026 U-King contributors）
> **commit SHA**：`ee2f51f`（前 7 位）

给 DeepSeek Harness 增加三项原生媒体能力：识图/OCR、作图/改图、视频生成。客户端插件 MIT 开源；模型推理、额度、风控和充值由虾盘云服务端提供。用户安装 U-King、登录并充值后，插件复用设备级凭据 `UKING_DSH_API_KEY`。

---

## 1. 使用指南

### 前置依赖

- DeepSeek Harness `>= 0.1.0-rc.6`
- Node.js `>= 22.19.0`
- 虾盘云（U-King）账号：安装 U-King、登录并充值后，插件复用设备级凭据 `UKING_DSH_API_KEY`；也可自行在 DSH 凭据仓库或环境变量中设置该引用
- 自动粘贴识图依赖文本路由 `uking-managed`（可改 `innerProvider` 为实际文本 provider ID）

### 安装命令

本地开发安装：

```powershell
dsh plugin --profile web add "link:D:/uking编程/dsh-xiapan-media"
```

GitHub 固定提交安装：

```powershell
dsh plugin --profile web add "github:dongsheng123132/dsh-xiapan-media#COMMIT_SHA"
```

> 发布后请把 `COMMIT_SHA` 换成 README/Release 中经过 CI 的完整提交。
> 插件包通过 `cordis.patch.yml` 一次安装三个独立插件行，任何一项都可以单独从 profile 中删除。

### 配置项

| 来源 | 字段 |
|---|---|
| `cordis.patch.yml` 的 `config`（dsh-xiapan-vision） | `providerId`（默认 `xiapan-vision`）、`innerProvider`（默认 `uking-managed`）、`baseURL`（默认 `https://api.u-claw.org.cn/v1`）、`credentialRef`（默认 `UKING_DSH_API_KEY`）、`model`（默认 `qwen3.7-flash`）、`workspaceRoot`（默认 `.`） |
| `cordis.patch.yml` 的 `config`（dsh-xiapan-image） | `baseURL`、`credentialRef`、`model`（默认 `gpt-image-2`）、`workspaceRoot`、`artifactDir`（默认 `.dsh-media`）、`requireApproval`（默认 `true`） |
| `cordis.patch.yml` 的 `config`（dsh-xiapan-video） | `baseURL`、`credentialRef`、`model`（默认 `doubao-seedance-2-0-mini-260615`）、`workspaceRoot`、`artifactDir`、`requireApproval`（默认 `true`） |
| 凭据 | `UKING_DSH_API_KEY`（DSH credentials 服务 → 同名环境变量 → `XIAPAN_API_KEY` → `~/.uking/device.json`） |

- 凭据每次调用时动态解析，不缓存、不打印。
- Authorization 只允许发送到 `api.u-claw.org.cn`（兼容旧域名 `api.u-claw.org` 并自动改为 `.org.cn`）。

### 典型用法示例

**识图/OCR**：安装后在 DSH 模型选择器里选择 **U-King DeepSeek + 虾盘云识图**（路由 ID `xiapan-vision`）。`xiapan-vision` 路由让仍由 DeepSeek 负责思考的会话可以直接粘贴图片；图片先由虾盘云 `qwen3.7-flash` 转译为文本，再交回原文本模型。另提供 `xiapan_vision_analyze`、`xiapan_vision_ocr`、`xiapan_vision_locate` 三个文件工具。

**作图/改图**：`xiapan_image_generate` 调用 `gpt-image-2`，支持 1–4 张、尺寸/质量与参考图，产物保存到工作区 `.dsh-media/images/`。

**视频生成**：`xiapan_video_generate` 调用 Seedance，支持文生视频、图生视频、5–15 秒、480p/720p/1080p，产物保存到 `.dsh-media/videos/`。

### 重启生效说明

!!! tip "作图/视频默认需审批，避免静默扣费"
    作图和视频工具默认注册 DSH `tools/pre-execute` 审批闸门。交互式 DSH 会先显示模型、数量/时长和粗略价格；无审批服务的 headless 环境会拒绝，不会静默扣费。只有管理员明确把 `requireApproval` 设为 `false` 时才允许无人值守付费调用。出处：README「付费保护」。

---

## 2. 弊端与缺陷

!!! warning "非共享密钥插件，需登录充值虾盘云"
    不是把 API Key 写死在开源代码中的"共享密钥插件"。客户端插件 MIT 开源；模型推理、额度、风控和充值由虾盘云服务端提供。用户需安装 U-King、登录并充值后复用设备级凭据；未找到凭据时会提示登录/充值，不会尝试匿名调用。出处：README 顶部、「凭据顺序」。

!!! warning "作图/视频默认需审批，headless 会拒绝"
    作图和视频工具默认注册 DSH `tools/pre-execute` 审批闸门；无审批服务的 headless 环境会拒绝，不会静默扣费。只有管理员明确把 `requireApproval` 设为 `false` 时才允许无人值守付费调用——这既是保护也是限制。出处：README「付费保护」。

!!! warning "DSH v1 attachment 服务只原生保存图片，视频以文件路径返回"
    DSH v1 attachment 服务目前只原生保存图片，因此视频作为真实 `.mp4/.webm` 文件路径返回（不是 attachment），下游消费需自行处理文件路径。出处：README「安全边界」。

!!! warning "工作区安全边界严格，输入图最大 10 MiB / 产物最大 200 MiB"
    输入文件必须位于配置的工作区根目录内；拒绝 `..` 越界和指向工作区外的符号链接。单张输入图最大 10 MiB，下载产物最大 200 MiB。产物使用临时文件 + 原子改名写入，不覆盖已有文件。出处：README「安全边界」。

!!! warning "Seedance 价格以虾盘云实时计费为准，插件文案不是报价承诺"
    Seedance 当前粗略基价（mini 约 ¥2.9/5秒/480p、fast 约 ¥4.9、full 约 ¥6.9；720p 约 1.5 倍、1080p 约 2.5 倍）以虾盘云实时计费为准，插件文案不是报价承诺。出处：README「付费保护」。

---

## 3. 后续拓展思路

### 可二次开发的方向

- **BYOK / baseURL 高级配置**：README 明确"后续可增加 BYOK/baseURL 高级配置，但不能在客户端内置平台总密钥"；可让用户自带视觉/生图/视频模型凭据，绕过虾盘云托管。
- **更多文件工具**：当前 `xiapan_vision_analyze` / `xiapan_vision_ocr` / `xiapan_vision_locate` 三个文件工具；可加 `xiapan_vision_compare`（对比）、`xiapan_vision_classify`（分类）等。
- **视频编辑能力**：当前仅生成；可加视频剪辑（裁剪、拼接、字幕）。

### 可对接的 DSH 能力

- **`tools/pre-execute` 审批闸门**：已用此注册作图/视频审批；可作为"付费保护"样例。
- **`credentials` 服务**：已用 DSH 凭据服务解析 `UKING_DSH_API_KEY`；可作为"设备级凭据复用"样例。
- **`cordis.patch.yml` 多行 bundle**：一次安装三个独立插件行，任何一项可单独删除；可作为"一包多插件"样例。

### 与其它插件组合的可能性

- **dsh-xiapan-media + dsh-imagecraft**：`xiapan_image_generate` 走虾盘云 gpt-image-2，`image_gen` 走 ChatGPT 订阅；可按配额/可用性选择生图后端，且前者还提供视频生成。
- **dsh-xiapan-media + dsh-vision**：`xiapan-vision` 路由走虾盘云 qwen3.7-flash，`vision` 工具走阿里云百炼；可按用户已有的视觉模型 API 选择。
- **dsh-xiapan-media + modlens**：前者三件套（识图/作图/视频）走虾盘云，后者多 provider 链走多端点；可让前者做"一站式付费"，后者做"自配多 provider"。
