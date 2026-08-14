# dsh-yolo-mode

> **插件名**：dsh-yolo-mode（YOLO 自动审批模式）
> **来源仓库**：<https://github.com/SeverusZh/dsh-yolo-mode>
> **许可证**：MIT（Copyright (c) 2026 dsh-yolo-mode contributors）
> **commit SHA**：`7930ab6`（前 7 位）

DSH 双面包插件（v0.2.0，Host + Browser）。当会话处于可写沙箱模式且审批策略为 `ask` 时，作为 `approval/request` 应答者用 LLM 自动裁决沙箱升权申请（`escalate sandbox to workspace-write|danger-full-access: <justification>`），按预设 / 自定义层级决定「放行 / 拒绝 / 转人工」。任何错误、超时、非 JSON、工具块、信号量溢出路径都不放行（**fail-closed**）。内置 6 种预设（off / strict / balanced / permissive / yolo / custom），默认 `balanced`。浏览器端提供输入栏状态 chip、统计面板（总审批 / 放行 / 拒绝 / 转人工 + 最近 20 条决策）、设置页（保存即时生效，持久化到 `settings.yaml`）。每次裁决追加一行 JSONL 到审计日志。

---

## 1. 使用指南

### 前置依赖

- DeepSeek Harness 主目录（`$DSH_HOME`，通常 `C:\Users\<user>\.dsh`），含 `profiles/web/cordis.patch.yml`。
- Node.js `>=20`（`package.json` `engines`）。
- peer 依赖：`@deepseek-ai/dsh-llm ^0.1.0-rc.6`（裁判调用）、`@deepseek-ai/dsh-timeout ^0.1.0-rc.6`（deadline）、`@deepseek-ai/dsh-client-runtime` / `dsh-client-ui-slots ^0.1.0-rc.6`（浏览器 UI）、`@deepseek-ai/schemastery ^3.18.1`（settings schema）、`react ^18.2.0`。
- 测试运行需能解析 peer 依赖（如把 DSH checkout 的 `node_modules/@deepseek-ai` 链接到本项目，或由 profile 的 pnpm 安装解析）。

!!! warning "包未声明 dsh.bundle manifest，安装需两步"
    `package.json` 只有 `dsh.client`，无 `dsh.bundle.patch`；安装走 README 的「`dsh plugin add` + 手动追加 `cordis.patch.yml` 行」两步流程，不能仅靠 `dsh plugin add` 一键完成。出处：`package.json` `dsh` 字段、README「二、安装」。

### 安装命令

```bash
# 步骤 1：安装插件包（指向项目绝对路径，转发 pnpm，支持本地路径 / link）
dsh plugin --profile web add <项目绝对路径>

# 步骤 2：编辑 $DSH_HOME/profiles/web/cordis.patch.yml，在顶层 YAML 数组追加：
#   - insert:
#       - id: yolo-mode
#         name: dsh-yolo-mode
#         config:
#           preset: balanced
```

> `cordis.patch.yml` 由 `watchUserPatches` 热重载，保存后新行即挂入运行中的宿主组合（实测无需重启即可 ACTIVE；若加载失败，宿主保留上一棵好树并记录 `hmr/config-update-failed`）。重启 DSH 始终是最稳妥的兜底方式。升级到 v0.2.0 后请**重启 DSH 并刷新浏览器**（已挂载插件行的模块代码更新需重启才能重新导入）。

### 配置项

| 字段 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `preset` | `'off'\|'strict'\|'balanced'\|'permissive'\|'yolo'\|'custom'` | `balanced` | 内置预设；`custom` 时以 `levels` 为准 |
| `modes` | `string[]` | `['workspace-write']` | 会话有效沙箱模式 ∈ 此列表时才介入；合法项 `read-only` / `workspace-write` / `danger-full-access` |
| `levels` | `object` | `{}` | `preset=custom` 时的层级表；`levels.tools.<toolName>` 可对**任意预设**逐工具覆盖 |
| `judge.provider` | `string` | `''` | 启用 LLM 裁判所必需；空串视为未配置，`judge` 决策一律按错误回退 |
| `judge.model` | `string` | `''` | LLM 裁判所用模型 |
| `judge.systemPrompt` | `string` | `''` | 空 = 内置安全审计者 prompt（含防回环三要求） |
| `judge.timeoutMs` | `number` | `20000` | 裁判单次调用超时（毫秒，正整数） |
| `judge.maxTokens` | `number` | `256` | 裁判输出最大 token 数（正整数） |
| `judge.concurrency` | `number` | `2` | 并发裁判信号量上限，超出抛 `OVERLOAD` → 按错误回退（正整数） |
| `includeSubagents` | `boolean` | `true` | 子代理会话是否同样裁决；`false` 时子代理请求转人工 |
| `auditFile` | `string` | `''` | 审计 JSONL 文件绝对路径；空 = `%TEMP%/dsh-yolo/judge.log` |

