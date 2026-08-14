# dsh-whale-animation

> **插件名**：dsh-whale-animation（DSH Web 鲸鱼深潜状态动画）
> **来源仓库**：<https://github.com/LeemanCheung/dsh-whale-animation>
> **许可证**：MIT（Copyright (c) LeemanCheung）
> **commit SHA**：`48f2129`（前 7 位 `48f2129`）

在 DeepSeek Harness Web 状态文字旁显示持久化黑色鲸鱼深潜动画：无缝闭环、运行时零网络请求，并内嵌静态 PNG 作为 `prefers-reduced-motion` 用户的回退。客户端资源以 data URL 嵌入 `lib/client.js`，安装后不依赖仓库检出目录。

---

## 1. 使用指南

### 前置依赖

- Node.js `>= 20`（仅构建/校验脚本需要，运行时无需）
- DeepSeek Harness Web UI
- DSH 版本需兼容 `@deepseek-ai/dsh-client-runtime ^0.1.0-rc.6`
- peerDependencies：`@deepseek-ai/cordis ^4.0.1`、`@deepseek-ai/dsh-client-runtime ^0.1.0-rc.6`
- 重新生成 README 配图时才需要 Python 与 Pillow

### 安装命令

```powershell
dsh plugin --profile web add github:LeemanCheung/dsh-whale-animation
```

卸载：

```powershell
dsh plugin --profile web remove dsh-whale-animation
```

### 配置项

| 来源 | 字段 |
|---|---|
| `package.json` `dsh.bundle` | `patch: ./cordis.patch.yml` |
| `package.json` `dsh.client` | `inject: ["@deepseek-ai/dsh-client-runtime"]`、`platform: web` |
| `cordis.patch.yml` | `insert` 一项：`id: whale-animation`、`name: dsh-whale-animation` |

- 客户端资源（动态 WebP + 静态 PNG）以内嵌 data URL 写入 `lib/client.js`，运行时无环境变量、无外部 URL、无配置文件。
- 主机端入口 `lib/index.js` 仅为占位（`apply()` 为空），效果仅在浏览器侧。

### 动画规格

| 属性 | 数值 |
|---|---:|
| 画布 | 184 × 184 px |
| 原始帧数 | 618 |
| 单帧时长 | 17 ms |
| 循环时长 | 10.506 秒 |
| 编码 | 带 Alpha 的无损动画 WebP |
| 减少动态效果资源 | 透明 PNG |
| 运行时资源请求 | 无 |

### 典型用法示例

**自然语言触发**：本插件为纯 UI 装饰插件，无自然语言触发入口；安装并启用后即生效于 DSH Web 状态文字旁。

**命令行触发**：

- 安装到 Web profile：`dsh plugin --profile web add github:LeemanCheung/dsh-whale-animation`
- 卸载：`dsh plugin --profile web remove dsh-whale-animation`
- 重新构建客户端（开发）：`node scripts/build-client.mjs`
- 校验注册/生命周期/嵌入资源（开发）：`node scripts/check.mjs`

### 重启生效说明

!!! tip "安装后需硬刷新或重启 DSH"
    安装后请硬刷新 DSH Web 页面；若当前 profile 已缓存客户端 Bundle，请重启 DSH 使新客户端生效。出处：README「安装」。

---

## 2. 弊端与缺陷

!!! warning "依赖 DSH 状态文字的 CSS 类名模式"
    客户端通过向 DSH 状态文字元素的 `::after` 注入样式表实现动画；当前依赖 DSH 状态文字的 CSS 类名模式，未来 DSH Shell 若重新设计，可能需要更新选择器。出处：README「兼容性」、README「工作原理」。

!!! warning "仅适配 DSH Web UI，不适用其他 profile"
    目标平台为 DeepSeek Harness Web UI（`dsh.client.platform: web`），不适用于 CLI 等其他 profile。出处：`package.json` `dsh.client`、README「兼容性」。

!!! warning "需 DSH 版本兼容 dsh-client-runtime ^0.1.0-rc.6"
    peerDependencies 要求 `@deepseek-ai/dsh-client-runtime ^0.1.0-rc.6` 与 `@deepseek-ai/cordis ^4.0.1`，旧版本 DSH 不保证可用。出处：`package.json` `peerDependencies`、README「兼容性」。

!!! warning "lib/client.js 体积较大（约 826 KB）"
    `lib/client.js` 有意提交到仓库以确保 GitHub 安装无需构建或下载外部资源，但内嵌 base64 资源使该文件约 826 KB，仓库克隆体积偏大。出处：README「仓库结构」「开发」、`lib/client.js` 文件体积。

!!! warning "动画为原创插图，非 DeepSeek 官方资产"
    动画为原创 UI 插图，与 DeepSeek 官方无关联、未获其背书；"DeepSeek" 及相关标记可能为各自所有者的商标，MIT 许可仅覆盖插件代码与原创动画资源，不覆盖第三方商标。出处：NOTICE.md、README「声明」。

---

## 3. 后续拓展思路

### 可二次开发的方向

- **多主题/多物种动画包**：当前为单条黑色鲸鱼深潜闭环，可沿用同一套 build-client 嵌入流水线扩展为多主题动画包（如不同色调、不同生物），通过配置切换或按活动期上线。
- **可配置的动画参数**：将画布尺寸、帧时长、循环策略等参数化（当前为硬编码 184×184 / 17 ms / 618 帧），支持用户按状态类型选择不同动画。
- **状态语义联动**：当前动画与具体状态语义无关，可扩展为根据 DSH 状态文字内容（如 thinking / diving / error）切换不同动画或回退到静态 PNG。

### 可对接的 DSH 能力

- **client inject**：已通过 `dsh.client.inject` 挂载到 `@deepseek-ai/dsh-client-runtime`，可作为后续 Web UI 视觉插件的模板。
- **cordis.patch.yml**：持久化 DSH Bundle 组合补丁机制可复用于其他需要在 Web profile 自动挂载客户端的视觉插件。
- **prefers-reduced-motion**：静态 PNG 回退思路可作为 DSH 无障碍规范的参考样例。

### 与其它插件组合的可能性

- **dsh-whale-animation + DSH Web UI 皮肤中心**：将鲸鱼动画作为皮肤包的动态元素之一，与配色/字体等皮肤资源统一管理与切换。
- **dsh-whale-animation + 状态事件 hooks**：通过 hooks 感知 DSH 状态切换事件，让动画在特定状态（如长任务进行中）强化或切换形态，增强状态反馈。
