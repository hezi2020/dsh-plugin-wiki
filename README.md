# DeepSeek Harness (DSH) 插件生态百科与竞品对比手册

[![GitHub](https://img.shields.io/badge/GitHub-dsh--plugin--wiki-blue?logo=github)](https://github.com/hezi2020/dsh-plugin-wiki)
[![Topic](https://img.shields.io/badge/topic-dsh--plugin-ff69b4)](https://github.com/topics/dsh-plugin)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)

> **一站式 DSH 社区资源百科** — 快速上手 DeepSeek Harness、对比竞品差异、收录每个社区插件的用法/缺陷/拓展性详解。

---

## 项目定位

本项目以 **DeepSeek Harness**（DSH）为核心，提供三大价值：

### 1. 快速入门 Harness

- [安装与使用指南](wiki/docs/usage/installation.md) — 从零开始搭建 DSH 开发环境
- [CLI 命令参考](wiki/docs/usage/cli.md) — 常用命令速查
- [Web UI 操作](wiki/docs/usage/web-ui.md) — 图形界面使用说明
- [Python SDK](wiki/docs/usage/python-sdk.md) — 通过 Python 调用 DSH 能力
- [运行时模式](wiki/docs/usage/runtime-modes.md) — 理解 headless/web 等模式差异
- [配置与 Profile](wiki/docs/usage/configuration.md) — 如何配置模型、Provider、插件等

### 2. 竞品对比分析

系统对比 DSH 与主流 AI 编码代理工具，所有结论源自官方文档，可溯源：

| 竞品 | 定位 | 对比页面 |
|------|------|----------|
| [Trae](wiki/docs/comparison/trae.md) | 字节跳动闭源商业 IDE/工作台 | [对比详情](wiki/docs/comparison/trae.md) |
| [OpenAI Codex CLI](wiki/docs/comparison/codex-cli.md) | 开源 Apache-2.0，Rust 构建的本地终端代理 | [对比详情](wiki/docs/comparison/codex-cli.md) |
| [Claude Code](wiki/docs/comparison/claude-code.md) | Anthropic 闭源商业智能体编码工具 | [对比详情](wiki/docs/comparison/claude-code.md) |
| [Pi Agent](wiki/docs/comparison/pi.md) | 开源 MIT 极简终端编程脚手架 | [对比详情](wiki/docs/comparison/pi.md) |

**核心对比维度**：架构设计、插件机制、模型支持、开源协议、沙箱隔离、MCP 支持、社区活跃度等 17 个维度。
- [对比矩阵](wiki/docs/comparison/matrix.md) — 横评一览表
- [优势与缺陷小结](wiki/docs/comparison/summary.md) — DSH 的定位与适用场景

### 3. 社区插件百科

收录 **54 个** DSH 社区插件，每个插件均有 **三段式文档**：

1. **使用指南** — 安装方式、核心能力、配置参数
2. **弊端与缺陷** — 已知限制、兼容性问题、安全注意事项（均标明出处）
3. **后续拓展思路** — 可能的改进方向、可扩展点

[查看完整插件目录](wiki/docs/plugins/index.md)

#### 插件分类速览

| 分类 | 代表插件 | 数量 |
|------|----------|------|
| 协作与团队 | dsh-agent-teams, dsh-track | 2 |
| 会话与上下文 | dsh-session-hub, dsh-context, dsh-auto-memory | 5 |
| 可观测与通知 | dsh-mcp-panel, dsh-bottom-bar, dsh-outline | 5 |
| 视觉与媒体 | dsh-vision-toolkit, modlens, dsh-imagecraft | 7 |
| UI 美化与主题 | dsh-web-ui, dsh-gui-customization, deepseek-harness-themes | 6 |
| 文件与工作台 | dsh-better-sidebar, dsh-file-explorer, dsh-work | 3 |
| 搜索与网络 | anysearch-dsh, dsh-net-proxy, ego-browser | 4 |
| GitHub 与工作流 | dsh-github, dsh-clawrouter, dsh-humanizer, TokenLedger | 5 |
| 插件市场与管理 | dsh-plugins-marketplace, dsh-plugin-hub, dsh-plugin-store | 7 |
| 桌面与扩展（非标准 bundle） | deepseek-harness-desktop, jacobian, Mobius 等 | 9 |

#### 自研插件

- **[dsh-wiki-entry](plugins/dsh-wiki-entry/)** — DSH Web UI 右上角 Wiki 入口：首次点击自动启动本地 Wiki 静态服务器（端口 8099，`/wiki` 前缀）并打开，设置 → 插件 中可持久化开关。

---

## 插件安装

### 方式一：通过 DSH 插件命令安装（推荐）

```bash
# 安装本仓库的 dsh-wiki-entry 插件（本地路径）
dsh plugin --profile web add <本仓库克隆路径>/plugins/dsh-wiki-entry

# 或按插件文档中的 npm / GitHub 安装方式
dsh plugin add @some-org/dsh-xxx              # npm 包
dsh plugin add github:author/repo             # GitHub 仓库
dsh plugin add file:<本地路径>                 # 本地目录
```

### 方式二：通过插件市场/商店安装

- [dsh-plugins-marketplace](wiki/docs/plugins/dsh-plugins-marketplace.md) — Web GUI 一键浏览/安装/更新
- [dsh-plugin-hub](wiki/docs/plugins/dsh-plugin-hub.md) — 插件管理面板 + GitHub 市场
- [dsh-plugin-store](wiki/docs/plugins/dsh-plugin-store.md) — 图形 app-store

> 每个插件的具体安装方式、依赖与兼容性要求，请查看 [插件百科](wiki/docs/plugins/index.md) 中对应插件的「使用指南」段落。

---

## 目录结构

```
├── wiki/                     # MkDocs 文档站点
│   ├── docs/                 # 文档源文件（Markdown）
│   │   ├── index.md          # 首页
│   │   ├── usage/            # 使用指南
│   │   ├── development/      # 开发指南
│   │   ├── plugin-dev/       # 插件开发指南
│   │   ├── dev-tutorial/     # 开发教程
│   │   ├── reference/        # 参考文档
│   │   ├── plugins/          # 社区插件百科（54 个插件文档）
│   │   └── comparison/       # 竞品对比
│   ├── mkdocs.yml            # MkDocs 配置
│   └── site/                 # 编译后的静态站点
├── plugins/                  # 社区插件源码（按 author-repo 组织）
│   ├── Ceelog-dsh-plugins/
│   ├── Acidmoon-DIzzy-DSH/
│   ├── liustack-modlens/
│   └── ...                   # 更多插件
├── .gitignore
└── README.md                 # 本文件
```

---

## 本地预览

```bash
# 安装 MkDocs 和 Material 主题
pip install mkdocs mkdocs-material

# 进入 wiki 目录
cd wiki

# 启动本地预览
mkdocs serve
```

访问 `http://localhost:8000` 即可浏览完整文档站点。

---

## 贡献指南

欢迎任何形式的贡献！

1. **发现文档错误或遗漏** → 提 [Issue](https://github.com/hezi2020/dsh-plugin-wiki/issues) 或直接 PR
2. **新增插件文档** → 按 `wiki/docs/plugins/` 目录下的模板格式编写 Markdown，需包含使用指南、弊端与缺陷、拓展思路三段
3. **更新插件源码** → 将插件源码放入 `plugins/` 对应目录，提交 PR
4. **竞品对比更新** → 更新 `wiki/docs/comparison/` 下的对应文档，确保每条结论有官方文档链接溯源

### 文档编写规范

- 每个插件文档顶部需包含元信息：插件名、来源仓库链接、许可证、commit SHA
- 弊端用 `!!! warning` 标注，并标明出处（README 章节/源码文件）
- 非标准 DSH 插件 bundle 需如实说明其性质（独立服务/桌面壳/学习仓库/索引集合等）

---

## 相关资源

- [DeepSeek Harness 官方仓库](https://github.com/deepseek-ai/deepseek-harness)
- [DSH 插件官方文档](https://dsh-docs.vercel.app/)
- [GitHub dsh-plugin 话题](https://github.com/topics/dsh-plugin)

---

## 许可证

本项目内容采用 [MIT](LICENSE) 许可证开源。各插件源码的许可证请见对应插件目录下的 LICENSE 文件。