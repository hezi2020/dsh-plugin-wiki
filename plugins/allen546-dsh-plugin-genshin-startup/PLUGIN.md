# PLUGIN 元数据 — dsh-plugin-genshin-startup

## 插件名称
dsh-plugin-genshin-startup（原神启动视频插件）

## 来源仓库 URL
https://github.com/allen546/dsh-plugin-genshin-startup

## 克隆时的 commit SHA
c4a86d1（前 7 位）

## 功能描述（一句话）
启动 `dsh web` 时以自动全屏、居中不拉伸的方式播放原神启动（"原神，启动！"）开屏视频，周围黑边/柱边以纯白填充，播放完毕平滑淡入主工作区。

## 前置依赖
- DeepSeek Harness（`dsh web` 可启动）
- 浏览器支持 HTML5 video 自动播放（受浏览器安全策略限制时显示交互式声音按钮）
- DSH Web profile（`$DSH_HOME/profiles/web`）

## 安装命令
```bash
dsh plugin --profile web add /path/to/dsh-plugin-genshin-startup
```
> 该命令将插件添加到 `$DSH_HOME/profiles/web` 并挂载 `cordis.patch.yml` 层。安装后运行 `dsh web`，打开 `http://127.0.0.1:3080` 即可自动播放原神启动动画。

## 配置项
| 来源 | 字段 |
|---|---|
| cordis.patch.yml | DSH profile bundle patch layer（由 `dsh.bundle` 声明） |
| dsh.client | `platform: web`、`immediately: true`（启动即加载） |
| assets/genshin-launch.mp4 | 快速启动优化视频资产 |
| assets/genshin-launch.mov | 原始高分辨率录制 |
| assets/genshin-launch.css | 全屏覆盖层样式（纯白填充 `#ffffff`） |

## 已知限制
- 每次 `dsh web` 启动都会播放视频，无法通过配置关闭（需卸载插件或移除 bundle 条目）。
- 自动播放受浏览器安全策略限制：尝试无声播放，受限时显示交互式声音按钮。
- 视频资产（`genshin-launch.mp4` / `genshin-launch.mov`）随包发布，占用存储空间。
- 按 Esc / Space 或点击浮动 Skip 按钮可随时跳过进入工作区。
- 仓库根目录未见独立 LICENSE 文件，许可证以 README 与 package.json 声明为准。

## 本地运行状态
未实测安装（本任务仅克隆源码，未实际通过 dsh plugin add 加载或运行 dsh web）

## 许可证
MIT License © 2026 Allen Sun（来源：README「License」章节、package.json `license` 字段；仓库根目录未见独立 LICENSE 文件）
