# DeepSeek Harness (dsh) 部署排障笔记

本文件记录在 Windows 环境下从源码克隆、安装、构建到启动 DeepSeek Harness（`dsh`）Web UI 过程中遇到的问题与解决方法。仓库地址：`https://github.com/deepseek-ai/deepseek-harness.git`。

## 版本要求

### Node 版本

- **要求**：`package.json` 的 `engines.node` 声明为 `^22.19.0 || >=24.0.0`。
- **本次环境**：Node `v22.16.0`，略低于下限。
- **影响**：`pnpm install` 与 `pnpm run build` 都会打印 `[WARN] Unsupported engine: wanted: {"node":"^22.19.0 || >=24.0.0"}`，但不阻塞执行。
- **解决**：pnpm 默认不强制 `engines`，无需额外处理即可继续。若安装/构建因版本被硬性拦截，追加 `--config.engine-strict=false` 兜底：
  ```powershell
  pnpm install --config.engine-strict=false
  pnpm run build
  ```
  本次未触发硬性拦截，仅警告。

### pnpm 版本

- **要求**：`package.json` 的 `packageManager` 字段声明 `pnpm@11.7.0`。pnpm 11.x 均可工作。
- **本次环境**：自定义路径 `D:\Program Files\nodejs\node_cache\pnpm.cmd` 为 `11.21.0`。

## pnpm 路径覆盖问题

### 现象

系统中 `pnpm` 命令可能被 TRAE 私有环境覆盖为较低版本（如 8.15.9），直接调用 `pnpm` 会拿到错误版本，导致 workspaces 安装异常。

### 排查

```powershell
pnpm -v                                    # 查看默认 pnpm 版本
& "D:\Program Files\nodejs\node_cache\pnpm.cmd" -v   # 查看自定义路径版本
```

### 解决

每条 pnpm 命令前先把正确的 node_cache 目录前置到 `PATH`，或直接用绝对路径调用 pnpm：

```powershell
# 方式一：前置 PATH（后续 pnpm 调用都走 11.x）
$env:PATH = "D:\Program Files\nodejs\node_cache;" + $env:PATH
pnpm -v   # 确认输出 11.x

# 方式二：直接用绝对路径（最稳妥）
& "D:\Program Files\nodejs\node_cache\pnpm.cmd" install
```

> 注意：即便用 11.21.0 调用，corepack 仍可能按 `packageManager` 字段回显 `using pnpm v11.7.0`，这是正常现象，不影响功能。

## Windows 原生模块限制与绕过

### landlock-run（Linux 专属，Windows 自动跳过）

`native/landlock-run` 是 Linux 沙箱模块，其子包 `linux-arm64`、`linux-x64` 在 `package.json` 中声明了平台约束 `{"os":["linux"]}`。在 Windows 上 pnpm 会打印：

```
native/landlock-run/packages/linux-arm64 | [WARN] Unsupported platform: wanted: {"cpu":["arm64"],"os":["linux"],"libc":["any"]} (current: {"os":"win32","cpu":"x64","libc":"unknown"})
native/landlock-run/packages/linux-x64   | [WARN] Unsupported platform: wanted: {"cpu":["x64"],"os":["linux"],"libc":["any"]} (current: {"os":"win32","cpu":"x64","libc":"unknown"})
```

这只是警告，包被跳过，**不会导致安装失败**，无需 `--ignore-scripts`。

### 实际会执行 postinstall 的原生模块

`node-pty`、`koffi`、`esbuild` 等在 Windows 上会执行 postinstall 构建原生二进制。本次安装中它们均成功：

- `node-pty@1.1.0`：复制 `conpty.dll` / `OpenConsole.exe` 到 `build/Release`。
- `koffi@3.1.1`：install 成功。
- `esbuild`（多版本）：postinstall 成功。

### 兜底方案

若 `pnpm install` 因原生模块构建失败，改用跳过脚本的方式安装，并记录跳过的脚本：

```powershell
pnpm install --ignore-scripts
```

之后手动补跑需要的 postinstall（如 `node-pty`）。本次未触发该兜底。

## tsdown 构建报错：Failed to import module "unrun"

### 现象

`pnpm run build` 在 `build:lib:host` 阶段执行 `tsdown --env.DSH_BUILD_FACE host` 时失败：

```
ERROR  Error: Failed to import module "unrun". Please ensure it is installed.
    at importWithError (.../tsdown/dist/general-Cp4NiJNK.mjs:42:9)
    ...
    at async loadConfigFile (.../tsdown/dist/options-DWGUHu4D.mjs:604:19)
[ELIFECYCLE] Command failed with exit code 1.
```

### 原因

`tsdown@0.22.2` 把 `unrun`（TS 配置加载器）声明为**可选 peer 依赖**（`peerDependenciesMeta.unrun.optional = true`），pnpm 不会自动安装可选 peer 依赖。但 `tsdown` 在加载 `tsdown.config.ts` 时仍尝试 `import "unrun"`，导致失败。

### 解决

把 `unrun` 安装到根 workspace 的 devDependencies：

```powershell
pnpm add -Dw unrun --config.engine-strict=false
```

