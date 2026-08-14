# dsh-easyssh（chenw2759-wq monorepo）

> **插件名**：dsh-easyssh（DSH 远程 SSH 工作区插件，monorepo 含 `@deepseek-ai/dsh-ssh` 引擎包与 `dsh-easyssh` 本插件包）
> **来源仓库**：<https://github.com/chenw2759-wq/dsh-easyssh>
> **许可证**：BSD-3-Clause（远程实现 MIT 归 UynajGI/dsh-ssh 原作者，详见 NOTICE）
> **commit SHA**：`17685eedd341f95ee1638350eb48aa44a3aca8f6`（前 7 位 `17685ee`）

在 DeepSeek Harness（DSH）Web GUI 里一键进入 **SSH 远程工作区模式**：右上角（session log 左侧）配置 SSH 主机（密码 / 密钥，复用 `~/.dsh/dsh-ssh.json`），进入后右侧面板的文件树自动切换到远程服务器，**模型本机的 read / write / edit / glob / grep 与 bash / 终端在 SSH 模式下透明地在远程服务器执行**，LLM 与 Agent 循环仍在本机——「本地大脑、远程手脚」。

## 仓库结构

```
dsh-easyssh/
├── packages/
│   ├── dsh-ssh/        # SSH 引擎：ssh2 连接池、exec/PTY/SFTP/隧道/集群（本插件依赖）
│   └── dsh-easyssh/    # 本插件：模式状态机、接缝门面、远程实现、Web GUI 前端
└── README.md
```

> 右侧文件面板（文件树 / 预览 / 终端 / 右键菜单）由 [dsh-aionui-panel]（DSH Web GUI 右侧面板系统，与 dsh-easyssh 配套使用）提供；dsh-easyssh 通过 `sshWorkspaceMode` 跨插件服务驱动它跟随 SSH 模式。

---

## 1. 使用指南

### 前置依赖

- Node.js `^22.19.0 || >=24.0.0`
- pnpm `11.7.0`
- 已安装 dsh（`npx @deepseek-ai/dsh`）
- **配套插件 dsh-aionui-panel**（右侧面板系统，不在本仓库内，需另行安装）
- 系统层（SSH 模式远程端）：
  - GNU find / grep / coreutils（`-printf` / `-mz` / `base64 -w0`）
  - bash（SSH 模式下 `pwsh` 工具在 POSIX 远程主机上不可用）
- `dsh-easyssh` 包 peer 依赖（rc.6）：`@deepseek-ai/dsh-client-connection` / `dsh-client-locale` / `dsh-client-runtime` / `dsh-client-ui-settings` / `dsh-client-ui-sidebar` / `dsh-client-ui-slots`、`dsh-fs` / `dsh-fs-sandbox` / `dsh-host-webserver` / `dsh-subprocess` / `dsh-subprocess-local` / `dsh-system-prompt` / `dsh-timeout` / `dsh-tools`、`react@^18.2.0`、`react-dom@^18.2.0`
- `dsh-ssh` 包 peer 依赖（rc.6）：同上 client 命名空间 + `@deepseek-ai/dsh-settings`、`react@^18.2.0`、`react-dom@^18.2.0`
- `dsh-ssh` 包运行时依赖：`ssh2@^1.17.0`、`ws@^8.18.0`、`@xterm/xterm@^6.0.0`、`@xterm/addon-fit@^0.11.0`

### 安装命令

仓库为 pnpm monorepo（`private: true`，未发布到 npm），需从源码构建后装入 profile：

```sh
# 1) 克隆并构建
git clone https://github.com/chenw2759-wq/dsh-easyssh.git
cd dsh-easyssh
pnpm install
pnpm --filter "./packages/dsh-ssh" build
pnpm --filter "./packages/dsh-easyssh" build

# 2) 把两个包安装到 web profile（注意用你自己的绝对路径）
dsh plugin --profile web add file:C:/你的路径/dsh-easyssh/packages/dsh-ssh
dsh plugin --profile web add file:C:/你的路径/dsh-easyssh/packages/dsh-easyssh
```

#### ⚠️ 第 3 步：接缝切换补丁（关键，v2 必需）

打开 `<profile>/cordis.patch.yml`（Windows 默认 `C:\Users\<你>\.dsh\profiles\web\cordis.patch.yml`），写入：

