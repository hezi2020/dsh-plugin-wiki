# AgentFrame-v3

> **插件名**：AgentFrame v3 先明（dsh-compaction-agentframe）
> **来源仓库**：<https://github.com/ljsysfurryACE/AgentFrame-v3>
> **许可证**：GPL-3.0 © Cloud LTE Studio（按 README 与 frontmatter 声明）
> **commit SHA**：`db96607`（前 7 位）

AgentFrame v3 先明作为 DeepSeek Harness 的 compaction 后端插件接入，提供「语义轨（MemoryDirector）+ 物理轨（吸收式 MLA + INT4）」双层压缩，实现 28.4× KV 压缩、3.2× 语义蒸馏、总压缩 ~113×，与 DSH `ctx.compaction` seam 保持契约。本仓库含 AgentFrame 本体（Python）+ dsh-plugin 子目录两部分。

---

## 1. 使用指南

### 前置依赖

#### AgentFrame 本体（Python）
- Python3
- `pip install -e agentframe/`
- 环境变量 `AGENTFRAME_API_KEY="sk-xxx"`

#### dsh 插件（TypeScript）
- 在 `deepseek-harness` 仓库内（`packages/compaction/compaction-agentframe`）
- pnpm
- `npx tsc -b tsconfig.json` 编译；`npx tsx tests/smoke.ts` 验证

### 安装命令

AgentFrame 本体：

```bash
pip install -e agentframe/
export AGENTFRAME_API_KEY="sk-xxx"

python3 -m agentframe.cli demo
python3 -m agentframe.cli ingest "知识" --tags kv
python3 -m agentframe.cli ask "问题"
```

dsh 插件（在 deepseek-harness 仓库内）：

```bash
cd packages/compaction/compaction-agentframe
pnpm install
npx tsc -b tsconfig.json   # 编译
npx tsx tests/smoke.ts     # 验证
```

profile 一行配置接入：

```yaml
# profile 的 cordis.patch.yml
- id: compaction-agentframe
  name: '@deepseek-ai/dsh-compaction-agentframe'
  config:
    semantic: true      # 语义压缩 (MemoryDirector 思路)
    retainRatio: 0.2    # 保留 20% 关键信息
    physical: true      # 物理压缩记账 (7776B/token)
```

Python 库方式：

```python
from agentframe.config import AgentFrameConfig
from agentframe.core.engine import ContextEngine

eng = ContextEngine(AgentFrameConfig.from_env())
r = eng.ask_autopilot("我的服务器 IP 是 98.142.241.130")
print(r.meta["memory_decision"])   # 自主记忆决策
```

!!! warning "非独立可加载 DSH 插件 bundle"
    本仓库为预览版（Preview），含 AgentFrame 本体（Python）+ dsh-plugin 子目录两部分；插件以 DSH Cordis 插件形式接入 `ctx.compaction` seam，而非通过 `dsh plugin add github:` 远程安装。需在 deepseek-harness 仓库内编译并放入 `packages/compaction/compaction-agentframe`。出处：README「v3 新特性: DeepSeek Harness 整合」、「dsh 插件 (TypeScript)」段。

### 配置项

| 来源 | 字段 |
|---|---|
| profile `cordis.patch.yml` | `id: compaction-agentframe`、`name: '@deepseek-ai/dsh-compaction-agentframe'`、`config.semantic`、`config.retainRatio`、`config.physical` |
| 环境变量 | `AGENTFRAME_API_KEY` |

### 典型用法示例

- **CLI**：`python3 -m agentframe.cli demo` / `ingest` / `ask`，做记忆写入与查询。
- **Python 库**：用 `ContextEngine.ask_autopilot` 让模型自主决定「记什么忘什么」，从 `r.meta["memory_decision"]` 读取决策。
- **DSH compaction**：DSH 在 `ctx.compaction` seam 调用 `compactIfNeeded` / `compactNow` / `compactRegion`，由 AgentFrame 实现语义 + 物理双层压缩。
- **smoke test 验证**：`npx tsx tests/smoke.ts` 应输出 `ctx.compaction = registered`、`compactIfNeeded / compactNow / compactRegion 全实现`，并演示语义压缩（闲聊剔除、关键代码保留）。

