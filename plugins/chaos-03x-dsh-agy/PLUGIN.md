# PLUGIN 元数据 — dsh-agy

## 插件名称
dsh-agy（Google Antigravity 接入）

## 来源仓库 URL
https://github.com/chaos-03x/dsh-agy

## 克隆时的 commit SHA
1da4ff0（前 7 位）

## 功能描述（一句话）
为 DeepSeek Harness 提供 Google Antigravity (agy) 接入：OAuth 认证、多账号池 + 自动 429 轮换、设备指纹伪装，以及 CLI 与 Web 双管理入口。

## 前置依赖
- Node.js `>= 20`（`package.json` engines；本地源码开发 README 路径 C 标注 `>= 22`）
- pnpm（开发；CI 使用 pnpm 11，需 Node 22.13+）
- 可选 peer 依赖（均 optional）：`@deepseek-ai/cordis`、`@deepseek-ai/dsh-llm`
- 运行时依赖：`commander`、`proper-lockfile`
- CLI 入口 `src/cli/` 运行时禁止 import 任何 `@deepseek-ai/*` 包（保证独立可用）

## 安装命令
```sh
# Web GUI 用户（推荐）
dsh plugin --profile web add dsh-agy
# 或：npx @deepseek-ai/dsh plugin --profile web add dsh-agy

# 纯终端/无桌面环境（CLI 独立使用，免全局安装）
npx dsh-agy login
npx dsh-agy status

# 本地源码开发（Link 模式）
git clone https://github.com/chaos-03x/dsh-agy.git
cd dsh-agy && pnpm install && pnpm run build
dsh plugin --profile web link .
```

## 配置项
| 来源 | 字段 |
|---|---|
| 环境变量 | `$DSH_HOME`（整体迁移 `~/.dsh` 存储路径） |
| 凭据文件 | `~/.dsh/.credentials.yaml` 中的 `AGY_MASTER_KEY`（0600；账号 AES-256-GCM 主密钥） |
| 账号存储 | `~/.dsh/agy-accounts.json`（加密） |
| 指纹覆盖 | `~/.dsh/agy-fingerprint-data.json`（用户热更新指纹池，无需发版） |
| 内嵌公开凭据 | `AGY_CLIENT_ID` / `AGY_CLIENT_SECRET`（Antigravity 桌面应用内置的公开客户端凭据，非项目密钥） |
| `cordis.patch.yml` | 仅 `insert` 两行插件（`dsh-agy` 主插件 + `dsh-agy/web` Web 插件），无 config 字段 |

- `/agy` 仪表盘仅在 DSH Web 启动时注册，且只允许绑定到 loopback 主机。

## 已知限制
- **风险声明**：本插件使用 Antigravity 桌面产品内置的 Google consumer OAuth 客户端，并在该产品之外使用 Antigravity Cloud Code API，可能违反 Antigravity 服务条款；账号可能被限流、降级或封禁。多账号轮换、设备指纹与签名绕过 sentinel 默认开启，设计上用于规避上游限制。出处：README「⚠️ Disclaimer / 风险声明」。
- **缓存命中率达不到 DeepSeek V4 的 99%**：agy 的 gemini 系模型要求请求前缀约 16k token 才开始缓存（DSH 默认裸系统提示约 13k，低于门槛），且缓存更新慢半拍（本轮新增内容约两轮后才生效）。出处：README「About cache hits / 关于缓存命中」。
- **删除本地文件不会撤销 Google 侧 token**：refresh token 在过期或在 Google 账号安全设置中手动撤销前仍然有效。出处：README「Uninstall / 卸载」。
- **`/agy` 路由无认证**：仅允许注册到 loopback 主机绑定，非 loopback 不注册。出处：AGENTS.md「Security (Loopback Trust Model)」。
- **`~/.dsh/.credentials.yaml` 只能追加+原子替换**：重写整个文件会抹掉 DSH 其他服务存储的凭据。出处：AGENTS.md。
- **401/403 分类**：HTTP 403 含 quota / `RESOURCE_EXHAUSTED` 字样必须归类为限流（冷却）；只有真正的认证失败才触发账号吊销。出处：AGENTS.md「Classification Semantics」。
- **profile `file:` 依赖是拷贝非软链**：改源码后需 `rm -rf node_modules/<pkg> && pnpm install --offline` 重新同步，否则 profile 跑旧产物。出处：AGENTS.md。

## 本地运行状态
未实测安装（本任务仅克隆源码，未实际加载运行）

## 许可证
MIT（Copyright (c) 2026 dsh-agy contributors）
