# awesome-dsh-plugins

> **插件名**：awesome-dsh-plugins（Awesome DSH Plugins 生态雷达）
> **来源仓库**：<https://github.com/AdamPlatin123/awesome-dsh-plugins>
> **许可证**：MIT（Copyright (c) 2026 AdamPlatin123 & Awesome DSH Plugins contributors；README 末尾声明「当前仓库尚未声明许可证」，但根目录存在 MIT LICENSE 文件，以 LICENSE 文件为准）
> **commit SHA**：`87844a6`

自动发现、证据验证的 DeepSeek Harness 插件生态雷达：每 8 小时扫描 GitHub `dsh-plugin` topic 与 `dsh-external` 组织，对候选仓库做清单 / 静态兼容 / 编译 / 运行四级验证，输出日期化证据报告与分类目录。

---

## 1. 使用指南

### 前置依赖

- 无运行时依赖（本仓库为索引 / 雷达仓库，不提供可安装的 DSH 插件 bundle）
- 浏览器可访问 GitHub（浏览目录与报告）
- 维护者：Node、`scripts/` 下的发现 / 检查 / 测试 / 渲染脚本

### 安装命令

!!! warning "非标准 DSH 插件 bundle"
    本仓库**非标准 DSH 插件 bundle**，不通过 `dsh plugin add` 安装。它是生态索引 / 雷达仓库，使用方式为直接浏览 README / PLUGINS.md / `reports/` 目录。出处：PLUGIN.md 安装命令说明。

如需本地查看完整报告：

```bash
git clone https://github.com/AdamPlatin123/awesome-dsh-plugins.git
cd awesome-dsh-plugins
# 浏览 PLUGINS.md（人工分类精选）
# 浏览 reports/<日期>/（完整扫描索引与兼容矩阵）
# 浏览 CHANGELOG.md（日期化生态变更摘要）
```

### 配置项

| 来源 | 字段 |
|---|---|
| 源材料未提及 | 本仓库为索引仓库，无运行时配置项 |

### 典型用法示例

| 你的目标 | 跳转入口 |
|---|---|
| 看热门插件 | README「🔥 Star Top 20」 |
| 按用途找一个插件 | PLUGINS.md — 9 大功能领域 + 兼容性状态 |
| 浏览自动发现的全部仓库 | README「当前生态快照」 — 日期化兼容矩阵 |
| 了解最近发生了什么 | CHANGELOG.md |
| 登记或提交插件 | README「给插件开发者」— 加 `dsh-plugin` topic → 8h 自动收录 |

最小可复现样例：打开仓库首页 → 查看自动收录数（截至 2026-08-14，124 个仓库）→ 点击「待调研」分类下的某个插件 → 跳转其仓库 → 自行安装验证。

### 重启生效说明

!!! tip "本仓库为静态索引，无服务进程需重启"
    本仓库为索引 / 雷达仓库，无服务进程，无需重启。扫描脚本由维护者通过 GitHub Actions 每 8 小时自动执行，普通用户直接浏览即可。

---

## 2. 弊端与缺陷

!!! warning "收录不等于兼容，静态检查不等于运行可用"
    收录不等于兼容，静态检查不等于运行可用，运行可用也不等于安全审计——本仓库提供可追溯的筛选信号，不代表 DSH 官方背书。安装第三方插件前需自行检查插件源码、权限、依赖、许可证及测试日期。出处：PLUGIN.md 已知限制、README 顶部 `[!IMPORTANT]`。

!!! warning "mainline 与插件都在快速变化，旧结论可能很快失效"
    mainline 和插件都在快速变化，旧结论可能很快失效。出处：PLUGIN.md 已知限制、README「已知边界」。

!!! warning "静态未发现问题不代表真实运行一定成功"
    静态未发现问题不代表真实运行一定成功；编译失败可能来自测试环境、缺失依赖或配置错误，不应自动等同于 API 不兼容。出处：PLUGIN.md 已知限制、README「已知边界」。

!!! warning "运行级实测覆盖极低"
    当前运行级实测：0 可用 · 5 失败（共测试 5 个），运行级覆盖极低；运行成功只覆盖报告中的最小任务，不代表全部功能、平台和配置。出处：PLUGIN.md 已知限制、README「当前生态快照」。

!!! warning "LLM 摘要仅用于导航，不能替代原始矩阵和日志"
    自动生成的 LLM 摘要只用于导航，不能替代原始矩阵和日志。出处：PLUGIN.md 已知限制、README「已知边界」。

!!! warning "README 与 LICENSE 声明不一致"
    README 末尾声明「当前仓库尚未声明许可证」，但根目录存在 MIT LICENSE 文件（Copyright (c) 2026 AdamPlatin123），以 LICENSE 文件为准。出处：PLUGIN.md 已知限制、README 末尾「项目边界与致谢」、LICENSE 文件。

---

## 3. 后续拓展思路

### 可二次开发的方向

- **运行级测试自动化**：当前运行级实测覆盖仅 5 个，可扩展 GitHub Actions 矩阵，在多 OS / 多 dsh 版本组合上批量做加载测试，提高运行级覆盖。
- **PR 跟踪**：当前「正在跟踪的 open PR」为 0，可加入自动扫描 dsh-external 组织下的 open PR 并展示在首页。
- **LLM 摘要可信度标注**：对自动生成的 LLM 摘要增加可信度评分（基于证据数量 / 测试日期 / star 数），辅助用户判断。

### 可对接的 DSH 能力

- **skill**：可将「按用途推荐插件」「检查插件兼容性」封装为 DSH skill，由 agent 自然语言触发（"找一个能做 OCR 的 dsh 插件"）。
- **hooks**：在 dsh-external 组织有新 PR / 新 release 时触发 hooks，更新雷达快照并推送通知。
- **self-modification**：本仓库的 `scripts/sync-runtime.py` 已实现运行级测试同步，可作为 self-modification 的反馈源——agent 根据测试结果自动调整插件推荐顺序。

### 与其它插件组合的可能性

- **awesome-dsh-plugins + dsh-plugin-installer**：将 awesome-dsh-plugins 的四级兼容性证据作为 dsh-plugin-installer 商店元数据补充，在 UI 上展示兼容状态徽标，避免装到不可用插件。
- **awesome-dsh-plugins + dsh-plugin-manager**：用 MAXeaglet 的桌面 GUI 管理器呈现 awesome-dsh-plugins 的分类目录，桌面端浏览 + 一键安装。
- **awesome-dsh-plugins + dsh-plugin-hub**：与 Noob-stupid 的 plugin-hub 联合，前者提供证据、后者提供分发，形成完整的「发现-验证-分发」链路。
