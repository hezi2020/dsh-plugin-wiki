# dsh-fleet-audit

> **插件名**：dsh-fleet-audit（DSH agent 舰队卫生审计插件）
> **来源仓库**：<https://github.com/LeslieWylie/dsh-fleet-audit>
> **许可证**：MIT © LeslieWylie（Copyright (c) 2026 LeslieWylie）
> **commit SHA**：`700f7aa`（前 7 位 `700f7aa`）

DSH agent 舰队卫生审计插件：只读、零依赖、确定性。检查三件事，输出全程脱敏——凭据文件权限、git remote 内嵌凭据（masked）、provider token 前缀字面量（仅计数）。多 agent 时代的机器上，凭据散落在 `~/.gitconfig`、agent 配置、`.git/config` 与各种 `.env` 里，git 的 `url.*.insteadof` 或 `pushurl` 一旦嵌了 token，任何 `git remote -v` 都会把密钥打印进日志/对话/CI；一键只读审计 + 脱敏输出，是安全基线体检的第一道。

---

## 1. 使用指南

### 前置依赖

- Node.js `^22.19.0 || >=24.0.0`（package.json `engines.node`）
- dsh `>= 0.1.0-rc.6`（peer 依赖 `@deepseek-ai/cordis ^4.0.1`、`@deepseek-ai/dsh-tools ^0.1.0-rc.6`，均为 optional peerDependenciesMeta，意味着也可作为独立库使用）
- 零运行时依赖（`dependencies` 为空，仅 devDependencies 用于构建与测试）

### 安装命令

```sh
# 本地验证
dsh plugin --profile web add /path/to/dsh-fleet-audit

# 发布后（npm / GitHub）
dsh plugin --profile web add dsh-fleet-audit
# 或
dsh plugin --profile web add github:LeslieWylie/dsh-fleet-audit
```

安装后重启 `dsh web`，直接说「审计一下本机凭据卫生 / run fleet_audit」。

仓库提供 `cordis.patch.yml` 作为 dsh bundle patch：

```yaml
# dsh bundle patch: inserts this plugin into a profile's layer stack (0806+).
- insert:
    - id: fleet-audit
      name: 'dsh-fleet-audit'
```

由 `package.json` 的 `dsh.bundle.patch` 字段声明。

### 配置项

无静态配置项。所有行为通过工具调用参数控制（来源：`src/index.ts` defineTool parameters + README「用法」）：

| 参数 | 类型 | 默认 | 上限 | 说明 |
|---|---|---|---|---|
| `roots` | string[] | `[]` | — | 递归扫描 `.git/config` 的目录（默认只查 `~/.gitconfig`） |
| `files` | string[] | `[]` | — | 额外要查权限的凭据文件绝对路径 |
| `scanSecrets` | boolean | `true` | — | 是否扫描 token 前缀字面量 |
| `maxGitConfigs` | number | `200` | `2000` | git config 扫描上限 |
| `maxDepth` | number | `5` | `20` | 目录递归深度 |

默认检查的固定凭据文件列表（`src/audit.ts` `DEFAULT_FILES` / `DEFAULT_DIRS`）：

- 文件：`~/.gitconfig`、`~/.netrc`、`~/.npmrc`、`~/.env`
- 目录：`~/.ssh`（预期 700）

权限判定逻辑：`(mode & 0o077) !== 0` 即标记为 `tooOpen`（组/其他可读）。

### 典型用法示例

**自然语言触发**（来源：README「安装」）：

> 审计一下本机凭据卫生
> run fleet_audit

**工具调用参数示例**（扫描指定目录 + 额外凭据文件）：

```jsonc
{
  "roots": ["/Users/alice/code"],
  "files": ["/Users/alice/.config/gh/hosts.yml"],
  "scanSecrets": true,
  "maxGitConfigs": 500,
  "maxDepth": 8
}
```

**输出示例（脱敏）**（来源：README「输出示例」）：

```jsonc
{
  "ok": true,
  "summary": { "files": 5, "tooOpen": 1, "gitLeaks": 2, "secretFiles": 1, "issues": 4, "scannedGitConfigs": 12 },
  "checks": {
    "credentialFiles": [
      { "path": "/Users/alice/.gitconfig", "exists": true, "mode": "644", "tooOpen": true }
    ],
    "gitRemoteLeaks": [
      { "file": "/Users/alice/code/proj/.git/config", "host": "gitlab.example.com", "maskedUrl": "https://***:***@gitlab.example.com/group/proj.git" }
    ],
    "secrets": [
      { "file": "/Users/alice/.gitconfig", "providers": [ { "provider": "github", "count": 1 } ] }
    ]
  },
  "note": "Read-only audit; secret-like values are masked in the output. Fix permissions with chmod 600 and rotate any exposed credentials."
}
```

**回滚**（来源：README「回滚」）：

```sh
dsh plugin --profile <p> remove dsh-fleet-audit   # 或从 dsh.profile.bundles 删除该行
```

插件只读、无状态，卸载不影响任何用户数据。

### 重启生效说明

!!! tip "安装后需重启 dsh web"
    安装后需重启 `dsh web`，工具才会注册生效；卸载同理。来源：README「安装」「回滚」。

