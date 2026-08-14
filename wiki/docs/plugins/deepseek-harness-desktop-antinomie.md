# deepseek-harness-desktop (antinomie1)

> **插件名**：DeepSeek Harness Desktop（antinomie1 版，极简 Tauri 桌面壳）
> **来源仓库**：<https://github.com/antinomie1/deepseek-harness-desktop>
> **许可证**：MIT（dsh 本身亦为 MIT，由 DeepSeek 单独授权）
> **commit SHA**：`cd4b386`（前 7 位，来自任务清单；本地克隆失败未独立校验）

> ⚠️ 本地克隆失败（github.com 端口 443 连接超时），commit SHA 取自任务清单提供值，文档基于 GitHub 仓库网页 README 编写。

用 Tauri 包装 DeepSeek Harness（`dsh`）的桌面外壳：启动时准备好 dsh、在系统分配的回环端口上运行 `dsh web`、再把 webview 指过去。外壳本身不含 dsh 代码，dsh 仍是普通 npm 安装，可自行升级 / 锁版本或用 `dsh plugin add` 扩展。`DSH_HOME` 默认 `~/.dsh`，与命令行 dsh 共享配置、会话和插件。非官方项目，与 DeepSeek 无关。

---

## 1. 使用指南

### 前置依赖

#### 使用 Releases（已构建产物）
- minimal 构建：机器已有 Node.js 24+（首次启动时 npm 装 dsh）
- full 构建：开箱即用，无需联网（自带 Node、npm、编译好的 node-pty 和 dsh）
- Linux minimal 首次启动需现场编译 node-pty，需 Python + C++ 编译器；macOS / Windows 有官方预编译版
- Linux 还需系统已安装 `webkit2gtk-4.1` 和 `libayatana-appindicator3`

