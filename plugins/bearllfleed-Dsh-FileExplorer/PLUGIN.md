# PLUGIN 元数据 — dsh-plugin-file-explorer

## 插件名称
dsh-plugin-file-explorer（DSH 工作区文件浏览器）

## 来源仓库 URL
https://github.com/bearllfleed/dsh-plugin-file-explorer

## 克隆时的 commit SHA
前 7 位：`9276fe8`

## 功能描述（一句话）
为 DSH Web UI 加一个 VS Code 风格的工作区文件浏览器：右侧文件树 + 可编辑标签页 + Markdown 阅读/编辑/分屏 + 悬浮大纲 + Quick Open 模糊搜索。

## 前置依赖
- 已安装 DSH 并初始化过 `web` profile（首次运行 `dsh web` 会自动生成）
- DSH Web UI（前端 bundle 注入运行时）

## 安装命令
```sh
# 方式一：npm 安装
dsh plugin --profile web add dsh-plugin-file-explorer

# 方式二：GitHub 安装（无需发布 npm）
dsh plugin --profile web add github:bearllfleed/dsh-plugin-file-explorer
```

安装后必须手动登记到 profile 的 `cordis.patch.yml`，DSH 才会加载：

```yaml
# 编辑 $DSH_HOME/profiles/web/cordis.patch.yml
- insert:
    - id: file-explorer           # 配置树唯一标识，可自定义
      name: 'dsh-plugin-file-explorer'   # 必须是 npm 包名
```

重启：

```sh
dsh web
# 然后刷新 http://127.0.0.1:3080
```

## 配置项
| 来源 | 字段 |
|---|---|
| profile 的 `cordis.patch.yml` | `id`（配置树唯一标识，可自定义）、`name`（必须是 npm 包名 `dsh-plugin-file-explorer`） |
| DSH 通用设置 | 中英文语言切换（跟随 DSH 通用设置） |
| 文件浏览器设置面板 | 编辑器字体（等宽上下文）、自动保存策略（关闭 / 延迟保存 / 失焦保存） |

## 已知限制
- 安装只把包放进依赖，不会自动注册到 `cordis.patch.yml`：必须手动登记 `id` + `name` 才会被 DSH 加载（README「然后启用插件」明确说明）。
- `lib/` 改动需要同步：若插件以 `file:` 链接方式安装，改完 `lib/` 后需手动同步到 `$DSH_HOME/profiles/web/node_modules/dsh-plugin-file-explorer/lib/`；否则要重新 `dsh plugin add` 并重启。
- 插件 entry 走 `dsh.client.inject` 注入 4 个 DSH 客户端运行时/UI 包（`@deepseek-ai/dsh-client-runtime`、`-ui-slots`、`-ui-layout`、`-ui-conversation`），`platform: "web"` 限定只能用于 Web profile，桌面端/Electron 主窗口不适用。
- 自动保存仅在「延迟保存 / 失焦保存」模式下生效，关闭未保存文件会弹确认框（不可关闭该确认）。

## 本地运行状态
未实测安装（本任务仅克隆源码，未实际通过 `dsh plugin` 加载或 `dsh web` 运行）

## 许可证
MIT（Copyright (c) 2025 bearllfleed，来源：LICENSE 文件、package.json `license`、README「License」）
