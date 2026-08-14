# mobius

> **插件名**：Mobius（首个自进化开源 Agent OS）
> **来源仓库**：<https://github.com/nutshellai-tech/mobius>
> **许可证**：NOASSERTION —— Mobius Open Source License（果壳智算（北京）科技有限公司，非商业 source-available；商业使用需另行授权）
> **commit SHA**：`6b5c614`（前 7 位）

全球首个自进化开源 Agent OS，把团队、AI 智能体、设备、算力连进一个可追溯的工作空间。支持自迭代代码生成、多智能体自动科研、自然语言入口小莫、任意模型接入、SSH/AIMUX/可控代理连接资源、团队协作与自孵化拓展。本仓库是独立 Agent OS 系统，非标准 DSH 插件 bundle。

---

## 1. 使用指南

### 前置依赖

#### 容器（推荐）
- Docker + Docker Compose
- Python3（运行 `conf_prepare.py` / `conf_check.py`）

#### 直接部署（Linux / macOS）
- `tmux`、`git`、`curl`、`proxychains`、`openssh-server`、`build-essential`
- Python3
- npm（用于 `npm install -g @anthropic-ai/claude-code @openai/codex`）
- Node.js（前后端 `npm install`）

### 安装命令

容器（推荐）：

```bash
# 1. 克隆仓库（建议先 fork 再 clone，自进化后可直接提交到自己的仓库）
git clone https://github.com/nutshellai-tech/mobius.git && cd mobius

# 2. 生成配置（随机密钥/密码；也可手动配置以跳过此步）
python3 conf_prepare.py --docker && python3 conf_check.py --docker

# 3. 构建镜像（base 镜像仅含环境，不含代码）
docker build -t mobius-system-base:latest -f deploy/Dockerfile .
docker build -t mobius-system-exe:latest .

# 4. 启动
docker compose up
```

直接部署（Linux / macOS）：

```bash
# 1. 安装前置依赖
sudo apt install tmux python3 git curl proxychains openssh-server build-essential

# 2. 安装编码 Agent（任选其一，建议两者都装）
npm install -g @anthropic-ai/claude-code @openai/codex

# 3. 克隆仓库
git clone https://github.com/nutshellai-tech/mobius.git && cd mobius

# 4. 生成并校验配置（会把 .env.default 复制为 .env 并生成随机密码）
python3 conf_prepare.py && python3 conf_check.py

# 5. 安装依赖（前端 + 后端）
cd ./mobius && npm install && cd ./frontend && npm install && cd ../..

# 6. 运行
python3 start.py
```

!!! warning "非标准 DSH 插件 bundle"
    本仓库为独立 Agent OS 系统，非标准 DSH 插件 bundle；不通过 `dsh plugin add` 安装。Mobius 是模型无关的 Agent OS，与 DSH 是平行的两套系统，可作为对比参考或并存部署。出处：README「Quick Start」。

### 配置项

| 来源 | 字段 |
|---|---|
| `.env.default` → `.env` | 由 `conf_prepare.py` 生成随机密码 / 密钥 |
| `conf_check.py` | 启动前校验配置完整性 |
| 模型配置 | 任意模型（GPT / Claude / GLM-5.2 / Codex 等），按任务类型、成本、性能选择 |
| 资源接入 | SSH / SFTP / AIMUX / 可控代理（接 GPU 集群、嵌入式板、NAS、云服务器、工作站、Web/开放文献） |

### 典型用法示例

- **自进化**：发一个修改需求 / 截图 / 参考链接，Mobius 把它们变成真实的代码、UI、插件或流程更新，全程后台替换「忒修斯之船」上的一块木板（README「Self-Evolving」段）。
- **自动科研**：把一个科研目标编排成多智能体系统——读论文、抽取方法、跑实验、汇总结果（README「Auto Research」段）。
- **小莫（XiaoMo）**：自然语言入口，可创建项目、拆分任务、启动智能体、追踪进度；支持语音输入、Web/PC/移动端多端（README「XiaoMo」段）。
- **拓展**：金融看板、PPT 生成器、科研工作台、实时门户等自孵化拓展，每个拓展自带前端、后端 handler、数据目录、调用入口（README「Self-Incubating Extensions」段）。

### 重启生效说明

!!! tip "配置变更需重新生成并重启"
    修改 `.env` 后需重跑 `conf_check.py` 校验，再重启 Mobius（容器：`docker compose up` 重启；直接部署：重跑 `python3 start.py`）。

---

## 2. 弊端与缺陷

!!! warning "source-available 非开源，商业使用需授权"
    Mobius 是 source-available 软件，仅供非商业用途（个人项目、学术研究、教育、内部评估）。商业使用需另行向果壳智算（北京）科技有限公司申请商业许可（business@nutshellai.cn）。出处：LICENSE「Summary」与第 3 节。

!!! warning "Logo / 前端版权信息不可移除"
    无论商业或非商业使用，均不可移除或更改 Mobius logo 与前端 `mobius/frontend/` 的版权信息；不可使用名称 / logo / 商标为衍生品背书。出处：LICENSE 第 4 节。

!!! warning "路线图项目尚未完成"
    移动端 App、桌面端 App、拓展市场、i18n 多语言本地化仍在开发中，未完全交付。出处：README「Roadmap」段。

!!! warning "配置必须先生成再校验"
    未运行 `conf_prepare.py` 生成 `.env` / 未运行 `conf_check.py` 校验，不能直接启动；配置流程不可跳过。出处：README「Quick Start」第 2 / 4 步。

!!! warning "贡献即授予商业使用权利"
    提交 Contribution 即同意以相同许可授予果壳智算，且后者可用于任何目的包括商业用途；公司可调整本许可条款。出处：LICENSE 第 5 节。

---

## 3. 后续拓展思路

### 可二次开发的方向

- **自孵化新拓展**：按 README「Self-Incubating Extensions」段的契约（前端 + 后端 handler + 数据目录 + 调用入口）添加新拓展，复用自进化机制让拓展持续迭代。
- **多协议资源接入扩展**：在 SSH / AIMUX / 可控代理之外，新增 RDP / VNC / 自定义协议 adapter，扩展可调度资源类型。
- **i18n 本地化**：把界面与文档本地化为更多语言，填补路线图中明确空缺项。

### 可对接的 DSH 能力

- **skill**：把 Mobius 的「发需求 → 自进化迭代」流程包装为 DSH Skill，让 DSH Agent 可在 Mobius 工作区内提交变更请求。
- **self-modification**：Mobius 的自进化（忒修斯船模型）与 DSH 的 self-modification 在理念上同源，可作为对照参考实现。
- **MCP**：Mobius 模型无关，可把 DSH 自身作为一个「执行引擎」接入 Mobius 的任务网络（与 GPT / Claude / GLM-5.2 / Codex 并列）。

### 与其它插件组合的可能性

- **mobius + jacobian**：把 Jacobian 的精确数学验证作为 Mobius 自动科研 pipeline 的一环，对实验结论做独立 `VERIFIED` 检验。
- **mobius + dsh-net-proxy**：让 Mobius 调度的远程资源经 dsh-net-proxy 配置的统一代理出口，集中管控网络策略。
- **mobius + AgentFrame-v3**：把 AgentFrame 的长期记忆 / 上下文压缩后端接入 Mobius 的多智能体协作，缓解长会话上下文膨胀。
