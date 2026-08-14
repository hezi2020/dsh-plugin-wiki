# dsh-plugins-marketplace

> **插件名**：dsh-plugin-marketplace（DSH 插件市场）
> **来源仓库**：<https://github.com/bradeGithub/DSH-Plugins-Marketplace>
> **许可证**：MIT
> **commit SHA**：`9c58125`（前 7 位）

一个为 DeepSeek Harness（DSH）打造的插件市场插件：从 GitHub 的 `dsh-plugin` topic 拉取全部插件，在 DSH Web GUI 的设置页中以卡片列表展示，支持一键安装 / 自动更新 / 版本检测 / 已安装识别，全程无需命令行。

---

## 1. 使用指南

### 前置依赖

- DSH Web profile（`dsh web` 可启动）
- 浏览器可访问 GitHub（静态索引走 jsDelivr CDN，兜底走 GitHub 搜索 API）
- 可选：`gh CLI`（手动触发 `update-registry.bat` / `update-registry.sh` 立即重建索引时需要）
- 可选：环境变量 `DSH_MARKETPLACE_ALLOWED_HOSTS`（追加允许的安装端点 Host 白名单）

### 安装命令

一键脚本安装（来源：README「⚡ 一键安装」）：

```bash
# Windows (PowerShell)
irm https://raw.githubusercontent.com/bradeGithub/DSH-Plugins-Marketplace/main/install.ps1 | iex

# macOS / Linux
curl -sL https://raw.githubusercontent.com/bradeGithub/DSH-Plugins-Marketplace/main/install.sh | bash
```

> 建议先下载脚本肉眼检查一遍再执行（`irm <url> | iex` / `curl <url> | bash` 是公认的远程代码执行模式）。安装完成后需重启 DSH（重新运行 `dsh web`）再刷新页面。

本插件位于 `~/.dsh/profiles/web/node_modules/dsh-plugin-marketplace/`，并通过 `~/.dsh/profiles/web/cordis.patch.yml` 注册：

```yaml
- insert:
    - id: plugin-marketplace
      name: dsh-plugin-marketplace
```

### 配置项

| 来源 | 字段 |
|---|---|
| 环境变量 | `DSH_MARKETPLACE_ALLOWED_HOSTS`（追加安装端点 Host 白名单，默认本机回环 / 局域网私有网段） |
| cordis.patch.yml | `- insert: { id: plugin-marketplace, name: dsh-plugin-marketplace }` |
| 运行时数据 | `~/.dsh/marketplace/installed.json`（已安装清单）、`~/.dsh/marketplace/cache/<owner>__<name>/`（克隆缓存） |

### 典型用法示例

1. 重启 DSH 后打开 Web GUI，进入 **设置 → DSH插件市场**。
2. 页面自动加载全部插件（按 Star 排序），也可点击「刷新」强制重新拉取。
3. 使用搜索框按名字过滤插件。
4. 点击插件卡片上的按钮：
   - **安装** → 开始安装，日志实时滚动；需要材料时弹出输入框提供 API Key 等。
   - **更新** → 检测到新版本时覆盖升级。
   - **已安装**（灰色）→ 无需操作。
5. tab 切换到「通用 Skills」可浏览 CI 构建的全量 skills 索引（12000+ 仓库），支持一键安装到 `~/.dsh/skills/`。

### 重启生效说明

!!! tip "插件代码修改后需重启 DSH"
    DSH 的 Web profile 关闭了配置热重载（`hmr` 被禁用），修改插件代码或注册条目后需要重启 DSH（重新运行 `dsh web` 或 `start-dsh.bat`）再刷新页面。出处：README「📦 安装本插件」。

---

## 2. 弊端与缺陷

!!! warning "安装端点无用户认证，防护依赖网络隔离"
    安装端点无用户认证，防护依赖「本地网络隔离 + CSRF 头 + Host 白名单（本机/局域网/可配置）+ Origin 校验」——请勿将 DSH web 端口暴露到不可信网络；安装即意味着在机器上执行第三方代码（npm 依赖与安装脚本），请只安装你信任并已核验的仓库。出处：README「⚠️ 安全说明」「🔄 已知限制」。

!!! warning "版本检测仅对含 package.json 的 cordis 插件生效"
    版本检测仅对含 `package.json` 的插件生效；skill / 预设 / 脚本类无版本概念，无法检测更新。出处：README「🔄 已知限制」。

!!! warning "静态索引不可用时回退 GitHub 搜索 API 有限流"
    插件列表默认走静态索引（CDN）；仅当索引的两个源都不可用时才回退 GitHub 搜索 API，此时未认证限流 10 次/分钟，频繁点「刷新」可能触发限流（会提示刷新失败，稍等再试）。出处：README「🔄 已知限制」。

!!! warning "Skills 索引中未探测的仓库显示「未验证」"
    Skills 索引为全量索引（12000+ 仓库），`has_skill` 探测按 Core API 额度分批补齐（CI 每 2 小时增量续跑），未探测的仓库显示「未验证」弱提示。出处：README「🔄 已知限制」。

!!! warning "插件代码修改后需重启 DSH 才能生效"
    Web profile 的 HMR 处于禁用状态，插件代码修改后需重启 DSH 才能生效。出处：README「🔄 已知限制」「📦 安装本插件」。

!!! warning "安装脚本类插件的已安装判定基于缓存目录存在性"
    安装脚本类插件的「已安装」判定基于缓存目录存在性，卸载（删除缓存）后会重新显示为可安装。出处：README「🔄 已知限制」。

---

## 3. 后续拓展思路

### 可二次开发的方向

- **多源索引聚合**：当前索引仅来自 `dsh-plugin` topic，可扩展聚合 `agent-skills` / `claude-skills` 之外的更多生态标签（如 `dsh-external`），形成更全的发现面。
- **签名校验与 allowlist**：README 明确「签名校验与 allowlist 尚未实现」，可引入包签名机制与可信作者白名单，降低第三方代码执行风险。
- **离线索引导出/导入**：将 `registry.json` 导出为可分发的离线包，支持内网/气隙环境下的插件市场浏览与安装。

### 可对接的 DSH 能力

- **skill**：仓库自带的 `install.ps1` / `install.sh` 可封装为 DSH Skill，由 Agent 自然语言触发「安装某插件」。
- **hooks**：安装/更新事件可经 hooks 触发外部通知（如企业 IM 推送审计日志）。
- **self-modification**：版本检测与更新流程可作为 self-modification 的样例——Agent 自主检测并升级自身依赖的插件。

### 与其它插件组合的可能性

- **dsh-plugin-marketplace + dsh-plugin-hub**：两者均提供插件管理能力，可组合使用——marketplace 负责发现与安装，hub 负责启用/停用与详情查看，互补覆盖插件全生命周期。
- **dsh-plugin-marketplace + awesome-dsh-plugins**：以 awesome-dsh-plugins 的兼容性证据（静态/编译/运行级）作为 marketplace 安装前的风险提示，降低安装失败率。
