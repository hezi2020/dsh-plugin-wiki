# deepseek-harness-themes

> **插件名**：deepseek-harness-themes（@dshthemes/ui + @dshthemes/core）
> **来源仓库**：<https://github.com/orxz/deepseek-harness-themes>
> **许可证**：MIT（Copyright (c) 2026 deepseek-harness-themes contributors）
> **commit SHA**：`874a3bb`（前 7 位）

面向 deepseek-harness 的 UI 主题集合。社区维护，基于官方主题扩展点（`@deepseek-ai/dsh-client-ui-theme` 的 `ctx.theme`）构建，只关注视觉体验——颜色、表面、状态、代码块、工具调用、终端 UI。不改模型、不改 agent、不改提示词、不改协议。内置六个主题：DeepSeek / OLED / Dracula / Catppuccin / Tokyo Night / GitHub Dark。

---

## 1. 使用指南

### 前置依赖

- DeepSeek Harness（deepseek-harness）
- pnpm（monorepo 形态）
- 运行时 `@deepseek-ai/cordis` 由 DSH 提供（peerDependencies，永不打包）

### 安装命令

一条命令完成依赖安装、profile 层添加与功能挂载：

```sh
dsh plugin --profile <profile> add @dshthemes/ui
```

卸载同样简单：

```sh
dsh plugin --profile <profile> remove @dshthemes/ui
```

手写 patch 替代方式（profile 偏好手写层时）：

```yaml
- insert:
    - id: dsh-themes
      name: "@dshthemes/ui"
```

仅用核心包与本地开发见 [docs/installation.md](https://github.com/orxz/deepseek-harness-themes/blob/main/docs/installation.md)。

### 配置项

| 来源 | 字段 |
|---|---|
| 设置页 General 区「Theme」行（id `themes`，order `11`，紧跟宿主 Appearance 行） | 主题选择（DeepSeek / OLED / Dracula / Catppuccin / Tokyo Night / GitHub Dark + 其它已注册第三方主题） |
| `$DSH_HOME/settings.yaml` | `dsh-themes.theme`（值为主题 id；`system` 表示不覆盖、跟随宿主偏好） |

- 第三方选择持久化在插件自己的命名空间 `dsh-themes`，不写入宿主内置主题 schema（`ui-theme.preference` 仅接受 `light`/`dark`/`system`）。
- 内置选择清空标记（`system`）并由宿主 Appearance 行接管；非字符串或未注册的值在 restore 时被忽略。

### 典型用法示例

**UI 触发**：打开「设置 → General」，在宿主「Appearance」行下方的「Theme」行点击任一主题色块即切换；选择会持久化，刷新与重启后保留。

### 重启生效说明

!!! tip "一条命令安装即生效，第三方选择跨重启保留"
    `dsh plugin add` 把 bundle 加入 `dsh.profile.bundles`，浏览器插件名单与 Host 装载列表随之生效；第三方选择持久化在 `dsh-themes` 命名空间，激活时若该主题仍注册则恢复。出处：README「Install」、packages/ui/README.md「Persistence boundary」。

---

## 2. 弊端与缺陷

!!! warning "主题只改外观不改行为，能力边界窄"
    主题只改变 deepseek-harness 的外观，而非行为——不改模型、不改 agent、不改提示词、不改协议；用户期望"换主题改变 agent 行为"会落空。出处：README「Theme philosophy」、packages/ui/README.md「Model Experience」。

!!! warning "第三方选择持久化在本插件命名空间，不写入宿主内置 schema"
    宿主内置主题 schema（`ui-theme.preference`）只接受 `light`/`dark`/`system`，本插件只能用自己的命名空间 `dsh-themes` 持久化第三方选择，永不写入内置 schema；这意味着宿主 Appearance 行与本插件 Theme 行是两套独立的持久化路径，用户需理解分工。出处：packages/ui/README.md「Persistence boundary」。

!!! warning "远程浏览器选择 process-local，不跨实例同步"
    远程浏览器保持选择 process-local（settings RPCs 在那里只允许 loopback），见宿主 `SettingsScope` 契约；多远程实例间选择不同步。出处：packages/ui/README.md「Known limitations」。

!!! warning "选择行只覆盖自带六个 id，其它插件主题无标题无色块"
    选择行列出所有已注册的第三方主题（含其它插件注册的），但本包字典只覆盖自带六个 id；其它插件的主题以 id 的 title-cased 形式渲染、无 swatch（色块）。出处：packages/ui/README.md「Known limitations」。

!!! warning "每个主题必须覆盖完整 REQUIRED_TOKENS 集，否则 pnpm test 失败"
    每个主题必须覆盖 `packages/core/src/tokens.ts` 定义的完整 `REQUIRED_TOKENS` 集；`pnpm test` 强制覆盖、id 唯一、CSS 颜色有效——贡献新主题门槛较高。出处：AGENTS.md「Standing orders」、docs/theme-spec.md。

---

## 3. 后续拓展思路

### 可二次开发的方向

- **贡献更多社区主题**：按 [docs/creating-a-theme.md](https://github.com/orxz/deepseek-harness-themes/blob/main/docs/creating-a-theme.md) 分步指南新增主题（如 Nord、Solarized、Gruvbox、One Dark），需覆盖完整 `REQUIRED_TOKENS` 集并通过 `pnpm test`。
- **主题色板与背景图联动**：当前主题只覆写 token，可扩展为"主题色板 + 配套背景图预设"，对标 dsh-gui-customization 的氛围层。
- **主题切换动画**：当前主题切换是即时覆写 token，可加平滑过渡动画（如 CSS 变量过渡）。

### 可对接的 DSH 能力

- **`ctx.theme`（`@deepseek-ai/dsh-client-ui-theme`）**：已用此官方扩展点注册主题；可作为"主题贡献"样例供其它插件参考。
- **`settings.general.item` 插槽**：已用此（id `themes`，order `11`）注入选择行；可扩展为带预览的主题管理行。
- **`ctx.effect()` disposer**：注册均返回 disposer，卸载即清理——可作为"可卸载插件"样例。

### 与其它插件组合的可能性

- **deepseek-harness-themes + dsh-gui-customization**：前者提供成套主题色基座，后者提供氛围光 + 动态背景；二者叠加可得到"主题色 + 氛围层 + 壁纸"组合。
- **deepseek-harness-themes + dsh-ui-appearance**：前者主题色，后者背景图/透明度/模糊；二者分工——前者做"色板切换"，后者做"壁纸 + 玻璃效果"。
- **deepseek-harness-themes + dsh-ui-beautify**：前者 token 覆写稳健，后者选择器覆盖轻量；可让前者做主力主题，后者做"快速预设"补充。
