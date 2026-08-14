# PLUGIN 元数据 — awesome-dsh-plugins

## 插件名称
awesome-dsh-plugins（Awesome DSH Plugins 生态雷达）

## 来源仓库 URL
https://github.com/AdamPlatin123/awesome-dsh-plugins

## 克隆时的 commit SHA
87844a6（前 7 位）

## 功能描述（一句话）
自动发现、证据验证的 DeepSeek Harness 插件生态雷达：每 8 小时扫描 GitHub `dsh-plugin` topic 与 `dsh-external` 组织，对候选仓库做清单/静态兼容/编译/运行四级验证，输出日期化证据报告与分类目录。

## 前置依赖
- 无运行时依赖（本仓库为索引/雷达仓库，不提供可安装的 DSH 插件 bundle）
- 浏览器可访问 GitHub（浏览目录与报告）
- 维护者：Node、scripts/ 下的发现/检查/测试/渲染脚本

## 安装命令
> 本仓库**非标准 DSH 插件 bundle**，不通过 `dsh plugin add` 安装。它是生态索引/雷达仓库，使用方式为直接浏览 README / PLUGINS.md / reports/ 目录。
>
> 如需本地查看完整报告：
> ```bash
> git clone https://github.com/AdamPlatin123/awesome-dsh-plugins.git
> cd awesome-dsh-plugins
> # 浏览 PLUGINS.md（人工分类精选）、reports/<日期>/（完整扫描索引与兼容矩阵）、CHANGELOG.md
> ```

## 配置项
| 来源 | 字段 |
|---|---|
| 源材料未提及 | 本仓库为索引仓库，无运行时配置项 |

## 已知限制
- 收录不等于兼容，静态检查不等于运行可用，运行可用也不等于安全审计——本仓库提供可追溯的筛选信号，不代表 DSH 官方背书。
- mainline 和插件都在快速变化，旧结论可能很快失效。
- 静态未发现问题不代表真实运行一定成功。
- 编译失败可能来自测试环境、缺失依赖或配置错误，不应自动等同于 API 不兼容。
- 运行成功只覆盖报告中的最小任务，不代表全部功能、平台和配置。
- 自动生成的 LLM 摘要只用于导航，不能替代原始矩阵和日志。
- 当前运行级实测：0 可用 · 5 失败（共测试 5 个）——运行级覆盖极低。
- README 末尾声明「当前仓库尚未声明许可证」，但根目录存在 MIT LICENSE 文件（Copyright (c) 2026 AdamPlatin123），以 LICENSE 文件为准。

## 本地运行状态
未实测安装（本仓库为索引/雷达仓库，无可安装的 DSH 插件 bundle）

## 许可证
MIT（Copyright (c) 2026 AdamPlatin123 & Awesome DSH Plugins contributors，来源：LICENSE 文件）
