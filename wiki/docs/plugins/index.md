# 社区插件

DeepSeek Harness（DSH）社区插件目录。本页收纳已收集的 54 个社区插件，每个插件均有独立的「三段式」文档（使用指南 / 弊端与缺陷 / 后续拓展思路）。所有文档基于插件真实 README / PLUGIN.md / 源码编写，弊端均标明出处。

!!! tip "文档编写约定"
    - 每个插件文档顶部含元信息：插件名、来源仓库链接、许可证、commit SHA。
    - 弊端用 `!!! warning` 标注，使用技巧用 `!!! tip` 标注。
    - 弊端必须标明出处（README 章节 / 源码文件），不编造功能或限制。
    - 非标准 DSH 插件 bundle（独立服务 / 桌面壳 / Agent OS / 学习仓库 / 索引集合等）均如实说明其性质。

---

## 卡片导航

### 协作与团队

<div class="grid cards" markdown>

- :material-account-group: **[dsh-agent-teams](dsh-agent-teams.md)**

    ---

    多智能体团队协作。一句自然语言创建团队、拉成员、拆任务、收发消息，右上角实时活动面板。

    :material-license: MIT · :material-source-repository: `NanmiCoder/dsh-agent-teams`

- :material-clipboard-list: **[dsh-track](dsh-track.md)**

    ---

    嵌入式任务管理引擎：决策点协议、念头捕获墙、Linear 形 issue 存储（私有内测，npm 包 `@fakechris/dsh-track`）。

    :material-license: BSD-3-Clause · :material-source-repository: `fakechris/dsh-track`

</div>

### 会话与上下文

<div class="grid cards" markdown>

- :material-server-network: **[dsh-session-hub](dsh-session-hub.md)**

    ---

    多服务器 DSH 会话聚合到本机官方 Web UI 工作区树，远端无需装插件，可导入 Codex/Claude Code 历史。

    :material-license: MIT · :material-source-repository: `Asaiuta/dsh-session-hub`

- :material-link-variant: **[dsh-session-deeplink](dsh-session-deeplink.md)**

    ---

    URL `/?session=<id>` 直接定位会话，地址栏随活动会话自动同步，纯浏览器侧实现。

    :material-license: MIT · :material-source-repository: `R3alloc/dsh-session-deeplink`

- :material-chart-arc: **[dsh-context](dsh-context.md)**

    ---

    Context 洞察面板：Web UI 新增 Context tab，可视化上下文窗口构成与演化、压缩/注入事件、逐消息 token 成本。

    :material-license: Apache-2.0 · :material-source-repository: `bowenliang123/dsh-context`

- :material-brain: **[dsh-auto-memory](dsh-auto-memory.md)**

    ---

    三层记忆（用户级 / 项目笔记 / 每日日志）自动注入检索、每日反思、四象限日历，可继承其他 AI 工具历史。

    :material-license: BSD-3-Clause · :material-source-repository: `Aik358/dsh-auto-memory`

- :material-thought-bubble: **[dsh-think-any-lang](dsh-think-any-lang.md)**

    ---

    设置 → 通用选择模型思考（CoT）语言，13 种，零延迟零额外调用，纯 JS 无构建。

    :material-license: MIT · :material-source-repository: `lco117/dsh-think-any-lang`

- :material-camera: **[dsh-group-photo](dsh-group-photo.md)**

    ---

    DSH 内测大合影墙。GitHub 零权限 OAuth + 冻结白名单 + 拍立得墙，含 DSH Skill 包装样例。

    :material-license: MIT · :material-source-repository: `SenmuuuuW/dsh-group-photo`

</div>

### 可观测与通知

<div class="grid cards" markdown>

- :material-microsoft-azure-devops: **[dsh-mcp-panel](dsh-mcp-panel.md)**

    ---

    只读 MCP 客户端运行时管理面板：`/mcp` 命令 + Settings MCP tab，展示状态 / 工具 / 错误 / 重连计数。

    :material-license: Apache-2.0 · :material-source-repository: `PerryLink/dsh-mcp-panel`

- :material-bell-ring: **[dsh-notification-center](dsh-notification-center.md)**

    ---

    通知中心：对话 / 任务完成、报错、等待批准触发浏览器通知 + 21 种匹配音效，每类事件独立配置。

    :material-license: MIT · :material-source-repository: `610la/dsh-notification-center`

- :material-message-alert: **[dsh-attention-notifier](dsh-attention-notifier.md)**

    ---

    微信式任务栏提醒的持久化 Cordis 插件（判定端），配合 dsh-shell 呈现闪烁提醒。

    :material-license: MIT · :material-source-repository: `zdjmrq/dsh-attention-notifier`

- :material-monitor: **[dsh-bottom-bar](dsh-bottom-bar.md)**

    ---

    提供更丰富的 DSH 底栏信息显示：8 段可组装统计行、拖拽排序、实时预估费用跳动。

    :material-license: MIT · :material-source-repository: `kc0ed/dsh-bottom-bar`

- :material-format-list-bulleted: **[dsh-outline](dsh-outline.md)**

    ---

    DSH Web GUI 实时大纲插件：大纲树面板、流式实时更新、点击定位、层级滑块、搜索收藏。

    :material-license: MIT · :material-source-repository: `urzeye/dsh-outline`

</div>

### 视觉与媒体

<div class="grid cards" markdown>

- :material-eye: **[dsh-vision-toolkit](dsh-vision-toolkit.md)**

    ---

    视觉工具套件。10 个视觉工具：图片问答、OCR、UI 还原、grounding、pixel diff、Artifacts。

    :material-license: MIT · :material-source-repository: `Anionex/dsh-vision-toolkit`

- :material-image-search: **[dsh-vision](dsh-vision.md)**

    ---

    给纯文本模型（deepseek-v4-flash）加 vision 工具，调用视觉大模型（默认阿里云百炼）返回中文描述。

    :material-license: MIT · :material-source-repository: `sjakdhasdh/dsh-vision`

- :material-eye-circle: **[modlens](modlens.md)**

    ---

    全网第一个 DSH 视觉插件，直接粘贴图片即识别，5 内置 provider + 4 可复用 CLI，返回结构化 JSON。

    :material-license: MIT · :material-source-repository: `liustack/modlens`

