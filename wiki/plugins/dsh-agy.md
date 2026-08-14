# dsh-agy

> **插件名**：dsh-agy（Google Antigravity 接入）
> **来源仓库**：<https://github.com/chaos-03x/dsh-agy>
> **许可证**：MIT（Copyright (c) 2026 dsh-agy contributors）
> **commit SHA**：`1da4ff0`（前 7 位）

为 DeepSeek Harness 提供 Google Antigravity (agy) 接入：OAuth 认证、多账号池 + 自动 429 轮换、设备指纹伪装，以及 CLI 与 Web 双管理入口。Web 仪表盘挂载在 `/agy`，CLI 可独立于 harness 运行。

---

## 1. 使用指南

### 前置依赖

- Node.js `>= 20`（`package.json` engines；本地源码开发 README 路径 C 标注 `>= 22`，CI 跑 Node 22/24）
- 可选 peer 依赖（均 optional）：`@deepseek-ai/cordis`、`@deepseek-ai/dsh-llm`
- 运行时依赖：`commander`、`proper-lockfile`
- CLI 入口 `src/cli/` 运行时禁止 import 任何 `@deepseek-ai/*` 包，故 CLI 可独立使用

### 安装命令

**路径 A：DSH Web GUI 用户（推荐，纯 Web UI）**

```sh
dsh plugin --profile web add dsh-agy
# 或未全局安装 dsh 时：
npx @deepseek-ai/dsh plugin --profile web add dsh-agy

dsh web
# 浏览器访问 http://127.0.0.1:3080/agy，点【Google 账号登录】完成授权
```

**路径 B：无桌面 / 纯终端（CLI 独立使用）**

```sh
# 免全局安装即用
npx dsh-agy login          # 交互式 OAuth（浏览器 / --headless 粘贴 / --blob）
npx dsh-agy status         # 账号列表 + 每模型配额摘要
npx dsh-agy verify         # refresh + userinfo 校验
npx dsh-agy import <file>  # 导入 agy auth.json 或凭据 blob（--blob）
npx dsh-agy logout         # 删除账号

# 或全局安装
npm install -g dsh-agy
```

**路径 C：本地源码开发与调试（Link 模式）**

```sh
git clone https://github.com/chaos-03x/dsh-agy.git
cd dsh-agy && pnpm install && pnpm run build
dsh plugin --profile web link .
```

### 配置项

| 来源 | 字段 | 说明 |
|---|---|---|
| 环境变量 | `$DSH_HOME` | 整体迁移 `~/.dsh` 存储路径 |
| 凭据文件 | `~/.dsh/.credentials.yaml` → `AGY_MASTER_KEY`（0600） | 账号 AES-256-GCM 主密钥 |
| 账号存储 | `~/.dsh/agy-accounts.json` | 加密账号池 |
| 指纹覆盖 | `~/.dsh/agy-fingerprint-data.json` | 用户热更新指纹池（版本串/SDK 客户端），无需发版 |
| 内嵌公开凭据 | `AGY_CLIENT_ID` / `AGY_CLIENT_SECRET` | Antigravity 桌面应用内置的公开客户端凭据，非项目密钥，勿删除/混淆 |
| `cordis.patch.yml` | 仅 `insert` 两行（`dsh-agy` + `dsh-agy/web`） | 无 config 字段 |

### CLI 命令参考

| 命令 | 关键参数 | 说明 |
|---|---|---|
| `dsh-agy login` | `--headless`、`--blob`、`--port <n>`（默认 51121）、`--project <id>`、`--timeout <ms>`（默认 300000） | 交互式 Google OAuth |
| `dsh-agy status` | — | 账号列表 + 每模型配额摘要 |
| `dsh-agy import <files...>` | `--blob`、`--email <email>`、`--overwrite` | 导入 auth.json 或凭据 blob（多文件/多行粘贴 = 批量） |
| `dsh-agy export` | `--index <n>`、`--out <dir>` | 导出账号凭据为粘贴 blob |
| `dsh-agy verify` | `--index <n>` | refresh + 健康检查 |
| `dsh-agy logout` | `--index <n>`、`--email <email>` | 删除账号 |

### 429 轮换机制

| 分类 | 行为 |
|---|---|
| `soft_rate_limit`（Retry-After < 3s） | 同账号立即重试，不冷却 |
| `rate_limited` | 5 分钟冷却 + 切换下一账号（单账号时冷却后重试同号） |
| `quota_exhausted`（"quota reached"/"individual quota"/RESOURCE_EXHAUSTED…） | 24 小时冷却——当天不再调用该账号 |
| `unknown` | 指数退避 |

401/403 → 账号吊销（标记需重新认证）；成功重置失败计数。HTTP 403 含 quota / `RESOURCE_EXHAUSTED` 字样归类为限流而非认证失败。

### 重启生效说明

