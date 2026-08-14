# Skill 规范

Skill(技能)是 DSH 中**可复用的任务特定指令集**。它让模型在遇到匹配场景时,先加载技能的完整指令再执行任务,从而把领域知识、流程规范、工具用法等以可发现、可注入的方式提供给 agent。

## 什么是 Skill

Skill 由 `dsh-skill` 包提供的 `ctx.skills` 注册表管理。注册表本身**不关心**技能来源(本地文件、嵌入式数据、HTTP、其他后端),由 provider 注册各自来源。 shipped 的本地实现是 `dsh-skill-filesystem`。

### 架构角色

| 角色 | 包 | 职责 |
|---|---|---|
| **Service Definition** | `dsh-skill` | `ctx.skills` 注册表,host+per-scope 分层 |
| **Service Provider** | `dsh-skill-filesystem` | 扫描本地 project/custom/user 根,解析 `SKILL.md` 或扁平 Markdown |
| **Consumer** | `dsh-tool-skill` | 模型可调用的 `skill` 工具 + 持久会话目录 |

### 核心 API

- `ctx.skills.registerProvider(create)`:注册 provider,unique within calling context's layer。
- `ctx.skills.register(skill)`:注册运行时嵌入式 skill(rank `250`)。
- `ctx.skills.snapshot({ cwd?, signal?, scope? })`:返回 `{ skills, complete }` 观测。
- `ctx.skills.list({ cwd?, signal?, scope? })`:返回当前 workspace 合并后的获胜 summary。
- `ctx.skills.get(name, options)`:加载并返回 skill 定义。

### 调用策略

`SkillSummary.invocation` 是必需的 typed policy 对象,独立描述两个表面:

| Policy | Model 可见 | User 可见 |
|---|---|---|
| `{ modelInvocable: true, userInvocable: true }` | 包含 | 包含 |
| `{ modelInvocable: true, userInvocable: false }` | 包含 | 排除 |
| `{ modelInvocable: false, userInvocable: true }` | 排除 | 包含 |
| `{ modelInvocable: false, userInvocable: false }` | 排除 | 排除 |

模型通过 `skill` 工具加载技能;用户通过 `/name` token 直接注入(disable-model-invocation 技能的唯一入口)。

## SKILL.md 的结构

Skill 文件支持两种形式:

- **单级目录 bundle**:`<name>/SKILL.md`
- **扁平 Markdown**:`<name>.md`

!!! warning "嵌套被排除"
    `**/SKILL.md` 的嵌套发现被**故意排除**。只有 `<root>/<name>/SKILL.md` 和 `<root>/<name>.md` 被识别。

### Frontmatter 字段

Frontmatter 解析为开放 YAML 对象。`dsh-skill-filesystem` 解释以下字段:

| 字段 | 类型 | 必需 | 说明 |
|---|---|---|---|
| `name` | `string` | 是 | 必须为 **kebab-case** |
| `description` | `string` | 是 | 技能描述(目录中按 `catalogDescriptionMaxLength` 截断,默认 500) |
| `whenToUse` | `string` | 否 | 何时使用提示(provider 元数据,不渲染到目录) |
| `metadata` | `object` | 否 | 任意元数据(如 `version`、`date`、`reference`) |
| `disable-model-invocation` | `boolean` | 否 | `true` 排除出模型目录与 `skill` 工具;接受 `true/false`、`yes/no`、`on/off`、`1/0` |
| `user-invocable` | `boolean` | 否 | `false` 排除出人类命令表面;接受同上形式 |

!!! warning "调用策略 fail closed"
    拼写错误(camel-case)或非布尔调用值会导致**整个技能从发现中丢弃**(而非降级为允许)。这是因为忽略无效数据可能把技能暴露到已禁用的表面。错误的 `whenToUse` 和 `metadata` 值会被省略(不丢弃技能),因为它们不授予调用权。

### Frontmatter 示例(摘自 dsh-agent-teams 的 SKILL.md)

```yaml
---
name: dsh-plugin-development
description: 开发、维护、分发和验证 DeepSeek Harness (DSH) 插件的执行型 Skill。覆盖 host/client 形态判断、bundle/profile 契约、Service 与函数插件、工具、HTTP、持久化、slot、Conversation Node、客户端构建、HMR、GitHub 安装和真实组合验证。
metadata:
  version: "3.1.0"
  date: "2026-08-13"
  reference: "https://github.com/dsh-external/dsh-agent-teams"
---
```

### 正文

Frontmatter 之后是 Markdown 正文,即技能的完整指令体。`dsh-tool-skill` 加载时会渲染为 canonical `<skill_content>` 块:

```markdown
<skill_content name="<escaped-name>">
<skill_resources>
<resource-guidance>
</skill_resources>

<skill_instructions>
<provider-owned-instruction-body>
</skill_instructions>
</skill_content>
```

- 目录(catalog)只包含 `name` 和 `description` summary;正文不在目录中。
- 每次 `skill(name)` 加载都会重新读取并解析当前文件,因此**正文编辑无需 hash/revision/缓存失效**。
- frontmatter rename(改 `name`)会拒绝 stale name 并 invalidate provider。

## 发现路径与 rank

`dsh-skill-filesystem` 按以下 rank 顺序解析默认根:

