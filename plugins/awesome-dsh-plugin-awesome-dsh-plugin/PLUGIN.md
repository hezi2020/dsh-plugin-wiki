# PLUGIN 元数据 — awesome-dsh-plugin

## 插件名称
awesome-dsh-plugin（Awesome DeepSeek Harness Plugin · DSH 插件精选列表）

## 来源仓库 URL
https://github.com/awesome-dsh-plugin/awesome-dsh-plugin

## 克隆时的 commit SHA
8ad0885（前 7 位）

## 功能描述（一句话）
社区维护的 DeepSeek Harness（dsh）插件精选索引列表（Awesome List），按 10 个分类收录可通过 `dsh plugin add` 安装的社区插件，配套静态站点与构建脚本，本身不是插件 bundle。

## 前置依赖
- 无运行时依赖（仓库为索引列表 + 静态站点构建脚本）
- 站点构建（可选）：Node.js + 仓库自带 `scripts/build-site.mjs` / `scripts/probe-npm.mjs` / `scripts/probe-stars.mjs`
- 浏览收录内容推荐：DeepSeek Harness + dsh-market 或 dsh-find-plugin（均来自本列表条目）

## 安装命令
```sh
# 本仓库不是插件 bundle，不能用 dsh plugin add 安装
git clone https://github.com/awesome-dsh-plugin/awesome-dsh-plugin.git
```

> 推荐通过本列表收录的 dsh-market 在 DSH 内浏览 / 搜索 / 一键安装社区插件：
> ```sh
> dsh plugin --profile web add dshmarket
> ```
> 或用 dsh-find-plugin 让 agent 帮你找插件：
> ```sh
> dsh plugin --profile web add dsh-find-plugin
> ```

## 配置项
无（仓库为静态索引，无运行时配置）。

## 已知限制
- 本仓库是社区维护的索引（Awesome List），**不是** DSH 插件 bundle：未声明 `dsh.bundle` / `dsh.client` manifest，不能用 `dsh plugin add` 安装。出处：`package.json`（无 `dsh` 字段）、README 顶部说明。
- 收录不构成背书：README「Disclaimer / 免责声明」明确声明插件由各自作者维护，收录不构成背书，不对任何插件的安全性、质量或维护状态作保证；安装即在本机运行第三方代码，请自行审阅源码、风险自担；本项目与 DeepSeek 无隶属关系。
- 收录要求：仓库 `package.json` 必须声明 `dsh.bundle` manifest（monorepo 根包或子包亦可）；只声明 `dsh.client` 不算可安装。仓库需有真实可用代码，占位 / 纯 README 仓库不收；项目需活跃维护，失效项目会在定期清理中移除。出处：`contributing.md`「Adding a plugin」。
- 列表条目数随社区增长变化；本次克隆时 README 标注 **271** 个插件。出处：README 顶部「271 plugins · 271 个插件」。

## 本地运行状态
未实测安装（本任务仅克隆源码，未实际加载运行；本仓库为索引，无运行时加载概念）

## 许可证
CC0-1.0（Creative Commons Zero 1.0 Universal，已在仓库根 `LICENSE` 文件中以 CC0 法律文本声明）。仓库选择 CC0 即放弃版权相关权利，可自由复用、修改、商用。
</content>
</invoke>