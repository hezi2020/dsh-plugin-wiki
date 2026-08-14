# dsh-github-login

> **插件名**：dsh-github-login（DSH GitHub Login，独立的 GitHub 可视化登录插件）
> **来源仓库**：<https://github.com/Noob-stupid/dsh-github-login>
> **许可证**：未声明（GitHub 仓库未提供 LICENSE 文件）；`package.json` 与 README 自声明为 MIT
> **commit SHA**：`d9f5de7`（前 7 位 `d9f5de7`）

一个零终端的 GitHub 登录小工具：打开窗口 → 生成设备码 → 授权 → 完成。**设备码流程在窗口内（Chromium 网络栈）执行**，与你的浏览器共用同一网络通道——浏览器能打开 GitHub，这里就能完成登录，不受终端/代理配置差异影响。授权成功后令牌写入 `~/.dsh/github-auth.json` 并同步进 gh CLI 的 `~/.config/gh/hosts.yml`，gh 命令行立即可用。

---

## 1. 使用指南

### 前置依赖

- Node.js（运行 `npm install` 与 `npm start` 所需；Electron 33 自带 Node 运行时）
- Electron `^33.2.0`（devDependency，`.npmrc` 已配置国内镜像）
- electron-builder `^25.1.8`（仅打包 `npm run dist` 时需要）
- 复用 GitHub CLI 的公开 OAuth client_id（`178c6fc778ccc68e1d6a`），权限范围 `repo workflow gist read:org`
- 可选：gh CLI（用于校验登录状态 `gh auth status`；本工具会写入 `~/.config/gh/hosts.yml`，但不强依赖 gh 已安装）

### 安装命令

本仓库为独立 Electron 应用，非标准 DSH 插件 bundle，无 `dsh plugin add` 形式的安装命令：

```sh
git clone https://github.com/Noob-stupid/dsh-github-login.git
cd dsh-github-login
npm install        # 安装 electron（已配置国内镜像 .npmrc）
npm start          # 直接运行
# 可选：打包为便携版单文件 exe
npm run dist       # 产物：dist/DSH-GitHub-Login.exe
```

集成到其他应用（如桌面客户端）——把它当作一个独立进程调用即可，登录状态通过同一份文件（`~/.dsh/github-auth.json`）共享（来源：README「集成到其他应用」）：

```js
spawn('<path>/DSH-GitHub-Login.exe', [], { windowsHide: false })
// 之后用 `gh auth status` 或直接读取 ~/.dsh/github-auth.json 验证登录状态
```

### 配置项

| 来源 | 字段 |
|---|---|
| 环境变量 | `DSH_HOME`（决定 `github-auth.json` 落盘目录，默认 `~/.dsh`） |
| OAuth 参数（写死在 `renderer/github-login.html`） | `CLIENT_ID=178c6fc778ccc68e1d6a`（GitHub CLI 公开 client_id）、`SCOPES='repo workflow gist read:org'` |
| 令牌文件 `~/.dsh/github-auth.json` | `login`、`token`、`scopes`、`savedAt`（程序写入，无需手改） |
| gh CLI 配置 `~/.config/gh/hosts.yml` | `github.com` 段下的 `oauth_token`、`user`、`git_protocol`（程序行级合并写入） |

无运行时配置文件，所有行为由源码常量决定。

### 典型用法示例

**图形界面操作流程**（来源：README「功能」「原理」）：

1. 启动后窗口自动打开，点「登录 GitHub」生成设备码（`user_code` + `device_code`）。
2. 点「在窗口内授权」打开内嵌 `<webview>` 授权页（带前进/后退/刷新），或点「改用外部浏览器」用系统浏览器打开。
3. 在授权页输入 `user_code`（已自动复制到剪贴板）完成授权。
4. 程序按 GitHub 给出的 `interval` 轮询 `access_token` 接口；网络抖动不中断（验证码 15 分钟有效期）。
5. 拿到 `access_token` → 主进程落盘 + 写入 gh 配置 → 状态页显示「登录成功：<账号>」。

**托盘常驻**：

- 关闭窗口后程序保持托盘常驻，登录状态随时可查。
- 托盘菜单 `GitHub: <账号> (click to log out)` 一键登出；`Quit` 才完全退出。

**与 dsh-plugin-hub 配套**（来源：README「与 dsh-plugin-hub 配套」）：