- :material-image-auto-mirror: **[easy-vision](easy-vision.md)**

    ---

    注册 describe_image 工具，魔数自动识别图片格式，发 OpenAI 兼容视觉模型返回文字（可选写 Markdown）。

    :material-license: MIT · :material-source-repository: `Koreyer/easy-vision`

- :material-creation: **[dsh-imagecraft](dsh-imagecraft.md)**

    ---

    注册 image_gen（生图）+ image_vision（识图）两工具，复用 ChatGPT 登录态，无需 OPENAI_API_KEY。

    :material-license: MIT · :material-source-repository: `SPYQWER1/dsh-imagecraft`

- :material-movie-open: **[dsh-xiapan-media](dsh-xiapan-media.md)**

    ---

    虾盘云提供三项原生媒体能力：识图 / OCR + 作图（gpt-image-2）+ 视频（Seedance），客户端 MIT 开源。

    :material-license: MIT · :material-source-repository: `dongsheng123132/dsh-xiapan-media`

- :material-image-frame: **[dsh-image-subagent](dsh-image-subagent.md)**

    ---

    让纯文本主模型贴图投影为占位符，委托视觉子代理读取，零核心补丁，rc.6 端到端验证。

    :material-license: MIT · :material-source-repository: `yuqingsh/dsh-image-subagent`

</div>

### UI 美化与主题

<div class="grid cards" markdown>

- :material-monitor-multiple: **[dsh-web-ui](dsh-web-ui.md)**

    ---

    Web UI 插件与皮肤集合。任务看板、Git 图谱、右侧面板、移动端远程、SSH、鲸鱼娘宠物、7 款皮肤。

    :material-license: BSD-3-Clause · :material-source-repository: `zhu1090093659/dsh-web-ui`

- :material-palette: **[dsh-gui-customization](dsh-gui-customization.md)**

    ---

    DSH 时装工坊：Nous 蓝配色 + 四预设 + 13 色自定义 + 氛围光 + 动态背景（图片 / 视频），中英双语。

    :material-license: MIT · :material-source-repository: `LAN-TINA-WS/dsh-gui-customization`

- :material-format-paint: **[dsh-ui-beautify](dsh-ui-beautify.md)**

    ---

    DSH Web UI 美化：四套颜色主题 + 整页背景图，全部可撤销，重启自动恢复。

    :material-license: MIT · :material-source-repository: `Zalpha263/dsh-ui-beautify`

- :material-aspect-ratio: **[dsh-ui-appearance](dsh-ui-appearance.md)**

    ---

    DSH WebUI 个性化外观：6 预设 + 8 色角色自定义 + 背景图 + 透明度 / 模糊 / 毛玻璃，零核心改动。

    :material-license: MIT · :material-source-repository: `TQSY114514/dsh-ui-appearance`

- :material-theme-light-dark: **[deepseek-harness-themes](deepseek-harness-themes.md)**

    ---

    面向 deepseek-harness 的社区主题集合：6 主题（DeepSeek / OLED / Dracula / Catppuccin / Tokyo Night / GitHub Dark）。

    :material-license: MIT · :material-source-repository: `orxz/deepseek-harness-themes`

- :material-game-console: **[dsh-plugin-genshin-startup](dsh-plugin-genshin-startup.md)**

    ---

    启动时居中白屏播放原神启动视频，仪式感启动体验。

    :material-license: MIT · :material-source-repository: `allen546/dsh-plugin-genshin-startup`

</div>

### 文件与工作台

<div class="grid cards" markdown>

- :material-sidebar: **[dsh-better-sidebar](dsh-better-sidebar.md)**

    ---

    VSCode 风格侧边栏工作台。文件管理、编辑预览、内嵌浏览器、真实终端、Git 面板、后台任务页。

    :material-license: MIT · :material-source-repository: `omdsh-dev/DSH-better-sidebar`

- :material-folder-multiple: **[dsh-file-explorer](dsh-file-explorer.md)**

    ---

    VS Code 风格工作区文件浏览器：右侧文件树 + 可编辑标签页 + Markdown 阅读 / 编辑 / 分屏 + 悬浮大纲 + Quick Open。

    :material-license: MIT · :material-source-repository: `bearllfleed/dsh-plugin-file-explorer`

- :material-desktop-tower: **[dsh-work](dsh-work.md)**

    ---

    Local-first AI workbench（Electron 桌面应用，非标准 bundle）：Agent 会话 / 项目文件 / 数据分析 / MCP / Office artifacts。

    :material-license: MIT · :material-source-repository: `vibeinging/dsh-work`

</div>

### 搜索与网络

<div class="grid cards" markdown>

- :material-magnify: **[anysearch-dsh](anysearch-dsh.md)**

    ---

    AnySearch web search provider 与高级搜索工具：能力发现 / 垂直搜索 / 有界批量搜索，无 key 匿名访问。

    :material-license: MIT · :material-source-repository: `anysearch-team/anysearch-dsh`

- :material-web: **[dsh-web-search-exa](dsh-web-search-exa.md)**

    ---

    Zero-config Exa web search provider：无 key 匿名 MCP fallback + keyed REST，可切 providerId 与官方包共存。

    :material-license: MIT · :material-source-repository: `TonyDua/dsh-web-search-exa`

- :material-lan-connect: **[dsh-net-proxy](dsh-net-proxy.md)**

    ---

    让 Agent 网络请求走配置的代理：包装 agent 进程全局 fetch，支持 HTTP/HTTPS-CONNECT 与 SOCKS5。

    :material-license: MIT · :material-source-repository: `mafeis/dsh-net-proxy`

- :material-google-earth: **[ego-browser](ego-browser.md)**

    ---

    把 ego-lite 浏览器接入 HARNESS，13 个 ego_* 工具，内置 ego 运行时，实时观察窗（私有内测）。

    :material-license: MIT · :material-source-repository: `Fisfzy/ego-browser`

</div>

### GitHub 与工作流

<div class="grid cards" markdown>

