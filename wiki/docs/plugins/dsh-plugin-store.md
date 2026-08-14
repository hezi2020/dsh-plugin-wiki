# dsh-plugin-store

> **插件名**：dsh-plugin-store（DeepSeek Harness 插件商店）
> **来源仓库**：<https://github.com/yunhuantian/dsh-plugin-store>
> **许可证**：MIT
> **commit SHA**：`bf54e2f`（前 7 位）

一个深度集成于 Harness Web UI 的图形化插件商店：在原生界面中浏览、搜索、一键安装 GitHub 上的 DSH 插件（来源限定为标记 `topic: dsh-plugin` 或 `#dsh-plugin` 的仓库），并内置本地评分评论、依赖拓扑评估、操作审计日志与插件开发脚手架引导。

---

## 1. 使用指南

### 前置依赖

- Node `^22.19.0 || >=24.0.0`
- pnpm
- DSH Web profile（`dsh --profile web`）
- 可选：GitHub Token（设置页配置，缓解 GitHub API 限频：匿名搜索 10/min → 30/min，核心 60/h → 5000/h）
- peerDependencies：`@deepseek-ai/cordis ^4.0.1`、`@deepseek-ai/cordis-plugin-loader >=1.0.2 <2.0.0`、`@deepseek-ai/dsh-api-gateway ^0.1.0-rc.6`、`@deepseek-ai/dsh-client-* ^0.1.0-rc.6`、`@deepseek-ai/dsh-typert-protocol ^0.1.0-rc.6`、`react >=18.2.0 <20.0.0`

### 安装命令

来源：README「安装」。

```bash
# 在任意位置构建本包（需要 node >= 22.19 与 pnpm）
pnpm install
pnpm build        # 产出 lib/host/*.js 与 lib/client.js

# 安装到 web profile（dsh plugin 命令），随后刷新浏览器即可看到入口按钮
dsh plugin --profile web add <本包目录>
```

> 安装后侧边栏底部会出现「插件商店」按钮。首次使用请先在商店「设置」页点击「立即同步」，将 GitHub 上的 dsh-plugin 仓库镜像到本地数据库。

### 配置项

| 来源 | 字段 |
|---|---|
| cordis.patch.yml | 由 `dsh.bundle.patch` 声明，`dsh plugin add` 自动挂载进 profile 层栈 |
| 设置页 | GitHub Token（缓解 API 限频）、镜像同步（立即同步 / 定时同步） |
| 本地数据库 | `$DSH_HOME/storages/plugin-store/`（SQLite：镜像缓存 / 评分 / 审计） |

### 典型用法示例

1. 安装后刷新浏览器，侧边栏底部出现「插件商店」按钮（与常规功能按钮同尺寸）。
2. 进入商店：卡片式列表支持按 工具 / Agent / UI / 数据处理 分类筛选，按名称或描述关键词搜索，按评分 / 下载量 / 最近更新排序。
3. 点击插件卡片进入详情页：完整 README、使用说明、版本历史（GitHub Releases）、依赖信息、截图；一键安装 / 卸载 / 启用 / 禁用。
4. 详情页查看**依赖拓扑图**：红色入边为该插件依赖的底层库，蓝色出边为被哪些上层插件依赖，辅助卸载前评估影响范围。
5. **本地评分与评论**：对插件 1-5 星打分并撰写使用反馈（仅本机/本企业可见）。
6. **操作审计日志**：查看谁在什么时间执行了安装、卸载、启用、禁用、评分、Token 配置、镜像同步等操作，可筛选查询。

### 重启生效说明

!!! tip "安装/卸载经 Cordis HMR 热加载生效，无需重启"
    installer 通过 pnpm 完成安装/卸载，并写入 profile 的 `cordis.patch.yml`，由 Cordis HMR 热加载生效（无需重启）。出处：README「架构」。

---

## 2. 弊端与缺陷

!!! warning "定时镜像同步受 GitHub API 限频约束"
    定时镜像同步依赖 GitHub API，未配置 Token 时受匿名限频（搜索 10/min、核心 60/h）约束。需在设置页配置私人 Token 才能提升至 30/min（搜索）与 5000/h（核心）。出处：README「功能总览 - GitHub Token 配置」。

!!! warning "本地评分与评论仅本机/本企业可见，不与 GitHub 互通"
    本地评分与评论仅本机/本企业可见，与 GitHub 数据互补但不互通——无法形成跨组织的公共口碑。出处：README「功能总览 - 本地评分与评论」。

!!! warning "依赖拓扑图基于本地镜像数据，未同步的插件无拓扑信息"
    依赖拓扑图基于本地 SQLite 镜像数据，未同步的插件无拓扑信息；需先执行「立即同步」才能查看完整依赖关系。出处：README「功能总览 - 依赖拓扑图」「定时镜像同步」。

!!! warning "操作审计日志含操作者与时间，需妥善保管"
    操作审计日志完整记录谁在什么时间执行了安装、卸载、启用、禁用、评分、Token 配置、镜像同步等操作，满足企业合规要求，但日志本身含敏感信息需妥善保管。出处：README「功能总览 - 操作审计日志」。

---

## 3. 后续拓展思路

### 可二次开发的方向

- **跨组织评分聚合**：当前评分仅本地可见，可扩展为跨组织/跨企业的评分聚合机制（带隐私保护），形成公共口碑。
- **依赖拓扑自动影响分析**：在卸载前自动计算依赖链影响范围并给出建议（如「卸载 X 会影响 Y、Z」），降低误卸载风险。
- **插件开发脚手架集成**：商店内置的开发引导入口可进一步集成为一键创建插件模板并提交 PR 的全流程。

### 可对接的 DSH 能力

- **skill**：插件开发脚手架引导可封装为 DSH Skill，由 Agent 自然语言触发「创建一个新插件骨架」。
- **hooks**：安装/卸载/启用/禁用事件可经 hooks 触发企业合规告警与审计推送。
- **self-modification**：依赖拓扑评估可作为 self-modification 的安全护栏——Agent 自主卸载依赖前先评估影响范围。

### 与其它插件组合的可能性

- **dsh-plugin-store + dsh-plugin-hub**：store 负责发现/安装/评分/审计，hub 负责启用/停用/详情查看，互补覆盖插件全生命周期与企业合规需求。
- **dsh-plugin-store + dsh-bottom-bar**：用 bottom-bar 的费用统计反馈 store 安装的插件运行成本，结合 store 的审计日志形成成本-合规联合视图。