- 配置优先级：插件行 `config` 为基底，设置页保存值（持久化到 `settings.yaml`，namespace = `yolo-mode`）覆盖其上。
- 内置 6 预设表：`off`（全转人工）/ `strict`（仅裁决 `workspace-write`，`danger-full-access` 恒转人工，裁判错误 → 拒绝）/ `balanced`（默认，裁决全部目标，失败 / 不确定 → 转人工）/ `permissive`（不确定视为允许，文档警示）/ `yolo`（确定性全放行，零 LLM 调用）/ `custom`（全字段开放）。
- `resolvePolicy` 优先级（高 → 低）：`levels.tools[toolName]` → 基础行（`preset=custom` 时为 `levels[targetMode]`，缺省 `delegate`；其余预设为内置预设表）。

### 典型用法示例

**预设选择（按风险偏好）**：

- 默认 `balanced`：裁决全部升权目标；裁判失败 / 不确定 → 转人工。最常用的安全平衡点。
- `strict`：仅裁决 `workspace-write` 目标；`danger-full-access` 恒转人工；裁判错误 → 拒绝。最严格。
- `custom` + `levels.tools`：对特定工具逐个覆盖。例如对 `pwsh` 强制 `delegate`（转人工）、对 `write` 直接 `allow`：

```yaml
levels:
  workspace-write: judge
  danger-full-access: judge
  error: delegate
  unsure: delegate
  tools:
    pwsh: delegate
    write: allow
```

**浏览器 UI（v0.2.0）**：

- **输入栏状态 chip**：会话输入栏左侧显示 `YOLO <preset>`，点击弹出统计面板（总审批 / 放行 / 拒绝 / 转人工 + 最近 20 条决策）。
- **设置页**：设置面板新增「YOLO 审批」页，可在线修改预设、生效沙箱模式、judge 参数与 levels 层级（JSON），保存后即时生效（持久化到 `settings.yaml`）。

**审计日志**：每次裁决追加一行 JSONL 到 `auditFile`（默认 `%TEMP%/dsh-yolo/judge.log`），含 `{time, sessionId, origin, toolName, callId?, targetMode, currentMode, justification, decision, outcome, reason?}`。

### 重启生效说明

!!! tip "cordis.patch.yml 热重载，行 config 修改无需重启"
    `cordis.patch.yml` 由 `watchUserPatches` 热重载，保存后新行即挂入运行中的宿主组合（实测无需重启即可 ACTIVE；加载失败时宿主保留上一棵好树并记录 `hmr/config-update-failed`）。设置页保存值经 settings 服务持久化，下次裁决即生效。重启 DSH 始终是最稳妥的兜底方式；升级到 v0.2.0 后必须重启并刷新浏览器（已挂载插件行的模块代码更新需重启才能重新导入）。

---

## 2. 弊端与缺陷

!!! warning "fail-closed：任何错误 / 超时 / 非法输出都不放行"
    任何错误、超时、非 JSON、工具块、信号量溢出路径都不会放行；只有明确得到 `allow` 才返回一次性 `allowed-once`。这是安全设计但意味着裁判不可用时所有 `judge` 决策会回退到 `delegate`（转人工）或 `rejected`（strict+error），自动化链路可能频繁被打断。出处：README「五、安全须知」、`lib/policy.js` `judgeFallback`、`lib/judge.js` `JudgeError` 处理。

!!! warning "permissive / yolo 显著放大风险，仅建议可信环境"
    `permissive` 会把裁判「不确定」视为允许（`allowed-once`）；`yolo` 直接全部放行（零 LLM 调用）。二者都会显著放大风险，仅建议在可信环境下使用；默认预设为 `balanced`，不默认使用 `permissive` / `yolo`。出处：README「四、预设表」「五、安全须知」。