- :material-github: **[dsh-github](dsh-github.md)**

    ---

    GitHub 集成：创建 PR、后台审查 PR、读 issue，每次写操作经人工批准，8 工具 + 3 命令族。

    :material-license: Apache-2.0 · :material-source-repository: `PerryLink/dsh-github`

- :material-shield-account: **[governed-workflow-for-dsh](governed-workflow-for-dsh.md)**

    ---

    策略强制、证据优先的治理工作流：authority core + evidence append-only + monotonic bash guard + governed-builder skill。

    :material-license: MIT · :material-source-repository: `zcx369658780/governed-workflow-for-dsh`

- :material-robot: **[dsh-clawrouter](dsh-clawrouter.md)**

    ---

    二脑：强模型在危险工具调用前审查，70 个模型一个钱包，review gate + blockrun provider route + x402 USDC。

    :material-license: MIT · :material-source-repository: `BlockRunAI/dsh-clawrouter`

- :material-file-document-edit: **[dsh-humanizer](dsh-humanizer.md)**

    ---

    DSH 原生中文文本 AI 痕迹消除与多重审核对抗工作流：十步流程 + 十条铁律 + 19 章 references + 3 程序工具。

    :material-license: MIT · :material-source-repository: `DEEP-IOS/dsh-humanizer`

- :material-calculator-variant: **[TokenLedger](tokenledger.md)**

    ---

    Token 用量核算，对账 New API 与 Sub2API relay-site 计费，双事件源 + 证据等级对账 + SQLite + CSV/JSON 导出。

    :material-license: MIT · :material-source-repository: `zh667/TokenLedger`

</div>

### 插件市场与管理

<div class="grid cards" markdown>

- :material-store: **[dsh-plugins-marketplace](dsh-plugins-marketplace.md)**

    ---

    DSH Web GUI 插件市场：一键浏览 / 安装 / 更新 GitHub dsh-plugin 全部插件，静态索引 CDN 分发，零 API 限流。

    :material-license: MIT · :material-source-repository: `bradeGithub/DSH-Plugins-Marketplace`

- :material-console: **[dsh-plugin-market](dsh-plugin-market.md)**

    ---

    dsh plugin marketplace CLI：browse / install / uninstall 社区 bundle 插件，pin to commit + 审计日志。

    :material-license: MIT · :material-source-repository: `6kongbai/dsh-plugin-market`

- :material-toggle-switch: **[dsh-plugin-hub](dsh-plugin-hub.md)**

    ---

    DSH 插件管理面板：一键启用 / 停用插件 + GitHub dsh-plugin 插件市场，带详情与一键安装。

    :material-license: MIT · :material-source-repository: `Noob-stupid/dsh-plugin-hub`

- :material-shopping: **[dsh-plugin-store](dsh-plugin-store.md)**

    ---

    图形 app-store：浏览 / 搜索 / 一键安装，含本地评分 / 依赖影响图 / 审计日志 / SQLite 镜像。

    :material-license: MIT · :material-source-repository: `yunhuantian/dsh-plugin-store`

- :material-package-variant: **[dsh-plugin-installer](dsh-plugin-installer.md)**

    ---

    插件商店 + 安装排障技能一体包：Web GUI 商店 tab + agent 驱动可解释安装。

    :material-license: MIT · :material-source-repository: `zhang66633/dsh-plugin-installer`

- :material-radar: **[awesome-dsh-plugins](awesome-dsh-plugins.md)**

    ---

    自动发现、证据验证的 DSH 插件生态雷达（索引仓库，非插件 bundle）：每 8h 扫描 / 四级验证 / 日期化证据报告。

    :material-license: MIT · :material-source-repository: `AdamPlatin123/awesome-dsh-plugins`

- :material-bookshelf: **[deepseek-harness-101](deepseek-harness-101.md)**

    ---

    个人 DSH 插件开发集（submodule 索引集合，非标准 bundle）：workspace 级 MCP 自动加载 + 环境变量隔离。

    :material-license: 未声明 · :material-source-repository: `Momojie-S/deepseek-harness-101`

</div>

### 桌面与扩展（非标准 bundle）

<div class="grid cards" markdown>

- :material-laptop: **[deepseek-harness-desktop (anywhere)](deepseek-harness-desktop-anywhere.md)**

    ---

    基于官方 DSH 打造的 Electron 桌面端，适配 macOS / Windows，开箱即用（桌面壳，非插件 bundle）。

    :material-license: MIT · :material-source-repository: `anywhere-labs/deepseek-harness-desktop`

- :material-window-maximize: **[deepseek-harness-desktop (antinomie)](deepseek-harness-desktop-antinomie.md)**

    ---

    极简 Tauri 桌面壳，不含 dsh 代码，回环端口跑 dsh web + webview 指过去 + DSH_HOME 共享。

    :material-license: MIT · :material-source-repository: `antinomie1/deepseek-harness-desktop`

- :material-microsoft-visual-studio-code: **[DeepSeek Harness for VS Code](deepseek-harness-for-vs-code.md)**

    ---

    在 VS Code 里用 DSH 如 ChatGPT/Copilot：@dsh 原生 chat、独立视图、跨项目会话（VS Code 扩展，非 bundle）。

    :material-license: MIT · :material-source-repository: `NEXTINDIE/DeepSeek-Harness-for-VS-Code`

- :material-school: **[dsh-plugin-practice](dsh-plugin-practice.md)**

    ---

    DSH 插件开发入门练习仓库（Lesson 1）：Cordis apply(ctx) + ctx.effect() 心跳资源 + patch 加载。

    :material-license: 未声明 · :material-source-repository: `Ri0n72Y/dsh-plugin-practice`

- :material-math-integral: **[jacobian](jacobian.md)**

    ---

    AI Agent 用的纯数学 MCP 服务器：math.find 发现运算 / math.run 执行 / 独立 checker 发 VERIFIED。

    :material-license: MIT · :material-source-repository: `morluto/jacobian`

- :material-infinity: **[Mobius](mobius.md)**

    ---

    首个自演化开源 Agent OS：自演化 + 多智能体自动科研 + 小莫 NL 入口 + 任意模型 + SSH/AIMUX 资源接入。

    :material-license: NOASSERTION · :material-source-repository: `nutshellai-tech/mobius`