| Rank | 来源 | 路径 |
|---|---|---|
| 100 | `project-dsh` | `<projectRoot>/.dsh/skills` |
| 200 | `project-agents` | `<projectRoot>/.agents/skills` |
| 300 | `custom` | `Config.customSkillDirs` |
| 400 | `user-dsh` | `<dshHome>/skills`(默认 `$DSH_HOME` 或 `~/.dsh`) |
| 500 | `user-agents` | `<agentsHome>/skills`(默认 `$DSH_AGENTS_HOME` 或 `~/.agents`) |

- project root 是最近的含 `.git` 的祖先;无 `.git` 时用 cwd。
- user DSH 根跳过 `.system` 子目录。
- `includeDefaultRoots: false` 省略 project/user 行,保留 custom/bundled 根,用于隔离 provider。

### 重复名解析

- **同一 layer 内**:按 rank → provider 注册顺序 → provider-local 顺序;first-wins。
- **跨 layer**:最近 scope 的条目获胜(nearest layer wins)。
- runtime skills 用 rank `250`:project provider 可覆盖,而它覆盖 shipped local provider 的 custom/user 根。

## Skill 与插件的关系

Skill 有两种分发方式:

### 1. 独立 Skill 文件(本地发现)

把 `SKILL.md` 或 `<name>.md` 放在上述发现路径下,`dsh-skill-filesystem` 自动扫描。无需打包成插件。

```text
<projectRoot>/.dsh/skills/my-skill/SKILL.md      # 单级目录 bundle
<projectRoot>/.agents/skills/quick-ref.md         # 扁平 Markdown
~/.dsh/skills/personal-helper/SKILL.md            # 用户级
```

### 2. 随插件 bundle 分发(runtime 注册)

插件可在 `apply` 中通过 `ctx.skills.register(...)` 注册嵌入式 runtime skill。注册时省略 `invocation` 则默认 `{ modelInvocable: true, userInvocable: true }`,省略 `provider` 则默认 `"runtime"`。

```ts
export const inject = ['skills']

export function apply(ctx: Context): void {
  ctx.skills.register({
    name: 'my-runtime-skill',
    description: '随插件分发的嵌入式技能',
    content: '完整的指令体……',
    // 可选:resourceBase, metadata, whenToUse, invocation
  })
}
```

!!! info "runtime skill rank 250"
    Runtime skills 用 rank `250`:project provider(rank 100/200)可覆盖,而它们覆盖 shipped local provider 的 custom/user 根(300+)。同 layer 内 runtime 贡献 first-wins,重复贡献无法通过 disposer 移除活跃的那个。

## 范例:dsh-plugin-development Skill

`NanmiCoder-dsh-agent-teams` 插件随包分发了 `dsh-plugin-development` Skill,位于:

```text
plugins/NanmiCoder-dsh-agent-teams/
├── skills/dsh-plugin-development/SKILL.md      # 源
├── .dsh/skills/dsh-plugin-development/SKILL.md # 项目级发现副本
└── scripts/sync-skill.mjs                       # 同步脚本
```

该 Skill 的特点:

- **frontmatter** 声明 `name`、`description`、`metadata`(version/date/reference)。
- **正文** 是正式版导向的执行清单,覆盖 bundle/profile 契约、host/client 形态判断、Service 与函数插件、工具/HTTP/持久化、Conversation Node、客户端构建、HMR、GitHub 安装和真实组合验证。
- 通过 `pnpm verify:skill`(运行 `sync-skill.mjs --check`)校验 canonical Skill 与镜像一致性。
- 可被 `npx skills add` 安装,也可随插件 bundle 分发(项目级 `.dsh/skills/` 副本供本地发现)。

## 模型可见性

### 目录(catalog)

`dsh-tool-skill` 在每个 `agent/pre-step` 调用 `ctx.skills.snapshot()`,渲染有序 `name`/`description` 作为 durable user-role `<system-reminder>`:

```markdown
<system-reminder>
A skill is a reusable set of task-specific instructions. The following skills are available in this session:

<available_skills>
- `<name>`: <normalized-and-capped-description>
</available_skills>

If the user names a skill, or the task clearly matches a skill's description, call the `skill` tool with the exact skill name before taking task actions. ...
</system-reminder>
```

- 目录只含 summary;正文、路径、source、provider、`whenToUse` 不在目录中。
- 目录变化(增删/描述变/可见性变)会追加完整替换目录(append-only)。
- 空目录或 `skill` 工具被隐藏/遮蔽时不发初始目录。

### 工具调用

模型调用 `skill` 工具(参数:`name` 必填),返回 canonical `<skill_content>` 块。无效名、未知名、`modelInvocable: false` 返回不同错误。

### 用户显式注入

用户消息中空白分隔的 `/name` token(命名一个 user-invocable 技能)会注入该技能的完整 `<skill_content>` 渲染,作为 user-role instructions context。这是 `disable-model-invocation` 技能的唯一入口。

## 下一步

- [dsh.bundle 声明规范](dsh-bundle.md) —— 随插件分发 runtime skill 需要 bundle 声明
- [最小插件 walkthrough](walkthrough.md) —— 可在插件中注册 runtime skill
- [插件机制总览](overview.md) —— Skill 在能力矩阵中的位置