```yaml
- id: fs-sandbox
  disabled: true
- id: subprocess
  disabled: true
- insert:
  - id: easyssh-fs
    name: 'dsh-easyssh/fs'
  - id: easyssh-subprocess
    name: 'dsh-easyssh/subprocess'
```

#### 第 4 步：重启 + 硬刷新

```sh
npx @deepseek-ai/dsh web
```

打开 `http://127.0.0.1:3080` → **Ctrl+F5 硬刷新**（浏览器缓存旧 client 包时必做）→ 右上角 SSH 按钮配置主机 → 进入 SSH 模式。

> 回滚 = 把 `cordis.patch.yml` 恢复为 `[]` 再重启。

### 配置项

| 来源 | 字段 |
|---|---|
| `dsh-easyssh` 的 `dsh.bundle` | `patch`（`./cordis.patch.yml`） |
| `dsh-easyssh` 的 `dsh.client` | `platform: web`、`inject`（`dsh-client-runtime` / `dsh-client-connection` / `dsh-client-ui-settings`） |
| `dsh-ssh` 的 `dsh.bundle` / `dsh.client` | 同上结构（两个包各自声明） |
| profile `cordis.patch.yml` | 禁用 `fs-sandbox` / `subprocess` 两行 + 插入 `easyssh-fs` / `easyssh-subprocess` 两行（v2 接缝切换必需） |
| `~/.dsh/dsh-ssh.json` | 主机配置（别名 / 主机 / 端口 / 用户名 / 密码或密钥含 passphrase / 远程根 / ProxyJump 跳板链）；文件权限 0600、目录 0700；原子写入 |
| `dsh-ssh` 设置面板 | `announceToAgent`（是否向 Agent 宣告插件）、`enabled`（总开关） |
| 运行时 SSH 模式 | 远程根 `remoteRoot`（默认 `~`，可在面板头部切换）；路径规则：远程绝对路径直接用，相对路径以 `remoteRoot` 为基准，禁用 `..` |

### 典型用法示例

**双轨架构**（`packages/dsh-easyssh/README.md`「双轨架构（v2 接缝级）」）：

1. **接缝切换（v2，默认路径）**：profile 补丁禁用部署自带的 `fs-sandbox` / `subprocess` 行，由本插件提供模式路由门面。本地模式门面委托给同样的沙箱化本地实现；SSH 模式委托给移植自 UynajGI/dsh-ssh 的远程实现。效果：模型本机的 read/write/edit/glob/grep 与 bash/终端在 SSH 模式下透明地在远程主机执行，无需提示词约定。
2. **显式工具（v1，保留）**：`remote_status` / `remote_ls` / `remote_read` / `remote_write` / `remote_mkdir` / `remote_rm` / `remote_rename` / `remote_glob` / `remote_grep` 与 `ssh_exec` / `ssh_upload` / `ssh_download` 仍可用作显式操作与一次性运维。

`dsh-ssh` 引擎包还提供 `ssh_list` / `ssh_exec` / `ssh_upload` / `ssh_download` / `ssh_tunnel` / `ssh_cluster` 六个 Agent 工具（GUI 与 Agent 共享同一份主机配置）。

**操作流程**（根 README「使用」）：

1. 会话右上角（session log 左侧）点击 **SSH** → 填主机（别名/主机/端口/用户名/密码或密钥/远程根）→ 保存并测试 → 进入 SSH 模式。
2. 右侧面板自动切换到远程文件树；直接对 Agent 说「读/改远程文件」「在服务器上执行命令」——普通工具即远程执行。
3. 路径规则：远程绝对路径直接用；相对路径以远程根 `remoteRoot`（默认 `~`）为基准；不要用 Windows 本机路径。
4. 右上角切换按钮随时回到本机模式。

**操作速览**（根 README「操作速览」）：

- **布局切换**：预览 tab 条右侧「⇊ / ⇉」按钮——下框展示 vs 右侧弹出代码框（右弹模式每行底色交替 + 行号）。
- **运行代码**：打开 `.py` / `.js` / `.sh` 等文件 → 工具栏「▶ 运行」，SSH 模式下在远程主机执行。
- **打开终端**：预览工具栏「>_ 终端」，或文件栏 tab 条「>_」按钮（不打开代码也能开命令行），可直接输入命令。
- **文件右键**：文件树节点右键 → 下载 / 重命名 / 复制 / 粘贴 / 删除（本地与远程一致）。

### 重启生效说明

