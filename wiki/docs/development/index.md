# 项目开发指南

本章节面向希望参与 DeepSeek Harness 开发或深入理解其内部实现的开发者，覆盖 Cordis 内核架构、`packages/` workspace 布局、命令系统、测试体系与贡献流程。

## 章节导航

| 主题 | 说明 |
|---|---|
| [架构与 Cordis 内核](./architecture.md) | 「Everything is a plugin」设计、Service/Consumer 模型、事件机制 |
| [packages 布局](./packages-layout.md) | 33+ workspace 分组职责详解（core / api / llm / skill / subagent / bundle 等） |
| [命令系统](./commands.md) | pnpm scripts 与 dsh 子命令清单、何时运行 |
| [测试体系](./testing.md) | vitest 单测、覆盖率门禁、e2e、snapshot 回放、Windows wine |
| [贡献流程](./contributing.md) | AGENTS.md 约定、Pre-release 立场、文档 tier、PR 流程 |

!!! warning "开发前必读"
    修改 `packages/` 下任何代码前，务必先阅读 [架构与 Cordis 内核](./architecture.md) 与仓库根的 `AGENTS.md`、`docs/architecture.md`。dsh 处于 developer preview，遵循「foundation over blast radius」——优先正确的基础而非兼容垫片。
