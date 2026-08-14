# Dizzy-DSH

> **插件名**：Dizzy-DSH（DSH 插件合集）
> **来源仓库**：<https://github.com/Acidmoon/DIzzy-DSH>
> **许可证**：未声明（仓库未包含 LICENSE 文件）
> **commit SHA**：`1e5fe12`（前 7 位）

「克隆即装」的 DSH 插件合集：一条命令装完余额查询、本月用量、Agent 规则注入、Kimi 浏览器控制四个自有插件，并快照收录 dsh-vision-toolkit / dsh-genui / dsh-notification / dsh-better-sidebar 四个第三方插件，重启即用。无需 npm 发布；仓库本身作为 bundle 层安装，重启后依然生效。

---

## 1. 使用指南

### 前置依赖

- DeepSeek Harness（dsh web）
- Node.js / pnpm（profile workspace）
- 浏览器控制 `dizzy-dsh-kimi-webbridge` 依赖 Kimi WebBridge daemon（`%USERPROFILE%\.kimi-webbridge\bin\kimi-webbridge.exe`，监听 127.0.0.1:10086）+ Chrome/Edge Kimi WebBridge 浏览器扩展（不在本仓库，需用户自行安装）
- 视觉识别 `dsh-vision-toolkit` 需用户提供视觉模型 API（baseUrl / API key / 模型名）

### 安装命令

```bash
# 1. 克隆仓库
git clone https://github.com/Acidmoon/DIzzy-DSH.git

# 2. 一条命令安装全部插件（自有 + 收录的第三方）
dsh plugin --profile web add file:<仓库绝对路径>

# 3. 重启 dsh web,全部生效(含浏览器 UI)
```

> ⚠️ 必须用 **`file:`** 而不是 `link:`（`link:` 不安装依赖树，插件无法加载）。

> ⚠️ 首次安装如遇 `ERR_PNPM_IGNORED_BUILDS: node-pty / protobufjs`：在
> `~/.dsh/profiles/web/pnpm-workspace.yaml` 的 `allowBuilds` 里把两者设为
> `true`，重新 add 即可。

**卸载**：`dsh plugin --profile web remove dizzy-dsh`

**更新**：`git pull` 后删除 profile 里的旧副本再重装：

```powershell
Remove-Item ~/.dsh/profiles/web/node_modules/dizzy-dsh* -Recurse -Force
dsh plugin --profile web add file:<仓库绝对路径>
```

### 配置项

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

> 通用：DSH 设置 `~/.dsh/settings.yaml`；**密钥只进 DSH credentials**（`~/.dsh/.credentials.yaml` / 设置界面），settings 里只放 credential 引用，绝不写明文密钥（README「通用步骤」第 3 条）。

### 典型用法示例

- **余额查询**：对话中直接问「余额」或调用 `balance_check` 工具，或用 `/dizzy/balance` 命令；输入栏右侧常驻徽章每分钟自动刷新。
- **本月用量**：右侧「用量」Tab 看月度热力图 / 近 7 天趋势 / 今日分模型明细 / 峰谷时段；悬浮弹窗看输入/输出/缓存分项；支持月份切换。
- **Agent 规则注入**：装完即全局生效，所有会话、所有工作区；编辑 `prompts/agent-instructions.md` 下一轮对话即生效，无需重启。
- **浏览器控制**：让模型调用 `kimi_browser_activate`，工具目录随后出现全套 `kimi_browser_*`（导航/快照/点击/输入/截图/标签管理）；带登录态的会话直接可用。
- **视觉识别**：新会话给模型一张图片，用 `vision_glance` 描述；4 个常驻工具直接可见，其余工具加载 vision-tools skill 后出现。
- **生成式 UI**：新会话要求「用 dsh-ui 画一个统计仪表盘」，回答中应直接渲染出组件；工具目录含 `render_ui` / `validate_dsh_ui`。
- **桌面通知**：让模型跑一个耗时任务，切到其他标签页，任务完成时应收到系统通知。
- **IDE 侧边栏**：点开右侧侧边栏图标，可见资源管理器 / 编辑器 / 终端 / Git / 浏览器分区，按会话隔离。

### 重启生效说明

!!! tip "配置改动后一律重启 dsh web + 浏览器硬刷新"
    配置改动后一律**重启 dsh web + 浏览器硬刷新**（Ctrl+Shift+R）；Agent 规则文本例外，编辑 `prompts/agent-instructions.md` 后下一轮对话即生效，无需重启。出处：README「通用步骤」第 2 条、「Agent 规则注入」表。

---

## 2. 弊端与缺陷

!!! warning "必须用 file: 安装，link: 不可用"
    必须用 `file:` 而不是 `link:` 安装；`link:` 不安装依赖树，插件无法加载。出处：README「快速开始」第一条注解。