!!! tip "工具执行超时 10 秒，超大仓库需调参"
    `src/index.ts` 中 `timeoutMs: 10000`，超大仓库扫描可能超时；可调大 `maxGitConfigs`（上限 2000）或缩小 `roots` 范围。来源：`src/index.ts` defineTool `timeoutMs`。

---

## 2. 弊端与缺陷

!!! warning "仅扫描文本类配置文件，不解析加密存储/钥匙串/二进制"
    仅扫描文本类配置文件，不会解析加密存储、系统钥匙串（macOS Keychain / Windows Credential Manager）、二进制文件；这些位置的凭据无法被本工具发现。出处：README「已知局限」。

!!! warning "token 前缀识别为启发式规则，存在漏报/误报"
    token 前缀识别为启发式规则：可能漏报（非常规前缀，如自定义 OAuth token 格式）或误报（如代码示例中的占位 token）；需人工复核。出处：README「已知局限」。

!!! warning "默认只检查固定凭据列表，任意路径需显式指定"
    默认只检查 `~/.gitconfig`、`~/.netrc`、`~/.npmrc`、`~/.env`、`~/.ssh` 这组固定列表；任意路径凭据需通过 `roots` / `files` 参数显式指定，否则不会被检查。出处：README「已知局限」、`src/audit.ts` `DEFAULT_FILES` / `DEFAULT_DIRS`。

!!! warning "不主动修改任何文件，需用户手动 chmod 与轮换密钥"
    工具只读，不主动修改任何文件；发现权限过宽或泄漏后，需用户自行 `chmod 600` 收紧权限并轮换暴露的密钥。出处：README「已知局限」「安全边界」、输出 `note` 字段。

!!! warning "工具执行超时 10 秒，超大仓库可能超时"
    `src/index.ts` 中 `timeoutMs: 10000`，超大仓库（数千个 `.git/config`）扫描可能超时；需调大 `maxGitConfigs`（上限 2000）或缩小 `roots` 范围。出处：`src/index.ts` defineTool `timeoutMs`。

!!! warning "依赖 dsh 0.1.0-rc.6 的 cordis / dsh-tools，版本强耦合"
    peer 依赖 `@deepseek-ai/cordis ^4.0.1` 与 `@deepseek-ai/dsh-tools ^0.1.0-rc.6`（虽然标记为 optional，但作为 dsh 插件运行时必须由宿主提供）；dsh 版本不匹配可能导致 `defineTool` 接口不兼容。出处：`package.json` `peerDependencies`。

---

## 3. 后续拓展思路

### 可二次开发的方向

- **更多 provider token 前缀**：`src/secret.ts` 当前覆盖 github / github-fine-grained / gitlab / gitlab-ci / slack / aws / openai / jwt 常见前缀；可扩展 azure-devops、gcp-service-account、stripe、twilio 等。
- **加密存储/钥匙串扫描**：当前仅扫描文本配置；可集成平台钥匙串查询（macOS `security find-generic-password`、Windows Credential Manager API）作为可选增强。
- **自动修复模式**：当前严格只读；可增加 `fix: true` 模式自动 `chmod 600`（需用户显式开启，并保留 dry-run 预览）。
- **CI/CD 集成**：当前作为 dsh 工具触发；可打包为独立 CLI（`npx dsh-fleet-audit`）供 CI 流水线 pre-commit / pre-merge 调用，输出 SARIF 格式供 GitHub Code Scanning 消费。
- **基线对比与历史趋势**：当前输出为单次快照；可加入历史落盘与对比，跟踪"权限过宽文件数""泄漏数"随时间的变化。

### 可对接的 DSH 能力

- **tools**：已注册 `fleet_audit` 工具（`src/index.ts` defineTool），dsh Agent 可自然语言触发或工具调用触发；可继续拆分为多个细粒度工具（如 `fleet_audit_perms` / `fleet_audit_git_remotes` / `fleet_audit_secrets`）。
- **hooks**：可作为 dsh 启动 hook（每次 dsh web 启动时自动跑一次审计），把结果写进 dsh 日志或推送给维护者。
- **systemPrompt**：可在 dsh system prompt 中注入"本机已启用 fleet-audit，凭据泄漏会被记录"提示，引导 Agent 主动避免在对话中打印 token。

### 与其它插件组合的可能性

- **dsh-fleet-audit + dsh-github-login**：dsh-github-login 会把 token 写入 `~/.dsh/github-auth.json` 与 `~/.config/gh/hosts.yml`；dsh-fleet-audit 可把这些文件纳入默认扫描列表（或通过 `files` 参数显式传入），检查它们的权限是否过宽。
- **dsh-fleet-audit + dsh-onebot**：dsh-onebot 把 `accessToken` 与管理员白名单存于 dsh 配置；dsh-fleet-audit 可扫描 dsh 配置目录（`~/.dsh/`）下的凭据文件，确保 QQ token 不泄露。
- **dsh-fleet-audit + dsh-group-photo**：dsh-group-photo 维护者用 `read:org` PAT 重新冻结白名单，PAT 可能临时写入文件；dsh-fleet-audit 可在 PAT 使用前后扫描，确保 PAT 未残留于磁盘。
