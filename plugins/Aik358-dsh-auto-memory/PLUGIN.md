# PLUGIN 元数据 — dsh-auto-memory

## 插件名称
dsh-auto-memory（DSH 自动记忆插件，npm 包名 `@a9i5k4/dsh-auto-memory`）

## 来源仓库 URL
https://github.com/Aik358/dsh-auto-memory

## 克隆时的 commit SHA
0911966（前 7 位）

## 功能描述（一句话）
DSH Web GUI 三层记忆插件（用户级 / 项目笔记 / 每日日志）自动注入与检索、每日反思、智能时段问候、四象限日历视图与设置页，支持继承其他 AI 工具（CodeBuddy / Claude Code / Codex / 项目约定文件）的历史记忆。

## 前置依赖
- 已安装 DeepSeek Harness（dsh）并至少启动过一次 `dsh web`（profile 目录 `~/.dsh/profiles/web` 需存在）
- pnpm（或 npm）用于在 profile 目录安装包
- 浏览器：官方 Web UI

## 安装命令
```bash
cd ~/.dsh/profiles/web
pnpm add @a9i5k4/dsh-auto-memory
```
> 然后编辑该目录下的 `package.json`，在 `dsh.profile.bundles` 数组里追加：
> ```json
> "@a9i5k4/dsh-auto-memory"
> ```
> 保存后**重启 dsh web**，插件即生效（侧边栏出现「记忆」入口）。
>
> 没有 pnpm 可用 npm：`npm install @a9i5k4/dsh-auto-memory`

## 配置项
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

## 已知限制
- **记忆文件为明文 Markdown**：不存密钥，除非用户明确要求。出处：README「限制」。
- **历史会话检索依赖 session-query 索引**：`memory_recall` 的历史会话检索依赖部署的 session-query 索引，未启用时仅本地检索。出处：README「限制」。
- **插件集变更需重启 dsh 生效**：插件集变更需重启 dsh 生效。出处：README「限制」。
- **仅 Web profile**：插件 `dsh.client.platform: web`，只面向 `web` profile 的 Web UI。出处：package.json `dsh.client.platform`。
- **AI 主动写入日历**：AI 会从对话中提取 deadline、约定时间等自动写入日历，未完成事项注入每次会话的系统提示词——AI 自动写入可能产生误判条目，需用户主动核对。出处：README「日历视图（四象限）」。

## 本地运行状态
未实测安装（本任务仅克隆源码，未实际通过 dsh plugin 加载，亦未运行 smoke-test）

## 许可证
BSD-3-Clause（Copyright (c) 2026, Aik358）
