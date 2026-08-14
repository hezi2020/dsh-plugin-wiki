# dsh-think-any-lang

> **插件名**：dsh-think-any-lang（DSH 思考语言选择器）
> **来源仓库**：<https://github.com/lco117/dsh-think-any-lang>
> **许可证**：MIT（Copyright (c) 2026 lco117）
> **commit SHA**：`e1f7e1e`（前 7 位）

DeepSeek Harness 插件：在设置 → 通用中添加「思考语言」下拉选择器，选择模型进行推理思考（chain of thought）时使用的语言（中文、English、日本語、한국어、Deutsch……共 12 种语言 + off 默认）。最终回复语言保持不变。实现方式是系统提示词指令（`systemPrompt.section`），零延迟、零额外调用；指令用目标语言书写，模型遵循度更高；选择结果持久化，重启后保持；纯 JS、无构建，GitHub 直装零门槛。

---

## 1. 使用指南

### 前置依赖

- 已安装 `dsh` CLI 并初始化过 profile（`dsh plugin --profile <name> add` 会自动初始化）
- 浏览器：官方 Web UI
- 运行时依赖：`@deepseek-ai/schemastery ^3.18.1`（声明在 dependencies）

### 安装命令

从 GitHub 直装（推荐）：

```sh
dsh plugin --profile web add github:lco117/dsh-think-any-lang
```

纯 JS 包没有 `prepare` 构建脚本，不需要 pnpm ≥10 的 `allowBuilds` 许可，GitHub 直装即装即用。建议像官方文档建议的那样固定提交：

```sh
dsh plugin --profile web add github:lco117/dsh-think-any-lang#<commit-sha>
```

从本地目录安装（开发时）：

```sh
dsh plugin --profile web add ./dsh-think-any-lang
```

验证：

```sh
dsh --profile web --dump-config   # 应出现 "# == dsh-think-any-lang" 层
```

### 配置项

| 来源 | 字段 |
|---|---|
| GUI（设置 → 通用 → 思考语言） | `language` 字段，枚举，默认 `zh`；可选值：`off`（跟随默认，不注入指令）、简体中文、English、日本語、한국어、Deutsch、Français、Español、Português、Русский、Italiano、العربية、हिन्दी |
| Host 设置命名空间 | `think-any-lang`（注册 `language` 字段；监听选择变化，非 `off` 时注册 `systemPrompt.section` 名称 `think-any-lang`，`off` 时注销） |

- 选择结果存入用户设置文档（settings 服务），重启后保持。
- 最终回复语言保持不变，仅影响模型思考（`reasoning_content`）的语言。

### 典型用法示例

1. 启动 `dsh web`。
2. 打开 **设置 → 通用**。
3. 在「**思考语言**」下拉中选择语言（默认中文）。
4. 之后的模型调用会在系统提示中收到对应语言的思考指令；DeepSeek 推理模型通常据此用所选语言输出 `reasoning_content`。

### 重启生效说明

!!! tip "选择结果持久化，重启后保持"
    选择结果存入用户设置文档（settings 服务），重启后保持。安装/卸载插件后需重启 `dsh web` 才生效；切换语言选项实时生效（非 `off` 时注册 `systemPrompt.section`，`off` 时注销）。

---

## 2. 弊端与缺陷

!!! warning "仅影响思考语言，不影响最终回复语言"
    插件只注入系统提示词指令，让 DeepSeek 推理模型据此用所选语言输出 `reasoning_content`；最终回复语言保持不变。用户若误以为会改变最终回复语言会失望。出处：README「功能」「使用」。

!!! warning "语言表需双半同步维护，新增语言易遗漏"
    语言表在 `index.js`（指令文本）与 `client.js`（显示标签）中各维护一份——浏览器 factory 的 `require` 只能解析平台模块，不能读取本地模块，因此两半各自持有自己的语言视图。新增语言时两个文件需要同步，否则会出现下拉选项与指令不匹配。出处：README「工作原理」。

!!! warning "依赖 DeepSeek 推理模型遵循指令"
    插件通过系统提示词指令实现，模型遵循度取决于模型本身；非 DeepSeek 推理模型或遵循度低的模型可能不按要求输出思考语言。出处：README「使用」。

!!! warning "仅面向 web profile"
    插件 `dsh.client.platform: web`，只面向 `web` profile 的 Web UI；其他 profile 不适用。出处：package.json `dsh.client.platform`。

---

## 3. 后续拓展思路

### 可二次开发的方向

- **语言表统一管理**：当前语言表在 `index.js` 与 `client.js` 各维护一份，可重构为单一数据源（如构建期生成两半视图），消除同步遗漏风险。
- **自定义指令模板**：当前每种语言的指令文本固定，可扩展为支持用户自定义指令模板，适配特殊场景（如"用英语思考但保留中文术语"）。
- **混合语言思考**：当前只能选单一语言，可扩展为支持"主语言 + 辅助语言"组合（如"英语为主、中文术语保留"），覆盖跨语言工作场景。
- **效果评估**：可增加对比视图，让用户对比同一问题在不同思考语言下的 `reasoning_content` 差异，辅助选型。

### 可对接的 DSH 能力

- **skill**：可把"切换思考语言""查看当前思考语言"封装为 DSH Skill，由 Agent 自然语言触发——用户可在对话中直接说"用英语思考"。
- **hooks**：思考语言切换事件可经 hooks 触发外部记录，形成语言偏好变更轨迹。
- **self-modification**：基于不同思考语言下的实际效果（如响应质量、token 消耗），Agent 可自主学习最优思考语言，主动建议切换。

### 与其它插件组合的可能性

- **dsh-think-any-lang + dsh-auto-memory**：auto-memory 的 `locale` 与 dsh-think-any-lang 的思考语言可联动，确保记忆注入与模型思考语言一致；用户偏好可沉淀为用户级记忆。
- **dsh-think-any-lang + dsh-context**：dsh-context 可观察切换思考语言后 `reasoning_content` 在 context 预算中的占比变化，量化不同语言对 token 消耗的影响。
- **dsh-think-any-lang + dsh-notification-center**：思考语言切换可触发通知中心推送，提醒用户当前思考语言已变更（避免长期遗忘）。
- **dsh-think-any-lang + dsh-session-hub**：会话枢纽聚合多机远端会话时，可统一推送思考语言设置到远端（借助 session-hub 的模型配置增量同步机制），确保跨机思考语言一致。