[dsh-plugin-hub](https://github.com/Noob-stupid/dsh-plugin-hub)（插件管理面板）会读取本工具写入的同一份令牌文件：登录后面板的 GitHub 市场显示"已登录 GitHub：<账号>"，且服务端回退通道自动带认证（搜索配额 10 → 30 次/分钟）。

### 重启生效说明

!!! tip "授权后无需重启 dsh 即可使用 gh"
    授权成功后令牌立即写入 `~/.dsh/github-auth.json` 与 `~/.config/gh/hosts.yml`，gh CLI 立即可用，无需重启。来源：README「功能」。

!!! tip "用户名显示 unknown 时重启程序重试"
    授权已成功、令牌已保存，只是 `/user` 接口查询 login 失败时会显示 `unknown`；重启程序后状态页会重试。来源：README「帮助」。

---

## 2. 弊端与缺陷

!!! warning "仅 Windows x64 便携版打包"
    `package.json` 的 `build.win.target` 仅声明 `portable` + `arch: x64`，未提供 macOS / Linux 打包配置；其他平台需自行 `npm start` 运行或修改打包配置。出处：`package.json` `build` 段。

!!! warning "OAuth client_id 与权限范围写死，无法自定义"
    使用 GitHub CLI 的公开 OAuth client_id（`178c6fc778ccc68e1d6a`）与固定 scopes `repo workflow gist read:org`，无法自定义 OAuth App 或权限范围；如需更细粒度权限需修改源码常量。出处：README「功能」、`renderer/github-login.html` `CLIENT_ID` / `SCOPES` 常量。

!!! warning "用户名查询是尽力而为，失败时显示 unknown"
    授权成功即完成，但 `/user` 接口查询 login 失败时会显示 `unknown`；需重启程序后状态页重试。出处：README「帮助」、`renderer/github-login.html` pollOnce 注释。

!!! warning "gh CLI keyring 优先于 hosts.yml"
    若系统 keyring 里有旧 gh 凭证，gh 会优先用 keyring 而非本工具写入的 `hosts.yml`，导致 `gh auth status` 仍显示未登录或显示旧账号；需先 `gh auth logout` 清掉旧凭证。出处：README「帮助」。

!!! warning "关闭 webSecurity 折衷同源校验"
    BrowserWindow 配置 `webSecurity: false` 以让设备码流程直接走 Chromium 网络栈（与用户浏览器同通道），CSP 限定 `default-src 'self' https://github.com https://api.github.com`；这是必要的折衷但放宽了同源校验，理论上扩大了页面可访问的资源范围。出处：`main.js` createWindow 注释。

!!! warning "无 LICENSE 文件，许可证状态不明"
    仓库内未提供 LICENSE 文件，GitHub 仓库级别未声明许可证；虽然 `package.json` 与 README 末尾自声明为 MIT，但缺少 LICENSE 文件在法律意义上不构成完整授权。商业使用前需联系作者确认。出处：仓库根目录文件列表、`package.json` `license` 字段、README「License」。

!!! warning "非标准 DSH 插件 bundle，无 dsh plugin add 形式"
    本仓库为独立 Electron 应用，非标准 DSH 插件 bundle，无 `dsh plugin add` 形式的安装命令；与 dsh 生态的集成仅通过令牌文件 `~/.dsh/github-auth.json` 共享登录状态。出处：README「集成到其他应用」、`package.json`（无 `dshx` / `dsh.plugin.json` 字段）。

---

## 3. 后续拓展思路

### 可二次开发的方向

- **跨平台打包**：当前 `package.json` 仅声明 Windows x64 portable；可补充 macOS（dmg）与 Linux（AppImage / deb）target，复用同一份 main.js / preload.js / renderer 代码。
- **OAuth App 可配置化**：把写死的 `CLIENT_ID` 与 `SCOPES` 提取为运行时配置（环境变量或 config 文件），支持自定义 OAuth App 与最小权限原则。
- **多账号管理**：当前令牌文件只保存单一账号；可扩展为多账号切换（每个账号独立 `github-auth.json` 段或文件），托盘菜单列出账号列表。
- **令牌刷新与过期检测**：GitHub OAuth token 默认不过期，但 GitHub 已支持 token 过期配置；可加入过期检测与刷新流程。

### 可对接的 DSH 能力

- **令牌文件共享**：本工具是 DSH 生态的"登录态提供者"，任何 DSH 工具（如 dsh-plugin-hub）都可通过读取 `~/.dsh/github-auth.json` 复用登录态，无需各自实现 OAuth。
- **gh CLI 同步**：写入 `~/.config/gh/hosts.yml` 后，dsh Agent 可直接调用 `gh` 命令（如 `gh repo list`、`gh api`）操作 GitHub，无需额外传 token。
- **桌面客户端集成**：可作为桌面客户端的子进程启动（`spawn` 形式），在客户端首次启动时引导用户登录 GitHub。

### 与其它插件组合的可能性

- **dsh-github-login + dsh-plugin-hub**：README 明确提到 dsh-plugin-hub 会读取本工具写入的同一份令牌文件，登录后面板的 GitHub 市场显示"已登录 GitHub：<账号>"，且服务端回退通道自动带认证（搜索配额 10 → 30 次/分钟）。这是已设计的配套关系。
- **dsh-github-login + dsh-group-photo**：dsh-group-photo 需要 GitHub OAuth 登录入镜，可复用本工具的登录态（`~/.dsh/github-auth.json`）避免重复 OAuth，但需注意 dsh-group-photo 用的是独立 OAuth App（回调地址 `http://localhost:8808/auth/callback`），与本工具的 device flow 不同——需做适配。
- **dsh-github-login + 任何调用 gh CLI 的插件**：本工具写入 `hosts.yml` 后，任何依赖 `gh` 命令的插件（如代码搜索、仓库管理、issue 管理）都可直接复用登录态。
