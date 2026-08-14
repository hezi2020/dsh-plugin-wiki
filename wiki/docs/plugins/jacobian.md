# jacobian

> **插件名**：jacobian（Pure mathematics for agents）
> **来源仓库**：<https://github.com/morluto/jacobian>
> **许可证**：MIT（Copyright (c) 2026 Jacobian contributors）
> **commit SHA**：`ad85bc4`（前 7 位）

为 AI Agent 提供「搜索反例、精确计算、独立检验结果证明」的 MCP 服务器，通过 `math.find` 发现运算、`math.run` 执行单个原子数学运算，并由独立 checker 发出绑定到具体 claim 的 `VERIFIED` 记录。覆盖多项式代数、精确线性代数、图论、SAT/SMT、有限代数、多面体、Lean 证明等领域。本仓库是独立 MCP 服务器 + 数学库，非标准 DSH 插件 bundle。

---

## 1. 使用指南

### 前置依赖

- Node.js `>= 18`（npm 启动器）
- CPython 3.12 或 3.13（数学后端），或 [`uv`](https://docs.astral.sh/uv/)（installer 可代装其锁定版本）
- 测试二进制安装契约：CPython 3.12/3.13 + glibc Linux x86-64；Alpine/musl 无法从 PyPI 装齐强制后端栈
- MCP 客户端：launcher 支持 Claude / Codex / Cursor / Gemini / OpenCode
- 可选外部可执行 / 形式化运行时：Lean 4.31.0 toolchain、`cadical`、`drat-trim`、`carcara`

### 安装命令

```sh
# 一次性设置（npm 全局安装）
npm install -g jacobian
jacobian setup
jacobian upgrade
jacobian doctor

# 用户级引导安装
curl -fsSL https://raw.githubusercontent.com/morluto/jacobian/main/npm/install.sh | sh

# 延后运行时到首次使用
curl -fsSL https://raw.githubusercontent.com/morluto/jacobian/main/npm/install.sh | \
  sh -s -- --client codex --yes --defer-runtime

# Python 包
python -m pip install jacobian

# 直接启动 MCP 服务器
jacobian mcp

# 远程 MCP
jacobian-remote-mcp --host 127.0.0.1 --port 8000 --allow-anonymous
```

!!! warning "非标准 DSH 插件 bundle"
    本仓库为独立 MCP 服务器 + 数学库，非标准 DSH 插件 bundle；不通过 `dsh plugin add` 安装，需经 MCP 客户端配置接入。出处：README「Quickstart」、AGENTS.md「Product Constraints」。

### 配置项

| 来源 | 字段 |
|---|---|
| CLI | `jacobian setup` / `jacobian upgrade` / `jacobian doctor` / `jacobian mcp` / `jacobian-remote-mcp` |
| 安装参数 | `--client codex` / `--yes` / `--defer-runtime` |
| 远程 MCP | `--host` / `--port` / `--allow-anonymous` / `--auth-tokens-file`（本地入口不暴露后两项） |
| 部署基线 | `deploy/` 提供 systemd / Caddy / Tailscale Funnel / smoke / restart / rollback 可复现配置 |

### 典型用法示例

```text
# Agent 工作流：先搜索、再执行、按需独立检验
math.find  → 发现可用运算（如 matrix.determinant.compute）
math.run   → 执行单个原子运算，返回数学值 + 执行状态
math.run   → 单独调用 ….verify 独立 checker，对同一输入与候选结果发 VERIFIED 判决
```

`Subject + Candidate → Independent checker → Bound record`：只有 operator 授权的 checker 才能发出 `VERIFIED`，绑定到精确的 subject / candidate / evidence / protocol / scope / semantics / certificate format / checker identity（README「Verification model」段）。

### 重启生效说明

!!! tip "安装后需 jacobian setup 编译 catalog"
    `jacobian init` / `jacobian update` 把声明编译成可搜索 catalog，serving 阶段不再发现或安装 operations。配置 MCP 客户端后需重启客户端使其加载 Jacobian MCP server。

---

## 2. 弊端与缺陷

!!! warning "预稳定版本，实验性契约可能变动"
    Jacobian 0.11.0 是 pre-stable release；实验性契约在版本间可能变化；兼容性仅对受支持版本生效。出处：README「Status」段、AGENTS.md「Repository Gotchas」段。

!!! warning "强制 Python 后端栈体积较大"
    Python 包环境约 160MB；如无 Python 3.12，uv 托管 Python 再加约 110MB；可用 `--defer-runtime` 延后到首次使用。出处：README「Quickstart」段。

!!! warning "二进制安装契约仅覆盖 glibc Linux x86-64"
    测试二进制安装契约仅覆盖 CPython 3.12/3.13 + glibc Linux x86-64；Alpine/musl 无法从 PyPI 装齐强制后端栈（cvc5 / python-flint 等）。出处：README「Quickstart」段最后一段。

!!! warning "No witness is not proof"
    `TIMEOUT` / `CANCELLED` / `ERROR` / 不完整有界搜索一律视为 `UNKNOWN`，不能直接提升为 `VERIFIED`；评估器分数、solver 状态、模型答案、搜索结果都不能直接转为 `VERIFIED`。出处：README「Verification model」段、AGENTS.md「Fail-Closed Verification Rules」段。

!!! warning "生产者不能自我认证"
    `VERIFIED` 必须由与生产者独立的、operator 授权的 checker 发出；catalog 成员资格不等于验证权限；插件与搜索代码不能授权 checker 或改变信任策略。出处：README「Verification model」段、AGENTS.md「Fail-Closed Verification Rules」段。

!!! warning "可选 Lean / 外部求解器缺失时仅移除相关运算"
    `lean.check` 未安装时在 `init`/启动时打印 `lean.check is not installed`；外部求解器（`cadical` / `drat-trim` / `carcara`）不在 PATH 时相关运算被移除。这不破坏内核或核心测试，但 SAT 证明工件相关运算不可用。出处：AGENTS.md「Cursor Cloud specific instructions」段。

!!! warning "默认 uv run pytest 不收集 Lean / 存储 / 进程 / MCP"
    默认 `uv run pytest` 不会收集 Lean / 存储 / 进程 / MCP 测试；必须用对应 `make test-*` 目标。出处：AGENTS.md「Cursor Cloud specific instructions」段。

---

## 3. 后续拓展思路

### 可二次开发的方向

- **新增 domain operation**：按 `docs/reference/domain-operation-library.md` 的契约，在 `jacobian.math.<domain>` 下添加新的原子运算，遵循「一函数一规范输入、私有后端委托」的 ownership 模型。
- **新增独立 checker**：为新运算配对 `….verify` checker，明确 checker 授权边界与证书格式，扩展 trust boundary。
- **扩展远程部署形态**：复用 `deploy/` 的 systemd / Caddy / Tailscale Funnel 基线，把临时远程 MCP 升级为生产固定域名形态。

### 可对接的 DSH 能力

- **MCP**：Jacobian 本身就是 MCP server，可直接作为 DSH 的 MCP 工具源接入，把 `math.find` / `math.run` 暴露为 DSH 工具供 Agent 调用。
- **skill**：可写一个 DSH Skill 包装 Jacobian 的常见调查流程（如「先搜索 → 执行 → 独立 verify」），降低 Agent 的工具选择负担。
- **self-modification**：Jacobian 的 catalog 编译模型（声明 → 编译 → 服务）可作为 self-modification 中「声明驱动运行时」的样例。

### 与其它插件组合的可能性

- **jacobian + dsh-net-proxy**：让 Jacobian 远程 MCP 走 dsh-net-proxy 配置的代理，便于在内网受限环境下接入远程数学后端。
- **jacobian + AgentFrame-v3**：把 Jacobian 的 `VERIFIED` 记录作为 AgentFrame 长期记忆的「可信事实」写入压缩后端，避免重复验证。
- **jacobian + dsh-vision-toolkit**：组合「图像 → 数学描述 → Jacobian 验证」的跨模态链路，例如从截图提取几何关系后用 Jacobian 精确求解并独立验证。
