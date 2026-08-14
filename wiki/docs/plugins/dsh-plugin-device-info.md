# dsh-plugin-device-info

> **插件名**：@huanlin/dsh-plugin-device-info（Windows 设备信息工具集）
> **来源仓库**：<https://github.com/lsz-asd/dsh-plugin-device-info>
> **许可证**：AGPL-3.0（`package.json` 声明；LICENSE 文件正文为 AGPL-3.0，版权头疑为从 dsh-plugin-sleep 模板拷贝未改，GitHub 标注 NOASSERTION）
> **commit SHA**：`cca8aec`（前 7 位）

为 DeepSeek Harness 暴露 12 个只读 `win_*` 工具，覆盖时间、系统、CPU、内存、磁盘、GPU、网络/WiFi、电池、进程、USB、音频、打印机。数据经 Node `os` + Windows PowerShell (WMI/CIM) 采集，无写入、无安装、无网络。Ad-hoc PowerShell 探测每次约 40–100+ token，而插件调用约 6 token，安装一次即可复用预测试的版本化查询。

---

## 1. 使用指南

### 前置依赖

- Node.js `>= 18`（`package.json` engines）
- Windows 系统（非 Windows 上仅 `win_time` 可用，其余返回 `supported: false`）
- PowerShell（默认 `powershell.exe`，可改 `pwsh.exe`）
- 可选 peer 依赖（optional）：`cordis` `^4.0.0-rc.7`（由 host 提供）
- 运行时依赖：`schemastery`
- `lib/` 预构建随包发布，无 `prepare` 脚本

### 安装命令

```sh
# 发布后从 GitHub 安装
dsh plugin --profile <profile> add github:lsz-asd/dsh-plugin-device-info

# 从本地工作副本安装
dsh plugin --profile <profile> add link:C:/path/to/dsh-device-info
```

安装后重启 profile。

### 配置项

| 字段 | 默认 | 取值范围 | 说明 |
|---|---|---|---|
| `pwshEnabled` | `true` | bool | 总开关；`false` 时除 `win_time` 外全部禁用 |
| `pwshTimeoutMs` | `8000` | 1000–10000 | 单次 PowerShell 查询超时 |
| `topProcesses` | `10` | 1–100 | `win_processes` 默认 top-N |
| `includeSerialNumber` | `true` | bool | `win_system` 是否报告 BIOS 序列号 |
| `pwshPath` | `powershell.exe` | `powershell.exe` / `pwsh.exe` | PowerShell 可执行文件路径 |

### 工具清单

| 工具 | 报告内容 | 数据源 |
|---|---|---|
| `win_time` | ISO/epoch 时间、IANA 时区、UTC 偏移、uptime、启动时间 | Node `os`（任意平台） |
| `win_system` | OS、主机名、用户、厂商、型号、BIOS、序列号 | `Win32_ComputerSystem` / `Win32_OperatingSystem` / `Win32_BIOS` |
| `win_cpu` | 型号、核心数、最大频率、负载 % | `Win32_Processor` |
| `win_memory` | 已用/空闲/总量、使用率、内存条 | Node `os` + `Win32_PhysicalMemory` |
| `win_disk` | 磁盘 + 卷（容量、空闲） | `Win32_DiskDrive` / `Win32_LogicalDisk` |
| `win_gpu` | 名称、显存、驱动、分辨率 | `Win32_VideoController` |
| `win_network` | 网卡、IP、在线 WiFi（SSID/信号/速率/认证） | `Get-NetAdapter` + `netsh wlan` + Node `os` |
| `win_battery` | 电量 %、AC/DC、续航、电源方案 | `Win32_Battery` + `powercfg` |
| `win_processes` | 数量 + 按内存/CPU 的 top-N（`top_n`、`sort_by`） | `Get-Process` |
| `win_usb` | USB 设备 | `Win32_PnPEntity` |
| `win_audio` | 音频设备 | `Win32_SoundDevice` |
| `win_printers` | 打印机（驱动/端口/默认/离线） | `Win32_Printer` |

所有工具返回规范化 JSON；可空字段保持 `null`（schema `oneOf: [type, null]`）以保证形状稳定。

### 典型用法示例

```
User:  这台电脑还剩多少内存？电池呢？
Model: [win_memory] → 72.8% used, 2× Samsung 8 GB DDR5-4800
       [win_battery] → 100%, AC online, scheme 381b4222…（平衡）
```

### 重启生效说明

!!! tip "lib 预构建即装即用，配置热重载"
    `lib/` 随包发布且无 `prepare` 脚本，`github:` 安装后重启 profile 即可用。配置变更时 cordis 会 dispose 并重新 apply fiber，`ctx.tools.register` 是 effect-based，工具自动重新注册，无需手动重启进程。出处：AGENTS.md「Config hot-reload」。

---

## 2. 弊端与缺陷

