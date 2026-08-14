# deepseek-harness-101

> **插件名**：deepseek-harness-101（个人 DSH 插件开发集，submodule 索引）
> **来源仓库**：<https://github.com/Momojie-S/deepseek-harness-101>
> **许可证**：源材料未提及（README 与仓库均未声明 LICENSE）
> **commit SHA**：`f89c767`（前 7 位）

个人 DeepSeek Harness (DSH) 插件开发集。每个插件是独立仓库，以 git submodule 形式挂载到 `plugins/` 下，收录 workspace 级 MCP 自动加载与 workspace 级环境变量隔离两个插件及开发心得笔记。

!!! warning "非标准 DSH 插件 bundle，为 submodule 索引集合"
    本仓库为 submodule 索引集合，非标准 DSH 插件 bundle，不直接通过 `dsh plugin add` 安装。子模块插件需进入各自目录按其 README 单独安装。出处：README 顶部「个人 DeepSeek Harness (DSH) 插件开发集」。

---

## 1. 使用指南

### 前置依赖

- git（支持 submodule）
- DSH 运行环境（子模块插件各自有独立依赖，需进入对应子目录查看）
- 子模块插件：
  - `@momojie-s/dsh-workspace-mcp`：按 workspace（session cwd）自动加载/卸载 MCP server，工具注册到 agent scope
  - `@momojie-s/dsh-workspace-env`：pwsh 命令自动注入 workspace `.env` 环境变量，实现 workspace 级环境变量隔离

### 安装命令

来源：README「使用」。

```shell
git clone --recurse-submodules https://github.com/Momojie-S/deepseek-harness-101.git
# 或 clone 后补拉子模块
git submodule update --init --recursive
```

> 子模块插件（`@momojie-s/dsh-workspace-mcp`、`@momojie-s/dsh-workspace-env`）需进入各自目录按其 README 单独安装到 DSH profile。

### 配置项

| 来源 | 字段 |
|---|---|
| 源材料未提及 | 本仓库为 submodule 索引集合，配置项见各子模块插件的 README |

### 典型用法示例

1. `git clone --recurse-submodules` 拉取本仓库与全部子模块。
2. 进入 `plugins/dsh-workspace-mcp` 按其 README 安装：实现按 workspace（session cwd）自动加载/卸载 MCP server。
3. 进入 `plugins/dsh-workspace-env` 按其 README 安装：pwsh 命令自动注入 workspace `.env` 环境变量。
4. 阅读开发心得笔记：
   - `docs/usage/dsh-plugin-development.md` — DSH 插件开发指南（形态、依赖注入、HMR 缓存、patch 限制、踩坑速查）
   - `docs/usage/mcp.md` — 怎么在 DSH 添加 MCP server（插件 + patch + 踩坑）

### 重启生效说明

!!! tip "子模块插件安装后按各自 README 重启生效"
    本仓库为 submodule 索引集合，子模块插件安装后的生效方式见各子模块 README。出处：README「插件目录」「使用心得笔记」。

---

## 2. 弊端与缺陷

!!! warning "本仓库为 submodule 索引集合，非标准 DSH 插件 bundle"
    本仓库为 submodule 索引集合，非标准 DSH 插件 bundle，不直接通过 `dsh plugin add` 安装。子模块插件需进入各自目录按其 README 单独安装。出处：README 顶部说明。

!!! warning "子模块插件的具体安装命令与配置项未在本仓库 README 给出"
    本仓库 README 仅列出子模块插件名称、路径与一句话作用，未给出子模块的具体安装命令与配置项——需进入各子模块目录查看其 README。出处：README「插件目录」。

!!! warning "@momojie-s/dsh-workspace-env 依赖 pwsh，仅适用于 PowerShell 环境"
    `@momojie-s/dsh-workspace-env` 通过 pwsh 命令自动注入 workspace `.env` 环境变量，依赖 pwsh，仅适用于 PowerShell 环境，非 Windows / 非 pwsh 环境不可用。出处：README「插件目录」。

!!! warning "仓库未声明许可证"
    README 与仓库均未声明 LICENSE 文件，GitHub 许可证字段为空。在复制、修改或再分发前需向维护者确认授权。出处：README 全文（无 License 章节）。

---

## 3. 后续拓展思路

### 可二次开发的方向

- **跨 shell 环境变量隔离**：当前 `dsh-workspace-env` 依赖 pwsh，可扩展支持 bash/zsh 等 shell，实现跨平台 workspace 级环境变量隔离。
- **MCP server 生命周期管理增强**：`dsh-workspace-mcp` 当前按 workspace 自动加载/卸载 MCP server，可增加 MCP server 健康检查与自动重启能力。
- **开发心得笔记扩充**：`docs/usage/` 下的开发指南可扩充为更系统的 DSH 插件开发教程，覆盖更多踩坑场景。

### 可对接的 DSH 能力

- **skill**：`docs/usage/dsh-plugin-development.md` 开发指南可封装为 DSH Skill，由 Agent 自然语言触发「创建一个 DSH 插件骨架」。
- **hooks**：workspace 切换事件可经 hooks 触发 MCP server 的加载/卸载（与 `dsh-workspace-mcp` 联动）。
- **self-modification**：workspace 级环境变量隔离与 MCP 自动加载是 self-modification 的基础设施——Agent 可按 workspace 自主调整运行时能力。

### 与其它插件组合的可能性

- **deepseek-harness-101 + dsh-plugin-marketplace**：子模块插件可发布到 `dsh-plugin` topic 后经 marketplace 发现并安装，降低 submodule 手动管理成本。
- **deepseek-harness-101 + dsh-bottom-bar**：workspace 级 MCP / 环境变量加载状态可在 bottom-bar 显示，便于开发者感知当前 workspace 的运行时配置。
