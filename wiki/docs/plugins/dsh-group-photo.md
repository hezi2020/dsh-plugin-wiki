# dsh-group-photo

> **插件名**：dsh-group-photo（DSH 内测大合影）
> **来源仓库**：<https://github.com/SenmuuuuW/dsh-group-photo>
> **许可证**：MIT（Copyright (c) 2026 DSH Group Photo contributors）
> **commit SHA**：`bdcecf34a3700f5b23d069ee207589cbec6c658a`（前 7 位 `bdcecf3`）

DSH 内测收官之夜诞生的合影墙：内测成员用 GitHub 登录（零权限授权），通过冻结白名单校验后，在拍立得墙上入镜并留下一句话。这是内测社区的一件纪念作品。附带 DSH Skill 包装样例。

---

## 1. 使用指南

### 前置依赖

- Node.js `>= 20`（零 npm 依赖，无需安装包）
- GitHub OAuth App（回调地址 `http://localhost:8808/auth/callback`）
- 环境变量：`GH_CLIENT_ID`、`GH_CLIENT_SECRET`、`GH_ORG`、`PORT`（默认 8808）
- 可选：`read:org` 权限的 classic PAT（仅用于重新冻结白名单，用完立即 revoke）

!!! warning "非标准 DSH 插件 bundle"
    该仓库实际为独立 Node.js 服务（非标准 DSH 插件 bundle），README 描述的运行方式为 `git clone` + `npm start`。仓库内含 `skill/SKILL.md` 作为 DSH Skill 包装样例。`dsh plugin add` 命令仅为形式对齐，实际以独立服务方式运行。出处：PLUGIN.md 安装命令说明、README「快速开始」。

### 安装命令

形式上的 DSH 插件安装命令：

```sh
npx -p @deepseek-ai/dsh dsh plugin --profile web add github:SenmuuuuW/dsh-group-photo
```

实际推荐的独立服务运行方式（来源：README「快速开始」「本地部署」）：

```bash
# 1. 拿代码（公开版，含演示数据）
git clone https://github.com/SenmuuuuW/dsh-group-photo.git
cd dsh-group-photo

# 2.（可选）挂载真实数据：从私有数据层复制（仅维护者）
# git clone https://github.com/SenmuuuuW/dsh-group-photo-data.git /tmp/dsh-data
# cp /tmp/dsh-data/{whitelist.json,members.json,works.json,social.json} .

# 3. 配置密钥（环境变量或 config.json 二选一）
export GH_CLIENT_ID=你的ClientID
export GH_CLIENT_SECRET=你的ClientSecret
export GH_ORG=dsh-external

# 4. 启动
npm start        # 等价于 node server.js

# 5. 浏览器打开 http://localhost:8808
```

### 配置项

| 来源 | 字段 |
|---|---|
| 环境变量 | `GH_CLIENT_ID`、`GH_CLIENT_SECRET`、`GH_ORG`、`PORT`、`GH_PAT`、`GH_DATA_FILE`、`GH_WHITELIST_FILE`、`GH_WORKS_FILE`、`GH_SOCIAL_FILE` |
| `config.json` | `clientId`、`clientSecret`、`pat` 等（密钥留空，运行时用环境变量注入） |

- `whitelist.json` 按 mtime 热加载，重新冻结无需重启。
- 数据文件（members/whitelist/works/social）可经环境变量指向私有数据层挂载路径。

### 典型用法示例

**自然语言触发**：本服务以 Web 交互为主，无自然语言触发入口。仓库内 `skill/SKILL.md` 为 DSH Skill 包装样例，可作为 Skill 被 DSH 调用。

**命令行触发**：

- 重新冻结白名单（需 `read:org` PAT）：`node freeze-whitelist.js` → 生成/更新 `whitelist.json`，用完后立刻 revoke PAT。
- 导出静态纪念版：`node export-archive.js` → 产物 `archive/index.html`（单文件，双击可开，可上 GitHub Pages）。
- 公网访问（临时隧道）：`cloudflared tunnel --protocol http2 --url http://localhost:8808`。

### 重启生效说明

!!! tip "白名单热加载无需重启"
    `whitelist.json` 按 mtime 热加载，重新冻结无需重启服务。环境变量变更需重启。

---

## 2. 弊端与缺陷

