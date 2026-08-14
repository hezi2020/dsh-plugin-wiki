# dsh-ui-beautify

> **插件名**：dsh-ui-beautify
> **来源仓库**：<https://github.com/Zalpha263/dsh-ui-beautify>
> **许可证**：MIT（Copyright (c) 2026 dsh-ui-beautify contributors）
> **commit SHA**：`57ea5fb`（前 7 位）

DeepSeek Harness（DSH）Web UI 外观美化插件（Client 端持久插件）。名字即功能：dsh（DeepSeek Harness）+ ui（界面）+ beautify（美化）。内置四种颜色主题（默认 / 深海蓝 / 暖沙 / 松石绿），可上传自定义整页背景图，全部可撤销，重启后自动恢复。

---

## 1. 使用指南

### 前置依赖

- DeepSeek Harness `0.1.0-rc.6`（部分 CSS 选择器针对该版本客户端产物，升级后需复核）
- 运行时 `@deepseek-ai/cordis` 由 DSH 提供，无需额外 npm 依赖

### 安装命令

> 重要：DSH 用两个不同的解析锚点加载插件包——宿主行导入从 profile 目录解析，client 半区扫描（`dsh-client-modules`）从 dsh 安装目录解析。本包需要两份副本（必须保持同步），缺一份都会导致加载失败。

找到两个目标目录：

```bash
# dsh 安装目录：全局 node_modules 下的 @deepseek-ai/dsh
npm root -g
# profile 目录：$DSH_HOME/profiles/web（Windows 默认 C:\Users\<你>\.dsh）
```

复制两份副本：

```powershell
# Windows（把 <…> 换成实际路径）
Copy-Item -Recurse -Force .\dsh-ui-beautify "<npmRoot>\@deepseek-ai\dsh\node_modules\dsh-ui-beautify"
Copy-Item -Recurse -Force .\dsh-ui-beautify "$env:USERPROFILE\.dsh\profiles\web\node_modules\dsh-ui-beautify"
```

在 profile 补丁里注册插件：编辑 `$DSH_HOME/profiles/web/cordis.patch.yml`，追加：

```yaml
- insert:
    - id: ui-beautify
      name: dsh-ui-beautify
```

重启 DSH（`dsh web`），打开「设置 → 外观美化」即可使用。

### 配置项

| 来源 | 字段 |
|---|---|
| 「设置 → 外观美化」UI | 配色预设（默认 / 深海蓝 / 暖沙 / 松石绿）、整页背景图（选择本地图片） |
| 持久化 | 配色预设与背景图保存在浏览器 localStorage；背景图以 data URL 存储，受配额限制（约 5MB），过大时自动降级 |

### 典型用法示例

**配色切换**：点「深海蓝 / 暖沙 / 松石绿」立即生效；点「默认」还原。

**背景图片**：点「选择图片」选本地图片 → 整个界面透出背景图（侧边栏与主区都显示，自带半透明可读遮罩）；「清除」还原。

**重置全部**：一键回到默认外观，并清除已保存的设置。

### 重启生效说明

!!! tip "设置自动记忆，重启后自动恢复"
    v1.1.0+ 配色预设与背景图保存在浏览器 localStorage，重启 DSH 后自动恢复。修改代码后需把 `lib/` 同步到两份副本并重启 DSH。出处：README「已知说明」「版本历史」。

---

## 2. 弊端与缺陷

!!! warning "需手动维护两份副本同步，安装门槛高"
    DSH 用两个不同的解析锚点加载插件包，本包需要两份副本（profile 目录 + dsh 安装目录），必须保持同步，缺一份都会导致加载失败（缺 profile 副本报 `Cannot find package`；缺 dsh 副本静默跳过不报错但设置里没有「外观美化」）。`dsh` 升级（重新 npm install）会清空其 node_modules，需重新复制。出处：README「安装」「排错」「已知说明」。

!!! warning "兼容性硬绑定 DSH 0.1.0-rc.6，大版本升级后需复核"
    消息气泡（`.gdEzaW_bubble`）、发送按钮（`.uV2eYG_primary`）、淡出层（`.qDHVXG_fade`）等选择器针对 DSH `0.1.0-rc.6` 的客户端产物；DSH 大版本升级后需复核（代码中已注释），否则样式可能失效。出处：README「已知说明」。

!!! warning "背景图受 localStorage 配额限制，大图会降级丢失"
    背景图以 data URL 存 localStorage，受浏览器存储配额限制（一般约 5MB）；图片过大时自动降级为「只记住配色、不记图片」（v1.1.2 起上传时自动压缩最长边 ≤2560px、JPEG 0.85，保存失败时输出控制台警告）。出处：README「已知说明」「版本历史 v1.1.2」。

!!! warning "配置项有限，无自定义取色器/氛围光/透明度"
    仅四套预设 + 背景图，无自定义取色器、无氛围光、无透明度/模糊调节；用户需要更深定制需改 `lib/client.js`（调色板在 `PRESETS` 常量里）。出处：README「功能」「开发 / 修改」。

!!! warning "背景图使用浏览器 objectURL，仅当前页面会话有效"
    背景图使用浏览器 objectURL，仅当前页面会话有效；换图/清除会释放旧图（持久化走的是 data URL，不是 objectURL）。出处：README「已知说明」。

---

## 3. 后续拓展思路

### 可二次开发的方向

- **改用官方 `dsh.bundle.patch` 形态发布**：当前需手动复制两份副本，可改为标准 bundle 插件（`cordis.patch.yml` + `dsh.bundle.patch`），用 `dsh plugin --profile web add` 一键安装，降低用户门槛。
- **取色器与自定义色板**：当前仅四套预设，可加 HEX 取色器让用户自定义主色/侧边栏/气泡色，对标 dsh-gui-customization 的 13 色字段。
- **背景图压缩参数可调**：当前硬编码最长边 ≤2560px、JPEG 0.85；可暴露质量/尺寸滑块，让用户在画质与配额间权衡。

### 可对接的 DSH 能力

- **`ctx.theme.overrideTokens()`**：当前用 CSS 选择器覆盖，可改为覆写 `--dsw-alias-*` 语义 token（对标 dsh-ui-appearance），避免选择器随 DSH 版本漂移失效。
- **`settings.general.item` 插槽**：用官方设置行替代手写设置页，降低维护成本。
- **hooks**：背景图切换可经 hooks 触发外部动作（如截图归档、配色自动适配壁纸主色）。

### 与其它插件组合的可能性

- **dsh-ui-beautify + dsh-gui-customization**：前者轻量（四预设 + 背景图），后者重量（13 色 + 氛围光 + 视频）；可让前者作为"快速换肤"，后者作为"深度定制"，按需启用。
- **dsh-ui-beautify + deepseek-harness-themes**：前者提供整页背景图，后者提供成套主题色基座；二者叠加可快速得到"主题色 + 壁纸"组合。
- **dsh-ui-beautify + dsh-web-ui 皮肤中心**：本插件的四套预设可沉淀为皮肤包子集，复用 dsh-web-ui 的皮肤试穿/应用机制。
