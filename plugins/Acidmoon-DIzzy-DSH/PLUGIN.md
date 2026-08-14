# PLUGIN 元数据 — Dizzy-DSH

## 插件名称
Dizzy-DSH（DSH 插件合集）

## 来源仓库 URL
https://github.com/Acidmoon/DIzzy-DSH

## 克隆时的 commit SHA
1e5fe12（前 7 位）

## 功能描述（一句话）
「克隆即装」的 DSH 插件合集：一条命令装完余额查询、本月用量、Agent 规则注入、Kimi 浏览器控制四个自有插件，并快照收录 dsh-vision-toolkit / dsh-genui / dsh-notification / dsh-better-sidebar 四个第三方插件，重启即用。

## 前置依赖
- DeepSeek Harness（dsh web）
- Node.js / pnpm（profile workspace）
- 浏览器控制 `dizzy-dsh-kimi-webbridge` 依赖 Kimi WebBridge daemon（`%USERPROFILE%\.kimi-webbridge\bin\kimi-webbridge.exe`，监听 127.0.0.1:10086）+ Chrome/Edge Kimi WebBridge 浏览器扩展（不在本仓库，需用户自行安装）
- 视觉识别 `dsh-vision-toolkit` 需用户提供视觉模型 API（baseUrl / API key / 模型名）

## 安装命令
```bash
# 1. 克隆仓库
git clone https://github.com/Acidmoon/DIzzy-DSH.git

# 2. 一条命令安装全部插件（自有 + 收录的第三方）
dsh plugin --profile web add file:<仓库绝对路径>

# 3. 重启 dsh web，全部生效（含浏览器 UI）
```

> 必须用 `file:` 而不是 `link:`（`link:` 不安装依赖树，插件无法加载）。
> 首次安装如遇 `ERR_PNPM_IGNORED_BUILDS: node-pty / protobufjs`：在 `~/.dsh/profiles/web/pnpm-workspace.yaml` 的 `allowBuilds` 里把两者设为 `true`，重新 add 即可。

## 配置项
| 来源 | 字段 |
|---|---|
| 余额 `dizzy-dsh-balance` | 无配置文件；输入栏右侧徽章 + `/dizzy/balance` + `balance_check` 工具；Host 每分钟刷新 |
| 用量 `dizzy-dsh-usage-card` | 无配置文件；右侧「用量」Tab；60s 自动刷新 |
| Agent 规则 `dizzy-dsh-agent-instructions` | 编辑 `prompts/agent-instructions.md`，下一轮对话即生效 |
| 浏览器控制 `dizzy-dsh-kimi-webbridge` | 无配置文件；依赖外部 daemon 与扩展 |
| 视觉识别 `dsh-vision-toolkit` | `~/.dsh/settings.yaml` 的 `vision-toolkit` 段：`provider.baseUrl` / `provider.credential` / `provider.model` / `language` / `timeoutMs` / `maxImageBytes` / `maxImagePixels` / `concurrency` / `runtime.mode` / `allowedDirs` |
| 桌面通知 `dsh-notification` | 设置 > 通知：结束状态开关 / 关键词包含排除规则 / `config.maxBodyChars`（默认 400，profile `cordis.yml`） |
| GenUI `dsh-genui` | 零配置；可选复制 `third-party/dsh-genui/SKILL.md` 到 `~/.dsh/skills/genui/` |
| IDE 侧边栏 `dsh-better-sidebar` | 零配置，即点即用 |

## 已知限制
- 必须用 `file:` 安装，`link:` 不安装依赖树会导致插件加载失败（README「快速开始」注解）。
- 首次安装如遇 `ERR_PNPM_IGNORED_BUILDS: node-pty / protobufjs`，需手动改 `pnpm-workspace.yaml` 的 `allowBuilds` 为 `true`（README「快速开始」注解）。
- Agent 规则注入 entry id 必须用 `dizzy-agent-instructions`，不能用 `agent-instructions`（后者是 dsh-base 官方 entry，已占位，重复会抛 `duplicate loader entry id: agent-instructions`）（`cordis.patch.yml` 注释）。
- 浏览器控制依赖外部 Kimi WebBridge daemon + 浏览器扩展，二者不在本仓库，缺失则 `kimi_browser_*` 工具不可用（README「0. 浏览器控制」段）。
- 桌面通知：标签页关闭后不弹（浏览器限制）；断线期间完成的轮次重连后不补发；站点权限被拒后页面内无法恢复，需浏览器站点设置改回（README「3. 桌面通知」排查段）。
- GenUI 的 `dsh-ui` 围栏如渲染成代码块，多为未重启 / 未硬刷新 / 插件不在 bundle 列表；scene3d / mermaid 空白需重新 add 快照（README「2. 生成式 UI」排查段）。
- 第三方插件为快照收录，更新走独立流程（跟随上游 + 补丁重放 + 适配检查），见 `docs/THIRD-PARTY-UPDATE.md`（README「收录的第三方插件」段）。

## 本地运行状态
未实测安装（本任务仅克隆源码，未实际通过 `dsh plugin --profile web add file:` 加载）

## 许可证
未声明（仓库未包含 LICENSE 文件）
