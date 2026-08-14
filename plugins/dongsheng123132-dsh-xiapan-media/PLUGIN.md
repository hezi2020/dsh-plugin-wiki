# PLUGIN 元数据 — dsh-xiapan-media

## 插件名称
dsh-xiapan-media（dsh-xiapan-vision / dsh-xiapan-image / dsh-xiapan-video）

## 来源仓库 URL
https://github.com/dongsheng123132/dsh-xiapan-media

## 克隆时的 commit SHA
ee2f51f（前 7 位）

## 功能描述（一句话）
给 DeepSeek Harness 增加三项原生媒体能力：识图/OCR（虾盘云 qwen3.7-flash 转译为文本交回原文本模型 + 三个文件工具）、作图/改图（gpt-image-2，1–4 张 + 参考图）、视频生成（Seedance，文生/图生 5–15 秒 480p/720p/1080p），客户端 MIT 开源、服务端虾盘云托管。

## 前置依赖
- DeepSeek Harness `>= 0.1.0-rc.6`（package.json engines.dsh）
- Node.js `>= 22.19.0`
- `schemastery` ^3.18.0（运行时依赖）
- `@deepseek-ai/cordis` 4.0.1、`@deepseek-ai/dsh-credentials` 0.0.1-rc.1、`@deepseek-ai/dsh-tools` 0.0.1-rc.1（devDependencies，bundle 安装时从 harness 解析）
- 虾盘云（U-King）账号：安装 U-King、登录并充值后，插件复用设备级凭据 `UKING_DSH_API_KEY`；也可在 DSH 凭据仓库或环境变量中设置该引用
- 自动粘贴识图依赖文本路由 `uking-managed`（cordis.patch.yml 默认 `innerProvider: uking-managed`，可改）

## 安装命令
```powershell
# 本地开发安装
dsh plugin --profile web add "link:D:/uking编程/dsh-xiapan-media"

# GitHub 固定提交安装
dsh plugin --profile web add "github:dongsheng123132/dsh-xiapan-media#COMMIT_SHA"
```
> 发布后请把 `COMMIT_SHA` 换成 README/Release 中经过 CI 的完整提交。
> 插件包通过 `cordis.patch.yml` 一次安装三个独立插件行，任何一项都可以单独从 profile 中删除。

## 配置项
| 来源 | 字段 |
|---|---|
| `cordis.patch.yml` 的 `config`（dsh-xiapan-vision） | `providerId`（默认 `xiapan-vision`）、`innerProvider`（默认 `uking-managed`，可改为实际文本 provider ID）、`baseURL`（默认 `https://api.u-claw.org.cn/v1`）、`credentialRef`（默认 `UKING_DSH_API_KEY`）、`model`（默认 `qwen3.7-flash`）、`workspaceRoot`（默认 `.`） |
| `cordis.patch.yml` 的 `config`（dsh-xiapan-image） | `baseURL`、`credentialRef`、`model`（默认 `gpt-image-2`）、`workspaceRoot`、`artifactDir`（默认 `.dsh-media`）、`requireApproval`（默认 `true`） |
| `cordis.patch.yml` 的 `config`（dsh-xiapan-video） | `baseURL`、`credentialRef`、`model`（默认 `doubao-seedance-2-0-mini-260615`）、`workspaceRoot`、`artifactDir`、`requireApproval`（默认 `true`） |
| 凭据 | `UKING_DSH_API_KEY`（DSH credentials 服务 → 同名环境变量 → `XIAPAN_API_KEY` → `~/.uking/device.json`） |

- 凭据每次调用时动态解析，不缓存、不打印。
- Authorization 只允许发送到 `api.u-claw.org.cn`（兼容旧域名 `api.u-claw.org` 并自动改为 `.org.cn`）。

## 已知限制
- 不是"共享密钥插件"：客户端插件 MIT 开源；模型推理、额度、风控和充值由虾盘云服务端提供。用户需安装 U-King、登录并充值后复用设备级凭据；未找到凭据时会提示登录/充值，不会尝试匿名调用。
- 作图和视频工具默认注册 DSH `tools/pre-execute` 审批闸门；headless 环境会拒绝，不会静默扣费。只有管理员明确把 `requireApproval` 设为 `false` 时才允许无人值守付费调用。
- DSH v1 attachment 服务目前只原生保存图片，因此视频作为真实 `.mp4/.webm` 文件路径返回。
- 输入文件必须位于配置的工作区根目录内；拒绝 `..` 越界和指向工作区外的符号链接。
- 单张输入图最大 10 MiB，下载产物最大 200 MiB。
- 产物使用临时文件 + 原子改名写入，不覆盖已有文件。
- 只接受 HTTPS 虾盘云 API 和 HTTPS 产物 URL；错误信息会遮蔽常见密钥格式。
- Seedance 价格以虾盘云实时计费为准（mini 约 ¥2.9/5秒/480p、fast 约 ¥4.9、full 约 ¥6.9；720p 约 1.5 倍、1080p 约 2.5 倍），插件文案不是报价承诺。

## 本地运行状态
未实测安装（本任务仅克隆源码，未实际通过 dsh plugin 加载，亦未运行 npm test / npm run check）

## 许可证
MIT（Copyright (c) 2026 U-King contributors）