!!! warning "传感器需第三方 daemon，蓝牙/显示器/流量统计尚未实现"
    温度等传感器数据不在 WMI/CIM 标准输出内，需 LibreHardwareMonitor 等第三方 daemon；蓝牙、显示器、流量统计在 Roadmap 中推迟。出处：README「Known limitations / Roadmap」。

!!! warning "进程 CPU 是累计秒数非实时占用率"
    `Get-Process` 的 CPU 是累计秒（可能为 `null`），`sort_by: 'cpu'` 按累计秒排序，不能反映实时 CPU 占用率。出处：README「Known limitations」、AGENTS.md「Processes」。

!!! warning "非 Windows 上仅 win_time 可用"
    `requireWindows` 对非 Windows 平台的其他 11 个工具返回 `{ supported: false, message }`，不抛错；Linux/macOS 支持在 Roadmap 中（`/proc`、`sysctl`、`system_profiler`）。出处：README「Known limitations / Roadmap」、AGENTS.md「Unsupported platforms」。

!!! warning "@deepseek-ai/dsh-tools 未声明为 peer，typecheck 依赖 ambient 声明"
    `@deepseek-ai/dsh-tools@0.0.1-rc.x` 拉取未发布的 `@deepseek-ai/dsh-type-meta`（所有 registry 404），pnpm 11 即使标记 optional 也会自动安装而破坏 `pnpm install`，故未声明为 peer。typecheck 依赖 `src/types.d.ts` ambient 声明，测试用 `vi.mock` stub，真实模块仅在 `scripts/di-smoke.mjs` 与 Loader 中运行——脱离 DSH host 单独 typecheck 时需注意这套 ambient 声明约定。出处：AGENTS.md「Runtime deps」。

!!! warning "LICENSE 版权头与仓库名不符，GitHub 标 NOASSERTION"
    LICENSE 文件正文为 AGPL-3.0，`package.json` 也声明 `AGPL-3.0`，但 LICENSE 版权头写的是 `dsh-plugin-sleep / Copyright (C) 2026 Huanlin`（与仓库名 `dsh-plugin-device-info` 不符，疑从 dsh-plugin-sleep 模板拷贝未改），导致 GitHub licensee 标注 NOASSERTION。AGPL-3.0 具强 copyleft + 网络服务条款（Section 13），二次开发者若以网络服务形式提供修改版需公开源码。出处：仓库 LICENSE 文件、`package.json`。

!!! warning "win_system 默认报告 BIOS 序列号"
    `includeSerialNumber` 默认 `true`，`win_system` 会把 BIOS 序列号返回给模型——属于设备唯一标识，若会话内容外发（如经 dsh-feishu-bot 上传到飞书）需手动设为 `false`。出处：README「Config」、AGENTS.md。

---

## 3. 后续拓展思路

### 可二次开发的方向

- **跨平台扩展**：按 Roadmap 增加 Linux（`/proc`、`lscpu`、`lsblk`）与 macOS（`sysctl`、`system_profiler`）采集器，复用现有的 value/render 分离与 sentinel 处理骨架。
- **token 效率基准**：落地 README 提到的 token-efficiency benchmark——真实对比"插件调用 vs ad-hoc PowerShell 命令（含重试/权限提示）"的每任务 token 消耗，把估算变成可引用的数据。
- **传感器与更多类别**：对接 LibreHardwareMonitor 补温度/风扇；增加蓝牙、显示器、流量统计、已安装软件清单。

### 可对接的 DSH 能力

- **tools**：12 个 `defineTool` 注册是 DSH 工具体系的标准样例，value（execute 返回规范化 JSON）与 render（纯文本投影）分离的设计可作为"可重放、可测试"工具编写范式被其他插件借鉴。
- **Config (Schemastery)**：`pwshEnabled` / `pwshTimeoutMs` / `topProcesses` 等字段的 clamping（如 `top_n` 限 1..100、`pwshTimeoutMs` 限 1000–10000）展示了 Schemastery 在 DSH 中的配置约束写法。

### 与其它插件组合的可能性

- **dsh-plugin-device-info + dsh-feishu-bot**：飞书 bot 远程驱动本地 agent 时，可用 `win_battery` / `win_processes` 让 agent 自报"电量低/内存吃紧"等主机状态，便于远程判断是否该暂停重负载任务。注意 `includeSerialNumber` 在内容外发场景应关掉。
- **dsh-plugin-device-info + dsh-todo-freshness-guard**：Guard 阻塞期间，agent 可用 `win_processes` / `win_memory` 排查"是否真的因为主机资源耗尽导致卡住"，避免把环境问题误判为自身 Todo 不同步。
- **dsh-plugin-device-info + dsh-agy**：dsh-agy 的多账号轮换/限流诊断可借助 `win_network`（WiFi 信号/速率）排查"是否网络抖动触发 429"，把上游限流与本地网络问题区分开。
