# dsh-plugin-market

> **插件名**：dsh-plugin-market（dsh plugin marketplace CLI）
> **来源仓库**：<https://github.com/6kongbai/dsh-plugin-market>
> **许可证**：MIT
> **commit SHA**：`6d27df8`（前 7 位）

一个 plugin marketplace CLI for the DeepSeek Harness（`dsh`）：browse、install、uninstall 来自 GitHub `dsh-plugin` topic 的社区 bundle 插件。社区 registry 是 GitHub topic 而非私有索引——任何打了 `dsh-plugin` 标签且 `package.json` 声明了 `dsh.bundle.patch` 的仓库均可安装。

---

## 1. 使用指南

### 前置依赖

- Node `^22.19 || >=24`
- pnpm
- 预发布 harness 包：`@deepseek-ai/dsh-app-boot@0.1.0-rc.6`、`@deepseek-ai/dsh-home-paths@0.1.0-rc.6`
- 可选：`GITHUB_TOKEN`（提升匿名 GitHub API 限流额度）

### 安装命令

来源：README「Install」。

```sh
# from npm (once published)
npm i -g dsh-plugin-market

# or straight from GitHub now
npm i -g github:6kongbai/dsh-plugin-market
```

安装后可用命令：

```sh
dsh-plugin-market search <query>          # 搜索 dsh-plugin topic
dsh-plugin-market info <owner/repo>       # 详情 + pinned install spec
dsh-plugin-market list                    # 列出 profile 中已安装的 bundle
dsh-plugin-market install <owner/repo>    # 确认 → pin → pnpm add → reconcile → audit
dsh-plugin-market uninstall <package>     # pnpm remove → reconcile → audit
```

### 配置项

| 来源 | 字段 |
|---|---|
| CLI 选项 | `--profile`, `-p <name>`（目标 profile，默认 `web`） |
| 环境变量 | `DSH_PLUGIN_MARKET_PROFILE`（覆盖默认 profile） |
| 环境变量 | `GITHUB_TOKEN`（提升匿名 GitHub API 限流） |
| CLI 选项 | `--yes`, `-y`（跳过安装/卸载确认） |

### 典型用法示例

```sh
# 搜索 vision 相关插件
dsh-plugin-market search vision

# 查看某仓库详情与安装规格
dsh-plugin-market info owner/dsh-plugin-foo

# 安装（会先确认，pin 到 commit，pnpm add，reconcile bundles，写审计日志）
dsh-plugin-market install owner/dsh-plugin-foo

# 跳过确认直接安装
dsh-plugin-market install owner/dsh-plugin-foo --yes

# 卸载
dsh-plugin-market uninstall dsh-plugin-foo
```

安装流程（来源：README「How install works」）：

1. 读取仓库 `package.json`，校验声明了 `dsh.bundle.patch`（未声明的在 `search` 标记为不可安装）；
2. 解析默认分支当前 head 并 **pin 到 commit**——`pnpm add github:owner/repo#<sha>`，永不浮动分支；
3. 在目标 profile 目录运行 `pnpm add`；
4. reconcile `dsh.profile.bundles`（声明 `dsh.bundle` 的依赖加入层栈，移除的离开）；
5. 向 `$DSH_HOME/plugin-install.log` 追加审计行。

### 重启生效说明

!!! tip "新 bundle 在下次 dsh 重启时激活"
    install / uninstall 均运行 `pnpm add` / `pnpm remove`、reconcile bundles 并写审计日志，新 bundle 在下次 `dsh` 重启时激活。出处：README「How install works」。

---

## 2. 弊端与缺陷

!!! warning "v0.1.0 仅发布 CLI，Web GUI 被上游 Typert 限制阻塞"
    v0.1.0 仅发布 CLI。Web GUI 侧边栏面板因上游限制被阻塞：harness 的 Typert 生成器（`@deepseek-ai/dsh-typert-generator`）只识别来自源项目引用的 `@Remote` 服务，不识别已安装 npm 包，因此树外 bundle 当前无法生成其 Remote face。客户端半体位于 `packages/market-client/`（置于 pnpm workspace 之外），待 Typert 支持树外插件后接入。出处：README「Status」。

!!! warning "签名校验与 allowlist 尚未实现"
    签名校验与 allowlist 尚未实现——`dsh.bundle` 当前无签名机制。安装社区插件即下载并运行任意代码（当前用户权限），工具仅通过展示 `owner`/`stars`/`updated_at`/`license` + 第三方代码警告 + pin to commit + 审计日志 + 确认提示来降低风险。出处：README「Security model」。

!!! warning "仅支持声明了 dsh.bundle.patch 的仓库"
    仅支持声明了 `dsh.bundle.patch` 的仓库；未声明的在 `search` 中标记为不可安装（not-installable）。出处：README「How install works」「`dsh.market` metadata contract」。

!!! warning "开发依赖预发布 harness 包"
    开发需要 Node `^22.19 || >=24`、pnpm 以及预发布 harness 包（`@deepseek-ai/dsh-app-boot@0.1.0-rc.6`、`@deepseek-ai/dsh-home-paths@0.1.0-rc.6`），依赖门槛较高。出处：README「Development」。

---

## 3. 后续拓展思路

### 可二次开发的方向

- **Web GUI 侧边栏接入**：待 Typert 生成器支持树外插件后，将 `packages/market-client/` 接入 pnpm workspace 并 wire up Remote face，补齐 README 规划的 Web GUI 形态。
- **签名校验与 allowlist**：README 明确将签名校验与 allowlist 列为 future work，可引入包签名机制与可信作者白名单。
- **`dsh.market` 富元数据扩展**：当前 `market` 字段为可选（displayName / icon / categories / screenshots），可扩展为支持截图懒加载、分类聚合页面等更丰富的商店展示。

### 可对接的 DSH 能力

- **skill**：`dsh-plugin-market install` 可封装为 DSH Skill，由 Agent 自然语言触发「安装某插件并审计」。
- **hooks**：install / uninstall 的审计日志（`$DSH_HOME/plugin-install.log`）可经 hooks 触发企业合规告警。
- **self-modification**：pin to commit + reconcile bundles 的机制可作为 self-modification 的安全范式——Agent 自主安装依赖时锁定版本并留审计痕迹。

### 与其它插件组合的可能性

- **dsh-plugin-market + dsh-plugin-marketplace**：CLI（本仓库）与 Web GUI（bradeGithub/DSH-Plugins-Marketplace）面向同一生态，可组合使用——CLI 适合脚本化/CI 场景，Web GUI 适合交互式浏览。
- **dsh-plugin-market + awesome-dsh-plugins**：以 awesome-dsh-plugins 的兼容性证据作为 `info` / `search` 输出的补充信号，辅助安装决策。
