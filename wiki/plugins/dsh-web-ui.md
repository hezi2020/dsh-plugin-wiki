# dsh-web-ui

> **插件名**：dsh-web-ui（DSH Web UI 插件与皮肤集合）
> **来源仓库**：<https://github.com/zhu1090093659/dsh-web-ui>
> **许可证**：BSD-3-Clause（作者 zhu1090093659 个人开发）
> **commit SHA**：未收集（本目录因网络克隆失败无源码，文档基于仓库 README 编写）

dsh-web-ui 是 DeepSeek Harness（DSH）Web UI 的插件与皮肤集合：任务看板、Git 图谱、右侧面板、移动端远程、远程连接、鲸鱼娘宠物、实时令牌统计，以及皮肤中心。所有插件既可独立安装，也可通过聚合包 `dsh-web-ui-all` 一次装齐。

!!! tip "文档来源说明"
    本插件目录因网络克隆失败仅含 PLUGIN.md 元数据缺失，文档基于 `raw.githubusercontent.com/zhu1090093659/dsh-web-ui/main/README.md` 真实内容编写，未编造功能。

---

## 1. 使用指南

### 前置依赖

- Node.js `>= 22`
- pnpm（用于 `pnpm install` 与 `pnpm -r build`）
- 已安装 DSH（`dsh web` 可运行）
- 远程连接（SSH）功能：主机支持密钥 / 密码认证，可从 `~/.ssh/config` 一键导入
- 移动端公网配对（可选）：cloudflared 隧道

### 安装命令

!!! warning "插件包尚未发布到 npm"
    README 明确说明"插件包目前尚未发布到 npm，请克隆仓库后安装"。当前推荐从 GitHub 仓库安装。

**方式一：从 GitHub 仓库安装（当前推荐）**

```sh
# 1. 克隆仓库
git clone https://github.com/zhu1090093659/dsh-web-ui.git
cd dsh-web-ui
# 2. 安装依赖并构建（需要 Node.js >= 22 与 pnpm）
pnpm install
pnpm -r build
# 3. 把聚合包装进 web profile（link: 指向仓库内的聚合包目录）
dsh plugin --profile web add link:$(pwd)/packages/dsh-web-ui-all
# 4. 重启 dsh web，侧边栏即可看到全部插件入口
dsh web
```

只想用皮肤时，把第 3 步的 `packages/dsh-web-ui-all` 换成 `packages/dsh-skins`。

**方式二：从 npm 安装（发布后可用）**

```sh
dsh plugin --profile web add @deepseek-ai/dsh-web-ui-all
```

**单独安装某个插件**（发布前用 `link:<仓库路径>/packages/<目录>`）：

```sh
dsh plugin --profile web add @deepseek-ai/dsh-client-ui-task-board   # 任务看板
dsh plugin --profile web add @deepseek-ai/dsh-ssh                    # 远程连接（SSH）
dsh plugin --profile web add @deepseek-ai/dsh-pet                    # 鲸鱼娘宠物
```

### 配置项

全部插件的开关与参数统一收纳于「设置 > 插件配置」，修改即时生效。SSH 主机配置统一存于 `~/.dsh/dsh-ssh.json`。

### 典型用法示例

**自然语言触发**：本插件集合以 UI 交互为主，自然语言触发主要面向 SSH 远程连接的 Agent 直连——对话中直接说：

```text
连一下 xxx 主机看看状态
```

Agent 与面板共享同一份主机配置，即可由智能体执行远程命令。

**命令行 / UI 触发**：

- 任务看板：侧边栏点击「任务看板」，点击卡片「执行」由真实 DSH 智能体会话执行；详情中配置 cron 表达式（如每天 23:00 自动升级 DSH、每周一 09:00 生成周报）实现定时执行。
- Git 图谱：输入框上方分支选择器切换分支与查看提交历史。
- 右侧面板：项目会话打开时自动出现「预览」与「文件/变更」面板，支持文件树、多标签预览（markdown/HTML/代码/diff/CSV/PDF/Office/图片）、真实 git 变更面板。
- 鲸鱼娘宠物：常驻界面，跟随智能体状态切换动画，点击可互动、投喂小鱼干提升亲密度。
- 实时令牌统计：输入框下方实时显示 TPS、LLM 耗时、上下文占用、缓存命中率、输入/输出 token 数。
- 移动端远程：侧边栏底部手机图标扫码配对，手机进入独立移动端界面远程控制当前 dsh web 工作区。
- 远程连接：侧边栏「SSH」入口打开远程运维面板，支持 Web 终端、SFTP 文件传输、端口转发、集群执行。