- :material-arrange-send: **[AgentFrame v3](agentframe-v3.md)**

    ---

    DSH compaction 后端插件（语义 + 物理双层压缩）：28.4× KV 压缩 + 3.2× 语义蒸馏，总压缩约 113×。

    :material-license: GPL-3.0 · :material-source-repository: `ljsysfurryACE/AgentFrame-v3`

- :material-package-variant-closed: **[Dizzy-DSH](dizzy-dsh.md)**

    ---

    克隆即装的 DSH 插件合集：余额 / 用量 / Agent 规则 / Kimi 浏览器（自有）+ vision/genui/notification/sidebar（第三方快照）。

    :material-license: 未声明 · :material-source-repository: `Acidmoon/DIzzy-DSH`

- :material-cellphone-link: **[DeepSeekHarnessRemoteGateway](deepseekharness-remote-gateway.md)**

    ---

    轻量级 DSH 远程访问 sidecar 网关：自动随机公网 URL + 6 位密码 + 二维码 + 反代 DSH Web UI + 转发 WebSocket。

    :material-license: MIT · :material-source-repository: `lbwnb666-ai/DeepSeekHarnessRemoteGateway`

</div>

---

## 对比矩阵

| 插件 | 类型 | 核心能力 | 安装方式 | 许可证 | 主要弊端 | 适用场景 |
|---|---|---|---|---|---|---|
| [dsh-agent-teams](dsh-agent-teams.md) | 多智能体协作 | 团队创建 / 成员子代理 / 任务依赖 / 成员间消息直达 / 活动面板 | `github:` 安装 | MIT | 多进程操作同一团队不保证一致；一个队长同时只能带一个团队 | 多智能体调研、复杂任务拆分、并行子任务协作 |
| [dsh-track](dsh-track.md) | 任务管理（私有内测） | 捕获墙 / 决策账本 / 证据驱动生命周期 / 历史同步 / LLM 用量账本 / Web 面板 | `dsh plugin add @fakechris/dsh-track` + 协议 skill | BSD-3-Clause | 业务数据不写 session 事件；done/canceled 必须人工确认；lib 须提交+三处同改 | Agent 工作流的念头 / 决策 / 任务结构化追溯 |
| [dsh-session-hub](dsh-session-hub.md) | 会话聚合 | 远端会话进官方树 / 官方对话区零替换 / 导入 Codex/Claude/opencode 历史 / 模型配置增量同步 / 纯 `/api` 协议 | `dsh plugin add dsh-session-hub@alpha` | MIT | Alpha 单一环境验证；必须 SSH 隧道；模型同步会推送 API Key 到远端；无自动化测试 | 多台 DSH 机器统一管理；导入外部工具历史接着聊 |
| [dsh-session-deeplink](dsh-session-deeplink.md) | Web UI 扩展 | 直接打开会话 / 地址栏同步 / 保留无关 query/fragment / 纯浏览器侧 | `dsh plugin add dsh-session-deeplink` | MIT | 会话删除/归档后 URL 失效；DSH 版本耦合；仅 web profile | URL 定位 / 分享会话、书签快速回到某会话 |
| [dsh-context](dsh-context.md) | 可观测性 | 六大类构成 / 逐请求历史 / 压缩注入事件 / 逐消息 token 成本 / 双语 UI / 零运行时依赖 | `dsh plugin add dsh-context` | Apache-2.0 | token 数为估算非真实计量；依赖会话事件日志；2 秒轮询非实时推送 | 观察 context 预算被哪部分吃掉、调试压缩/注入 |
| [dsh-auto-memory](dsh-auto-memory.md) | 记忆系统 | 三层记忆自动注入 / 智能时段问候 / 四象限日历 / 12 个 Agent 工具 / 外部记忆继承 | `pnpm add @a9i5k4/dsh-auto-memory`（profile 目录+加 bundles） | BSD-3-Clause | 记忆文件明文无加密；历史检索依赖 session-query 索引；需重启生效 | 跨会话 / 跨项目保持长期记忆与项目笔记 |
| [dsh-think-any-lang](dsh-think-any-lang.md) | 系统提示词 | 12 种语言 + off / 系统提示词指令 / 指令用目标语言书写 / 持久化 / 纯 JS 无构建 | `dsh plugin add github:lco117/dsh-think-any-lang` | MIT | 仅影响思考语言不影响最终回复；语言表双半需同步维护；依赖模型遵循指令 | 让模型用指定语言输出 `reasoning_content` 保持回复语言 |
| [dsh-group-photo](dsh-group-photo.md) | 社区合影墙 | GitHub 零权限 OAuth / 冻结白名单 / 拍立得墙 / 静态纪念版导出 / Skill 包装样例 | 独立 Node 服务（非标准 bundle） | MIT | Fail-closed 白名单不可用即拒绝所有人；OAuth 回调地址只能一个 | 社区纪念活动、内测合影、私有期成员快照校验 |
| [dsh-mcp-panel](dsh-mcp-panel.md) | 可观测性 / MCP 管理 | `/mcp` 命令(5 语言) / Settings→MCP 页签 / 被动探测 / enable/disable patch 建议 / `mcp_probe` 工具 / 脱敏展示 | `dsh plugin add dsh-mcp-panel@0.2.0` | Apache-2.0 | 只读绝不写文件；无上游数据显示 unknown；依赖上游 mcp/status seam 提案 | 一眼看清 MCP 服务器状态 / 工具 / 错误，排查连接 |
| [dsh-notification-center](dsh-notification-center.md) | 通知 | 浏览器系统通知 / 21 种内置音效 / 每类事件独立配置 / 设置自动保存 | `dsh plugin add @lyhalal/dsh-notification-center` | MIT | 需主动授权浏览器通知权限；音效受自动播放策略限制；仓库无 LICENSE 文件 | 切到别的窗口也不错过 DSH 完成 / 报错 / 审批 |
| [dsh-attention-notifier](dsh-attention-notifier.md) | 任务栏提醒 | 判定需介入与一轮完成 / 聚合到 `GET /dsh-attention` / `stats` 自诊断 / 持久化自动加载 | 手动放 `attention-plugin.mjs` 到 `~/.dsh/plugins/` + 改 patch | MIT | 只做判定不呈现 UI 需配合桌面壳；1 秒轮询有延迟；阈值固定 1 秒不可配 | 微信式任务栏闪烁提醒，配合 dsh-shell 使用 |
| [dsh-bottom-bar](dsh-bottom-bar.md) | 客户端 + 服务端 | 8 段可组装统计行 / 拖拽排序 / 实时费用跳动 / 价格表 | clone 到 profile 树内 + `dsh plugin add` | MIT | 必须树内拷贝；峰谷定价暂未实现 | 会话成本与用量实时监控 |
| [dsh-outline](dsh-outline.md) | 客户端 UI（极简 host） | 大纲树面板 / 流式实时更新 / 点击定位 / 层级滑块 / 搜索收藏 | `dsh plugin add dsh-outline` | MIT | 不向模型暴露工具；GitHub 安装需 allowBuilds | 长会话结构导航与定位 |
| [dsh-vision-toolkit](dsh-vision-toolkit.md) | 视觉工具套件 | 10 个视觉工具：图片问答 / OCR / UI 还原 / grounding / pixel diff / Artifacts / Web Settings | `github:` 安装（Web + Headless） | MIT | 远程工具强依赖视觉 API 凭证；P2 稳定服务未发布 | 视觉理解、UI 还原、像素级回归验证、长截图 OCR |
| [dsh-vision](dsh-vision.md) | 视觉识图 | vision 工具 / 本地路径 + URL / OpenAI 兼容 / 配置优先级 | `pnpm build && dsh plugin add ./dsh-vision` | MIT | 不解决贴图准入（需打核心补丁且 npm install 后需重打）；默认百炼需申请 Key；结果是纯文字 | 有阿里云百炼 Key、想让主模型直接调用工具读图 |
| [modlens](modlens.md) | 视觉识图 | read_image 工具 / 多 provider 链 / 结构化 JSON / 粘贴恢复 / `(modlens vision)` 模型变体 | `npx -y @deepseek-ai/dsh plugin add @liustack/modlens@latest` | MIT | 不接受 PR；Antigravity 在无桌面会话被锁；粘贴恢复是 best-effort | 多 provider 链 + 结构化 JSON + 直接粘贴识图 |
| [easy-vision](easy-vision.md) | 视觉识图 | describe_image 工具 / 魔数识别格式 / 零依赖纯 ESM / outFile 写 md | `dsh plugin add easy-vision` + patch 层挂载 | MIT | README 与源码默认值不一致（model/apiKeyEnv）；需 OpenAI 兼容端点；API key 未接入 provider 路由 | 有 OpenAI 兼容视觉端点、想要零依赖轻量识图 |
| [dsh-imagecraft](dsh-imagecraft.md) | 生图 + 识图 | image_gen / image_vision / Codex 后端 / OAuth 自动刷新 / 零 npm 依赖 | `dsh plugin add github:SPYQWER1/dsh-imagecraft` | MIT | 依赖非公开 API（可能变更）；消耗 Codex-usage 配额；不支持透明背景与图片编辑；按 ToS 不可商用 | 有 ChatGPT 订阅、一站式生图 + 识图 |
| [dsh-xiapan-media](dsh-xiapan-media.md) | 生图 + 识图 + 视频 | xiapan-vision 路由 / 3 文件工具 / gpt-image-2 / Seedance / 付费审批闸门 | `dsh plugin add "github:dongsheng123132/dsh-xiapan-media#SHA"` | MIT | 需登录充值虾盘云；作图/视频默认需审批 headless 拒绝；视频以文件路径返回 | 一站式付费识图 + 生图 + 视频 |
| [dsh-image-subagent](dsh-image-subagent.md) | 视觉识图（委托） | internal/get 瀑布改写 / llm/stream 保险丝 / 占位符投影 / 诊断 RPC | `dsh plugin add github:yuqingsh/dsh-image-subagent#<sha>` | MIT | 无视觉子代理时无人能读图；子代理读图四项硬要求缺一不可 | 主模型 + 视觉子代理架构、零核心补丁放行贴图 |
| [dsh-web-ui](dsh-web-ui.md) | UI / 皮肤集合 | 任务看板 / Git 图谱 / 右侧面板 / 移动端远程 / SSH 远程连接 / 鲸鱼娘宠物 / 实时令牌统计 / 7 款皮肤 | `link:` 克隆构建（未发布 npm） | BSD-3-Clause | 插件包未发布到 npm，必须克隆 + pnpm 构建 | Web UI 增强、远程运维、移动办公、皮肤定制 |
| [dsh-gui-customization](dsh-gui-customization.md) | UI 美化 | 主题色板 / 氛围光 / 动态背景 / 配色 JSON 导入导出 | `dsh plugin add dsh-gui-customization` | MIT | 背景图依赖浏览器 IndexedDB；build/ 下 preset 源自 dsh-web-ui(BSD-3) | 深度定制 DSH 外观（色板 + 氛围光 + 视频背景） |
| [dsh-ui-beautify](dsh-ui-beautify.md) | UI 美化 | 四套预设 / 整页背景图 / localStorage 持久化 | 手动复制两份副本 + 编辑 patch | MIT | 需手动维护两份副本同步；选择器硬绑定 DSH 0.1.0-rc.6；背景图受 localStorage 配额限制 | 轻量快速换肤 + 背景图 |
| [dsh-ui-appearance](dsh-ui-appearance.md) | UI 美化 | 官方 token 覆写 / 背景图层 / 透明度模糊遮罩 / 毛玻璃 | `dsh plugin add file:<克隆路径>` | MIT | 设置跟随浏览器(localStorage)；背景图受配额约束；tests/ 依赖 harness 工作区 | 官方 token 覆写 + 壁纸 + 玻璃效果 |
| [deepseek-harness-themes](deepseek-harness-themes.md) | UI 主题 | ctx.theme 官方扩展点 / Theme 选择行 / 第三方选择持久化 | `dsh plugin add @dshthemes/ui` | MIT | 只改外观不改行为；持久化在自有命名空间；新主题需覆盖完整 REQUIRED_TOKENS | 成套主题色基座（不改行为） |
| [dsh-plugin-genshin-startup](dsh-plugin-genshin-startup.md) | 启动动画 | 全屏居中播放 / 纯白填充 / 跳过 / 音频降级 | `dsh plugin add /path/to/...` | MIT | 每次启动都播放无法配置关闭；autoplay 受限 | 仪式感启动体验 |
| [dsh-better-sidebar](dsh-better-sidebar.md) | 侧边栏工作台 | 文件管理 / 编辑预览 / 内嵌浏览器 / 真实终端 / Git 面板 / 后台任务页 / 服务化扩展 | npm 包或 `link:` 克隆构建 | MIT | Office/PPTX 预览内联进 client bundle 约 23MB，首次加载较慢 | VSCode 风格工作台、真实终端、Git SCM、后台任务监控 |
| [dsh-file-explorer](dsh-file-explorer.md) | DSH Web 客户端 | 文件树 / 标签页 / Markdown 三模式 / Quick Open / i18n / 编辑器字体 | `dsh plugin add dsh-plugin-file-explorer`（需手改 patch） | MIT | 安装不自动注册须手改 YAML；platform:web 不能进 Electron 主窗口；lib 改动需手动同步 | DSH Web UI 文件浏览与编辑 |
| [dsh-work](dsh-work.md) | Electron 桌面应用（非 bundle） | 三列工作台 / Git Worktree / Canvas / Site / Office 产物 / Browser Workspace / 插件中心 / 主题 | `npm install` + `npm run dev` | MIT | 非 DSH 插件须本地构建；平台覆盖不全（Win arm64/Linux 不可用）；缺任务看板/终端页 | 桌面外壳里统一组织 DSH 全能力 + 项目 / 文件 / 产物 |
| [anysearch-dsh](anysearch-dsh.md) | Web search provider | 驱动 `web_search` / `anysearch_capabilities` / `anysearch_search` / `anysearch_batch_search` / 无 key 匿名 / 凭据轮换无需重启 | `npx -y @deepseek-ai/dsh plugin add @anysearch/anysearch-dsh` | MIT | DSH 仍处于开发预览阶段；不提供 `anysearch_extract`；批量限 1–5 个 | 用 AnySearch 作为 web search provider，支持匿名试用 |
| [dsh-web-search-exa](dsh-web-search-exa.md) | Web search provider | 零配置免 key（匿名 MCP）/ 配 key 自动升级 REST / `providerId` 开关 / 内置类型声明 | `dsh plugin add @tonydua/dsh-web-search-exa` | MIT | 匿名 MCP 有限流(HTTP 429)；配 key 后需显式选中 Exa；与官方包共存需配 providerId | 零配置免 key 试用 Exa 搜索，或与官方 Exa 包并存 |
| [dsh-net-proxy](dsh-net-proxy.md) | 标准 DSH 插件 | 包装 agent 进程全局 fetch / HTTP/HTTPS-CONNECT / SOCKS5 / 设置页 | `dsh plugin add github:mafeis/dsh-net-proxy` | MIT | 仅作用 agent 自身请求；noProxy 默认仅排除回环 | 让 agent 的 web_search / web_fetch / 外部 API 走代理 |
| [ego-browser](ego-browser.md) | DSH 插件（私有内测） | 13 ego_* 工具 / 实时观察窗（SSE 推流 + 鼠标直操 + 标签条 + 历史抽屉） | `dshx install ego-browser ego-browser-plugin-0.2.0.tgz` | MIT | 私有内测严禁公开分发；Windows 宿主弱于 macOS；登录态强杀即丢 | Agent 在真实互联网上办事，人能看见 agent 在浏览什么 |
| [dsh-github](dsh-github.md) | DSH bundle 插件 | 8 工具 + 3 命令族 + approval gate + 后台 review job | `dsh plugin add @perrylink/dsh-github` | Apache-2.0 | 评审报告进程内重启即失；npm latest dist-tag 过期；不注册自定义会话事件 | Agent 自主开 PR / 审查 PR / 管 issue，写操作需人工批准 |
| [governed-workflow-for-dsh](governed-workflow-for-dsh.md) | DSH bundle（第三方社区） | authority core + evidence append-only + monotonic bash guard + governed-builder skill | `dsh plugin add github:zcx369658780/governed-workflow-for-dsh` | MIT | V0.4 仅 bash guard；durable reload upstream-blocked；Git/path/GitHub 强制未实现 | GPT 下发-builder 实现-reviewer 验收的治理工作流 |
| [dsh-clawrouter](dsh-clawrouter.md) | DSH bundle 插件 | review gate（safe/dangerous/uncertain）+ blockrun provider route + x402 USDC + spend + review | `dsh plugin add dsh-clawrouter` + export 钱包 key | MIT | 不会让 DeepSeek 更便宜；不记录 session 事件；图片被拒；smart routing 未接 | Full Access 模式下危险命令强模型审查 + 多模型路由 |
| [dsh-humanizer](dsh-humanizer.md) | DSH bundle 插件 | 十步流程 + 十条铁律 + 19 章 references + 3 程序工具 + humanize_reference | `dsh plugin add dsh-humanizer` | MIT | 不是 AI 检测器；程序规则刻意少；十步不可跳；三轮改写顺序不可颠倒；禁配额化 | 中文文本去 AI 味，模型做人味程序守内容 |
| [TokenLedger](tokenledger.md) | DSH bundle 插件 | 双事件源 foldUsage + relay 站点 origin 归一 + 证据等级对账 + SQLite + CSV/JSON 导出 | `dsh plugin add github:zh667/TokenLedger` | MIT | 早期开发中 Web UI 未完成；request 级对账不可达；会话日志 zstd 多帧易静默少算 | 多中转站 token 对账，明确证据等级拒绝不可比 |
| [dsh-plugins-marketplace](dsh-plugins-marketplace.md) | 客户端 + 服务端 | 插件发现 / 安装 / 更新 / 版本检测 / 已安装识别（五重判定） | 一键脚本 install.ps1/install.sh | MIT | 安装端点无认证依赖网络隔离；HMR 禁用需重启 | Web GUI 内浏览安装社区插件 |
| [dsh-plugin-market](dsh-plugin-market.md) | CLI 工具（monorepo） | CLI 搜索 / 安装 / 卸载，pin to commit，审计日志 | `npm i -g dsh-plugin-market` | MIT | v0.1.0 仅 CLI，Web GUI 被 Typert 阻塞；无签名校验 | 命令行 / CI 场景管理插件 |
| [dsh-plugin-hub](dsh-plugin-hub.md) | 客户端 + 服务端 | 插件启用 / 停用（HMR），GitHub 市场浏览安装 | `dsh plugin add github:Noob-stupid/dsh-plugin-hub` | MIT | 仅支持 DSH 0.1.0 系列；宿主变更需重启 | Web GUI 内管理已安装插件 + 浏览市场 |
| [dsh-plugin-store](dsh-plugin-store.md) | 客户端 + 服务端 | 图形商店 / 评分 / 依赖拓扑 / 审计日志 / SQLite 镜像 | `pnpm build` 后 `dsh plugin add` | MIT | 镜像同步受 API 限频；评分仅本地可见 | 企业级插件管理 + 合规审计 |
| [dsh-plugin-installer](dsh-plugin-installer.md) | 双面插件（商店 tab + skill） | Web GUI 商店 tab + agent 驱动可解释安装 | `dsh plugin add dsh-plugin-installer` | MIT | 商店数据为静态快照；安装需活跃 agent | agent 驱动的插件安装与排障 |
| [awesome-dsh-plugins](awesome-dsh-plugins.md) | 索引仓库（非 bundle） | 每 8h 扫描 / 四级验证 / 日期化证据报告 / 分类目录 | 非插件，直接浏览 README/reports | MIT | 运行级实测覆盖极低（0 可用 5 失败）；收录≠兼容 | 安装前查插件兼容性证据 |
| [deepseek-harness-101](deepseek-harness-101.md) | submodule 索引集合（非 bundle） | workspace 级 MCP 自动加载 + 环境变量隔离 | `git clone --recurse-submodules` | 未声明 | 非标准 bundle；子模块需单独安装；依赖 pwsh | DSH 插件开发参考 + workspace 级隔离 |
| [deepseek-harness-desktop (anywhere)](deepseek-harness-desktop-anywhere.md) | 桌面壳 | 服务生命周期管理 + 系统托盘 + 桌面窗口 + 插件市场(规划中) + Channels | 官网下载安装包 | MIT | 桌面端尚未以 DSH 插件形式交付；非官方产品 | macOS/Windows 开箱即用、手机远程控制 |
| [deepseek-harness-desktop (antinomie)](deepseek-harness-desktop-antinomie.md) | 桌面壳 | 回环端口跑 dsh web + webview 指过去 + DSH_HOME 共享 | Releases 提供 full/minimal 构建 | MIT | 产物未签名；Linux 需 webkit2gtk-4.1；设置项均下次启动生效 | 已有 Node 24+ 或想离线开箱即用的桌面用户 |
| [DeepSeek Harness for VS Code](deepseek-harness-for-vs-code.md) | VS Code 扩展（非 bundle） | @dsh 聊天参与者 + 辅助侧栏 + 独立窗口 + 子代理 + 轨迹 + 设置面板 + 附件 + 技能 | `npm run package` 生成 VSIX → VS Code 安装 | MIT | 非 DSH 插件须 VSIX 安装；LICENSE 含未解决 merge conflict；repository.url 误填 | 在 VS Code 里用 DSH，与 ChatGPT/Copilot 并列 |
| [dsh-plugin-practice](dsh-plugin-practice.md) | 学习仓库 | Cordis apply(ctx) + ctx.effect() 心跳资源 + patch 加载 | `pnpm dsh web --patch`（从 DSH 源码检出） | 未声明 | 仅含 Lesson 1；patch 路径占位符需手动替换 | 学习 DSH 插件生命周期、effect 清理机制 |
| [jacobian](jacobian.md) | MCP 服务器 + 数学库 | math.find 发现运算 / math.run 执行 / 独立 checker 发 VERIFIED | `npm install -g jacobian && jacobian setup` | MIT | 预稳定；强制 Python 后端栈约 160MB；仅 glibc Linux x86-64 测试契约 | 精确数学计算、反例搜索、独立证明检验 |
| [Mobius](mobius.md) | Agent OS 系统 | 自演化 + 多智能体自动科研 + 小莫 NL 入口 + 任意模型 + SSH/AIMUX 资源接入 | `docker compose up` 或 `python3 start.py` | NOASSERTION | 商业使用需另行授权；路线图项目尚未完成 | 团队 / AI 智能体 / 设备 / 算力统一工作空间 |
| [AgentFrame v3](agentframe-v3.md) | DSH Cordis 插件 + Python 库 | 28.4× KV 压缩 + 3.2× 语义蒸馏 + 总压缩 ~113× + ctx.compaction seam | `pip install -e agentframe/` + DSH 仓库内 pnpm 编译 | GPL-3.0 | 预览版；依赖 DSH 仓库内编译；smoke test 覆盖有限 | 长会话上下文压缩、Agent 自主记忆决策 |
| [Dizzy-DSH](dizzy-dsh.md) | 插件合集 bundle | 余额 / 用量 / Agent 规则 / Kimi 浏览器(自有) + vision/genui/notification/sidebar(第三方) | `dsh plugin add file:<仓库路径>` | 未声明 | 必须 file: 安装；浏览器控制依赖外部 daemon + 扩展；第三方为快照 | 想一次装好多插件的 DSH 用户 |
| [DeepSeekHarnessRemoteGateway](deepseekharness-remote-gateway.md) | 独立 sidecar 服务 | 自动随机公网 URL + 6 位密码 + 二维码 + 反代 DSH Web UI + 转发 WebSocket | `npm run doctor` + 按平台 start 脚本 | MIT | 工作区切换需先电脑端打开；Quick Tunnel 非固定域名 | 手机远程访问本地 DSH、临时分享会话 |

