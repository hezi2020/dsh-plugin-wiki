# dsh-auto-memory

> **插件名**：dsh-auto-memory（DSH 自动记忆插件，npm 包名 `@a9i5k4/dsh-auto-memory`）
> **来源仓库**：<https://github.com/Aik358/dsh-auto-memory>
> **许可证**：BSD-3-Clause（Copyright (c) 2026, Aik358）
> **commit SHA**：`0911966`（前 7 位）

DSH Web GUI 的记忆插件：三层记忆（用户级 / 项目笔记 / 每日日志）自动注入与检索、每日反思、智能时段问候、四象限日历视图与设置页，支持继承其他 AI 工具（CodeBuddy / Claude Code / Codex / 项目约定文件）的历史记忆。每次组装系统提示词时自动注入 `<memory_system>` 块，记忆操作（更新/检索）会在对话正文中明文说明，不藏在工具调用里。

---

## 1. 使用指南

### 前置依赖

- 已安装 DeepSeek Harness（dsh）并至少启动过一次 `dsh web`（profile 目录 `~/.dsh/profiles/web` 需存在）
- pnpm（或 npm）用于在 profile 目录安装包
- 浏览器：官方 Web UI

### 安装命令

在 **profile 目录**（`~/.dsh/profiles/web`）下执行：

```bash
cd ~/.dsh/profiles/web
pnpm add @a9i5k4/dsh-auto-memory
```

然后编辑该目录下的 `package.json`，在 `dsh.profile.bundles` 数组里追加：

```json
"@a9i5k4/dsh-auto-memory"
```

保存后**重启 dsh web**，插件即生效（侧边栏出现「记忆」入口）。

没有 pnpm 可用 npm：

```bash
npm install @a9i5k4/dsh-auto-memory
```

### 配置项

| 来源 | 字段 |
|---|---|
| `~/.dsh/dsh-auto-memory.json` | `userMemoryDir`（默认 `~/.dsh/memory`）、`projectMemoryDir`（默认 `.dsh-memory`）、`injectEnabled`（默认 `true`）、`injectBudgetChars`（默认 `2400`）、`recentDaysInjected`（默认 `3`）、`reflectEnabled`（默认 `true`）、`reflectStyle`（默认 `auto`）、`locale`（默认 `zh`，可选 `zh` / `en`） |
| GUI（设置 → 自动记忆） | 存储位置、注入预算、反思风格、界面语言（中文 / English） |

默认配置示例：

```json
{
  "userMemoryDir": "~/.dsh/memory",
  "projectMemoryDir": ".dsh-memory",
  "injectEnabled": true,
  "injectBudgetChars": 2400,
  "recentDaysInjected": 3,
  "reflectEnabled": true,
  "reflectStyle": "auto",
  "locale": "zh"
}
```

### 典型用法示例

- **三层记忆自动注入**：每次组装系统提示词时注入 `<memory_system>` 块（用户规则 + 项目笔记 + 最近反思 + 最近 N 天日志尾部 + 未完成日历事项 + 写入纪律）。
- **记忆操作可见**：更新/检索记忆时，AI 会在对话正文中明文说明（如"已把 X 记入今日日志""我查了记忆,发现…"），不藏在工具调用里。
- **智能时段问候**：打开记忆面板看到生活化的时段问候（早晨/上午/中午/下午/晚上），离开超过 1 小时再打开自动显示"欢迎回来"并列出期间完成事项。
- **四象限日历**：月视图网格，今日高亮，点击任意日期添加事项；四象限色标（重要紧急红 / 重要不紧急蓝 / 紧急不重要橙 / 不重要不紧急灰）；数据存用户级 `~/.dsh/memory/CALENDAR.md`，跨工作区共享。
- **外部记忆继承**：接入其他 AI 工具（CodeBuddy / Claude Code / Codex / 项目约定文件）积累的记忆。
- **Agent 工具**：`memory_log` / `memory_note` / `memory_user` / `memory_recall` / `memory_external` / `memory_maintain` / `memory_status` / `memory_reflect` / `calendar_add` / `calendar_list` / `calendar_done` / `calendar_remove`。

