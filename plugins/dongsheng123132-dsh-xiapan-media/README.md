# dsh-xiapan-media

[![CI](https://github.com/dongsheng123132/dsh-xiapan-media/actions/workflows/ci.yml/badge.svg)](https://github.com/dongsheng123132/dsh-xiapan-media/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![DeepSeek Harness](https://img.shields.io/badge/DeepSeek-Harness-4f46e5)](https://github.com/deepseek-ai/deepseek-harness)

给 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) 增加三项原生媒体能力：

1. **识图/OCR**：`xiapan-vision` 路由让仍由 DeepSeek 负责思考的会话可以直接粘贴图片；图片先由虾盘云 `qwen3.7-flash` 转译为文本，再交回原文本模型。另提供 `xiapan_vision_analyze`、`xiapan_vision_ocr`、`xiapan_vision_locate` 三个文件工具。
2. **作图/改图**：`xiapan_image_generate` 调用 `gpt-image-2`，支持 1–4 张、尺寸/质量与参考图，产物保存到工作区 `.dsh-media/images/`。
3. **视频生成**：`xiapan_video_generate` 调用 Seedance，支持文生视频、图生视频、5–15 秒、480p/720p/1080p，产物保存到 `.dsh-media/videos/`。

这不是把 API Key 写死在开源代码中的“共享密钥插件”。客户端插件使用 MIT 开源；模型推理、额度、风控和充值由虾盘云服务端提供。用户安装 U-King、登录并充值后，插件复用设备级凭据 `UKING_DSH_API_KEY`。也可自行在 DSH 凭据仓库或环境变量中设置该引用。

## 安装

本地开发安装：

```powershell
dsh plugin --profile web add "link:D:/uking编程/dsh-xiapan-media"
```

GitHub 固定提交安装：

```powershell
dsh plugin --profile web add "github:dongsheng123132/dsh-xiapan-media#COMMIT_SHA"
```

发布后请把 `COMMIT_SHA` 换成 README/Release 中经过 CI 的完整提交。插件包通过 `cordis.patch.yml` 一次安装三个独立插件行，任何一项都可以单独从 profile 中删除。

自动粘贴识图依赖文本路由 `uking-managed`。安装完成后在 DSH 模型选择器里选择 **U-King DeepSeek + 虾盘云识图**（路由 ID `xiapan-vision`）。如果用户只安装了原生 DeepSeek 路由，可把视觉插件的 `innerProvider` 改成实际文本 provider ID。

## 凭据顺序

每次调用时动态解析，不缓存、不打印：

1. DSH credentials 服务中的 `UKING_DSH_API_KEY`；
2. 同名环境变量；
3. `XIAPAN_API_KEY`；
4. `~/.uking/device.json` 中的设备凭据。

未找到凭据时会提示登录/充值，不会尝试匿名调用。Authorization 只允许发送到 `api.u-claw.org.cn`（兼容旧域名 `api.u-claw.org` 并自动改为 `.org.cn`）。

## 付费保护

作图和视频工具默认注册 DSH `tools/pre-execute` 审批闸门。交互式 DSH 会先显示模型、数量/时长和粗略价格；无审批服务的 headless 环境会拒绝，不会静默扣费。只有管理员明确把 `requireApproval` 设为 `false` 时才允许无人值守付费调用。

Seedance 当前粗略基价（以虾盘云实时计费为准）：

- mini：约 ¥2.9 / 5 秒 / 480p
- fast（`doubao-seedance-2-0-fast-260128`）：约 ¥4.9 / 5 秒 / 480p
- full（`doubao-seedance-2-0-260128`）：约 ¥6.9 / 5 秒 / 480p
- 720p 通常约 1.5 倍，1080p 约 2.5 倍；最终价格应由服务端账单页展示，插件文案不是报价承诺。

## 安全边界

- 输入文件必须位于配置的工作区根目录内；拒绝 `..` 越界和指向工作区外的符号链接。
- 单张输入图最大 10 MiB，下载产物最大 200 MiB。
- 产物使用临时文件 + 原子改名写入，不覆盖已有文件。
- 只接受 HTTPS 虾盘云 API 和 HTTPS 产物 URL；错误信息会遮蔽常见密钥格式。
- DSH v1 attachment 服务目前只原生保存图片，因此视频作为真实 `.mp4/.webm` 文件路径返回。

## 开发验证

```powershell
npm install
npm test
npm run check
```

测试只使用模拟 HTTP，不消耗虾盘云额度。真实作图/视频会产生费用，不应放进公共 CI。

## 商业与开源边界

推荐保持这个薄客户端 MIT 开源，同时保留虾盘云服务端闭源：

- 开源部分负责 DSH 适配、工作区安全、审批与可审计行为；
- 商业部分负责统一模型供应、U-King 充值、余额、限流、退款与风控；
- 后续可增加 BYOK/baseURL 高级配置，但不能在客户端内置平台总密钥。

SkillHub/ClawHub 更像发现与分发渠道，不应假设它们替插件作者完成分账。常见可持续模式正是“免费 skill/plugin + 用户 API Key 或托管 credits”。