### 重启生效说明

!!! tip "安装后必须重启"
    安装成功后重启 `dsh web`，侧边栏出现对应入口即生效；也可用 `dsh --profile web --dump-config` 确认插件配置层已挂载。若侧边栏没有新入口，多半是安装后没有重启 `dsh web`。

---

## 2. 弊端与缺陷

!!! warning "插件包尚未发布到 npm，必须克隆构建"
    README「安装」章节明确说明"插件包目前尚未发布到 npm，请克隆仓库后安装"，需 `git clone` + `pnpm install` + `pnpm -r build` + `link:` 安装，门槛高于 npm 一行命令。出处：README「安装 / 方式一」。

!!! warning "移动端公网配对依赖 cloudflared 临时隧道"
    移动端远程配对二维码默认走局域网；公网配对需开启 cloudflared 隧道，额外依赖与配置。出处：README「移动端远程」章节。

!!! warning "SSH 端口转发仅监听 127.0.0.1"
    远程连接的端口转发仅监听 127.0.0.1，只能本机访问远程内网服务，无法直接共享给局域网其他设备。出处：README「远程连接」章节。

!!! warning "聚合包与单包混用风险"
    聚合包 `dsh-web-ui-all` 与单独插件包（如 `dsh-ssh`、`dsh-pet`）功能重叠，同时安装可能导致重复挂载或入口冲突；README 未明确说明混用策略。出处：README「安装 / 单独安装某个插件」。

!!! warning "皮肤试穿与正式应用机制"
    皮肤中心支持先试穿再应用，试穿即时生效、退出完全还原；但若误点"应用"则需手动切换还原，无自动回滚时机。出处：README「皮肤」章节。

!!! warning "DSH 主线 developer preview 期兼容性"
    插件依赖 DSH web profile 机制，DSH 主线仍在 developer preview 期，后续版本 profile 挂载机制或 client bundle 约定变化时可能需要作者跟进适配。出处：README「来源与版权」隐含的 DSH 依赖。

---

## 3. 后续拓展思路

### 可二次开发的方向

- **任务看板 + cron 调度器增强**：当前任务看板支持 cron 定时执行，可扩展为带依赖关系的任务编排（前置任务完成才触发后置），并引入失败重试与通知钩子。
- **Git 图谱交互深化**：在分支泳道与提交历史可视化基础上，增加提交 diff 内联预览、按作者/时间筛选、PR 关联跳转。
- **皮肤主题市场**：7 款皮肤可扩展为社区主题市场，支持用户上传/分享皮肤包，并引入主题与季节/时段自动切换。

### 可对接的 DSH 能力

- **subagent**：任务看板的"执行"由真实 DSH 智能体会话执行，可对接 subagent 拓扑，把每个看板任务绑定一个子代理会话，实现任务-代理双向追踪。
- **workflow**：cron 定时执行可对接 workflow 引擎，把"每天 23:00 自动升级 DSH"等场景固化为可复用 workflow。
- **hooks**：任务状态回写、SSH 集群执行结果可经 hooks 触发外部通知（Webhook、IM）。
- **skill**：SSH Agent 直连能力可封装为 Skill，让"连一下 xxx 看看状态"成为可复用的运维 Skill。

### 与其它插件组合的可能性

- **dsh-web-ui + dsh-better-sidebar**：web-ui 的右侧面板（文件树/预览/变更）与 better-sidebar 的 VSCode 风格侧边栏功能重叠，二者择一或分工（web-ui 主看板/皮肤/移动端，better-sidebar 主编辑/终端/Git）。
- **dsh-web-ui 任务看板 + dsh-agent-teams**：把团队任务栈与看板五列状态打通，团队产出回写看板，看板"执行"触发新建团队。
- **dsh-web-ui SSH + dsh-vision-toolkit**：远程主机上的 UI 截图经 SSH 拉回本地后，用 `vision_html_screenshot` + `vision_pixel_diff` 做远程 UI 回归。
