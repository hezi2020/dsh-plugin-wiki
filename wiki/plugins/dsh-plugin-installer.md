# dsh-plugin-installer

> **插件名**：dsh-plugin-installer（DSH 插件商店 + 安装排障技能一体包）
> **来源仓库**：<https://github.com/zhang66633/dsh-plugin-installer>
> **许可证**：MIT © 2026 zhang66633
> **commit SHA**：`b6b5a59`

双面插件：Web GUI「插件商店」页签浏览插件目录（名称/介绍/原链接/星标），点击「安装」触发确认后由当前会话的 agent 完成安装；内置 `dsh-plugin-installer` 技能作为安装后端引擎，每一步可解释、可回滚。

---

## 1. 使用指南

### 前置依赖

- dsh 生态 `0.1.0-rc.6`（最后验证 2026-08）
- Node `>= 22.19`
- 操作系统：Windows / macOS / Linux
- Web GUI（`dsh --profile web`）；非 GUI profile 仅获得安装技能（Route B）
- peerDependencies：`@deepseek-ai/cordis ^4.0.1`、`@deepseek-ai/dsh-skill ^0.1.0-rc.6`

### 安装命令

**Route A — 完整插件**（商店 tab + 安装技能，发布到 npm 后）：

```bash
dsh plugin --profile web add dsh-plugin-installer
```

本地开发可用 link 方式：

```jsonc
// ~/.dsh/profiles/web/package.json
{
  "dependencies": { "dsh-plugin-installer": "link:<repo path>" },
  "dsh": { "profile": { "bundles": ["dsh-plugin-installer"] } }
}
```

```bash
cd ~/.dsh/profiles/web && pnpm install
```

**Route B — 仅安装技能**（文件系统发现，无商店 UI）：

```bash
git clone --depth 1 https://github.com/zhang66633/dsh-plugin-installer ~/.dsh/skills/dsh-plugin-installer
```

### 配置项

| 来源 | 字段 |
|---|---|
| `data/store.json` | 插件目录快照（name / description / original link / category / stars），随包发布，运行时无网络请求 |
| HTTP 路由 | `/plugin-store/install`（POST，body: `{ plugin name + session id }`，仅绑定本地 web server） |
| 环境变量 | 无（无环境变量、无 secrets） |

### 典型用法示例

1. 安装后重启 `dsh web`，打开任意 session，**插件商店** tab 出现在 view ring 中。
2. 搜索 `vision` → 点击「安装」→ 弹窗确认 → 当前 session 的 agent 接管安装流程。
3. 安装完成后重启 `dsh web`，新插件生效。

最小可复现样例：搜 `modlens` → 点击安装 → 确认 → agent 报告成功 → 重启 → 发图测 OCR。

### 重启生效说明

!!! tip "安装完成后需重启 dsh web"
    `dsh plugin add` 之后需重启 `dsh web` 才能让新插件进入 view ring。环境变量变更同样需重启。本地 link 模式下 `git pull` + 重新 `pnpm install` 后重启即可。

---

## 2. 弊端与缺陷

!!! warning "商店数据为静态快照，刷新需重建并重装"
    商店数据为随包发布的静态快照（`data/store.json`），运行时无网络请求；目录刷新需要重建快照并重新安装插件。出处：PLUGIN.md 已知限制、README「Configuration」章节。

!!! warning "点击「安装」仅触发请求，实际安装由当前会话的 agent 执行"
    点击「安装」仅 POST 一个 JSON 请求到本地路由 `/plugin-store/install`，实际安装由当前会话的 agent 执行；若当前 session 无活跃 agent，则点击「安装」无反应。出处：PLUGIN.md 已知限制、README「Configuration」章节。

!!! warning "agent 安装时执行第三方代码并读写 dsh profile"
    agent 执行安装时会读写 dsh profile 和插件目录，并访问 npm / GitHub——每一步可见可停止，但仍是第三方代码执行，需关注权限与凭据暴露。出处：PLUGIN.md 已知限制、README「Permissions & data」章节。

!!! warning "非 GUI profile 仅获得安装技能，无商店 UI"
    非 GUI profile 仅能通过 Route B 获取安装技能（文件系统发现），无商店 UI。出处：PLUGIN.md 已知限制、README「Compatibility」表格。

!!! warning "商店 tab 缺失需手工排障"
    商店 tab 缺失需确认 `dsh.profile.bundles` 包含 `dsh-plugin-installer`，并通过 `dsh --profile web --dump-config` 检查；操作较底层，对普通用户不友好。出处：PLUGIN.md 已知限制、README「Troubleshooting」表格。

---

## 3. 后续拓展思路

### 可二次开发的方向

- **在线目录刷新**：当前 `store.json` 为静态快照，可加入后台 subagent 定时拉取 GitHub `topic:dsh-plugin` 列表刷新快照，使商店数据保持新鲜。
- **安装预检与回滚**：在 agent 执行安装前加入 dry-run 预检（peerDeps / dsh 版本兼容 / 已存在同名插件），失败时自动回滚 profile bundle 改动。
- **多商店源**：扩展为支持多源（GitHub topic、npm registry、私有镜像）的统一商店，按源标记可信度。

### 可对接的 DSH 能力

- **skill**：仓库已内置 `skills/dsh-plugin-installer/SKILL.md` 作为安装排障技能，可被自然语言触发（"安装 vision-toolkit 并排障"）。
- **hooks**：可在安装完成 / 失败事件上挂 hooks，触发桌面通知或群机器人推送。
- **self-modification**：本插件本身就是 dsh profile 的 self-modification 入口，agent 通过它读写 profile 实现插件增删。

### 与其它插件组合的可能性

- **dsh-plugin-installer + awesome-dsh-plugins**：用 awesome-dsh-plugins 的四级兼容性证据作为商店元数据补充，在 UI 上展示兼容状态徽标，避免装到不可用插件。
- **dsh-plugin-installer + dsh-plugin-manager**：商店触发安装后，由 MAXeaglet 的桌面 GUI 管理器接管 profile / 插件的全生命周期管理。
- **dsh-plugin-installer + dsh-better-sidebar**：商店点击「安装」后，better-sidebar 的后台任务页可实时显示 agent 安装进度，闭环可视。
