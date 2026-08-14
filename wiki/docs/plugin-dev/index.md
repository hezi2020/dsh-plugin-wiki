# 插件拓展指南

本章节面向希望为 DeepSeek Harness 编写插件或扩展能力的开发者，从插件机制总览到从零编写一个最小插件，提供完整的开发路径。

## 章节导航

| 主题 | 说明 |
|---|---|
| [插件机制总览](./overview.md) | Cordis 插件挂载/卸载/依赖、Service/Consumer 模型、13 类能力 |
| [dsh.bundle 规范](./dsh-bundle.md) | `dsh.bundle` 与 `cordis.patch.yml` 字段级文档、生效顺序 |
| [dsh plugin 命令](./plugin-command.md) | `dsh plugin --profile <p> add github:owner/repo` 安装与启用流程 |
| [Profile](./profile.md) | web / headless 等 profile 概念与组合方式 |
| [Skill 规范](./skill.md) | SKILL.md 结构、`ctx.skills` API、与插件的关系 |
| [从零编写插件](./walkthrough.md) | 完整的 echo 工具插件 walkthrough（TypeScript） |

!!! tip "参考实现"
    [NanmiCoder/dsh-agent-teams](https://github.com/NanmiCoder/dsh-agent-teams) 提供了权威的 `dsh-plugin-development` Skill，可作为插件开发的样例参考。其 `docs/developing-dsh-plugins.md` 是面向人类的开发指南。

!!! note "安装后重启生效"
    通过 `dsh plugin add` 安装插件后，需重启正在运行的 `dsh web` 服务并刷新页面，工具、系统提示与 Web 入口才会随 profile 重新加载。
