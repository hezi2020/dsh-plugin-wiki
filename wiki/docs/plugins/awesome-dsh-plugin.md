# awesome-dsh-plugin

> **插件名**：awesome-dsh-plugin（Awesome DeepSeek Harness Plugin · DSH 插件精选列表）
> **来源仓库**：<https://github.com/awesome-dsh-plugin/awesome-dsh-plugin>
> **许可证**：CC0-1.0（Creative Commons Zero 1.0 Universal）
> **commit SHA**：`8ad0885`（前 7 位）

社区维护的 DeepSeek Harness（dsh）插件精选索引列表（Awesome List）。按 10 个分类（UI 增强 / 主题与外观 / 会话与消息 / 记忆 / 工具与能力 / 技能包 / 工作流与自动化 / 通知与集成 / 模型与账号接入 / 开发与运行时 / 娱乐）收录可通过 `dsh plugin add` 安装的社区插件，配套静态站点（中英双语）与构建脚本。**本仓库本身不是插件 bundle**，不能用 `dsh plugin add` 安装。本次克隆时 README 标注共 **271** 个插件。

---

## 1. 使用指南

### 前置依赖

- 无运行时依赖（仓库为索引列表 + 静态站点构建脚本）。
- 浏览收录内容推荐：DeepSeek Harness + dsh-market（设置页内逛 / 搜 / 一键安装）或 dsh-find-plugin（让 agent 找插件），二者均来自本列表条目。

!!! warning "本仓库不是插件 bundle，无法用 dsh plugin add 安装"
    本仓库为 Awesome List 索引，`package.json` 未声明 `dsh.bundle` / `dsh.client` manifest，不能用 `dsh plugin add` 安装。要装的是列表里收录的其它插件。出处：`package.json`（无 `dsh` 字段）、README 顶部说明。

### 安装命令

```sh
# 本仓库只是索引，克隆下来用于浏览 / 贡献
git clone https://github.com/awesome-dsh-plugin/awesome-dsh-plugin.git
```

推荐通过本列表收录的 **dsh-market** 在 DSH 内浏览 / 搜索 / 一键安装社区插件：

```sh
dsh plugin --profile web add dshmarket
```

或用 **dsh-find-plugin** 让 agent 帮你找插件：

```sh
dsh plugin --profile web add dsh-find-plugin
```

### 配置项

无（仓库为静态索引，无运行时配置）。

### 典型用法示例

**人类浏览**：直接看 `README.md`（英文）/ `README.zh.md`（中文），或访问静态站点 <https://awesome-dsh-plugin.com>（含分类、added-dates、stars、npm-map 元数据）。条目格式 `- [owner/repo](https://github.com/owner/repo) — 一句话描述`。

**Agent 检索**：装 dsh-find-plugin 后，agent 可按关键词 / 分类搜索本精选 registry，返回描述与可直接执行的安装命令。

**贡献收录**：按 `contributing.md` 要求，在 `README.md` 与 `README.zh.md` 对应分类下各加一行 PR；同时建议给仓库加 `dsh-plugin` topic。

### 重启生效说明

!!! tip "条目合并后网站自动重建"
    `contributing.md` 说明 PR 合并后网站自动重建（`.github/workflows/build-site.yml`），无需改动其他文件。

---

## 2. 弊端与缺陷

!!! warning "收录不构成背书，安装即在本机运行第三方代码"
    README「Disclaimer / 免责声明」明确：本项目是社区维护的索引，插件由各自作者开发与维护，收录不构成背书，亦不对任何插件的安全性、质量或维护状态作出保证。安装插件即在本机运行第三方代码——请自行审阅源码、风险自担。本项目与 DeepSeek 无隶属关系。出处：README「Disclaimer」/「免责声明」。

!!! warning "收录门槛要求 dsh.bundle manifest，仅声明 dsh.client 不算可安装"
    `contributing.md` 明确：仓库 `package.json` 需声明 `dsh.bundle` manifest（monorepo 根包或子包声明亦可），否则无法通过 `dsh plugin add` 安装；最常见的被拒原因是只声明了 `dsh.client`。这意味着部分仅含浏览器 UI 的纯客户端插件如果未补 `bundle.patch`，无法被本列表按"可安装"收录。出处：`contributing.md`「Adding a plugin」。

!!! warning "条目数随社区变化，需以仓库实时状态为准"
    本次克隆时 README 标注 **271** 个插件；条目会随 PR 增长与失效项目定期清理而变化，引用具体数字时需复核当前 README。出处：README 顶部「271 plugins · 271 个插件」。

!!! warning "推荐项（dsh-market / dsh-find-plugin）由不同作者维护，与本仓库无统一步调"
    README 顶部推荐先装 dsh-market 或 dsh-find-plugin，二者由不同作者维护，与本仓库的版本节奏、收录口径独立；若其与最新列表存在偏差，以本仓库 README 为准。出处：README 顶部推荐块。

---

## 3. 后续拓展思路

### 可二次开发的方向

- **分类自动化校验**：在 `build-site.yml` 中加入 lint，校验条目格式、链接可达性、`dsh.bundle` 声明存在性，降低人工审核成本。
- **元数据可视化**：`data/added-dates.json` / `data/stars.json` / `data/npm-map.json` 已沉淀，可扩出"最近新增 / 高星 / 下载量"动态榜单页。
- **多语言扩展**：当前为中英双语，可借助 dsh-find-plugin 思路让 agent 按用户语言返回条目描述。

### 可对接的 DSH 能力

- **dsh-market**：列表的"装入 DSH"形态——浏览 / 搜索 / 一键安装 / 更新 / 卸载，多数插件免重启即刻生效。
- **dsh-find-plugin**：列表的自然语言检索层——agent 按关键词 / 分类返回描述与安装命令。
- **agent-presets / skill**：可把"按场景推荐插件组合"封装为 skill（如"Vibe Coding 起步包""安全审查套件"），让 agent 一键装配。

### 与其它插件组合的可能性

- **awesome-dsh-plugin + dsh-recommend**：dsh-recommend 已对本列表生态做透明排行与推荐（每日抓取 `dsh-plugin` 话题、公开评分模型）；本仓库可作为其权威数据源。
- **awesome-dsh-plugin + dsh-plugin-check**：收录前用 dsh-plugin-check 跑健康检查（manifest 协议 / patch 格式 / 构建陷阱），把检查结果作为收录门槛之一。
- **awesome-dsh-plugin + dsh-security-audit**：装新插件前用 dsh-security-audit 跑只读脱敏风险报告，对应 README"自行审阅源码、风险自担"的免责建议。