!!! warning "首次安装可能遇 ERR_PNPM_IGNORED_BUILDS"
    首次安装如遇 `ERR_PNPM_IGNORED_BUILDS: node-pty / protobufjs`，需手动改 `~/.dsh/profiles/web/pnpm-workspace.yaml` 的 `allowBuilds` 把两者设为 `true`，重新 add 才能装好。出处：README「快速开始」第二条注解。

!!! warning "Agent 规则注入 entry id 不能用 agent-instructions"
    Agent 规则注入 entry id 必须用 `dizzy-agent-instructions`，不能用 `agent-instructions`——后者是 dsh-base 里 `@deepseek-ai/dsh-agent-instructions` 的官方 entry，web-app 虽把它 disabled 但 id 仍占位，再 insert 同 id 会在 boot 抛 `duplicate loader entry id: agent-instructions`。出处：`cordis.patch.yml` 注释段。

!!! warning "浏览器控制依赖外部 daemon 与扩展"
    浏览器控制 `dizzy-dsh-kimi-webbridge` 依赖 Kimi 官方 daemon（`%USERPROFILE%\.kimi-webbridge\bin\kimi-webbridge.exe`，监听 127.0.0.1:10086）+ Chrome/Edge Kimi WebBridge 浏览器扩展，二者不在本仓库；缺失则 `kimi_browser_*` 工具不可用。daemon 缺失需用户到 https://www.kimi.com/zh-cn/features/webbridge 安装；扩展未连接需用户检查扩展是否启用。出处：README「0. 浏览器控制」段。

!!! warning "桌面通知受浏览器限制"
    桌面通知：标签页关闭后不弹（浏览器限制，页面需处于打开状态）；断线期间完成的轮次重连后不补发；站点权限被拒后页面内无法恢复，需浏览器站点设置改回。出处：README「3. 桌面通知」排查段。

!!! warning "GenUI 渲染失败常见于未重启 / 未硬刷新"
    GenUI 的 `dsh-ui` 围栏如渲染成代码块，多为未重启 / 未硬刷新 / 插件不在 bundle 列表；scene3d / mermaid 空白按需资产路由失效，先硬刷新，仍不行则 `dsh plugin --profile web remove dizzy-dsh` 后重新 add（快照重装）。出处：README「2. 生成式 UI」排查段。

!!! warning "第三方插件为快照收录，更新走独立流程"
    第三方插件为快照收录（`third-party/`），版本固定；更新走独立流程（跟随上游 + 补丁重放 + 适配检查），见 `docs/THIRD-PARTY-UPDATE.md`；不会自动跟随上游最新版。出处：README「收录的第三方插件」段、`docs/THIRD-PARTY-SNAPSHOTS.md` / `docs/THIRD-PARTY-UPDATE.md`。

!!! warning "仓库未声明许可证"
    仓库未包含 LICENSE 文件，许可证未声明；其中收录的第三方插件各有自己的 LICENSE（如 dsh-vision-toolkit / dsh-genui / dsh-notification / dsh-better-sidebar），使用时需分别遵守。出处：仓库根目录文件列表、README「收录的第三方插件」表。

---

## 3. 后续拓展思路

### 可二次开发的方向

- **新增自有子包**：按 `docs/DEVELOPMENT.md` 的「双半区机制、平面规则、如何新增子包」流程，在 `plugins/` 下建子包（自己的 package.json/main/client bundle），主包 package.json 加 `file:` 依赖，再在 `cordis.patch.yml` 加一行 entry。
- **第三方插件补丁管理**：用 `scripts/reapply-third-party-patches.mjs` 与 `patches/` 目录管理对快照的手工补丁，跟随上游更新时重放补丁。
- **替代 Kimi WebBridge**：把浏览器控制后端从 Kimi WebBridge 换成更通用的 CDP / browser-use 方案，减少对单一外部 daemon 的依赖。

### 可对接的 DSH 能力

- **skill**：仓库已带 `skills/README.md`；可把余额查询、用量统计、Agent 规则编辑等高频操作封装为 DSH Skill，供 Agent 自然语言触发。
- **hooks**：在余额低于阈值、用量异常飙升、浏览器扩展断开等事件上挂 hooks，触发外部通知。
- **self-modification**：Agent 规则注入（`dizzy-dsh-agent-instructions`）本身就是 self-modification 的入口——用户/Agent 通过编辑规则文本动态调整后续所有会话的行为。

### 与其它插件组合的可能性

- **Dizzy-DSH + dsh-net-proxy**：让浏览器控制、视觉识别、外部模型 API 调用统一经 dsh-net-proxy 代理出口，集中网络管控。
- **Dizzy-DSH + AgentFrame-v3**：用 AgentFrame 的语义 + 物理双层压缩缓解 Dizzy-DSH 多插件叠加带来的上下文膨胀，Agent 规则注入可优先保留。
- **Dizzy-DSH + jacobian**：把 Jacobian 的 `math.find` / `math.run` 接入 Dizzy-DSH 的工具体系，扩展 Agent 的精确计算能力，配合视觉识别做图像→数学描述→精确求解链路。