### 重启生效说明

!!! tip "插件集变更需重启 dsh web"
    安装/升级后必须重启 `dsh web` 才能生效；插件集变更同样需重启。配置项（`~/.dsh/dsh-auto-memory.json` 或 GUI 设置）调整后建议重启以稳定生效。

---

## 2. 弊端与缺陷

!!! warning "记忆文件为明文 Markdown，无加密"
    记忆文件为明文 Markdown；不存密钥，除非用户明确要求。明文存储意味着任何能读到这些文件的进程都能读取记忆内容。出处：README「限制」。

!!! warning "历史会话检索依赖 session-query 索引"
    `memory_recall` 的历史会话检索依赖部署的 session-query 索引，未启用时仅本地检索——跨会话历史检索能力受部署形态限制。出处：README「限制」。

!!! warning "插件集变更需重启 dsh 生效"
    插件集变更需重启 dsh 生效；热加载不支持。出处：README「限制」。

!!! warning "AI 主动写入日历可能产生误判条目"
    AI 会从对话中提取 deadline、约定时间等自动写入日历（`calendar_add` / `calendar_list` / `calendar_done` / `calendar_remove`），并在正文转述；未完成事项注入每次会话的系统提示词。AI 自动写入可能产生误判条目，需用户主动核对。出处：README「日历视图（四象限）」。

!!! warning "仅面向 web profile"
    插件 `dsh.client.platform: web`，只面向 `web` profile 的 Web UI。出处：package.json `dsh.client.platform`。

---

## 3. 后续拓展思路

### 可二次开发的方向

- **记忆加密存储**：当前记忆文件为明文 Markdown，可扩展为支持加密存储（如 age / GPG），保护敏感项目笔记与每日日志。
- **跨机器记忆同步**：当前三层记忆分散在 `~/.dsh/memory`（用户级）与各工作区 `.dsh-memory/`（项目级），可扩展为基于 git 或对象存储的跨机器同步，让多机协作共享同一份记忆。
- **记忆检索增强**：`memory_recall` 当前依赖 session-query 索引，可扩展为基于向量检索的记忆语义搜索，跨历史会话与笔记做相似度召回。
- **反思策略可配置化**：当前 `reflectStyle` 仅 `auto`，可扩展为支持多种反思模板（如"五问法""STAR 复盘"等），适配不同团队习惯。

### 可对接的 DSH 能力

- **skill**：可把"查看今日记忆""写入项目笔记""添加日历事项"封装为 DSH Skill，由 Agent 自然语言触发；记忆操作已在对话正文可见，可进一步封装为可复用 skill。
- **hooks**：每日反思、记忆注入事件可经 hooks 触发外部记录（如推送到团队 IM），形成记忆变更的审计轨迹。
- **self-modification**：auto-memory 的"每日反思"机制本身就是 self-modification 的雏形——Agent 基于每日工作积累结构化反思；可进一步把反思转化为对自身行为策略的调整。

### 与其它插件组合的可能性

- **dsh-auto-memory + dsh-context**：auto-memory 的注入内容是 dsh-context 中"注入上下文"类的重要组成部分，二者组合可观察记忆注入对 context 预算的占用，反向调优 `injectBudgetChars` 与 `recentDaysInjected`。
- **dsh-auto-memory + dsh-session-hub**：会话枢纽聚合多机远端会话后，auto-memory 可把跨机协作的关键决策沉淀为项目笔记，形成跨机器的项目级记忆。
- **dsh-auto-memory + dsh-notification-center**：每日反思生成、日历事项到期可由通知中心推送浏览器通知 + 音效，避免用户错过关键反思与 deadline。
- **dsh-auto-memory + dsh-think-any-lang**：auto-memory 的 `locale` 与 dsh-think-any-lang 的 CoT 语言可联动，确保记忆注入与模型思考语言一致。