!!! warning "Fail-closed 白名单不可用即拒绝所有人"
    Fail-closed：白名单不可用即拒绝所有人，绝不放行。这是安全设计但也是可用性风险——白名单文件丢失或不可读时所有成员被锁外。出处：PLUGIN.md 已知限制、README「安全设计」。

!!! warning "GitHub OAuth App 只允许注册一个回调地址且必须精确匹配"
    GitHub OAuth App 只允许注册一个回调地址且必须精确匹配；本地（`http://localhost:8808/auth/callback`）与公网隧道地址切换需重新注册。出处：PLUGIN.md 已知限制、README「本地部署 / 关键提醒」。

!!! warning "资格判定只认冻结快照，组织公开化/成员变动均不影响"
    资格判定只认冻结快照：按 GitHub 用户 id（主）+ 用户名（辅）匹配；组织公开化/成员变动均不影响。"曾经的内测成员"永远有效，但新成员无法补入。出处：PLUGIN.md 已知限制、README「安全设计」「隐私说明」。

!!! warning "公开仓库数据均为演示数据，真实数据在私有数据层"
    本仓库为公开安全版：`members.json` / `whitelist.json` / `works.json` / `archive/index.html` 均为演示数据（虚构成员）；真实数据存放在私有数据层（如 `SenmuuuuW/dsh-group-photo-data`），永不进入公开仓库。维护者需手动挂载真实数据。出处：PLUGIN.md 已知限制、README「隐私说明」。

!!! warning "线上合影为活动期临时隧道，非永久地址"
    线上合影地址为活动期临时隧道（trycloudflare），仅 dsh-external 内测成员可入镜；永久纪念版见 `archive/index.html`。临时隧道失效后需重新生成。出处：PLUGIN.md 已知限制、README 顶部公告。

!!! warning "会话令牌机制"
    浏览与入镜均需成员会话；会话令牌 48 位随机十六进制 + HttpOnly。出处：PLUGIN.md 已知限制、README「安全设计」。

!!! warning "非标准 DSH 插件 bundle，dsh plugin add 不真正生效"
    该仓库为独立 Node.js 服务，非标准 DSH 插件 bundle，`dsh plugin --profile web add` 命令形式对齐但实际无法作为 DSH 插件加载；需以独立服务方式运行。出处：PLUGIN.md 安装命令说明。

!!! warning "重新冻结白名单需 read:org PAT，权限敏感"
    重新冻结白名单需 `read:org` 权限的 classic PAT，权限敏感；README 要求用完立即 revoke，但操作期间 PAT 泄露风险存在。出处：README「白名单冻结」。

---

## 3. 后续拓展思路

### 可二次开发的方向

- **多组织/多活动复用**：当前硬编码 `GH_ORG` 单组织，可扩展为多组织/多活动配置，每个活动独立冻结白名单与合影墙，复用同一套 OAuth + 白名单校验骨架。
- **回调地址多注册支持**：通过 OAuth App 之外的方式（如自建中转回调）缓解"只允许注册一个回调地址"的限制，支持本地与公网并行。
- **合影数据 CRUD 管理后台**：为维护者提供白名单/works/留言的 Web 管理后台，替代直接编辑 JSON 文件，降低误操作风险。

### 可对接的 DSH 能力

- **skill**：仓库内含 `skill/SKILL.md` 作为 DSH Skill 包装样例，可将"导出静态纪念版""重新冻结白名单"等操作封装为 DSH Skill，由 Agent 自然语言触发。
- **hooks**：合影入镜事件可经 hooks 触发外部通知（如内测群 IM 推送）。
- **self-modification**：`export-archive.js` 导出的静态纪念版可作为 self-modification 的产物样例——Agent 自主生成可托管静态站点。

### 与其它插件组合的可能性

- **dsh-group-photo + dsh-agent-teams**：用 AgentTeams 团队协作收集内测成员的合影留言与代表作信息，队长汇总后批量写入 `members.json` / `works.json`，自动化合影数据维护。
- **dsh-group-photo + dsh-vision-toolkit**：用 `vision_dominant_colors` / `vision_extract_foreground` 为成员头像自动生成主题色调与前景抠图，美化拍立得卡片；或用 `vision_glance` 校验头像合规性。
- **dsh-group-photo + dsh-web-ui 皮肤中心**：合影墙的视觉风格（拍立得 + 彩带庆祝）可沉淀为 web-ui 皮肤包，复用其皮肤试穿/应用机制。
