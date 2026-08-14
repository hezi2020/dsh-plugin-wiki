# 使用指南

本章节带你从零上手 DeepSeek Harness（`dsh`）：从安装部署，到 Web UI 与 CLI 的日常使用，再到四种运行时模式与会话可观测性。

## 章节导航

| 主题 | 说明 |
|---|---|
| [安装](./installation.md) | 环境要求与 npm / 源码两条安装路径 |
| [Web UI](./web-ui.md) | 启动 Web UI 与各视图（Chat / Trajectory / Skills / Settings）使用 |
| [CLI 命令](./cli.md) | `dsh` 命令行入口与常用 flag、profile 概念 |
| [运行时模式](./runtime-modes.md) | Standard / Code / Minimal / Creator（仓库内 preset id 为 `cordis`）四种模式 |
| [Session 与 Trajectory](./session-trajectory.md) | append-only 事件流、resume / fork / search / replay |
| [配置与 Profile](./configuration.md) | Profile 组合、Settings、Credentials 与 API Key 配置 |
| [部署排障](./troubleshooting.md) | Windows 原生模块、pnpm 路径覆盖等常见问题 |

!!! tip "快速开始"
    最快体验路径：

    ```bash
    npx @deepseek-ai/dsh web
    ```

    启动后浏览器访问 <http://127.0.0.1:3080>，在 Settings → Models 配置 `DEEPSEEK_API_KEY` 后即可开始对话。
