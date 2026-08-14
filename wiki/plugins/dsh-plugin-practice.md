# dsh-plugin-practice

> **插件名**：dsh-plugin-practice（DSH 插件开发练习仓库）
> **来源仓库**：<https://github.com/Ri0n72Y/dsh-plugin-practice>
> **许可证**：未声明（仓库未包含 LICENSE 文件）
> **commit SHA**：`21535a0`（前 7 位）

一个 DSH 插件开发入门练习仓库，以 Lesson 1 演示 Cordis 函数插件的最小骨架：`apply(ctx)` 入口、`ctx.effect()` 管理的定时心跳资源、以及通过 `cordis.patch.yml` 加载到 DSH 的完整流程。这是「一次只学一个概念」的练习用仓库，非可发布的插件 bundle。

---

## 1. 使用指南

### 前置依赖

- DeepSeek Harness 源码检出（用于 `pnpm dsh web --patch`）
- pnpm
- 本仓库需用本机绝对路径替换 `cordis.patch.yml` 中的占位符 `/ABSOLUTE/PATH/TO/dsh-plugin-practice`

### 安装命令

```sh
# 1. 克隆仓库
git clone https://github.com/Ri0n72Y/dsh-plugin-practice.git
cd dsh-plugin-practice

# 2. 编辑 cordis.patch.yml，把 /ABSOLUTE/PATH/TO/dsh-plugin-practice 替换为仓库绝对路径

# 3. 在 deepseek-harness 源码检出目录下执行
pnpm dsh web --patch /ABSOLUTE/PATH/TO/dsh-plugin-practice/cordis.patch.yml
```

!!! warning "非标准 DSH 插件 bundle"
    本仓库为学习用仓库，非可发布的 DSH 插件 bundle；没有 `package.json` / `dsh.plugin.json`，仅以 Cordis patch 方式从 DSH 源码检出加载。`dsh plugin add` 不适用，必须经 `pnpm dsh web --patch` 加载。出处：README「Load it from a DSH source checkout」。

### 配置项

| 来源 | 字段 |
|---|---|
| `cordis.patch.yml` | 路径占位符 `/ABSOLUTE/PATH/TO/dsh-plugin-practice`（需替换为本机绝对路径） |

仓库未提供其他配置项（无 `package.json` / `dsh.plugin.json`）。

### 典型用法示例

加载后终端应输出：

```text
[practice-lifecycle] loaded
[practice-lifecycle] heartbeat
```

插件卸载或替换时应输出：

```text
[practice-lifecycle] disposed
```

`src/plugin.ts` 中的心跳资源由 `ctx.effect()` 创建定时器并返回清理函数，Cordis 在插件卸载时自动调用 disposer（README「Plugin」段）。

### 重启生效说明

!!! tip "改动后需重启 dsh web"
    修改 `src/plugin.ts` 或 `cordis.patch.yml` 后需重新执行 `pnpm dsh web --patch` 才能加载新版本；本仓库无热加载机制。

---

## 2. 弊端与缺陷

!!! warning "仅含 Lesson 1，非完整插件"
    仓库定位为「一次只学一个概念」的最小练习，仅含 Lesson 1，未提供完整插件运行时或发布物。出处：README 第 1 段、Lesson 1 标题。

!!! warning "cordis.patch.yml 路径占位符需手动替换"
    `cordis.patch.yml` 内是占位符 `/ABSOLUTE/PATH/TO/dsh-plugin-practice`，必须手动替换为本机绝对路径，否则无法加载。出处：README「Load it from a DSH source checkout」第 2 步。

!!! warning "仓库未声明许可证"
    仓库未包含 LICENSE 文件，许可证未声明。出处：仓库根目录文件列表。

!!! warning "插件示例仅 console.log 心跳，无实际功能"
    插件示例仅打印 `console.log` 心跳，无实际业务逻辑，不可直接用于生产。出处：README「Plugin」段代码。

---

## 3. 后续拓展思路

### 可二次开发的方向

- **向 Lesson 2 推进**：在 Lesson 1 基础上加 `inject = ['tools']`，注册一个真实的 DSH Tool，跳出框架黑盒（README「What to understand before Lesson 2」段已预告）。
- **多生命周期资源演示**：在 `ctx.effect()` 内组合多个定时器 / 监听器 / 文件 watch，演示资源所有权与清理顺序。
- **把练习仓库演进为可发布 bundle**：补 `package.json` / `dsh.plugin.json` / `cordis.patch.yml` 标准结构，走 `dsh plugin add` 路径。

### 可对接的 DSH 能力

- **hooks**：把心跳逻辑改造为 hooks 监听会话事件，演示 Cordis 事件系统。
- **self-modification**：把 `console.log` 改为写入会话日志或触发 self-modification 钩子，作为 self-modification 入门样例。

### 与其它插件组合的可能性

- **dsh-plugin-practice + dsh-net-proxy**：在 Lesson 2 注册一个走代理的 web_fetch 工具，用 dsh-net-proxy 提供的代理配置发请求，演示插件协作。
- **dsh-plugin-practice + dsh-vision-toolkit**：在 Lesson 2 注册一个调用 `vision_glance` 的工具，复用 vision-toolkit 的常驻工具目录。