!!! tip "指纹覆盖文件热更新无需发版"
    `~/.dsh/agy-fingerprint-data.json` 用户可自行覆盖，无需等插件发版即可更新指纹池。`$DSH_HOME` 可整体迁移账号存储与主密钥。User-Agent 版本由 `version.ts` 动态解析（750ms 超时上限 + 6 小时缓存 + 启动预热）。

---

## 2. 弊端与缺陷

!!! warning "可能违反 Antigravity 服务条款，账号有封禁风险"
    本插件使用 Antigravity 桌面产品内置的 Google consumer OAuth 客户端，并在该产品之外使用 Antigravity Cloud Code API，可能违反 Antigravity 服务条款。账号可能被限流、降级或封禁。多账号轮换、设备指纹与签名绕过 sentinel 默认开启，设计上用于规避上游限制；使用者需自行承担账号后果。出处：README「⚠️ Disclaimer / 风险声明」。

!!! warning "缓存命中率天然低于 DeepSeek V4 的 99%"
    agy 的 gemini 系模型要求请求前缀约 16k token 才开始缓存，而 DSH 默认裸系统提示约 13k，低于门槛——每个新对话前一两个请求必然 0%。且 agy 缓存更新慢半拍，本轮新增内容约两轮后才进入缓存，中间对相同内容的请求全部算未命中。长对话命中率随上下文增长持续上升，上限由模型上下文窗口决定。差距来自上游机制，无优化空间。出处：README「About cache hits / 关于缓存命中」。

!!! warning "删除本地文件不会撤销 Google 侧 token"
    删除 `~/.dsh/agy-accounts.json` 等本地文件不会撤销 Google 侧的 refresh token——它在过期或你在 Google 账号安全设置中手动撤销前仍然有效。需另行到 Google 账号安全 → 第三方访问 → 撤销 "Antigravity"。出处：README「Uninstall / 卸载」。

!!! warning "/agy 路由无认证，仅限 loopback 绑定"
    `/agy` 路由本身无认证，安全模型完全依赖"只允许注册到 loopback 主机绑定"这一道闸（`web/plugin.ts` gate）。若误将 DSH Web 暴露到非 loopback 地址且 `/agy` 被注册，将导致账号管理界面裸奔。出处：AGENTS.md「Security (Loopback Trust Model)」。

!!! warning ".credentials.yaml 只能追加+原子替换，重写会抹掉其他凭据"
    `~/.dsh/.credentials.yaml` 同时存放 DSH 其他服务的凭据，只能通过追加 + 原子替换修改 `AGY_MASTER_KEY` 行；重写整个文件会抹掉其他凭据。出处：AGENTS.md。

!!! warning "profile file: 依赖是拷贝非软链，改源码后需手动重同步"
    profile 的 `file:` 依赖是拷贝而非软链——改源码后需 `rm -rf node_modules/<pkg> && pnpm install --offline` 重新同步，否则 profile 跑旧产物。出处：AGENTS.md。

!!! warning "Windows 跳过 POSIX owner-only 文件权限检查"
    Windows 上跳过 `agy-accounts.json` / `.credentials.yaml` 的 POSIX owner-only 权限检查（设计如此）；文件保护依赖 NTFS ACL 与用户隔离。出处：AGENTS.md。

---

## 3. 后续拓展思路

### 可二次开发的方向

- **指纹池社区共享**：`~/.dsh/agy-fingerprint-data.json` 已支持用户热覆盖，可建立一个社区维护的指纹池仓库（版本串/SDK 客户端），插件启动时按版本拉取，降低单点维护压力。
- **多 provider 抽象**：当前 `LlmAdapter` seam 仅接入 agy，可将"OAuth + 多账号池 + 429 分类 + 指纹"骨架抽象为通用 adapter 基类，复用到其他需要轮换的 provider。
- **缓存命中观测面板**：基于 `signature-cache.ts` / `thoughtSignature` 缓存数据，在 `/agy` 仪表盘增加每会话缓存命中率曲线，让"16k 门槛 + 两轮延迟"对用户可见。

### 可对接的 DSH 能力

- **web plugin**：`/agy` 仪表盘本身就是 DSH Web plugin 样例，可作为"如何在 loopback 上挂载无认证管理面板且不泄漏到公网"的范本。
- **self-modification**：`fingerprint-data.json` 编译进 bundle + 用户覆盖文件双轨制，是 self-modification 中"内置基线 + 用户热补丁"模式的标准实现，可被其他需要版本化内置数据的插件借鉴。

### 与其它插件组合的可能性

- **dsh-agy + dsh-group-photo**：dsh-group-photo 的 `skill/SKILL.md` 包装样例可借鉴 dsh-agy 的 CLI/Web 双入口设计；dsh-agy 的"OAuth + fail-closed 白名单"骨架可复用到合影墙的成员资格校验。
- **dsh-agy + dsh-feishu-bot**：飞书 bot 的审批卡片可对接 agy 账号池健康状态——当某账号 `quota_exhausted` 24 小时冷却时，主动推送飞书提醒，避免长任务卡在单账号限流上。