### 重启生效说明

!!! tip "Agent 规则改动下一轮即生效，dsh 插件改动需重编译重启"
    AgentFrame 本体配置改动需重启 Python 进程；dsh 插件改动需 `npx tsc -b` 重新编译并重启 dsh web。

---

## 2. 弊端与缺陷

!!! warning "预览版（Preview），非稳定生产可用"
    状态为预览版（Preview），迭代中，非稳定生产可用。出处：README 顶部「状态: 预览版 (Preview) · 迭代中」。

!!! warning "压缩比数据来自实测，未在所有场景验证"
    KV 压缩 28.4×（L40S 实测）、语义压缩 3.2×（67→21 tokens，API 实测）、总压缩 ~113×（27MB → 235KB）为特定实测数据，未覆盖所有场景。出处：README「核心能力 (v1+v2 保留)」表。

!!! warning "v3 整合依赖 DSH ctx.compaction seam，需在 DSH 仓库内编译"
    v3 整合依赖 DSH 的 `ctx.compaction` seam，需在 DSH 仓库内编译；非独立可加载 bundle，不能脱离 deepseek-harness 源码检出使用。出处：README「dsh 插件 (TypeScript)」段、架构图。

!!! warning "仓库根目录无独立 LICENSE 文件"
    仓库根目录未单独包含 LICENSE 文件，但 README 与 frontmatter 明确声明 GPL-3.0 © Cloud LTE Studio。GPL-3.0 是强 copyleft 许可，分发衍生作品需同协议开源。出处：README「License」段、frontmatter `license: gpl-3.0`。

!!! warning "smoke test 覆盖有限"
    子插件 smoke test 仅验证注册与压缩基本行为（注册成功、三个 compact 方法实现、语义压缩剔除/保留示例），未覆盖全部生产场景。出处：README「插件验证结果」段。

---

## 3. 后续拓展思路

### 可二次开发的方向

- **新增 dsh-plugin 子插件**：仓库已有 `compaction-agentframe` / `memory-director` / `aura-scheduler` 三个子插件，可继续按 DSH Cordis 插件契约添加新模块（如检索增强、遗忘策略调优）。
- **物理压缩后端扩展**：在 MLA + INT4 之外探索更激进的量化方案（INT3 / 混合精度），评估压缩比与召回的权衡。
- **Aura 遗忘曲线调参**：把 `S(t)=I·2^(-t/τ)` 的指数遗忘参数暴露为可配置项，让用户按任务类型调参。

### 可对接的 DSH 能力

- **self-modification**：AgentFrame 的「模型自主决定记什么忘什么」(MemoryDirector) 与 DSH 的 self-modification 理念同源，可作为 self-modification 的记忆层基础设施。
- **hooks**：在 compact 触发前后挂 hooks，记录压缩前后 token 数、压缩比、保留关键信息，便于审计与调优。
- **skill**：把「按场景调 retainRatio / 物理压缩开关」封装为 DSH Skill，让 Agent 自然语言切换压缩策略。

### 与其它插件组合的可能性

- **AgentFrame-v3 + jacobian**：把 Jacobian 的 `VERIFIED` 记录作为 AgentFrame 长期记忆的「可信事实」写入压缩后端，避免重复验证；语义轨可优先保留已验证结论。
- **AgentFrame-v3 + dsh-net-proxy**：让 AgentFrame 调用远程 LLM 做语义压缩时经 dsh-net-proxy 配置的代理出口，统一网络策略。
- **AgentFrame-v3 + dsh-vision-toolkit**：把图像描述 / OCR 结果作为 AgentFrame 记忆输入，结合语义压缩保留关键视觉事实，丢弃冗余像素级描述。
