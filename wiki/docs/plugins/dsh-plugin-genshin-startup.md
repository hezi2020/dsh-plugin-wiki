# dsh-plugin-genshin-startup

> **插件名**：dsh-plugin-genshin-startup（原神启动视频插件）
> **来源仓库**：<https://github.com/allen546/dsh-plugin-genshin-startup>
> **许可证**：MIT License © 2026 Allen Sun（来源：README「License」章节、package.json `license` 字段；仓库根目录未见独立 LICENSE 文件）
> **commit SHA**：`c4a86d1`

启动 `dsh web` 时以自动全屏、居中不拉伸的方式播放原神启动（"原神，启动！"）开屏视频，周围黑边 / 柱边以纯白（`#ffffff`）填充，播放完毕平滑淡入主工作区。

---

## 1. 使用指南

### 前置依赖

- DeepSeek Harness（`dsh web` 可启动）
- 浏览器支持 HTML5 video 自动播放（受浏览器安全策略限制时显示交互式声音按钮）
- DSH Web profile（`$DSH_HOME/profiles/web`）

### 安装命令

```bash
dsh plugin --profile web add /path/to/dsh-plugin-genshin-startup
```

> 该命令将插件添加到 `$DSH_HOME/profiles/web` 并挂载 `cordis.patch.yml` 层。安装后运行 `dsh web`，打开 `http://127.0.0.1:3080` 即可自动播放原神启动动画。出处：README「How It Is Installed」章节。

启动 DSH：

```bash
npx @deepseek-ai/dsh web
# 或全局 dsh
dsh web
```

### 配置项

| 来源 | 字段 |
|---|---|
| `cordis.patch.yml` | DSH profile bundle patch layer（由 `dsh.bundle` 声明） |
| `dsh.client` | `platform: web`、`immediately: true`（启动即加载） |
| `assets/genshin-launch.mp4` | 快速启动优化视频资产 |
| `assets/genshin-launch.mov` | 原始高分辨率录制 |
| `assets/genshin-launch.css` | 全屏覆盖层样式（纯白填充 `#ffffff`） |

### 典型用法示例

1. 通过 `dsh plugin --profile web add` 安装插件。
2. 运行 `dsh web`，浏览器打开 `http://127.0.0.1:3080`。
3. 原神启动动画自动播放（自动全屏 + 居中不拉伸 + 纯白填充周围空白）。
4. 按 <kbd>Esc</kbd> / <kbd>Space</kbd> 或点击浮动 **Skip** 按钮随时跳过进入工作区。
5. 播放完毕平滑淡入主 Harness agent 工作区。

### 重启生效说明

!!! tip "安装后需重启 dsh web 才生效"
    通过 `dsh plugin add` 安装后需重启 `dsh web`，新插件才会在启动时加载。卸载插件需从 `dsh.profile.bundles` 移除条目并重启。

---

## 2. 弊端与缺陷

!!! warning "每次 dsh web 启动都会播放视频，无法通过配置关闭"
    每次 `dsh web` 启动都会播放视频，无法通过配置关闭（需卸载插件或移除 bundle 条目）。出处：PLUGIN.md 已知限制。

!!! warning "自动播放受浏览器安全策略限制"
    自动播放受浏览器安全策略限制：尝试无声播放，受限时显示交互式声音按钮。出处：PLUGIN.md 已知限制、README「Features」章节。

!!! warning "视频资产随包发布，占用存储空间"
    视频资产（`genshin-launch.mp4` / `genshin-launch.mov`）随包发布，占用存储空间。出处：PLUGIN.md 已知限制、README「Package Structure」章节。

!!! warning "仓库根目录未见独立 LICENSE 文件"
    仓库根目录未见独立 LICENSE 文件，许可证以 README 与 package.json 声明为准（均为 MIT © 2026 Allen Sun）。出处：PLUGIN.md 已知限制、README「License」章节、package.json `license` 字段。

---

## 3. 后续拓展思路

### 可二次开发的方向

- **可配置开关**：增加配置项 `genshin-startup.enabled` 或 `genshin-startup.skip-on-shift`（按 Shift 启动时跳过），避免每次启动都被打断。
- **多视频轮播 / 随机**：扩展为支持多视频轮播或随机选择，避免审美疲劳；可对接社区视频包。
- **自定义开屏**：开放 API 让用户上传自己的开屏视频 / 图片，复用同一套全屏覆盖 + 淡入机制。

### 可对接的 DSH 能力

- **skill**：可封装「跳过开屏」「切换开屏视频」为 DSH skill，由 agent 自然语言触发（"换个开屏视频"）。
- **hooks**：在开屏播放完成 / 被跳过事件上挂 hooks，触发自定义欢迎语或工作区主题切换。
- **self-modification**：本插件本身就是 dsh profile 的 self-modification 入口，可作为开屏主题包的范式样例。

### 与其它插件组合的可能性

- **dsh-plugin-genshin-startup + deepseek-harness-angelina-themes**：开屏视频播放完毕后平滑切换到 Angelina 主题，形成「开机仪式 + 主题加载」连贯体验。
- **dsh-plugin-genshin-startup + dsh-ui-beautify**：开屏淡入后由 ui-beautify 接管视觉精修，UI 风格统一过渡。
- **dsh-plugin-genshin-startup + dsh-home-ui**：开屏结束后进入 home-ui 的 PiUI 风格首页，仪式感拉满。
