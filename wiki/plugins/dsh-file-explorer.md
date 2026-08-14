# dsh-file-explorer

> **插件名**：dsh-plugin-file-explorer
> **来源仓库**：<https://github.com/bearllfleed/dsh-plugin-file-explorer>
> **许可证**：MIT（Copyright (c) 2025 bearllfleed）
> **commit SHA**：前 7 位 `9276fe8`

给 DSH Web 界面加一个 VS Code 风格的工作区文件浏览器：右侧文件树 + 可编辑标签页 + Markdown 阅读/编辑/分屏 + 悬浮大纲 + Quick Open 模糊搜索。

---

## 1. 使用指南

### 前置依赖

- 已安装 DSH 并初始化过 `web` profile（首次运行 `dsh web` 会自动生成）
- DSH Web UI（前端经 `dsh.client.inject` 注入 4 个 DSH 客户端包：`@deepseek-ai/dsh-client-runtime`、`-ui-slots`、`-ui-layout`、`-ui-conversation`，`platform: "web"`）

### 安装命令

```bash
# 方式一：npm 安装
dsh plugin --profile web add dsh-plugin-file-explorer

# 方式二：GitHub 安装（无需发布 npm）
dsh plugin --profile web add github:bearllfleed/dsh-plugin-file-explorer
```

安装后必须手动登记到 `cordis.patch.yml`：

```yaml
# 编辑 $DSH_HOME/profiles/web/cordis.patch.yml
- insert:
    - id: file-explorer           # 配置树唯一标识，可自定义
      name: 'dsh-plugin-file-explorer'   # 必须是 npm 包名
```

重启：

```bash
dsh web
# 然后刷新 http://127.0.0.1:3080
```

### 配置项

| 来源 | 字段 |
|---|---|
| profile `cordis.patch.yml` | `id`（配置树唯一标识，可自定义）、`name`（必须是 npm 包名 `dsh-plugin-file-explorer`） |
| DSH 通用设置 | 中英文语言切换（跟随 DSH 通用设置自动切换） |
| 文件浏览器设置面板 | 编辑器字体（等宽上下文）、自动保存策略（关闭 / 延迟保存 / 失焦保存） |

### 典型用法示例

| 操作 | 快捷键 / 入口 |
|---|---|
| 打开 / 关闭文件树 | 右侧活动栏文件图标 |
| 打开文件 | 文件树点击；或 `⌘/Ctrl+P` 搜索后回车 |
| 保存 | `⌘/Ctrl+S` |
| 关闭标签页 | 标签页悬停 `×`，或右键菜单（关闭 / 关闭其他 / 关闭右侧 / 关闭已保存 / 全部关闭 / 复制路径 / 固定） |
| Markdown 模式 | 文件顶部「阅读 / 编辑 / 分屏」 |
| Markdown 大纲 | 阅读模式右侧悬浮条，悬停展开 |
| 编辑器字体 / 自动保存 | 侧栏齿轮设置按钮 |

### 重启生效说明

!!! tip "改完 cordis.patch.yml 或 lib/ 都要重启 dsh web"
    `cordis.patch.yml` 改动需 `dsh web` 重启并刷新浏览器；若以 `file:` 链接方式安装，改完 `lib/` 后需手动同步到 `$DSH_HOME/profiles/web/node_modules/dsh-plugin-file-explorer/lib/`；否则要重新 `dsh plugin add` 并重启。

---

## 2. 弊端与缺陷

!!! warning "安装不自动注册，必须手动改 cordis.patch.yml"
    安装只把包放进依赖，DSH 不会自动加载它；必须手动在 `$DSH_HOME/profiles/web/cordis.patch.yml` 加 `id` + `name` 行，新手容易漏这一步导致插件「装了但不生效」。出处：README「然后启用插件」。

!!! warning "platform: web 限定，不能进 Electron 主窗口"
    `package.json` 的 `dsh.client.platform` 是 `"web"`，并显式 `inject` 4 个 `@deepseek-ai/dsh-client-*` 包；这意味着它只能注入 DSH Web UI，无法在 Electron 桌面外壳主窗口（如 dsh-work 的有权限主窗口）里生效。出处：package.json `dsh.client`。

!!! warning "lib/ 改动需手动同步或重装"
    若插件以 `file:` 链接方式安装，改完 `lib/` 后要手动同步到 `$DSH_HOME/profiles/web/node_modules/dsh-plugin-file-explorer/lib/`；否则需重新 `dsh plugin add` 并重启。开发期无热重载，迭代成本高。出处：README「开发」。

!!! warning "关闭未保存文件始终弹确认框，不可关闭"
    自动保存仅在「延迟保存 / 失焦保存」模式下生效；关闭未保存文件时弹确认框是硬性行为，无配置项关闭，对追求零打扰的用户是噪音。出处：README「功能 · 自动保存」。

---

## 3. 后续拓展思路

### 可二次开发的方向

- **Git 状态着色与变更视图**：当前文件树只按类型着色图标，可扩展为读取 git status 给文件标 dirty/added/modified 颜色，并提供 stage/unstage 操作面板（DSH 官方 Web 也尚未提供完整 stage 面板）。
- **多根工作区支持**：现文件树跟随当前 profile 工作目录，可扩展为支持 VS Code 风格的多根工作区切换。
- **大纲跳转 + 符号搜索**：Markdown 悬浮大纲已具备，可扩展为 `⌘/Ctrl+Shift+O` 跳转符号（含代码符号，需要 LSP 桥接）。

### 可对接的 DSH 能力

- **skill**：把「在 DSH 中打开并预览某文件」封装为 DSH Skill，让 Agent 自然语言触发文件查看，而非只靠用户点击。
- **hooks**：文件保存事件可经 hooks 触发 Agent 自动 format / lint（类似 VS Code 的 formatOnSave）。
- **self-modification**：Agent 用 Quick Open + 编辑标签页直接修改自身工作区文件，配合审批门形成 self-modification 的可视化编辑闭环。

### 与其它插件组合的可能性

- **dsh-file-explorer + dsh-track**：让 dsh-track 的「↩ 对话」跳回原始 prompt 时，自动在文件浏览器中高亮定位该 prompt 涉及的源文件，形成「决策 → 文件」双向跳转。
- **dsh-file-explorer + dsh-github**：把 PR diff 文件在文件浏览器中按 PR 维度分组展示，点击即可在编辑标签页中查看 diff 并直接修复。
- **dsh-file-explorer + dsh-work**：dsh-work 是 Electron 桌面外壳，其「项目源码目录默认只读」策略可与本插件的「可编辑标签页」组合，由 dsh-work 授权写入目录、本插件提供编辑体验。