---

## 按场景选型

!!! tip "选型建议"
    - **要让多个 Agent 协作完成大任务** → [dsh-agent-teams](dsh-agent-teams.md)
    - **要给纯文本 Agent 加视觉能力** → [dsh-vision-toolkit](dsh-vision-toolkit.md) / [modlens](modlens.md)（直接粘贴）/ [dsh-vision](dsh-vision.md)（百炼）/ [dsh-image-subagent](dsh-image-subagent.md)（零核心补丁委托子代理）
    - **要 VSCode 风格的本地工作台（终端/Git/编辑）** → [dsh-better-sidebar](dsh-better-sidebar.md) / [dsh-file-explorer](dsh-file-explorer.md)（纯文件浏览）
    - **要 Web UI 全家桶（看板/移动端/SSH/皮肤）** → [dsh-web-ui](dsh-web-ui.md)
    - **要办社区合影纪念活动** → [dsh-group-photo](dsh-group-photo.md)
    - **要统一管理多台机器的 DSH 会话** → [dsh-session-hub](dsh-session-hub.md)
    - **要观察 / 调试上下文窗口** → [dsh-context](dsh-context.md)
    - **要给 Agent 加长期记忆** → [dsh-auto-memory](dsh-auto-memory.md)
    - **要浏览器通知 / 任务栏提醒** → [dsh-notification-center](dsh-notification-center.md) / [dsh-attention-notifier](dsh-attention-notifier.md)
    - **要换肤 / 主题 / 壁纸** → [dsh-gui-customization](dsh-gui-customization.md) / [dsh-ui-appearance](dsh-ui-appearance.md) / [deepseek-harness-themes](deepseek-harness-themes.md) / [dsh-ui-beautify](dsh-ui-beautify.md)
    - **要 web search provider** → [anysearch-dsh](anysearch-dsh.md) / [dsh-web-search-exa](dsh-web-search-exa.md)
    - **要让 Agent 操作 GitHub（人工批准写操作）** → [dsh-github](dsh-github.md)
    - **要看清 MCP 服务器状态** → [dsh-mcp-panel](dsh-mcp-panel.md)
    - **要危险命令强模型审查** → [dsh-clawrouter](dsh-clawrouter.md)
    - **要治理工作流（证据优先）** → [governed-workflow-for-dsh](governed-workflow-for-dsh.md)
    - **要中文去 AI 味** → [dsh-humanizer](dsh-humanizer.md)
    - **要 token 用量对账** → [TokenLedger](tokenledger.md)
    - **要在 GUI 里浏览安装社区插件** → [dsh-plugins-marketplace](dsh-plugins-marketplace.md) / [dsh-plugin-store](dsh-plugin-store.md) / [dsh-plugin-hub](dsh-plugin-hub.md)
    - **要远程 / 手机访问本地 DSH** → [DeepSeekHarnessRemoteGateway](deepseekharness-remote-gateway.md) / [deepseek-harness-desktop (anywhere)](deepseek-harness-desktop-anywhere.md)
    - **要在 VS Code 里用 DSH** → [DeepSeek Harness for VS Code](deepseek-harness-for-vs-code.md)
    - **要长会话上下文压缩** → [AgentFrame v3](agentframe-v3.md)
    - **要让 Agent 走代理** → [dsh-net-proxy](dsh-net-proxy.md)
    - **要数学证明 / 反例搜索** → [jacobian](jacobian.md)
    - **要选模型思考语言** → [dsh-think-any-lang](dsh-think-any-lang.md)