!!! tip "安装后必须重启 dsh + Ctrl+F5 硬刷新"
    装完插件并写入接缝切换补丁后，重启 `npx @deepseek-ai/dsh web`，浏览器 **Ctrl+F5 硬刷新**（避免缓存旧 client 包），右上角 SSH 按钮才会出现。

!!! tip "回滚 = 把 cordis.patch.yml 恢复为 []"
    若想退出接缝切换模式，把 profile 的 `cordis.patch.yml` 恢复为 `[]` 并重启 dsh 即可；`~/.dsh/dsh-ssh.json` 主机配置保留不删。

!!! tip "路径规则：远程绝对路径直接用，相对路径以 remoteRoot 为基准"
    SSH 模式下不要用 Windows 本机路径；相对路径以远程根 `remoteRoot`（默认 `~`，可在面板头部切换）为基准，禁用 `..`。

---

## 2. 弊端与缺陷

!!! warning "包未发布到 npm，只能从源码构建"
    根 `package.json` 与两个子包均 `private: true`，未发布到 npm；只能 `git clone` + `pnpm install` + 双包构建后用 `dsh plugin add file:` 装入 profile。出处：根 `package.json`、子包 `package.json`。

!!! warning "需配套 dsh-aionui-panel（不在本仓库内）"
    右侧文件面板（文件树 / 预览 / 终端 / 右键菜单）由 dsh-aionui-panel 提供，不在本仓库内，需另行安装；不装则面板视觉不完整。出处：根 README「仓库结构」末尾说明、「安装」前置要求。

!!! warning "接缝切换补丁必须手动写入 profile cordis.patch.yml"
    v2 默认路径依赖禁用 `fs-sandbox` / `subprocess` + 插入两行 `easyssh-fs` / `easyssh-subprocess`；不写补丁则只有 `remote_*` 显式工具轨，接缝切换不生效，模型本机的 read/write/edit/glob/grep 与 bash/终端不会透明地远程执行。出处：根 README「第 3 步：接缝切换补丁（关键）」。

!!! warning "v1 模式状态为进程内单例，多标签页共享"
    v1 模式状态为进程内单例（多标签页共享）；P2 按 sessionId 隔离。多标签页同时操作不同主机时会冲突。出处：`packages/dsh-easyssh/README.md`「已知限制」。

!!! warning "预览仅文本/代码（80KB 上限），二进制与超大文件无法预览"
    预览仅文本/代码（80KB 上限）；二进制与超大文件请用 `ssh_exec` / `ssh_download`。出处：`packages/dsh-easyssh/README.md`「已知限制」。

!!! warning "远程 grep/glob/realpath 依赖 GNU find/grep/coreutils"
    远程 grep/glob/realpath 依赖 GNU find/grep/coreutils（`-printf` / `-mz` / `base64 -w0`）；限深 4~6 层、限 200 条。在非 GNU 环境（如 BusyBox）上行为不符。出处：`packages/dsh-easyssh/README.md`「已知限制」、根 README「安全」。

!!! warning "SSH 模式下 pwsh 工具在 POSIX 远程主机上不可用"
    SSH 模式下 `pwsh` 工具在 POSIX 远程主机上不可用；请用 bash 语义命令或 `ssh_exec`。出处：`packages/dsh-easyssh/README.md`「已知限制」。

!!! warning "SSH 模式下本机沙箱不对远程执行生效"
    SSH 模式下本机沙箱不对远程执行生效（远程进程无法被本地内核沙箱约束）；门面的 `sandboxMode` 在远程模式报告 `undefined`，工具层不再展示沙箱升级提示。用户需自行评估远程操作风险。出处：根 README「安全」、`packages/dsh-easyssh/README.md`「安全模型」。

!!! warning "上传远程目标路径必须是绝对路径，下载不支持整个目录"
    上传的远程目标路径必须是绝对路径（相对路径会被拒绝）；下载不支持整个目录（逐文件下载）；上传支持目录递归（walk 本地目录逐文件传）。出处：`packages/dsh-ssh/README.md`「已知限制」。

!!! warning "exec 断线重连可能重复执行非幂等命令"
    exec 断线自动重连（最多 3 次）可能重复执行非幂等命令——长命令注意副作用。出处：`packages/dsh-ssh/README.md`「已知限制」。

!!! warning "跳板机 ProxyJump 每一跳必须是本插件已配置的主机别名"
    跳板机 ProxyJump 的每一跳必须是本插件已配置的主机别名；不能直接用 `~/.ssh/config` 里的任意 host。出处：`packages/dsh-ssh/README.md`「已知限制」。

