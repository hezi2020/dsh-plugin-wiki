# deepseek-harness-desktop (anywhere-labs)

> **插件名**：DeepSeek Harness Desktop（anywhere-labs 版）
> **来源仓库**：<https://github.com/anywhere-labs/deepseek-harness-desktop>
> **许可证**：MIT
> **commit SHA**：`f445a76`（前 7 位，来自任务清单；本地克隆失败未独立校验）

> ⚠️ 本地克隆失败（github.com 端口 443 连接超时），commit SHA 取自任务清单提供值，文档基于 GitHub 仓库网页 README 编写。

把官方 DeepSeek Harness 的本地 Web UI 带到原生桌面：自动启动和管理本地 Harness 服务，集成系统托盘与桌面窗口，无需安装 Node.js 或执行命令，适配 macOS / Windows。本项目基于 deepseek-ai/deepseek-harness 构建，是社区桌面版本，非 DeepSeek 官方产品。

---

## 1. 使用指南

### 前置依赖

- macOS 或 Windows
- 不需要用户安装 Node.js 或执行命令（应用自带服务生命周期管理）
- 开发模式需 pnpm（启动 `pnpm run dev:desktop`）

### 安装命令

```
# 桌面端下载（首页提供安装包）
访问 https://www.deepseekdesktop.com/
```

开发模式从源码启动：

```
pnpm install
pnpm run dev:desktop
```

!!! warning "非标准 DSH 插件 bundle"
    本仓库为 Electron 桌面端封装，非标准 DSH 插件 bundle，不通过 `dsh plugin add` 安装。桌面端「目前还不是以 DeepSeek Harness 插件形式交付，插件化能力仍在开发中」。出处：README「插件生态」段「即将推出」注。

### 配置项

| 来源 | 字段 |
|---|---|
| 桌面端 | 服务启动与生命周期管理、系统托盘、桌面窗口集成 |
| 桌面代码 | 位于 `apps/desktop`（开发模式入口） |

源材料未提及更细粒度的桌面端配置字段。

### 典型用法示例

- **桌面使用**：从 https://www.deepseekdesktop.com/ 下载安装包，安装后启动；应用自动启动并管理本地 Harness 服务，集成系统托盘与桌面窗口。
- **手机远程控制**：通过 iOS 和 Android 远程连接 Desktop，在手机上发起任务、查看 Agent 进度，并在需要时继续跟进（README「主要功能」表）。
- **插件市场**：桌面端插件市场提供插件的发现、安装、更新和管理（README「主要功能」表）。
- **Channels**：接入微信、飞书、Discord、WhatsApp 等 IM 通道，直接在日常聊天工具中向 Agent 发起任务、接收进度并继续对话（README「主要功能」表）。

### 重启生效说明

!!! tip "桌面端配置改动需重启应用"
    源材料未明确桌面端配置变更的生效机制；按 Electron 应用通用行为，配置改动通常需重启应用生效。

---

## 2. 弊端与缺陷

!!! warning "桌面端尚未以 DSH 插件形式交付"
    Desktop 目前还不是以 DeepSeek Harness 插件形式交付，服务管理、系统集成、插件市场等插件化能力仍在开发中；当前是「桌面封装」而非「插件生态参与者」。出处：README「插件生态」段「即将推出」注。

!!! warning "并非 DeepSeek 官方产品"
    本项目基于 deepseek-ai/deepseek-harness 构建，是社区桌面版本，并非 DeepSeek 官方产品；核心能力、插件系统、Web UI 来自官方项目。出处：README「与官方项目的关系」段。

!!! warning "覆盖范围有限，核心改动仍需上游"
    仓库仅负责桌面应用封装、本地服务生命周期管理、桌面窗口和系统托盘集成、macOS / Windows 安装包构建与发布、桌面环境界面适配；核心能力、插件系统、Web UI 来自官方项目，相关改动需走官方仓库。出处：README「与官方项目的关系」段。

---

## 3. 后续拓展思路

### 可二次开发的方向

- **插件化重构**：按 README「插件生态」段的规划，把桌面能力（服务管理、系统集成、插件市场）按官方插件机制重新组织，让 Desktop 从「桌面封装」演进为「DSH 插件生态中的桌面入口」。
- **Linux 支持**：当前覆盖 macOS / Windows，可补 Linux 安装包构建与发布。
- **Channels 扩展**：在微信 / 飞书 / Discord / WhatsApp 之外扩展更多 IM 通道。

### 可对接的 DSH 能力

- **plugin**：Desktop 计划以 DSH 插件形式交付后，可复用 DSH 的 plugin 管理（profile / bundle / `dsh plugin add`）。
- **skill**：桌面端的「服务管理」「系统集成」可封装为 DSH Skill，让 Agent 自然语言管理桌面与服务。
- **self-modification**：插件市场天然契合 self-modification——Agent 可自行发现、安装、更新插件。

### 与其它插件组合的可能性

- **deepseek-harness-desktop (anywhere-labs) + Dizzy-DSH**：Dizzy-DSH 一键装好的多插件合集可作为 Desktop 插件市场的首批内容，开箱即用。
- **deepseek-harness-desktop (anywhere-labs) + DeepSeekHarnessRemoteGateway**：Desktop 的「手机远程控制」可复用 RemoteGateway 的 Cloudflare Quick Tunnel 方案，互为补充。
- **deepseek-harness-desktop (anywhere-labs) + dsh-net-proxy**：桌面端用户可在图形化设置里直接配置 dsh-net-proxy 的代理，无需编辑 JSON。