---

## 组合推荐

| 组合 | 场景 | 说明 |
|---|---|---|
| dsh-agent-teams + dsh-vision-toolkit | 视觉多智能体 | 研究员成员看图、工程师成员做视觉回归、队长汇总对比报告 |
| dsh-better-sidebar + dsh-vision-toolkit | 编辑-预览-像素验证闭环 | better-sidebar 实时预览已保存文件，vision-toolkit 截屏后做像素级比对 |
| dsh-agent-teams + dsh-better-sidebar | 团队语义 + agent 拓扑真相 | agent-teams 看团队任务栈，better-sidebar 看子代理拓扑进程 |
| dsh-web-ui 任务看板 + dsh-agent-teams | 任务-团队双向追踪 | 看板"执行"触发新建团队，团队产出回写看板五列状态 |
| dsh-group-photo + dsh-vision-toolkit | 合影美化 | 为成员头像自动生成主题色调与前景抠图，校验头像合规性 |
| dsh-notification-center + dsh-attention-notifier | 双通道提醒 | 浏览器通知 + 任务栏闪烁，覆盖在窗口内与切走两种状态 |
| dsh-mcp-panel + anysearch-dsh | MCP 可观测 + 搜索 | mcp-panel 看 anysearch MCP server 状态，搜索异常一目了然 |
| dsh-context + dsh-mcp-panel | 上下文 + MCP 双视角 | context 看窗口构成，mcp-panel 看工具来源，定位上下文占用 |
| dsh-clawrouter + governed-workflow-for-dsh | 危险命令审查 + 治理工作流 | clawrouter 拦危险调用，governed-workflow 强制证据与审批 |
| dsh-auto-memory + dsh-session-hub | 跨机器记忆 | session-hub 聚合多机会话，auto-memory 跨会话保持长期记忆 |
| dsh-vision + dsh-image-subagent | 工具调用 + 委托读取 | dsh-vision 注册工具，dsh-image-subagent 让主模型贴图委托视觉子代理 |
| dsh-plugins-marketplace + awesome-dsh-plugins | 安装 + 证据 | awesome-dsh-plugins 查兼容性证据，marketplace 一键安装 |

---

## 相关文档

- [:material-tools: 插件开发指南](../plugin-dev/index.md) — 如何开发并发布自己的 DSH 社区插件
- [:material-compare: 竞品对比](../comparison/index.md) — DSH 与其它 Agent 框架的对比
- [:material-book-open: 使用指南](../usage/index.md) — DSH 通用使用指南与故障排查
- [:material-road-variant: 路线图](../roadmap/index.md) — DSH 主线版本路线与 developer preview 期 breaking changes 风险