安装 `unrun@^0.3.1` 后重新 `pnpm run build` 即可通过。

## API Key（DEEPSEEK_API_KEY）缺失时的只读/演示行为

### Web UI 行为

`dsh web` 启动后，Web UI 在 `http://127.0.0.1:3080` 提供服务，**无需 API key 即可访问页面**。但要让 agent 实际运行任务，必须配置模型凭据：

1. 打开 **Settings → Models**。
2. 填入 DeepSeek API key 并保存。
3. 模型路由立即生效，无需重启服务。

未配置 API key 时：

- Web UI 页面可正常加载（HTTP 200）。
- 可选择 workspace、浏览界面（只读/演示模式）。
- **无法发送会话任务**：会话编辑器在未选择 workspace 时不可用；即便选了 workspace，没有可用模型路由也无法产生模型响应。

### 环境变量与 e2e 测试

源码级的真实 API 测试与 demo 通过环境变量读取凭据：

- `DEEPSEEK_API_KEY`：必需，用于真实 API 调用。
- `DEEPSEEK_BASE_URL`：可选，自定义 API 端点。
- 根目录 `.env`：会被读取。

CI 的 e2e 测试在缺失 key 时自动跳过（`test:e2e` self-skip without `DEEPSEEK_API_KEY`），不会报失败。

## 本次实际部署记录

### 部署环境

- 操作系统：Windows
- Node：`v22.16.0`（低于要求的 `^22.19 || >=24`，仅警告）
- pnpm：`11.21.0`（自定义路径 `D:\Program Files\nodejs\node_cache\pnpm.cmd`）

### 克隆

- 完整克隆速度过慢（284496 对象），改用浅克隆 `git clone --depth=1` 加速。
- 克隆目标 `e:\DeepseekAgent\deepseek-harness`。
- commit SHA：`47f943859bef60e4160492346772ded9b24f765a`
- 最近提交：`Merge pull request #2519 from deepseek-harness/feat/npm-public`（分支 `master`）

### 安装

- 命令：`pnpm install --config.engine-strict=false`
- 结果：成功，923 个包，26.7 秒。
- postinstall 全部成功：`lefthook`、`node-pty`、`koffi`、`esbuild`、`subprocess-local`。
- 警告（非致命）：Node 引擎版本不符；`landlock-run` 平台不匹配；两个示例包的 bin 链接失败（`dsh-acp-demo`、`dsh-jsonrpc-demo`，因其 `lib/` 尚未构建，属正常）。

### 构建

- 首次 `pnpm run build` 失败：tsdown 缺少 `unrun`（见上节）。
- 执行 `pnpm add -Dw unrun` 后重新构建成功。
- 构建阶段：`build:lib:host`（tsc + tsdown）→ `build:lib:client`（tsc + tsdown）→ `build:web`（vite，2.78s）。
- 输出提示：部分 chunk 大于 500 kB（前端语言包与 vendor 包），为优化建议，非错误。

### 启动 Web UI

- 命令：`pnpm dsh web`（后台长驻进程）。
- 启动后输出：`dsh web: http://127.0.0.1:3080`。
- 验证：`Invoke-WebRequest http://127.0.0.1:3080` 返回 `StatusCode: 200`，`Content-Type: text/html; charset=utf-8`，内容长度 12076 字节。
- 端口 3080 在启动前为空闲状态。

### 遇到的问题汇总

| 问题 | 原因 | 解决方式 |
|---|---|---|
| 完整 git clone 极慢 | 仓库对象多（28 万+） | 改用 `--depth=1` 浅克隆 |
| `[WARN] Unsupported engine` | Node v22.16.0 低于 `^22.19` | 仅警告，pnpm 不强制；保留 `--config.engine-strict=false` 兜底 |
| `pnpm run build` 报 `Failed to import module "unrun"` | tsdown 的可选 peer 依赖未自动安装 | `pnpm add -Dw unrun` |
| landlock-run 平台警告 | Linux 专属模块 | 警告非错误，Windows 自动跳过 |
| 示例包 bin 链接失败 | `lib/` 未构建 | 构建后自动恢复，不影响 Web UI |

## 常用命令速查

```powershell
# 进入仓库
cd e:\DeepseekAgent\deepseek-harness

# 确保使用 pnpm 11.x
$env:PATH = "D:\Program Files\nodejs\node_cache;" + $env:PATH
pnpm -v

# 安装（Node 版本偏低时加兜底）
pnpm install --config.engine-strict=false

# 构建
pnpm run build

# 启动 Web UI（长驻服务，http://127.0.0.1:3080）
pnpm dsh web

# 验证 Web UI 可访问
Invoke-WebRequest http://127.0.0.1:3080 -UseBasicParsing -TimeoutSec 10 | Select-Object StatusCode

# 查看已启动 profile 的组合配置
pnpm dsh --profile web --dump-config

# 运行一次 headless 任务（需 DEEPSEEK_API_KEY）
pnpm dsh --profile headless "你的任务"

# 运行测试
pnpm run test
pnpm run test:e2e   # 无 key 时自动跳过
```
