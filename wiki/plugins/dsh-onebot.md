# dsh-onebot

> **插件名**：dsh-onebot（DSH 的 QQ 通道）
> **来源仓库**：<https://github.com/mario841859784/dsh-onebot>
> **许可证**：BSD-3-Clause（Copyright (c) 2026, dsh-external contributors）
> **commit SHA**：`af9eb82`（前 7 位 `af9eb82`）

把 dsh 变成 QQ 机器人（OneBot 11 协议，兼容 NapCat / Lagrange / LLOneBot / go-cqhttp），与 dsh-vision 同款的外部插件形态：零 Python、纯 TS、原生 Cordis 插件，挂载进 dsh 宿主进程，不改任何核心代码。提供反向/正向 WebSocket 双模、入站图片/语音转写、出站长消息按句号分段并 >150 字渲染文字图卡片、`[[qq_forward]]` 合并转发、管理员白名单与群聊 @ 触发。

---

## 1. 使用指南

### 前置依赖

- dsh `>= 0.1.0-rc.6`（在 PATH 上；`@deepseek-ai/*` 全部以 peer 依赖 0.1.0-rc.6 形式经 `scripts/link-host.sh` 符号链接到宿主）
- Node.js `>= 22`
- OneBot 11 实现：NapCat / Lagrange / LLOneBot / go-cqhttp（reverse 或 forward WebSocket）
- 可选：ffmpeg + whisper CLI（语音转写；可 `sttEnabled: false` 关闭）
- 可选：Linux 部署需安装 Noto CJK 字体（t2i 文字图中文显示）

### 安装命令

仓库未提供 `dsh plugin add` 形式的命令，需手动 `git clone` + `npm install --include=dev` + `./scripts/build.sh` 编译：

```sh
git clone https://github.com/mario841859784/dsh-onebot.git ~/dsh-plugins/dsh-onebot
cd ~/dsh-plugins/dsh-onebot
npm install --include=dev
./scripts/build.sh          # 链接宿主 @deepseek-ai 包 + tsc 编译 src/ → lib/
```

挂载到 `~/.dsh/profiles/<profile>/cordis.patch.yml`（profile 层 patch，`$HOME` 字面量不被 loader 插值，必须用绝对路径）：

```yaml
- insert:
    - id: dsh-onebot
      name: '/绝对路径/dsh-plugins/dsh-onebot/lib/index.js'
      config:
        mode: reverse        # reverse = NapCat 拨入；forward = 插件拨出
        port: 8643
        # accessToken: ''    # 与 NapCat 配置一致
        # botQQ: ''          # 留空自动从 meta 事件学习
```

**NapCat 侧（必须配置，两种模式二选一）**：

- **reverse 模式（NapCat 拨入 dsh，推荐）**：NapCat 网络设置里新增「WebSocket 客户端」，上报地址填 `ws://<dsh 所在机器 IP>:<port>/ws`，token 与插件 `accessToken` 相同；dsh 与 NapCat 不同机时不能用 `127.0.0.1`。
- **forward 模式（dsh 拨出到 NapCat）**：NapCat 启用「WebSocket 服务端」（默认 `0.0.0.0:3001`），插件 `url` 配置为 `ws://<NapCat 所在机器 IP>:3001`，token 两边一致。

两侧 token 必须一致；消息上报格式建议选「数组」（插件段数组优先解析，CQ 字符串仅回退）。配置完成后重启 dsh，日志出现 `[dsh-onebot] mounted` 且 NapCat 显示连接成功即就绪。

### 配置项

| 来源 | 字段 |
|---|---|
| `cordis.patch.yml` config | `mode`、`host`、`port`、`url`、`accessToken`、`botQQ`、`requireMention`、`dmPolicy`、`groupPolicy`、`adminUsers`、`allowFrom`、`groupAllowFrom`、`interimMessages`、`splitLength`、`sttEnabled`、`sttModel`、`textImageThreshold`、`cardFooter`、`fontFiles`、`fontFamilies`、`mediaDir`、`agentPreset`、`workspacePath` 等（完整 schema 见 `src/index.ts` 的 `Config`，schemastery 校验，均有默认值） |
| 环境变量 | `ONEBOT_ALLOWED_USERS`（逗号分隔管理员）、`ONEBOT_ALLOW_ALL_USERS=true`（开发用）、`DSH_HOME`（决定默认 `mediaDir`） |

