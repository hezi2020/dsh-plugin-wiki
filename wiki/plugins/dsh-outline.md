# dsh-outline

> **插件名**：dsh-outline（DSH Web GUI 实时大纲插件）
> **来源仓库**：<https://github.com/urzeye/dsh-outline>
> **许可证**：MIT（package.json 声明）
> **commit SHA**：`16919b7`（前 7 位）

DeepSeek Harness（DSH）Web GUI 的实时大纲插件：在会话页面提供「用户问题 + Markdown 标题（1~6 级）」的大纲树面板。流式生成时实时更新，点击节点滚动定位并高亮当前阅读位置。

---

## 1. 使用指南

### 前置依赖

- Node >= 20
- DSH Web profile（`dsh --profile web`）
- peerDependencies：`@deepseek-ai/cordis ^4.0.1`、`@deepseek-ai/dsh-client-runtime ^0.1.0-rc.6`、`@deepseek-ai/dsh-client-locale ^0.1.0-rc.6`、`@deepseek-ai/dsh-client-ui-slots ^0.1.0-rc.6`、`@deepseek-ai/dsh-client-ui-conversation ^0.1.0-rc.6`、`@deepseek-ai/dsh-client-ui-layout ^0.1.0-rc.6`、`react ^18.2.0`、`react-dom ^18.2.0`
- 开发：pnpm（`packageManager: pnpm@11.7.0`）

### 安装命令

来源：README「安装」。

```sh
# 从 npm 安装（推荐）
dsh plugin --profile web add dsh-outline

# 从 tarball 安装（无需发布 npm，也不需要任何构建授权）
pnpm pack
dsh plugin --profile web add ./dsh-outline-0.1.0.tgz

# 从 GitHub 安装
dsh plugin --profile web add github:urzeye/dsh-outline

# 本地路径安装（开发调试）
dsh plugin --profile web add /path/to/dsh-outline
```

卸载：

```sh
dsh plugin --profile web remove dsh-outline
```

> 从 GitHub 安装时，pnpm ≥10 在得到显式允许前拒绝运行 git 依赖的 `prepare`，首次 `add` 会失败并提示修法：把包键加入该 profile 的 `pnpm-workspace.yaml` 后重试（来源：README「从 GitHub 安装」）：
>
> ```yaml
> # $DSH_HOME/profiles/web/pnpm-workspace.yaml
> allowBuilds:
>   dsh-outline: true
> ```
>
> 注意：这表示允许该包的代码在安装时在你的机器上执行。只对可信来源授权，并锁定 commit。

### 配置项

| 来源 | 字段 |
|---|---|
| cordis.patch.yml | 由 `dsh.bundle.patch` 声明，`dsh plugin add` 自动挂载进 profile 层栈 |
| dsh.plugin.json | `id: dsh-external/dsh-outline`、`client.main: ./lib/client-registry.js`、`contributes.tools: []`、`contributes.skills: []` |
| 面板交互 | 层级滑块（0~6 档展开深度）、节点单独展开/收起、关键词搜索、按会话收藏、面板固定常驻/拖拽移动 |

### 典型用法示例

1. 启动 `dsh web`，打开任意会话页。
2. 鼠标悬停会话页右缘的大纲触发条，即可预览大纲面板。
3. 点击触发条或面板右上角的固定按钮，将面板固定常驻；拖动标题栏移动位置（拖动即固定）。
4. 面板内：
   - 点节点跳转正文；
   - 顶部滑块调整展开层级（0~6 档）；
   - 节点行内提供展开/收起与收藏按钮；
   - 支持关键词搜索。

### 重启生效说明

!!! tip "host 半变更需重启 dsh web，client 改动经 pnpm watch HMR 生效"
    安装后重启 `dsh web` 生效（host 半在启动时加载）。link 安装后 client 改动经 `pnpm watch` 重建即可 HMR 生效；host 半变更需重启 `dsh web`。出处：README「安装」「本地路径安装」。

---

## 2. 弊端与缺陷

!!! warning "只做 client 半 UI 插件，不向模型暴露工具，不动 agent loop"
    本插件只做 client 半 UI 插件 + 极简 host 挂载；不向模型暴露工具（`contributes.tools: []`），不动 agent loop——无法通过 Agent 自然语言触发大纲操作。出处：dsh.plugin.json、AGENTS.md「硬性约束」。

!!! warning "从 GitHub 安装时 pnpm ≥10 拒绝运行 prepare，首次 add 会失败"
    pnpm ≥10 在得到显式允许前拒绝运行 git 依赖的 `prepare` 脚本，首次 `add` 会失败——需在 `pnpm-workspace.yaml` 显式 `allowBuilds: { dsh-outline: true }`，且这表示允许该包代码在安装时执行。出处：README「从 GitHub 安装」。

!!! warning "面板依赖 DSH 稳定属性定位 DOM，DSH 升级可能需同步适配"
    面板为 `shell.overlay` 浮层，DOM 定位只用 `data-chat-*` / `data-slot` / `data-testid` 稳定属性——DSH 升级若改这些属性需同步适配。出处：AGENTS.md「硬性约束」。

!!! warning "交互形态移植自 Ophel 浏览器扩展，非原创设计"
    交互形态移植自 Ophel（浏览器扩展），非原创交互设计；插件形态遵循 DSH 官方打包与安装约定，参考 DSH-better-sidebar。出处：README 顶部说明。

---

## 3. 后续拓展思路

### 可二次开发的方向

- **大纲导出与分享**：当前大纲仅用于会话内导航，可扩展为导出为 Markdown 目录或分享链接，辅助长会话复盘。
- **大纲节点标注与折叠记忆**：可引入大纲节点标注（类似书签备注）与跨会话的折叠状态记忆，提升长对话管理效率。
- **多会话大纲聚合**：当前按单会话生成大纲，可扩展为多会话大纲聚合视图，辅助跨会话主题检索。

### 可对接的 DSH 能力

- **skill**：大纲生成逻辑（`src/core/` 纯逻辑）可封装为 DSH Skill，由 Agent 自然语言触发「生成当前会话大纲」。
- **hooks**：会话切换事件可经 hooks 触发大纲面板的自动刷新与收藏同步。
- **self-modification**：`src/core/` 只放纯逻辑、DSH API 调用只出现在适配层的架构纪律，可作为 self-modification 的可测试性范式——核心逻辑与平台耦合分离。

### 与其它插件组合的可能性

- **dsh-outline + dsh-bottom-bar**：outline 提供会话结构导航，bottom-bar 提供会话成本反馈，组合形成「结构 + 成本」双视图。
- **dsh-outline + dsh-better-sidebar**：outline 的浮层面板与 better-sidebar 的工作台 tab 可互补——better-sidebar 提供文件/终端/Git，outline 提供会话内结构导航。
- **dsh-outline + dsh-plugin-hub**：用 hub 管理 outline 的启用/停用，outline 辅助 hub 文档的快速定位。