#### 从源码构建
- [Rust](https://rustup.rs/)
- [bun](https://bun.sh/)
- 平台对应的 [Tauri 依赖](https://tauri.app/start/prerequisites/)

### 安装命令

从 Releases 安装（提供 full 与 minimal 两种构建）：

| 构建 | 内容 | 适合 |
|---|---|---|
| **full** | 自带 Node、npm、编译好的 node-pty 和 dsh | 装好即用，无需联网 |
| **minimal** | 什么都不带 | 机器上已有 Node 24+，首次启动时用 npm 装 dsh |

平台与格式：
- Linux x86_64：`.tar.gz` 压缩包，解压后运行里面的 `./dsh-desktop`（无 deb / AppImage）
- Windows x64：`-setup.exe` 安装包，或便携版 zip
- macOS (Apple Silicon)：`.dmg`，或 `.app` 的 zip

从源码构建（minimal，Linux）：

```
bun install
bun run tauri build --no-bundle
```

full 构建：

```
./scripts/vendor.sh                       # 准备 node + npm + node-pty + dsh
bun run tauri build --config src-tauri/tauri.full.conf.json
./scripts/package.sh full                 # 产物落在 dist-release/
```

开发模式：

```
bun run tauri dev                         # 前端和插件由 bun run assets 自动构建
```

!!! warning "非标准 DSH 插件 bundle"
    本仓库为 Tauri 桌面壳，非标准 DSH 插件 bundle；不通过 `dsh plugin add` 安装。`DSH_HOME` 默认 `~/.dsh`，与命令行 dsh 共享 profiles / sessions / plugins。出处：README 顶部描述、「Install」段。

### 配置项

| 来源 | 字段 |
|---|---|
| dsh 设置页「桌面端」一节 | dsh 版本、`DSH_HOME`、绑定地址、绑定端口（经 dsh 插件系统注入，位于 `plugin/`，TypeScript 编写，使用 dsh 自己的组件与 `--dsw-*` 设计变量；下次启动生效） |

### 典型用法示例

- **桌面使用**：下载对应平台的安装包或便携版，安装后启动；外壳在回环端口运行 `dsh web` 并把 webview 指过去。
- **设置调整**：在 dsh 设置页的「桌面端」一节调整 dsh 版本 / `DSH_HOME` / 绑定地址与端口，下次启动生效。
- **插件扩展**：因 `DSH_HOME` 与命令行 dsh 共享，可继续用 `dsh plugin add` 扩展。

### 重启生效说明

!!! tip "设置项均下次启动生效"
    dsh 版本、`DSH_HOME`、绑定地址、绑定端口均「下次启动生效」，运行中无法即时切换。出处：README「Settings」段。

---

## 2. 弊端与缺陷

!!! warning "所有产物均未签名"
    所有平台产物（macOS dmg/app、Windows setup.exe/zip、Linux tar.gz）均未签名，首次启动可能被系统 Gatekeeper / SmartScreen 拦截，需用户手动放行。出处：README「Install」段。

!!! warning "Linux 需系统已安装 webkit2gtk-4.1 和 libayatana-appindicator3"
    Linux 上需要系统已有 `webkit2gtk-4.1` 和 `libayatana-appindicator3`，否则桌面壳无法启动。出处：README「Install」段最后一段。

!!! warning "Linux minimal 首次启动需现场编译 node-pty"
    Linux minimal 首次启动需现场编译 node-pty，需 Python + C++ 编译器；macOS / Windows 有官方预编译版，无需。full 在哪个平台都不需要。出处：README「Install」段。

!!! warning "设置项均下次启动生效"
    dsh 版本、`DSH_HOME`、绑定地址、绑定端口均「下次启动生效」，运行中无法即时切换。出处：README「Settings」段。

!!! warning "非官方项目，与 DeepSeek 无关"
    非官方项目，与 DeepSeek 无关；dsh 本身由 DeepSeek 单独授权。出处：README 顶部声明、「Licence」段。

---

## 3. 后续拓展思路

### 可二次开发的方向

- **签名与公证**：为 macOS / Windows 产物补签名与公证，缓解首次启动被拦截问题。
- **Linux 多格式分发**：在 tar.gz 之外补 deb / AppImage / rpm，覆盖更多 Linux 发行版。
- **桌面端设置项热生效**：把「下次启动生效」改为「运行中即时切换」（至少对 `DSH_HOME` 与绑定端口），降低配置成本。
- **node-pty 预编译扩展**：把 node-pty 的官方预编译覆盖到 Linux，消除 minimal 首次启动的现场编译依赖。

### 可对接的 DSH 能力

- **plugin**：`plugin/` 目录本身就是经 dsh 插件系统注入的「桌面端」设置页，是「桌面壳反哺 dsh 设置」的标准样例，可继续按此模式扩展桌面相关设置项。
- **skill**：可写一个 DSH Skill 让 Agent 自然语言切换桌面端绑定地址 / 端口，封装设置页写操作。
- **self-modification**：`DSH_HOME` 与命令行 dsh 共享意味着 dsh 自身的 self-modification 能力在桌面壳里同样可用，无任何额外适配。

### 与其它插件组合的可能性

- **deepseek-harness-desktop (antinomie1) + DeepSeekHarnessRemoteGateway**：桌面壳在回环端口运行 `dsh web`，正好是 RemoteGateway 期望的 `http://127.0.0.1:3080` 上游；两者天然搭配，桌面壳用户可一键启用远程网关。
- **deepseek-harness-desktop (antinomie1) + Dizzy-DSH**：因 `DSH_HOME` 与命令行 dsh 共享，可在桌面壳里直接 `dsh plugin --profile web add file:` 装 Dizzy-DSH，获得余额 / 用量 / 浏览器控制等多插件。
- **deepseek-harness-desktop (antinomie1) + dsh-net-proxy**：桌面壳用户在 dsh 设置页配置 dsh-net-proxy 代理，无需编辑 JSON，图形化体验更好。