常用默认值（节选自 README「配置」表）：

| 键 | 默认 | 说明 |
|---|---|---|
| `mode` | `reverse` | `reverse`/`forward` |
| `host` / `port` | `0.0.0.0` / `8643` | reverse 监听 |
| `url` | `ws://127.0.0.1:3001` | forward 目标 |
| `accessToken` | 空 | OneBot token |
| `botQQ` | 空 | 机器人 QQ（空=自动学习） |
| `requireMention` | `true` | 群聊需 @ 或回复才响应 |
| `dmPolicy` | `open` | `open`(仅管理员)/`allowlist`/`disabled` |
| `groupPolicy` | `open` | `open`/`allowlist`/`disabled` |
| `adminUsers` | `[]` | 管理员 QQ；也可用 `ONEBOT_ALLOWED_USERS` 环境变量 |
| `allowFrom` / `groupAllowFrom` | `[]` | 白名单用户/群 |
| `interimMessages` | `true` | 工具调用之间的中间文本是否立即发送；`false` 只发最终回复 |
| `splitLength` | `100` | 长回复分段长度 |
| `sttEnabled` | `true` | 语音转写（需 ffmpeg + whisper CLI） |
| `sttModel` | `small` | whisper 模型 |
| `textImageThreshold` | `150` | 回复正文超过该长度渲染为文字图卡片；`<=0` 禁用卡片路径 |
| `cardFooter` | `dsh` | 卡片页脚品牌（"Powered by <brand>"） |
| `fontFiles` / `fontFamilies` | `[]` | t2i 字体文件/家族覆盖（Linux 部署必看：需安装 Noto CJK） |
| `mediaDir` | `<dsh-home>/media/onebot` | 入站媒体/映射文件目录 |
| `agentPreset` | 空 | 会话挂载的 agent preset（留空=默认） |
| `workspacePath` | 空 | 会话挂载的工作区（留空=宿主 cwd） |

### 典型用法示例

**斜杠命令（仅管理员）**：

- `/new`：开新会话
- `/model`：查看/切换模型（`/model <provider> <model>`）
- `/workspace`：查看/切换工作区（`/workspace <目录>`）
- `/stop`：停止生成并清残留
- `/help`：帮助

**模型工具（由 dsh Agent 调用）**：

- `qq_send_image`（≤9 张，路径或 URL）、`qq_send_voice`、`qq_send_video`、`qq_send_file`
- `qq_send_forward`：合并转发（群/私聊）
- `qq_napcat_api`：14 个白名单 action 的 NapCat API 代理
- `qq_group_history`：群历史消息

**自然语言触发**：QQ 用户在私聊/群聊（@机器人或回复）发消息即可触发 dsh Agent；模型回复 >150 字自动渲染为文字图卡片，渲染失败自动回退分段；工具调用之间的中间消息自动合并转发+撤回（`interimMessages=true` 时）。

### 重启生效说明

!!! tip "热加载：改配置或 touch 即 1 秒生效"
    改 patch 配置或 `touch ~/.dsh/profiles/<profile>/cordis.patch.yml` 即 1 秒热加载生效，无需重启 dsh。来源：README「开发」、AGENTS.md §3。

!!! tip "NapCat 侧切换回调地址需重新配置"
    reverse 与 forward 模式切换需在 NapCat 侧重新配置 WS 客户端/服务端，token 两侧必须一致。来源：README「安装」。

---

## 2. 弊端与缺陷

!!! warning "NapCat 必须部署在 dsh 可达的局域网内"
    NapCat 必须部署在 dsh **可达的局域网**内（同一网段/能互通），WS 连接、图片下载、文件解析都依赖这条网络通路；NapCat 与 dsh 不在同一台机器时，需在 NapCat 侧**开启「文件转 URL」开关**，`get_file` 才会返回可下载的 http(s) url，否则返回容器内路径，本插件无法访问。出处：README「安装 / 部署位置要求」。

!!! warning "群聊 @ 检测 fail-closed，botQQ 未学习时不自动回复"
    `requireMention: true` 时需 @ 或回复才触发；@ 检测 fail-closed——botQQ 未从 meta 事件学习且未显式配置时，群消息一律视为未 @，不自动回复。出处：README「故障排查」、DEVLOG §3。

