# dsh-gui-customization

> **插件名**：dsh-gui-customization（DeepSeek Harness 时装工坊）
> **来源仓库**：<https://github.com/LAN-TINA-WS/dsh-gui-customization>
> **许可证**：MIT（Copyright (c) 2026 LAN-TINA-WS；`build/` 下 tsdown preset 源自 dsh-web-ui，BSD-3-Clause，© zhu1090093659）
> **commit SHA**：`13b237a`（前 7 位）

DeepSeek Harness Web UI 的主题定制插件：Nous 蓝默认配色（明暗双模式）、四套预设与 13 色自定义、氛围光（光晕/呼吸/位置实时可调）、动态背景（图片/视频，原生文件选择 + 内置预设「deepseek娘01」+ 背景透明度滑块 + 侧边栏透明开关）、配色导入/导出，中英双语、设置持久化、跨重启保留。配置入口：设置 → 界面设定。

---

## 1. 使用指南

### 前置依赖

- DeepSeek Harness（DSH）Web 宿主
- 构建用：Node.js + pnpm + tsdown（运行时 `@deepseek-ai/*` peer 由宿主提供）
- 浏览器支持 IndexedDB（背景图持久化）与 localStorage（配色持久化）

### 安装命令

npm 安装（推荐，一条命令）：

```sh
dsh plugin --profile web add dsh-gui-customization
# 重启 dsh web，打开「设置 → 界面设定」开始配置
```

Release ZIP 安装：

```sh
# 1. 从 Releases 下载 dsh-gui-customization-v*.zip 并解压
dsh plugin --profile web add link:<解压目录>/dsh-gui-customization-v0.5.0
# 重启 dsh web
```

从源码构建安装（开发者）：

```sh
pnpm install && pnpm build          # 产出 packages/dsh-gui-customization/lib/
dsh plugin --profile web add link:<仓库>/packages/dsh-gui-customization
```

### 配置项

| 来源 | 字段 |
|---|---|
| 「设置 → 界面设定」UI | 预设配色（系统默认 / Nous 蓝 / 靛紫 / 翡翠绿）、13 个主题色字段（取色器 + 文本）、氛围光（开关/强度/呼吸幅度/位置 5 模式）、背景图（选图片文件 / 预设「deepseek娘01」/ 选视频文件 静音循环）、背景透明度滑块、侧边栏透明开关 |
| 导入/导出 | 配色方案 JSON（导出自动复制剪贴板；粘贴 JSON 导入即应用） |
| 持久化 | localStorage（配色）+ IndexedDB（背景图），刷新与重启 DSH 后完整恢复 |

### 典型用法示例

**UI 触发**：打开「设置 → 界面设定」——点预设一键换肤 → 取色器微调 13 色字段 → 点「应用配色」生效 → 上传/选择背景图、拖动透明度滑块、切换侧边栏透明 → 氛围光开启并实时调节强度/呼吸/位置。

**配色迁移**：导出配色 JSON（自动进剪贴板）→ 在另一台机器粘贴 JSON 导入即应用。

### 重启生效说明

!!! tip "配色与背景跨重启保留"
    配色存 localStorage、背景图存 IndexedDB，刷新页面与重启 DSH 后完整恢复；变更设置实时生效，无需保存。环境变量与 dsh 升级需重启。出处：README「成品展示」「配置指南」、packages/dsh-gui-customization/README.md「功能」。

---

## 2. 弊端与缺陷

!!! warning "背景图与视频持久化依赖浏览器存储"
    背景图与视频持久化依赖浏览器 IndexedDB；浏览器存储被清空或换浏览器会丢失背景图（配色 JSON 可经导出/导入迁移）。出处：README「成品展示」、PLUGIN.md 已知限制。

!!! warning "build/ 下 tsdown preset 源自 dsh-web-ui（BSD-3-Clause）"
    仓库内 `build/` 下的 tsdown 构建 preset 源自 dsh-web-ui（BSD-3-Clause，© zhu1090093659），许可声明保留在各文件头部——二次分发需保留该声明。出处：README「License」。

!!! warning "背景图内容区布局重做方案首版已回退"
    规划项 P1「背景图内容区布局重做」首版实验（图宽放大 + 左偏移）能随侧边栏移动但右侧未对齐（右缘溢出被裁），已回退；正确方案待改为独立背景层元素。出处：packages/dsh-gui-customization/README.md「规划（待办）」。

!!! warning "开发轨动态版已退役，仅组合插件形态在维护"
    开发轨 `plugins/gui-customization/`（动态版，guic-3，v1–v7 迭代）已退役，正式形态为 `packages/dsh-gui-customization/` 组合插件；仍在用动态版的用户需迁移。出处：packages/dsh-gui-customization/README.md 顶部说明。

!!! warning "明暗分离编辑尚未实现"
    当前 dark 模式自动配套 light 配色，规划项 P2「明暗分离编辑」（light/dark 各 13 色独立编辑）尚未实现。出处：packages/dsh-gui-customization/README.md「规划（待办）」。

---

## 3. 后续拓展思路

### 可二次开发的方向

- **独立背景层元素方案落地**：按规划 P1 用 fixed div（`left: var(--guic-bg-left); right: 0`，pointer-events none，DOM 在产品 `#root` 之前）做 cover，配合 dock 哨兵 + rAF 测量，解决右缘裁切问题，使背景图随侧边栏收缩自然右对齐。
- **明暗分离编辑**：落地规划 P2，light/dark 各 13 色独立编辑，避免深色模式只能自动配套。
- **配色分享社区**：基于导出 JSON 能力，搭建配色方案分享站，用户粘贴 JSON 即可应用他人配色。

### 可对接的 DSH 能力

- **settings 插槽**：插件已用 `settings.section` / `settings.plugin.item` / `shell.overlay` 三槽位注册；后续可扩展更多设置行（如氛围光预设库、背景图历史）。
- **i18n**：插件已实现中英双语随 DSH 语言设置即时切换，可作为多语言插件样例供其它插件参考。
- **self-modification**：配色 JSON 的导入/导出可作为 self-modification 产物样例——Agent 自主生成配色方案 JSON 并写入用户配置。

### 与其它插件组合的可能性

- **dsh-gui-customization + deepseek-harness-themes**：本插件侧重"氛围光 + 动态背景 + 自定义色板"，deepseek-harness-themes 侧重"成套主题预设 + 主题选择行"；二者可互补——前者提供氛围层与背景，后者提供主题色基座。
- **dsh-gui-customization + dsh-ui-appearance**：本插件用 IndexedDB 存背景图，dsh-ui-appearance 用 localStorage 存压缩 data URL；可统一二者的持久化策略与遮罩/模糊能力，避免叠加冲突。
- **dsh-gui-customization + dsh-web-ui 皮肤中心**：本插件的"预设配色 + 导入/导出 JSON"机制可沉淀为 dsh-web-ui 皮肤包的子集，复用其皮肤试穿/应用流程。
