# 安装指南

DeepSeek Harness（`dsh`）是 DeepSeek AI 基于 Cordis 内核的「Everything is a plugin」开源 Agent Harness。本页介绍如何在你的机器上安装并启动它。

!!! info "公测状态"
    DeepSeek Harness 目前处于 *developer preview* 阶段，迭代迅速，**会存在破坏性变更**。生产场景请谨慎评估。

## 环境要求

`dsh` 对运行环境有明确版本要求，下表汇总了各依赖项的约束与说明：

| 依赖 | 要求版本 | 说明 |
|---|---|---|
| Node.js | `^22.19.0 \|\| >=24.0.0` | `package.json` 的 `engines.node` 声明；pnpm 默认不强制，但建议满足 |
| pnpm | `11.7.0`（`packageManager` 字段） | pnpm 11.x 均可工作；仅源码路径需要 |
| 操作系统 | Windows / Linux / macOS | `landlock-run` 沙箱为 Linux 专属，Windows/macOS 会自动跳过 |

!!! tip "Node 版本不满足时的兜底"
    若你的 Node 版本略低于下限（如 v22.16.0），pnpm 仅会打印 `Unsupported engine` 警告，不会阻塞。若被硬性拦截，可追加 `--config.engine-strict=false` 兜底：
    ```powershell
    pnpm install --config.engine-strict=false
    ```

### 各操作系统差异

- **Windows**：使用 PowerShell；`tool-pwsh` 启用、`tool-bash` 禁用；`landlock-run` 模块自动跳过（仅警告）；`node-pty`、`koffi`、`esbuild` 等原生模块会执行 postinstall 构建。
- **Linux**：使用 bash；`landlock-run` 沙箱可用；`tool-bash` 启用、`tool-pwsh` 禁用。
- **macOS**：使用 bash；行为与 Linux 接近，但 `landlock-run` 不适用。

## 方式一：npm 快速路径（推荐新手）

无需克隆源码，直接通过 `npx` 启动 Web UI：

```bash
npx @deepseek-ai/dsh web
```

该命令会拉取 `@deepseek-ai/dsh` 包并启动 Web UI，默认服务于 `http://127.0.0.1:3080`。详见 [Web UI 使用指南](web-ui.md)。

!!! note "首次运行"
    `npx` 首次执行时会下载包并可能初始化 profile 模板，需要联网。`web` 和 `headless` profile 会在首次使用时从内置模板自动初始化。

## 方式二：源码路径（适合贡献者与定制）

适合需要阅读源码、开发插件或跟踪主干的用户。

### 1. 克隆仓库

```bash
git clone https://github.com/deepseek-ai/deepseek-harness.git
cd deepseek-harness
```

!!! tip "克隆过慢"
    仓库对象较多，完整克隆可能很慢。可改用浅克隆加速：
    ```bash
    git clone --depth=1 https://github.com/deepseek-ai/deepseek-harness.git
    ```

### 2. 安装依赖

```bash
pnpm install
```

Windows 上若 Node 版本偏低，可加兜底：

```powershell
pnpm install --config.engine-strict=false
```

!!! warning "pnpm 版本覆盖"
    某些环境（如多版本管理工具）可能将 `pnpm` 指向较低版本（如 8.x），导致 workspaces 安装异常。请先用 `pnpm -v` 确认版本为 11.x。若不符，将正确的 pnpm 所在目录前置到 `PATH`，或直接用绝对路径调用。

### 3. 构建

```bash
pnpm run build
```

构建分为三个阶段：`build:lib:host`（tsc + tsdown）→ `build:lib:client`（tsc + tsdown）→ `build:web`（vite）。

!!! warning "tsdown 报错 Failed to import module \"unrun\""
    `tsdown@0.22.2` 把 `unrun` 声明为可选 peer 依赖，pnpm 不会自动安装，但加载配置时仍会尝试 import。若构建报此错，执行：
    ```powershell
    pnpm add -Dw unrun
    ```
    安装后重新 `pnpm run build` 即可。

### 4. 启动 Web UI

```bash
pnpm dsh web
```

启动后输出 `dsh web: http://127.0.0.1:3080`，浏览器访问该地址即可。

## 验证安装

启动 Web UI 后，用以下命令验证服务可访问：

```powershell
# PowerShell
Invoke-WebRequest http://127.0.0.1:3080 -UseBasicParsing -TimeoutSec 10 | Select-Object StatusCode
```

```bash
# bash
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:3080
```

返回 `200` 即表示 Web UI 正常。此时页面可加载，但要让 agent 实际运行任务，还需配置模型凭据——见 [Web UI 使用指南](web-ui.md) 与 [配置与 Profile](configuration.md)。

## 配置 API Key（首次运行必读）

!!! warning "未配置 API Key 时的行为"
    - Web UI 页面可正常加载（HTTP 200），可选择 workspace、浏览界面（只读/演示模式）。
    - **无法发送会话任务**：会话编辑器在未选择 workspace 时不可用；即便选了 workspace，没有可用模型路由也无法产生模型响应。

配置步骤：

1. 打开 **Settings → Models**。
2. 填入 DeepSeek API key 并保存。
3. 模型路由立即生效，无需重启服务。

密钥存储在 `$DSH_HOME/.credentials.yaml`，页面只接收脱敏描述符，永不返回明文。详见 [配置与 Profile](configuration.md)。

## 常见安装问题

安装过程中的详细排障（Node/pnpm 版本、原生模块、tsdown 报错、API Key 缺失等）已收录在 [排障笔记](troubleshooting.md)。下表给出快速索引：

| 问题 | 参考位置 |
|---|---|
| Node 版本不符 / `Unsupported engine` 警告 | [排障笔记 - 版本要求](troubleshooting.md#版本要求) |
| pnpm 版本被覆盖 / 路径问题 | [排障笔记 - pnpm 路径覆盖问题](troubleshooting.md#pnpm-路径覆盖问题) |
| Windows 原生模块（landlock-run / node-pty） | [排障笔记 - Windows 原生模块限制](troubleshooting.md#windows-原生模块限制与绕过) |
| `tsdown` 报 `Failed to import module "unrun"` | [排障笔记 - tsdown 构建报错](troubleshooting.md#tsdown-构建报错failed-to-import-module-unrun) |
| API Key 缺失时的只读行为 | [排障笔记 - API Key 缺失](troubleshooting.md#api-keydeepseek_api_key缺失时的只读演示行为) |

## 下一步

- [Web UI 使用指南](web-ui.md) —— 熟悉各视图与基本流程
- [CLI 命令](cli.md) —— 了解 `dsh` 命令行入口
- [运行时模式](runtime-modes.md) —— 选择合适的 agent preset
- [配置与 Profile](configuration.md) —— 深入 profile 组合与凭据管理
