# dsh-science-workbench

> **插件名**：dsh-science-workbench
> **来源仓库**：<https://github.com/poplarity/dsh-science-workbench>
> **许可证**：MIT（Copyright (c) 2026 dsh-science-workbench contributors）
> **commit SHA**：`034629e9263e578e78dbe9660c10536d5fde350c`（前 7 位 `034629e`）

面向 DeepSeek Harness 的可复现科学工作台插件：Jupyter 式的 cell 与内联图，由 agent 驱动，具备 Nextflow/nf-core 级的 provenance。

> **核心承诺**：每张图、每个分析产物都可溯源、可重放——能回答「它 = 哪段代码 + 哪些输入 + 什么环境 + 什么参数/种子」，并一键重跑。

---

## 1. 使用指南

### 前置依赖

- DSH Web profile（双面包 Host + Client，需 `dsh.client.platform: web`）
- peer 依赖：
  - `@deepseek-ai/cordis@^4.0.1`
  - `@deepseek-ai/dsh-tools@^0.1.0-rc.6`
- 运行时宿主能力（design.md 已用 inspect 确认）：
  - `ctx.get('shell')` 提供子进程执行
  - `ctx.get('fs')` 提供 `resolve` / `readText` / `writeText` / `listDir` / `readBytes`（无 `mkdir`，目录创建走 shell `mkdir -p`）
  - `ctx.get('webServer')` 服务 `/biowb/*` 路由
- 系统层：
  - Python（Windows 自动用 `python`，POSIX 用 `python3`）
  - shell 按平台切换方言（macOS/Linux 用 bash，Windows 用 PowerShell）
  - `shasum -a 256`（用于 SHA-256 哈希，因宿主无 crypto 内建）
  - git（项目自动 `git init` + 每步本地 commit）
- 可选：视觉模型 endpoint（Qwen-VL / GLM-4V / GPT-4o / Claude / 本地 Ollama），用于 Tier 1 视觉 reviewer；不配置则不做

### 安装命令

```bash
# 本地开发（从源码目录）：
dsh plugin --profile web add file:/path/to/dsh-science-workbench

# 从 npm（发布后）：
dsh plugin --profile web add dsh-science-workbench
```

> `dsh plugin` 是对 pnpm 的薄封装：把包装进 profile 并自动加进 `dsh.profile.bundles`（因为本包声明了 `dsh.bundle.patch`）。安装后重启 `dsh web`，`bio_*` 工具全局可用、「分析工作台」标签页出现、插件在「设置 → 插件」里可见。

仓库根目录无构建步骤，已预构建产物 `lib/index.js`（Host 半）+ `lib/client.js`（Client 半）；lint 命令为 `node --check lib/index.js`。

### 配置项

| 来源 | 字段 |
|---|---|
| `package.json` 的 `dsh.bundle` | `patch`（`./cordis.patch.yml`） |
| `package.json` 的 `dsh.client` | `platform: web`、`inject`（`@deepseek-ai/dsh-client-runtime`、`@deepseek-ai/dsh-client-ui-slots`） |
| 运行时 | 项目根目录默认 `~/bio-projects/<name>/`（可用 `bio_set_projects_dir` 修改）；`bio_init_project` 创建目录骨架 + `manifest.json` + `environment.lock` + `git init` |
| cell 契约（脚本头声明块） | `@cell`、`@title`、`@language`、`@seed`、`@params`（JSON）、`@inputs`（JSON 数组）、`@outputs`（JSON 数组，图必须写到 `figures/` 下） |

项目目录结构（来自 `SKILL.md`）：

```
<workspace>/bio-projects/<name>/
├─ manifest.json        # 唯一事实来源（账本）：cells + artifacts + provenance + 反馈
├─ environment.lock     # 环境快照（interpreter 版本 + pip freeze）
├─ code/                # 每个 cell 一个自包含脚本 cell_0001.py / cell_0001_v2.py ...
├─ data/                # 输入数据（引用或副本）
├─ figures/             # 图产物（.png 等，可配 .data.tsv 原始绘图数据）
└─ .git/                # 项目自动 git（每次 cell 跑完/反馈 自动本地 commit，不 push）
```

### 典型用法示例

8 个 agent 工具（README「Tools」）：

