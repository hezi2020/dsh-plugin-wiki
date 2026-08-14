# 开发教程

本章节是 DeepSeek Harness（以下简称 dsh）的官方渐进式开发教程体系，覆盖从「第一个插件」到「Cordis 框架底层」的完整学习路径。所有内容同步自[官方文档](https://deepseek-harness.github.io/deepseek-harness/develop/basic/)，按学习顺序组织。

## 学习路径

| 阶段 | 主题 | 说明 |
|---|---|---|
| 基础 | [第一个插件](./basic/first-plugin.md) | 创建最小 Harness 插件并加载到 Web UI |
| 基础 | [开发一个工具](./basic/tool.md) | 用 `defineTool` 注册模型可调用工具 |
| 基础 | [插件配置](./basic/config.md) | 让插件接受 `cordis.yml` 配置 |
| 基础 | [打包与安装插件](./basic/publish.md) | 把插件做成可分发的 bundle 并安装进 profile |
| 框架 | [插件与生命周期](./framework/lifecycle.md) | Fiber 状态机、依赖驱动加载、HMR |
| 框架 | [服务与依赖](./framework/service.md) | Service 基类、`inject` 声明、服务隔离 |
| 框架 | [事件系统](./framework/events.md) | emit / bail / serial / waterfall 模式 |
| 实践 | [能力三层拆分](./practice/capability-layers.md) | Service Definition / Provider / Consumer |
| 实践 | [LLM 适配器](./practice/llm-adapter.md) | 接入新的模型提供方 |
| Cordis | [框架教程总览](./cordis-tutorial/index.md) | 7 章动手教程，无需 API 密钥 |

!!! tip "从哪里开始"
    - 想直接为 harness 写插件：从[第一个插件](./basic/first-plugin.md)开始。
    - 想理解 Cordis 底层机制：从[Cordis 教程总览](./cordis-tutorial/index.md)开始。
    - 想查 API 与概念：看[参考文档](../reference/architecture.md)。

## 前置要求

- 已按[使用指南](../usage/installation.md)完成 dsh 安装与 Web UI 启动
- Node.js `^22.19 || >=24`、pnpm 11
- 从源码路径运行教程需要克隆 `deepseek-ai/deepseek-harness` 仓库
