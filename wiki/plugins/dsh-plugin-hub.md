# dsh-plugin-hub

> **插件名**：dsh-plugin-hub（DSH 插件中心，包名 @deepseek-ai/dsh-plugin-console）
> **来源仓库**：<https://github.com/Noob-stupid/dsh-plugin-hub>
> **许可证**：MIT
> **commit SHA**：`bf58e96`（前 7 位）

给 DeepSeek Harness（DSH）Web 界面加上插件管理面板：一键启用/停用已安装插件，并直接在 GitHub 上浏览 dsh-plugin 插件项目一键添加并启用。

---

## 1. 使用指南

### 前置依赖

- DSH ≥ 0.1.0-rc.6（web profile，含 `dsh-client-modules` / `dsh-host-plugin-inventory`）
- 浏览器可访问 GitHub（插件市场走浏览器直连 GitHub，打不开时自动回退服务端通道）
- 安装市场插件时需 npm registry 可达（失败回退 `github:owner/repo`，需 git）

### 安装命令

来源：README「一键部署」。

```sh
# 方式一：官方命令（推荐）
dsh plugin --profile web add github:Noob-stupid/dsh-plugin-hub
```

方式二：部署脚本（网络受限时的兜底）：

```powershell
# Windows (PowerShell)
git clone https://github.com/Noob-stupid/dsh-plugin-hub "$env:TEMP\dsh-plugin-console" 2>$null; & "$env:TEMP\dsh-plugin-console\deploy.ps1"
```

```bash
# Linux / macOS
git clone https://github.com/Noob-stupid/dsh-plugin-hub /tmp/dsh-plugin-console 2>/dev/null; bash /tmp/dsh-plugin-console/deploy.sh
```

脚本会把插件包拷进 `$DSH_HOME/profiles/<profile>/node_modules/`，并在 `cordis.patch.yml` 幂等追加启用条目。

### 配置项

| 来源 | 字段 |
|---|---|
| cordis.patch.yml | 由 `dsh.bundle.patch` 声明，`dsh plugin add` 自动挂载进 profile 层栈 |
| 用户补丁层 | `$DSH_HOME/profiles/web/cordis.patch.yml`（停用条目：`- id: X` + `disabled: true`，HMR 生效） |

插件开关只是往用户补丁层追加/移除两行 YAML（来源：README「原理」）：

```yaml
- id: 插件条目id
  disabled: true
```

### 典型用法示例

1. 重启 dsh 服务 → 刷新页面 → 设置 → 插件 → **插件管理**。
2. **已安装插件**：列出全部插件条目（名称、加载状态、启用状态）；点「停用」/「启用」经 HMR 1-3 秒生效；点「详情」展开简介、版本、仓库/主页链接与 README 摘要。
3. **插件市场（GitHub）**：默认搜索 `dsh-plugin`，查看仓库 npm 包名、DSH 插件特征提示与 README 摘要；点「添加并启用」= npm 安装 + 写入启用条目，HMR 生效。

### 重启生效说明

!!! tip "用户补丁层经 HMR 生效，宿主代码变更需重启"
    配置文件监视器（HMR）会在保存后 1 秒内重组合，无需重启——除宿主代码本身变更外。命令行方式重启进程，桌面客户端退出重开。出处：README「原理」「一键部署」。

---

## 2. 弊端与缺陷

!!! warning "宿主代码变更需重启 dsh 服务进程"
    宿主代码变更需要重启进程；仅用户补丁层（启用/停用）经 HMR 1-3 秒生效。命令行方式重启进程，桌面客户端退出重开。出处：README「一键部署」「原理」。

!!! warning "仅支持 DSH 0.1.0 系列，官方破坏性升级后面板显示兼容性警告"
    当前支持 DSH 0.1.0 系列（`0.1.0-rc.6` 及同系列版本）。官方发布破坏性升级（0.2 / 1.0 等）后，面板顶部会显示兼容性警告并给出本仓库地址，而不是默默失效。官方破坏性更新可能改动的接口：补丁层语义、`webServer.register`、加载器条目结构、`dsh.client` bundle 格式、`settings.plugins.tab` 插槽。出处：README「兼容性策略」。

!!! warning "部署脚本不校验版本直接安装"
    部署脚本不校验版本、直接安装；面板里的兼容性警告是权威提示。出处：README「兼容性策略」。

!!! warning "基础设施插件禁止开关（受保护）"
    host 传输/热加载/存储/设置链上的插件（timer、hmr、webserver 等 70+ 行）标记「受保护」，禁止开关——误停用会破坏热加载本身。出处：README「功能 - 已安装插件」。

!!! warning "全部路由仅允许环回地址访问"
    全部路由仅允许环回地址访问；GitHub 元数据只用于发现公开插件，npm 安装走 registry 的完整 TLS 校验；插件市场搜索在浏览器内直连 GitHub，不经过服务端。出处：README「安全说明」。

---

## 3. 后续拓展思路

### 可二次开发的方向

- **版本兼容性自动适配**：当前依赖面收窄到补丁层语义、`webServer.register`、加载器条目结构、`dsh.client` bundle 格式、`settings.plugins.tab` 插槽，可随官方版本自动检测并提示适配分支。
- **插件市场索引缓存**：当前市场走浏览器直连 GitHub，可引入本地索引缓存（类似 marketplace 的 registry.json）减少网络依赖。
- **批量启用/停用与配置导入导出**：支持 profile 级别的插件配置导入导出，便于多机同步。

### 可对接的 DSH 能力

- **hooks**：启用/停用事件可经 hooks 触发外部通知（如团队 IM 推送插件变更审计）。
- **skill**：将「添加并启用某插件」封装为 DSH Skill，由 Agent 自然语言触发。
- **self-modification**：用户补丁层的逐键覆盖语义可作为 self-modification 的安全范式——变更可逆且可观测。

### 与其它插件组合的可能性

- **dsh-plugin-hub + dsh-plugin-marketplace**：hub 负责启用/停用与详情查看，marketplace 负责发现与安装，互补覆盖插件全生命周期。
- **dsh-plugin-hub + dsh-bottom-bar**：用 hub 管理 bottom-bar 的启用/停用，bottom-bar 的费用统计反馈插件运行成本。