| 工具 | 作用 |
|---|---|
| `bio_init_project` | 建项目（目录骨架 + manifest + 环境快照 + git init） |
| `bio_run_cell` | 跑一个自包含 cell，出图并登记 provenance |
| `bio_rerun_cell` | 带编辑代码重跑，生成派生版本（v1 → v2 → v3） |
| `bio_add_feedback` | 记录结构化反馈到 artifact |
| `bio_get_project` / `bio_list_projects` | 查账本 |
| `bio_set_projects_dir` | 修改项目根目录 |
| `bio_delete_cell` | 删除 cell |

使用流程（README「Usage flow」）：

1. `bio_init_project` 建项目；
2. `bio_run_cell` 跑分析出图（图写进 `figures/`）；
3. 看内联图 → `bio_add_feedback` 记录 → `bio_rerun_cell` 带编辑重画；
4. 打开「分析工作台」标签页看 notebook / 产物 / 反馈。

cell 脚本头声明块示例（来自 `examples/tss_profile/cell_0001_tss_profile.py`）：

```python
# @cell: cell_0001
# @title: TSS profile (control vs treatment)
# @language: python
# @seed: 42
# @params: {"upstream": 3000, "downstream": 3000, "bins": 100}
# @inputs: []
# @outputs: ["figures/tss_profile.png"]
```

数据流（README「Data flow」）：Host 是单一事实来源，项目数据 / manifest / provenance 都在磁盘；Client 是纯投影，浏览器经同源 `fetch('/biowb/<method>')` 读写，由 Host 通过 `webServer` 服务这些路由——不依赖 typert Remote 桥，因此不需要 Harness monorepo 构建。

### 重启生效说明

!!! tip "安装后需重启 dsh web"
    安装该插件后重启 `dsh web`，`bio_*` 工具才全局可用、「分析工作台」标签页才会出现、插件才在「设置 → 插件」里可见。

!!! tip "项目根目录可用 bio_set_projects_dir 修改"
    默认 `~/bio-projects/<name>/`；若想落到会话工作区下，用 `bio_set_projects_dir` 改路径。

!!! tip "图必须写到 figures/ 下才能被自动发现"
    cell 契约约定图产物必须写到 `figures/` 下（相对项目根路径），运行后才能自动被发现并登记 provenance。非图中间产物通过 `@outputs` 显式声明。

---

## 2. 弊端与缺陷

!!! warning "版本 0.1.0 (unreleased)，初始原型"
    CHANGELOG 明示「初始原型：动态 Cordis 插件」，尚未发布到 npm。出处：`CHANGELOG.md`「0.1.0 (unreleased)」。

!!! warning "沙箱策略硬编码 danger-full-access"
    原型为绕过 macOS `sandbox-exec` 的 scrubbed-PATH/cwd ENOENT，在 `runShell` 里硬编码 `danger-full-access`；Phase 2 改为解析会话真实模式。当前在受限沙箱环境下可能行为不符合预期。出处：`docs/design.md`「七、后续」。

!!! warning "workspace root 解析偏差"
    原型用 `sandboxPolicy.workspaceRoot` = DSH 启动 cwd，项目落到了 `~/bio-projects/` 而非会话工作区下；Phase 2 对齐会话 workspace。出处：`docs/design.md`「七、后续」。

!!! warning "环境锁定精度不足（pip freeze + python3 硬编码）"
    原型当前用 `pip freeze` 快照 + `python3` 硬编码；Phase 2 改为 `uv.lock` / `renv` 精确环境锁定。当前环境锁可能不足以保证严格复现。出处：`docs/design.md`「七、后续」。

!!! warning "无 crypto 内建，依赖 shasum 命令"
    哈希通过 shell `shasum -a 256` 实现，依赖宿主环境的 `shasum` 命令可用；若环境无 `shasum`（如某些 Windows 默认环境）哈希步骤会失败。出处：`docs/design.md`「五、后端契约要点」。

!!! warning "fs 无 mkdir，依赖 shell mkdir -p"
    目录创建走 shell `mkdir -p`，依赖宿主 shell 服务可用；shell 服务不可用时项目初始化会失败。出处：`docs/design.md`「五、后端契约要点」。