!!! warning "断点续传未实现"
    断点续传（resume）暂未实现；大文件传输中断后需重传。出处：`packages/dsh-ssh/README.md`「已知限制」。

!!! warning "密码/密钥口令明文保存在 ~/.dsh/dsh-ssh.json"
    密码/密钥口令以明文保存在 `~/.dsh/dsh-ssh.json`（文件权限 0600、目录 0700）；与 ssh-skill 同一信任模型。文件被读则凭据泄露。出处：`packages/dsh-ssh/README.md`「安全模型」。

!!! warning "ssh_upload/ssh_download 以宿主进程权限直接读写本机任意路径"
    `ssh_upload` / `ssh_download` 以宿主进程权限直接读写本机任意路径（不经 bash 沙箱）；与 ssh-skill 的宿主本地路径语义一致，注意该权限面。出处：`packages/dsh-ssh/README.md`「安全模型」。

!!! warning "exec/cluster 远程输出原样返回（不脱敏）"
    exec/cluster 的远程输出原样返回（不脱敏）；命令如 `env` 可能把远端环境中的密钥带回对话记录。出处：`packages/dsh-ssh/README.md`「安全模型」。

!!! warning "client 半区不能 import dsh-ssh 的任何值"
    `dsh-easyssh` 的 client 半区不 import dsh-ssh 的任何值（client bundle purity gate）；这是构建期约束，违反会导致 client bundle 不纯。出处：`packages/dsh-easyssh/README.md`「依赖」。

---

## 3. 后续拓展思路

### 可二次开发的方向

- **P2：按 sessionId 隔离模式状态**：当前 v1 模式状态为进程内单例（多标签页共享），P2 按 sessionId 隔离后可支持多标签页同时操作不同主机。
- **断点续传**：为大文件传输实现 resume，避免中断后重传。
- **下载整个目录**：当前下载仅逐文件，可扩展为目录递归下载（tar 流式打包）。
- **远程沙箱**：当前 SSH 模式下本机沙箱不对远程执行生效，可探索远程 nsjail / firejail / Docker 容器化执行，约束远程命令权限面。
- **输出脱敏**：exec/cluster 远程输出原样返回，可加脱敏层（如正则匹配密钥模式并 mask）。
- **多远端协同**：当前单主机模式，可扩展为多远端协同（如 A 主机读数据 + B 主机计算）。

### 可对接的 DSH 能力

- **接缝切换（fs / subprocess 模式路由门面）**：本插件是「通过 profile 补丁禁用部署自带服务 + 由插件提供门面」的范本，可作为其他需要按模式切换宿主服务的插件参考实现。
- **skill**：`dsh-ssh` 设置面板已有 `announceToAgent` 开关；可后续把「进入 SSH 模式」「切换主机」「执行远程命令」等封装为 Skill，由 Agent 自然语言触发。
- **hooks**：SSH 模式进入/退出事件可经 hooks 触发外部通知（如 IM 推送「已切换到生产主机」）；远程命令执行结果也可经 hooks 落审计日志。
- **self-modification**：`cordis.patch.yml` 的接缝切换补丁（禁用 + 插入）是 self-modification 改写 profile 的范本；回滚 = 恢复 `[]` 的可逆设计也可复用。

### 与其它插件组合的可能性

- **dsh-easyssh + dsh-aionui-panel**：本插件的必备配套组合；aionui-panel 提供右侧文件面板视觉与交互，dsh-easyssh 通过 `sshWorkspaceMode` 跨插件服务驱动它跟随 SSH 模式切换数据源。
- **dsh-easyssh + dsh-science-workbench**：dsh-science-workbench 当前仅本地执行（集群执行 = TODO）；用 dsh-easyssh 把执行位置延伸到远程 SSH 主机，弥补其集群执行短板，让 `bio_run_cell` 在远程跑大计算。
- **dsh-easyssh + Zalpha263-dsh-file-explorer**：file-explorer 浏览本地工作区，easyssh 浏览远程服务器文件系统；两者组合可形成本地 + 远程双面板文件管理。
- **dsh-easyssh + dsh-web-preview-float**：在远程开发场景下，用 easyssh 启动远程 dev server，再用 web-preview-float 的预览窗 iframe 指向远程隧道端口（经 `ssh_tunnel` 本地端口转发），形成远程开发 + 本地预览闭环。
