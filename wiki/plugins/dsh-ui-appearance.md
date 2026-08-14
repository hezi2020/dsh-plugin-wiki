# dsh-ui-appearance

> **插件名**：dsh-ui-appearance（@deepseek-ai/dsh-client-ui-appearance）
> **来源仓库**：<https://github.com/TQSY114514/dsh-ui-appearance>
> **许可证**：MIT（Copyright (c) 2026 DeepSeek Harness contributors）
> **commit SHA**：`4d1c962`（前 7 位）

为 DeepSeek Harness WebUI 提供个性化外观系统：主题调色盘、自定义背景图片、背景透明度/模糊、UI 面板透明度与毛玻璃效果。所有修改实时预览、持久保存，禁用插件后界面完整恢复默认。零核心代码改动：完全通过 Harness 官方插件机制（`ctx.theme.overrideTokens()` 主题扩展点 + `settings.general.item` 插槽）实现。

---

## 1. 使用指南

### 前置依赖

- DeepSeek Harness WebUI
- Node.js `>= 18`
- 包根即插件包：自带 `cordis.patch.yml`（声明于 `dsh.bundle.patch`）与自包含独立构建（`prepare` + `tsdown.standalone.config.ts`）
- `@deepseek-ai/*` 全部为 optional peer，运行期由宿主提供；唯一运行时依赖 `clsx`

### 安装命令

插件安装（推荐终端用户，无需改动仓库）：

```sh
git clone https://github.com/TQSY114514/dsh-ui-appearance.git
dsh plugin --profile <name> add file:<克隆路径>
```

`dsh plugin add` 把插件加入 profile 的 bundle 层叠（`dsh.profile.bundles`），浏览器插件名单与 Host 装载列表随之生效。卸载：

```sh
dsh plugin --profile <name> remove @deepseek-ai/dsh-client-ui-appearance
```

修改插件后需要重新构建 `lib/` 再重启 dsh web：

```sh
pnpm install && pnpm prepare
```

### 配置项

| 来源 | 字段 |
|---|---|
| 「设置 → 通用 → 个性化外观」行 | 预设主题（默认 / 午夜 / 海洋 / 森林 / 玫瑰 / 单色）、8 个颜色角色（主色/背景色/面板色/输入框色/文字色/边框色/用户气泡/AI 气泡，取色器 + HEX 输入）、背景图片（点击或拖拽上传 JPG/PNG/WebP，自动压缩：最长边阶梯 1920/1280/960px、WebP/JPEG 质量阶梯、存储预算 2MB、输入上限 5MB）、背景透明度 0–100%、背景模糊 0–30px、背景遮罩 0–100%、界面透明度 0–100%、毛玻璃强度 0–20px |
| 持久化 | 浏览器 localStorage 键 `dsh-ui-appearance.settings`；多标签页通过 `storage` 事件同步；图片以压缩后 data URL 存储 |

### 典型用法示例

1. 打开 WebUI → 侧栏「设置」→「通用」。
2. 「外观」（浅色/深色/跟随系统）下方即是「个性化外观」行，点击展开。
3. 点预设快速换肤 → 取色器/HEX 微调每个颜色角色 → 上传或拖入背景图片 → 拖动透明度/模糊滑块。
4. 所有修改**实时生效**，无需刷新、无需保存。

### 重启生效说明

!!! tip "设置实时生效，禁用插件即恢复默认"
    所有修改实时生效无需保存；设置持久化在浏览器 localStorage，重启/刷新后保留。从 profile 移除插件后界面即恢复默认；插件卸载时也会自动回收所有覆写 token、样式表与图层。修改插件代码后需 `pnpm install && pnpm prepare` 重新构建 `lib/` 再重启 dsh web。出处：README「使用」「持久化与恢复」「安装」。

---

## 2. 弊端与缺陷

!!! warning "设置跟随浏览器，换浏览器或清站点数据会丢失"
    设置持久化在浏览器 localStorage（harness 的 settings 网关只对硬编码的产品命名空间开放浏览器写入，第三方命名空间会被 `settings-not-exposed` 拒绝）——换浏览器或清除站点数据会丢失。出处：README「持久化与恢复」「工作原理」。

!!! warning "背景图受 localStorage 配额约束，超限时不持久化"
    图片以压缩后的 data URL 存储，受 localStorage 配额约束；超限时本次会话仍生效，但不持久化。出处：README「持久化与恢复」。

!!! warning "深色壁纸自动协调依赖采样阈值，极端壁纸可能不准"
    深色壁纸自动协调（采样亮度 <35% 时表面抬亮、文字翻亮、按钮跟随变暗）依赖采样阈值，极端壁纸（如局部高亮/低对比）可能协调不准。出处：README「功能」「兼容性」。

!!! warning "tests/ 依赖 harness 工作区测试运行时，独立仓库不跑测试"
    `tests/` 依赖 harness 工作区的测试运行时，独立仓库不跑测试；二次开发者需在 harness monorepo 内接线才能跑测试。出处：README「安装」、package.json `scripts`。

---

## 3. 后续拓展思路

### 可二次开发的方向

- **明暗分离 + 配色导入/导出**：当前每个颜色角色单值双模式共用，派生色按当前模式自动推导；可扩展为 light/dark 独立编辑 + 配色 JSON 导入/导出，对标 dsh-gui-customization。
- **氛围光层**：当前无角落光晕/呼吸动画；可加独立氛围层，随主题主色联动，对标 dsh-gui-customization 的氛围光。
- **视频背景**：当前仅图片背景；可扩展静音循环视频背景，对标 dsh-gui-customization。

### 可对接的 DSH 能力

- **`ctx.theme.overrideTokens()`**：已用此覆写 `--dsw-alias-*` 语义 token；后续可扩展更多 token 覆盖（如代码块、工具调用、终端 UI）。
- **`settings.general.item` 插槽**：已用此注册设置行；可作为第三方设置行样例供其它插件参考。
- **self-modification**：背景图压缩 + 深色协调逻辑可作为 self-modification 产物样例——Agent 自主上传壁纸并生成协调配色。

### 与其它插件组合的可能性

- **dsh-ui-appearance + dsh-gui-customization**：前者用官方 token 覆写（不依赖选择器），后者用氛围层 + 视频；二者叠加可得到"语义 token + 氛围光 + 视频"组合，但需注意二者都覆写 token 可能冲突，建议按区块分工。
- **dsh-ui-appearance + deepseek-harness-themes**：前者提供背景图/透明度/模糊，后者提供成套主题色基座；二者互补——前者做"壁纸 + 玻璃效果"，后者做"主题切换"。
- **dsh-ui-appearance + dsh-ui-beautify**：前者官方 token 覆写更稳健（不随 DSH 版本漂移），后者选择器覆盖更轻量；可让前者作为主力，后者作为"快速预设"补充。