!!! warning "Tier 1 视觉 reviewer 需配置视觉模型 endpoint"
    视觉自检 Tier 1 是可插拔的，需配置视觉模型 endpoint（Qwen-VL / GLM-4V / GPT-4o / Claude / 本地 Ollama）；不配置时不做，仅 Tier 0 + 人审。出处：`SKILL.md`「7. 视觉自检 Tier 1」。

!!! warning "集群执行未实现（仅本地执行）"
    执行位置本地优先；集群执行（对接现有 chipseq-cluster / cluster-ssh）是后续 TODO。出处：`docs/design.md`「二、19 项决策」第 7 项、「七、后续」。

!!! warning "缓存复用未实现"
    重跑带编辑 + 自动重跑下游（依赖图从 manifest 拿）；缓存复用未实现，每次重跑都全新子进程。出处：`docs/design.md`「二、19 项决策」第 16 项。

!!! warning "自动 commit 不 push 到远端"
    每个项目自动 `git init`，每步自动本地 commit，**不 push** 到远端；若需协作或备份需手动配置 remote 并 push。出处：README「Features」、`SKILL.md`「1. 项目布局」。

!!! warning "R 按需降级，Python 为主"
    语言栈 Python 主 + R 按需降级；R 支持非默认路径，需自行验证。出处：`docs/design.md`「二、19 项决策」第 4 项。

---

## 3. 后续拓展思路

### 可二次开发的方向

design.md「七、后续（Phase 2）」已列出明确的演进方向：

- **静态插件包 + 组合挂载永久化**：从动态 Cordis 插件走向开源 npm 包永久形态。
- **集群执行**：对接现有 chipseq-cluster / cluster-ssh，把执行位置从本地扩展到集群。
- **缓存复用 + 依赖图失效判定**：基于 manifest 的依赖图做缓存命中判定，避免每次重跑都全新子进程。
- **Tier 1 视觉 reviewer 实装**：配置视觉模型 endpoint 后，出图后调用它审图，检查标签重叠 / 图例缺失 / 字体过小 / 坐标轴单位 / 色盲配色 / dpi 不足 / 统计标注位置，发现机械问题先自改一轮再给用户看。
- **导出容器配方**：生成 Dockerfile / Apptainer def，把 `environment.lock` 固化为可移植容器。
- **uv.lock / renv 精确环境锁定**：替换当前的 `pip freeze` 快照 + `python3` 硬编码。
- **沙箱策略正确解析**：把硬编码的 `danger-full-access` 改为解析会话真实模式。
- **workspace root 解析**：对齐会话 workspace，让项目落到会话工作区下而非 `~/bio-projects/`。

### 可对接的 DSH 能力

- **skill**：仓库已带 `skills/bio-workbench/SKILL.md` 约定 skill，规定项目布局 / cell 契约 / manifest 规范 / 图审约定 / 循环流程；触发词：生信项目、分析工作台、bio_run_cell、可复现出图、manifest、cell 契约、反馈重画。
- **hooks**：可在 `bio_run_cell` 出图后通过 hooks 触发外部通知（如 IM 推送图审结果）；`bio_rerun_cell` 派生版本生成也可经 hooks 触发下游联动。
- **self-modification**：每个 cell 的「反馈 → 改代码 → 重跑 → 派生新版本」循环本身就是 self-modification 范式——Agent 自主落 cell + 「点开改代码→重跑」逃生舱，版本链 v1 → v2 → v3 由 `derivedFrom` 记录。

### 与其它插件组合的可能性

- **dsh-science-workbench + dsh-agent-plugins**：用 `dsh-agent-plugins` 装入更多生信相关的 Agent Plugins 包（如外部 SKILL.md / MCP server），扩展工作台的工具能力。
- **dsh-science-workbench + dsh-easyssh**：若分析需在远程服务器跑（如大型 chipseq-cluster），可用 `dsh-easyssh` 把执行位置延伸到远程 SSH 主机，弥补当前仅本地执行的短板。
- **dsh-science-workbench + Zalpha263-dsh-file-explorer**：用 file-explorer 浏览 `bio-projects/<name>/` 项目目录，查看 `code/` / `figures/` / `manifest.json` 等产物，与「分析工作台」tab 互补。
- **dsh-science-workbench + dsh-web-preview-float**：把 `figures/*.png` 在悬浮预览窗里并排对比 v1 / v2 / v3 派生版本，方便人审。