!!! warning "裁判需 judge.provider 与 judge.model 同非空，否则 judge 决策一律按错误回退"
    `judge.provider` 或 `judge.model` 任一为空视为未配置，`judge` 决策一律按错误回退（`strict+error → rejected`，其余 → `delegate`）。首次启用裁判需在行 config 或设置页填齐两个字段。出处：`lib/index.js` `getJudge`、README「三、配置参考表」。

!!! warning "审计日志默认在 %TEMP%，重启可能丢失"
    默认 `auditFile` 为 `%TEMP%/dsh-yolo/judge.log`；操作系统清理临时目录或重启后可能丢失历史审计。生产环境建议配置到持久化路径，并定期检查。出处：README「五、安全须知」、`lib/index.js` `auditFile()`。

!!! warning "仅介入 ask 策略下的升权申请，覆盖范围有限"
    本插件不改变 DSH 的 `sandbox` / `approval` 策略词汇；`never` 策略下 seam 在瀑布前直接拒绝，插件天然无请求可接；非升权格式（不匹配 `^escalate sandbox to (workspace-write|danger-full-access): (.+)$`）的请求透明委托给后续应答者。其它类型的审批请求（如普通工具审批）不在裁决范围内。出处：README「一、功能简介」「五、安全须知」、`lib/policy.js` `ESCALATION_RE`。

!!! warning "包未声明 dsh.bundle manifest，安装需两步"
    `package.json` 只有 `dsh.client`，无 `dsh.bundle.patch`；安装需「`dsh plugin add` + 手动追加 `cordis.patch.yml` 行」两步，不能仅靠 `dsh plugin add` 一键完成。出处：`package.json` `dsh` 字段、README「二、安装」。

!!! warning "防回环依赖 prompt 隔离，模型越狱仍可能绕过"
    裁判 prompt 与 agent 上下文隔离，强调「你不是发起方 agent，只依据事实裁决；存疑即 deny/unsure；绝不因发起方的目标 / 意图放行」，防止模型借 Web 审批回环自批准 `danger-full-access`（DSH 上游已关注的 #250 类问题）。但 LLM 越狱仍可能绕过 prompt 约束，敏感场景应保持 `balanced` / `strict` 并配合人工复核审计。出处：README「五、安全须知」、`lib/judge.js` `DEFAULT_SYSTEM_PROMPT`。

---

## 3. 后续拓展思路

### 可二次开发的方向

- **审计可视化与告警**：把 JSONL 审计接入看板（按时间 / 工具 / 目标模式 / 决策分布绘图），异常决策（如 `permissive+unsure → allowed-once` 连续出现）实时告警。
- **裁判模型多选与降级**：支持配置多个 `(provider, model)` 候选，主裁判超时 / 失败时按序降级到备用裁判，减少 `delegate` 打断。
- **细粒度策略 DSL**：`levels.tools` 已支持逐工具覆盖；可扩展为按 `arguments` 关键字 / 路径前缀的规则引擎（如 `delete node_modules` 恒拒绝），覆盖更细的安全场景。

### 可对接的 DSH 能力

- **approval/request seam**：本插件是 `prepend: true` 应答者的范例；同类审批类插件（dsh-tool-approval / dsh-turn-approval / dsh-approval-llm）可参考其抢占监听列表头的模式。
- **settings 服务**：通过 `settings.register('yolo-mode', z.dict(z.any()))` 注册自由 JSON 分区，运行时合并行 config + settings 覆盖；`pruneSettings` 处理空哨兵，避免 schemastery 默认值泄漏覆盖行配置。
- **webServer 路由**：注册 `/plugins/yolo-mode/status` 与 `/plugins/yolo-mode/config` 两条 exact 路由，供浏览器 UI 与外部监控读取 / 修改配置。

### 与其它插件组合的可能性

- **dsh-yolo-mode + dsh-tool-approval / dsh-turn-approval**：同类审批类插件；组合时需注意 `approval/request` 监听顺序与本插件的 `prepend: true` 抢占策略，避免相互遮蔽或循环委托。
- **dsh-yolo-mode + dsh-security-audit**：dsh-security-audit 跑只读脱敏风险报告，可为本插件的 `judge` 决策提供环境风险上下文（如「本机暴露面大」时强制 `strict`）。
- **dsh-yolo-mode + dsh-notification**：把 `delegate`（转人工）事件经 dsh-notification 推送桌面 / IM 通知，让人工审批不被错过。
