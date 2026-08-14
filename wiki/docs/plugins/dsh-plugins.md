# dsh-plugins（SisyphusSQ monorepo）

> **插件名**：dsh-plugins（DSH 第三方插件 monorepo）
> **来源仓库**：<https://github.com/SisyphusSQ/dsh-plugins>
> **许可证**：MIT
> **commit SHA**：`0ee6b6081fca6f4ed36d2208eef0f965775dcb36`（前 7 位 `0ee6b60`）

一个 pnpm monorepo，承载可独立安装、可组合的 DeepSeek Harness（DSH）第三方插件。仓库当前包含两个实验包：

- **`dsh-composer-skill-mention`**：为 DSH Web composer 增加 Codex 风格的 `$` / 全角 `￥` Skill 提及，仅在 `@deepseek-ai/dsh@0.1.0-rc.6` 上验证，未发布。
- **`dsh-agent-plugins`**：让 DSH 直接消费 [Agent Plugins 1.0.0](https://github.com/agentplugins/agent-plugins-spec) 标准插件包（`plugin.json` + `skills/` + `mcp.json`），一个 npm 包三合一：host 半（bundle patch）+ client 半（设置面板 tab）+ CLI（`agent-plugins`）。

---

## 1. 使用指南

### 前置依赖

- Node.js `>= 22`
- pnpm `10.33.2`（仓库 `packageManager` 字段固定）
- 已安装的 DSH Web profile（仅验证过 `@deepseek-ai/dsh@0.1.0-rc.6`），并提供以下 peer 依赖：
  - `@deepseek-ai/cordis@4.0.1`
  - `@deepseek-ai/dsh-agent`、`dsh-api-remotes`、`dsh-client-connection`、`dsh-client-runtime`、`dsh-client-ui-input-trigger`、`dsh-client-ui-slots`、`dsh-client-locale`、`dsh-skill`、`dsh-llm`、`dsh-typert-protocol`（均为 `0.1.0-rc.6`）
  - `@deepseek-ai/schemastery@^3.18.1`
  - `react@^18.2.0`（仅 `dsh-agent-plugins` client 半）
- `dsh-agent-plugins` 运行时依赖：`yaml@^2.4.2`、`@deepseek-ai/schemastery@^3.18.1`

### 安装命令

仓库根目录为私有 workspace，**不通过 `dsh plugin add github:...` 整仓库安装**；需在仓库内分别构建各子包后用 tarball 或 `file:` 链接安装：

```bash
# 1. 拉取并构建（仓库根目录）
git clone https://github.com/SisyphusSQ/dsh-plugins.git
cd dsh-plugins
pnpm install

# 2a. dsh-composer-skill-mention：构建 + 打包 + 装 tarball
pnpm --filter dsh-composer-skill-mention test      # 单测
pnpm --filter dsh-composer-skill-mention typecheck
pnpm --filter dsh-composer-skill-mention build
pnpm --filter dsh-composer-skill-mention pack
dsh plugin --profile <profile> add ./packages/dsh-composer-skill-mention/dsh-composer-skill-mention-0.1.0.tgz

# 2b. dsh-agent-plugins：构建 + file: 链接安装（开发期）
pnpm --filter dsh-agent-plugins build
dsh plugin --profile <profile> add file:../packages/dsh-agent-plugins
```

隔离 E2E 测试推荐方式（不污染线上 profile）：

```bash
rm -rf /tmp/dsh-ap-test && mkdir -p /tmp/dsh-ap-test
cp -R ~/.dsh/profiles /tmp/dsh-ap-test/profiles
DSH_HOME=/tmp/dsh-ap-test dsh plugin --profile web add file:/abs/path/packages/dsh-agent-plugins
DSH_HOME=/tmp/dsh-ap-test dsh --profile web --port 3090
```

### 配置项

| 来源 | 字段 |
|---|---|
| `dsh-composer-skill-mention` 运行时 | 无独立配置项；通过 DSH Skill registry 自动接入 |
| `dsh-agent-plugins` profile `cordis.patch.yml` | `stores`（store 目录数组，默认 `./agent-plugins` 与 `~/.dsh/agent-plugins`）、`managedPatch`（保留段写入路径，默认 `~/.dsh/cordis.patch.yml`）、`mcpEnabled`、`skillsEnabled`、`trustedStores`、`syncOnChange` |
| `dsh-agent-plugins` store 台账 | `$DSH_HOME/agent-plugins/installed.json`（插件级 `enabled` + 组件级 `skills.*.enabled` / `mcp.*.enabled`，两级默认 true） |

`dsh-agent-plugins` 配置面示例：

```yaml
# profile cordis.patch.yml（用户层，唯一静态改动）
- id: agent-plugins
  name: dsh-agent-plugins
  config:
    stores: [./agent-plugins, ~/.dsh/agent-plugins]
    managedPatch: ~/.dsh/cordis.patch.yml
    mcpEnabled: true
    skillsEnabled: true
    trustedStores: true
    syncOnChange: true
```

### 典型用法示例

**`dsh-composer-skill-mention`**：在 DSH Web composer 输入框输入 `$dis` 或 `￥dis`，会弹出当前会话可用的 Skills 候选并按前缀过滤；选中后写入规范形式 `$skill-name `，进入 Agent step 前由 host 半加载 Skill 正文。`/name $name ￥name` 混用时只注入一次。`$HOME`、`foo$bar`、`$foo/bar`、`\$name` 不会触发 Skill 注入。

**`dsh-agent-plugins` CLI**（M1 已实现）：

```sh
agent-plugins install <dir|zip|git-url>   # 校验通过才入 store；同 name 替换（PLUGIN_DATA 保留）
agent-plugins uninstall <name>            # 删文件与台账，PLUGIN_DATA 保留
agent-plugins update [name...|--all]      # 按台账来源重取（git/dir/zip）
agent-plugins enable|disable <name>       # 插件级启停
agent-plugins enable|disable <name> --skill <n> | --mcp <server>   # 组件级启停（--mcp 用限定名 <plugin>__<server>）
agent-plugins list [--json]
agent-plugins doctor
```

### 重启生效说明

!!! tip "patch-sync 原子写 + HMR 热重载"
    `dsh-agent-plugins` 的 `patch-sync` 采用 tmp + rename 原子写，DSH launcher 的 `watchUserPatches` 会热重载 `cordis.patch.yml`；运行中增/删 MCP 行无需重启 profile。但 **boot 时 home patch 含坏行会让整个 profile 起不来**，因此保留段必须保持合法 YAML 顶层数组。

!!! tip "dsh-composer-skill-mention 卸载会自动恢复 controller prototype"
    Client fiber 卸载时会注销 `$`、`￥` 两个 source、中止 catalog 请求，并在仍由本包持有时恢复 `InputTriggerController.prototype.track` 原方法；不会覆盖其他后来安装的兼容层。

---

## 2. 弊端与缺陷

!!! warning "整体仍处实验阶段，未发布到 npm"
    `dsh-composer-skill-mention` 与 `dsh-agent-plugins` 均未发布到 npm，README 明示「尚未发布」「不承诺兼容其他版本」。出处：根 README「Development status」、子包 README 顶部状态行。

!!! warning "仅验证 DSH 0.1.0-rc.6，跨版本兼容不保证"
    两个子包都仅在 `@deepseek-ai/dsh@0.1.0-rc.6` 上验证；DSH 仍处 developer preview，每个插件必须明确记录已验证的 DSH 版本和兼容边界。出处：根 AGENTS.md「兼容性与验证」、子包 README「兼容性」表。

!!! warning "dsh-composer-skill-mention 依赖 rc.6 私有 controller 形状"
    通过对 `InputTriggerController.prototype.track` 安装窄幅、可卸载兼容层实现；controller 形状不匹配时回退原 `track` 并禁用别名检测。这是有意限制在 rc.6 私有形状上的兼容层，上游提供 registry-driven trigger 扩展点后应删除该兼容层，不得无限期扩展。出处：`docs/design/dsh-composer-skill-mention.md`「实现架构」、子包 README「兼容性」。

!!! warning "dsh-composer-skill-mention 不实现 @ 文件提及，不支持半角 ¥"
    本包不包含 `@` 文件提及；文件检索与权限边界应由独立插件处理。半角日元符号 `¥`（U+00A5）不支持，仅支持 `$`（U+0024）与全角 `￥`（U+FFE5）。出处：`docs/design/dsh-composer-skill-mention.md`「非目标」、子包 README「兼容性」表。

!!! warning "rc.6 composer 装饰只识别 / 与 @，$name 不会获得内置引用着色"
    rc.6 的 composer 文本装饰正则仍是 `/`、`@`，`$name` 不会获得内置引用着色；属于已知视觉边界，不影响候选或 Skill 注入。出处：`docs/design/dsh-composer-skill-mention.md`「实现架构」、子包 README「已知限制」。

!!! warning "dsh-agent-plugins 明示不做的事"
    不重写 MCP 客户端、不做插件进程沙箱、不实现 sse transport、不处理 extensions 扩展目录、不做 per-tool allow/deny（不接核心审批）、面板不做安装/卸载/更新（CLI 专属）、一期无市场无发现 tab。组件级启停只到 skill / MCP server 粒度。出处：子包 README「不做的事」、设计文档「不做的事（护栏）」。

!!! warning "home patch boot 时含坏行会让整个 profile 起不来"
    `loadOptionalPatches` 对 home patch 是「文件坏 → boot fail loud」，且整个文件按单个 YAML 数组解析。`patch-sync` 必须保留段内只增删自己的行，文件始终是合法 YAML 顶层数组，并原子写（tmp + rename）。出处：`docs/design/dsh-agent-plugins.md`「3. patch 热重载」。

!!! warning "dsh-agent-plugins M2/M4 里程碑仍处计划中"
    M2（skills provider 含组件级启停过滤）与 M4（护栏、日志、doctor、README）状态为「计划中」；M0/M1/M3/M5 已完成。出处：子包 README「里程碑状态」表。

!!! warning "pnpm file: 安装是拷贝非链接"
    `dsh plugin --profile web add file:` 安装是拷贝而非链接，改 `lib/` 后需删旧拷贝重装。出处：`docs/design/dsh-agent-plugins.md`「M3/M4 实测补充结论」踩坑记录④。

!!! warning "cordis_inspect_query 在 client 平台对目录外服务名会挂起而非报错"
    `cordis_inspect_query` 的 client 平台查询，当页面返回错误应答时，host 侧 `resolveClientQuery` 对 `!resolution.ok` 直接 `return {accepted:false}` 丢弃，查询永远留在 pending 表直到工具超时取消。host 平台查询是本地执行无此问题（行为不对称）。出处：`docs/design/dsh-agent-plugins.md`「4. 顺带发现的上游缺陷（待提 PR）」。

---

## 3. 后续拓展思路

### 可二次开发的方向

- **`dsh-composer-skill-mention` 上游化**：推动 DSH 将 trigger detection 改为 registry-driven，让 source 声明边界与 guard tier；上游提供正式扩展点后删除 prototype 兼容层，只保留 Skill source 与 Host 别名注入。
- **`dsh-agent-plugins` M2/M4 落地**：完成 skills provider 含组件级启停过滤；补齐护栏（单插件 server >10 告警、headers 凭据字样告警）、doctor、文档符合性清单。
- **新增 `@` 文件提及独立包**：将文件检索与权限边界独立成包，与 `$` / `￥` Skill 提及解耦，避免一个包背负两种不同的检索语义。
- **多 DSH 版本兼容矩阵**：随着 DSH 后续 rc/正式版发布，建立版本兼容矩阵，明确每个包的兼容边界。

### 可对接的 DSH 能力

- **skill**：`dsh-composer-skill-mention` 本身就是 Skill 提及入口；`dsh-agent-plugins` 通过 `skills.registerProvider` 把 Agent Plugins 包内的 `skills/*/SKILL.md` 接入 DSH Skill registry，组件级启停即时生效。
- **hooks**：`dsh-composer-skill-mention` 的 host 半在 `agent/pre-step` 注册 `prepend` waterfall listener，扫描直接用户消息里的 `$name` / `￥name` 并复用 `renderSkillContent()` 注入 Skill 正文——这是 hook 的标准用法样例。
- **self-modification**：`dsh-agent-plugins` 的 `patch-sync` 保留段生成 / 清理 + 原子写机制，可作为 self-modification 改写 profile `cordis.patch.yml` 的范本；`dsh-composer-skill-mention` 的 prototype 兼容层 dispose 时按持有者恢复原方法，可作为可逆 self-modification 的安全范式。

### 与其它插件组合的可能性

- **`dsh-agent-plugins` + 任意外部 Agent Plugins 包**：通过 `agent-plugins install <git-url>` 直接消费社区生态（如 `agentplugins/agent-plugins-spec` 仓库示例），把 DSH 变成 Agent Plugins 标准的运行宿主之一。
- **`dsh-composer-skill-mention` + `dsh-agent-plugins`**：先装 `dsh-agent-plugins` 把外部包的 Skill 注入 registry，再用 `$` / `￥` 提及触发；两个包组合后形成「外部生态 Skill → 一行提及触发」的完整链路。
- **`dsh-composer-skill-mention` + 未来 `@` 文件提及包**：互补形成 Codex 风格的 `$skill` / `@file` 双提及体系，由独立包各自负责边界与权限。