!!! warning "同一插件文件绝不能 insert 两次"
    同一插件文件被 insert 两次（双实例）会导致工具注册冲突 → 崩溃循环 + `chat-sessions.json` 被清空。给现有插件加配置必须改原条目 config，不能新增条目。出处：DEVLOG §2 事故记录。

!!! warning "临时媒体 6h 过期清理，只写不删会无限堆积"
    入站媒体/映射文件写入 `<dsh-home>/media/onebot/`，超过 `tempTtlHours`（默认 6h）的会被清理；若清理逻辑被禁用或目录被外部写入，磁盘占用会无限增长。出处：README「权限与数据」、DEVLOG §3。

!!! warning "语音转写失败降级为 [语音] 占位"
    ffmpeg 或 whisper CLI 不可用时，语音消息显示 `[语音]` 占位，模型无法获取语音内容；需安装 ffmpeg + whisper 后重启，或 `sttEnabled: false` 关闭。出处：README「故障排查」。

!!! warning "Linux 未装 CJK 字体时文字图显示豆腐块"
    t2i 文字图在 Linux 部署时需安装 Noto CJK 字体（`apt install fonts-noto-cjk`）并用 `fontFiles` 指定 SC 字体文件；家族名解析失败时 Skia 静默回退成豆腐块，不会有错误日志。出处：README「故障排查」、AGENTS.md §2。

!!! warning "WS token 两侧必须一致"
    NapCat ws-reverse 与插件 `accessToken` 必须相同，token 不匹配将无法建立连接；消息上报格式建议选「数组」，CQ 字符串仅作回退。出处：README「安装」。

!!! warning "需手动 git clone + npm install + build.sh，无 dsh plugin add 形式"
    仓库未提供 `dsh plugin add` 形式的安装命令，必须 `git clone` + `npm install --include=dev` + `./scripts/build.sh` 编译，并以 cordis.patch.yml patch 形式挂载；`$HOME` 字面量不被 loader 插值，必须用绝对路径。出处：README「安装」、DEVLOG §2。

---

## 3. 后续拓展思路

### 可二次开发的方向

- **入站图片压缩**：README「路线图（v2 候选）」明确列出"入站图片压缩（≤2048px，避免大图拖慢视觉模型）"作为 v2 候选特性，可在 `src/media.ts` 的图片下载链路上加入尺寸上限与压缩逻辑。
- **多 OneBot 实现兼容性回归测试**：当前兼容 NapCat / Lagrange / LLOneBot / go-cqhttp，但 `tests/e2e-peer.mjs` 仅模拟单一对端；可扩展 E2E 矩阵覆盖不同实现的段格式差异。
- **t2i 卡片主题/字体可配置化**：当前 `cardFooter` 可改品牌，但卡片整体样式固定；可扩展为多主题（节日/活动）与字体包切换。

### 可对接的 DSH 能力

- **tools**：已注册 7 个 `qq_*` 工具（`qq_send_image`、`qq_send_voice`、`qq_send_video`、`qq_send_file`、`qq_send_forward`、`qq_napcat_api`、`qq_group_history`）；可继续扩展白名单 action（当前 14 个）。
- **systemPrompt**：已通过 `buildPlatformPrompt` 自动注入 QQ 平台说明（纯文本输出、图片走 `view_image`、工具指引）；可叠加业务专属提示词。
- **agentPresets / workspaceRegistry**：已支持 `agentPreset` 与 `workspacePath` 挂载，可结合 dsh 多 preset/多工作区能力做按群/按用户的差异化配置。

### 与其它插件组合的可能性

- **dsh-onebot + dsh-vision**：README 明确提到"用户发来的图片会标注本地路径，用 `view_image`（dsh-vision）查看"；可进一步用 `vision_extract_foreground` / `vision_dominant_colors` 为入站图片做前景抠图与主色调提取，丰富模型对图片的理解。
- **dsh-onebot + dsh-agent-teams**：群聊场景可用 AgentTeams 把多用户请求分发到子 Agent，由 dsh-onebot 统一回汇到 QQ 群。
- **dsh-onebot + dsh-group-photo**：合影墙的入镜留言可经 QQ 通道触发（QQ 用户发"我要入镜"→ dsh-onebot 转发到 dsh-group-photo 服务）。
