# 运行时模式

DeepSeek Harness 通过 **agent preset**（agent 预设）定义不同的运行时模式。一个 preset 是一份 `cordis.yml` 组合文件，为单个 session 挂载一组工具、persona 与 prompt 段。内置四种 preset，按 `order` 排列如下。

!!! info "preset 即运行时模式"
    preset 文件位于 [`apps/cli/config/agent-presets/`](https://github.com/deepseek-ai/deepseek-harness/tree/master/apps/cli/config/agent-presets)。每个 preset 由 `preset.yml`（名称与描述）和 `agent.cordis.yml`（插件组合）组成。本文的"运行时模式"即指这四种内置 preset。

## 模式总览

| order | preset id | 名称 | 一句话定位 |
|---|---|---|---|
| 1 | `standard` | 标准模式 | 功能完整的编码 Agent |
| 2 | `code` | PTC 模式 | 标准 + Code Mode SDK，多步操作合为一个 TypeScript 程序 |
| 3 | `minimal` | 极简模式 | 仅 bash + str_replace_editor，用于 benchmark |
| 4 | `cordis` | 创造模式 | 标准 + 运行时检查与插件实验，用于创作新 preset |

!!! note "关于“Creator”"
    任务规划中曾用 "Creator" 指代第四种模式；在仓库中其实际 preset id 为 `cordis`，中文名为「创造模式」。本文统一使用 `cordis`（创造模式）。

## 标准模式（standard）

**适用场景**：日常编码、仓库探索、文件编辑、运行命令、规划与子代理委派——绝大多数任务的默认选择。

**工具清单**（来自 `agent.cordis.yml`）：

| 类别 | 工具 / 插件 |
|---|---|
| 身份与指令 | `persona`、`agent-instructions` |
| Shell | `tool-bash`（Linux/macOS）、`tool-pwsh`（Windows，二者按平台互斥启用） |
| 文件系统 | `tool-fs`、`tool-fs-search` |
| 后台任务 | `tool-jobs` |
| 技能 | `skill-filesystem`、`tool-skill` |
| 目标 | `tool-goal` |
| 计划模式 | `plan-mode`（`exit_plan_mode` 工具） |
| 上下文压缩 | `compaction-basic`、`command-compact`、`tool-result-pruner` |
| 委派与工作流 | `tool-subagent-control`、`tool-subagent`（spawn）、`tool-subagent-fork`（fork）、`workflow-worker-thread`、`tool-workflow`、`tool-ralph` |
| 其他 | `tool-ask-user`、`tool-todo`、`tool-web`（搜索，默认关闭 fetch） |

**与其他模式的差异**：作为基线，`code`、`cordis` 都在其之上叠加能力；`minimal` 则是大幅裁剪版。

!!! tip "plan mode 的约束"
    进入 plan mode 后，agent 只做只读探索与规划，不执行变更；通过 `exit_plan_mode` 提交计划供审批后才开始实现。tool catalog 在各模式间保持不变以稳定请求缓存。

## PTC 模式（code）

**适用场景**：需要把多个工具调用编排为一个程序的场景。模型不逐个调用工具，而是写一个 TypeScript 程序，由 `run_code` 一次执行，把原本五次往返压缩为一次。

**工具清单**：标准模式全部工具 + 一个关键新增：

```yaml
- id: tool-presentation
  name: '@deepseek-ai/dsh-agent-tool-presentation'
  config:
    mode: code
```

**与标准模式的差异**：

- **新增 `tool-presentation`（mode: code）**：以 Code Mode SDK 形式呈现工具注册表，模型写 TypeScript 程序组合多步操作。
- 注册表本身仍在 host 平面，preset 拥有的是该 agent 独有的"呈现"。
- 该行**等待 host 的 `codeRuntime`** 而非假设其存在：若部署未组合 TypeScript runtime，挂载此 preset 时即报错（指出该 id），而非等到首次请求。

!!! note "Code Runtime 是可选能力"
    Code execution 是一个可选 capability seam（`ctx.codeRuntime`），**不属于 agent-loop 主干**。后端按执行 substrate（`worker-thread`/`process`/`container`）与源语言（目前仅 `typescript` 有已发布后端）区分。详见 [Code Runtime 文档](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/subsystems/code-runtime.md)。

## 极简模式（minimal）

**适用场景**：benchmark 与受控评测。固定 prompt、固定双工具，剥离一切运行时上下文与压缩。

**工具清单**（仅两项）：

| 类别 | 工具 / 插件 | 说明 |
|---|---|---|
| Shell | `persistent-bash`（`dsh-tool-bash-persistent`） | 持久 bash，状态跨调用保留；超时 300s |
| 编辑器 | `str-replace-editor`（`dsh-tool-str-replace-editor`） | 基于字符串替换的文件编辑器，需绝对路径 |

**与其他模式的差异**：

- **persona 是完整系统提示**（`complete: true`）：全局身份、Web 指向、工具指导等后续组装监听器都无法再添加 prompt 文本。
- **运行时上下文快照被抑制**（`includeRuntimeContext: false`）。
- **无上下文压缩**：不挂载 `compaction-basic` 等。
- **无技能、无目标、无计划、无子代理、无工作流、无 web 搜索**。
- 文件系统使用裸 `fs-local`（在本 preset 的 entry-local realm 内阴影掉 host 的沙箱 provider）。

!!! warning "minimal 不适合日常使用"
    该 preset 为可复现评测设计，能力被刻意限制。日常任务请用标准模式。

## 创造模式（cordis）

**适用场景**：让 agent 阅读并修改它自身运行的 runtime——创作新的 agent preset、在内存中实验 Cordis 插件、组合新的运行模式。

**工具清单**：标准模式全部工具 + 自我修改工具集 + 创作技能：

```yaml
# 自我修改：读取运行时、挂载临时插件、卸载
- id: tool-cordis
  name: '@deepseek-ai/dsh-tool-cordis'

# 技能注册携带本 preset 自带的两个 SKILL
- id: skill-filesystem
  name: '@deepseek-ai/dsh-skill-filesystem'
  config:
    customSkillDirs:
      - !!js "process.getBuiltinModule('node:url').fileURLToPath(new URL('skills/', baseUrl))"
- id: tool-skill
  name: '@deepseek-ai/dsh-tool-skill'
```

自带技能（位于 preset 目录的 `skills/` 下）：

- `editing-cordis-compositions` —— 编辑 Cordis 组合的指导
- `cordis-plugin-development` —— Cordis 插件开发指导

**与标准模式的差异**：

- **新增 `tool-cordis`**：读取 live runtime、挂载临时插件、卸载它。这是信任边界，不是沙箱。
- **persona 不同**：明确告诉模型它能读写 harness 自身，并解释 host plane 与 agent preset plane 的分工。
- **自带创作技能**：随 preset 一起分发，`baseUrl` 指向 preset 自身目录，故无论装在哪都能解析。
- 用户创作的 preset 位于 `${DSH_HOME:-$HOME/.dsh}/.agent-presets/<id>/`。

!!! danger "信任边界：等同 shell 访问"
    `cordis_mount` 会针对 live runtime 执行模型生成的 JavaScript，且该 agent 创作的 composition 会被其他 session 挂载。**把创造模式的会话视同 shell 访问**——其工具集自身的文档也做了同样声明。切勿在不信任的输入下使用。

!!! warning "禁止编辑内置 preset 安装"
    永远不要编辑或删除随部署自带的 preset 安装（部署自身 config 旁的 `agent-presets` 目录）。它属于部署，升级会覆盖它，且破坏 `cordis` preset 会禁用本模式本身。要改 shipped preset 的行为，请把它的 composition 复制到新 preset 目录再编辑副本。

## 模式选择速查

| 你想做的事 | 推荐模式 |
|---|---|
| 日常编码、读改文件、跑命令、委派子任务 | standard |
| 把多步工具调用合成一个程序，减少往返 | code |
| 跑可复现 benchmark / 受控评测 | minimal |
| 创作/实验新 preset、读写 runtime | cordis |

## 如何切换 / 自定义 preset

- **Web UI**：在会话开始时选择 preset（详见 [Web UI 使用指南](web-ui.md)）。
- **自定义**：复制某个 shipped preset 的 composition 到 `${DSH_HOME:-$HOME/.dsh}/.agent-presets/<你的id>/` 再编辑。创作流程建议用创造模式（cordis）的 agent 辅助，并先加载 `editing-cordis-compositions` 技能。
- **组合细节**：preset 是 agent-plane composition，挂在某个 agent 的 scope 下；其中 service 行必须位于带 `isolate` realm 的 group 内，否则会污染 root realm。详见 [配置与 Profile](configuration.md) 与 [CLI 命令](cli.md)。

## 下一步

- [Web UI 使用指南](web-ui.md) —— 在 UI 中选择 preset
- [配置与 Profile](configuration.md) —— 理解 host plane 与 agent plane、组合 layer
- [Session 与 Trajectory](session-trajectory.md) —— 各模式产生的会话日志
- [CLI 命令](cli.md) —— 用 `--dump-config` 查看实际挂载的工具树
