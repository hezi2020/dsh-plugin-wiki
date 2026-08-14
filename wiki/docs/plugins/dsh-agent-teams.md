# dsh-agent-teams

> **插件名**：dsh-agent-teams
> **来源仓库**：<https://github.com/NanmiCoder/dsh-agent-teams>（公开镜像；原 `dsh-external/dsh-agent-teams` 为私有仓库）
> **许可证**：MIT
> **commit SHA**：`874654fcaabb1ae16b64503407370c23099f33b9`（前 7 位 `874654f`）

DeepSeek Harness 的多智能体团队协作插件：一句自然语言即可创建团队、拉成员、拆任务并声明依赖，成员间直接收发消息协作，并在 Web GUI 右上角实时展示团队活动面板。核心语义移植自 Claude Code 的 AgentTeams。

---

## 1. 使用指南

### 前置依赖

- Node.js `^22.19` 或 `>=24`
- pnpm 11
- 已安装或可通过 `npx` 使用 DeepSeek Harness
- !!! tip "私有仓库凭证"
    原仓库 `dsh-external/dsh-agent-teams` 为私有仓库，`github:` 安装依赖本机 git 对该仓库的读取权限（SSH key 或带 `repo` 权限的 HTTPS token）。本 Wiki 文档基于公开镜像 `NanmiCoder/dsh-agent-teams` 编写。

### 安装命令

```sh
npx -p @deepseek-ai/dsh dsh plugin --profile web add github:NanmiCoder/dsh-agent-teams
```

`dsh plugin` 会把插件加入 `web` profile，并根据包内的 `dsh.bundle` 声明自动启用它；工具、系统提示和 Web 客户端入口随该 profile 一起加载。

### 配置项

在 profile 的 `cordis.patch.yml` 中覆盖默认值（来源：`docs/usage.md` 配置章节）：

```yaml
- id: agent-teams
  config:
    stateDir: .agent-teams        # 团队状态目录名（工作区下）
    memberProvider: spawn         # 成员子代理 provider（spawn / fork）
    memberModel: deepseek-v4      # 可选：成员模型覆盖
    memberMaxDepth: 1             # 成员再委派深度上限（0 = 禁止）
    maxMembers: 8                 # 团队人数上限
```

### 典型用法示例

**自然语言触发**：安装并重启后，直接对助手说：

```text
用 AgentTeams 帮我调研一下开源 RAG 框架的选型，输出对比报告
```

插件内置提示段会指导模型按协议执行：建团队 → 按角色拉成员 → 拆任务声明依赖 → 领取并唤醒成员 → 轮询 `agent_teams_status` 收集产出 → 汇报后 `agent_teams_delete`（归档保留）。

**CLI 入口**：本插件无独立 CLI，全部通过 DSH 会话内的 9 个 `agent_teams_*` 工具触发：

| 工具 | 作用 |
|---|---|
| `agent_teams_create` | 创建团队，调用者成为队长 |
| `agent_teams_add_member` | 拉成员入队（spawn 可续聊子代理 + 成员 persona） |
| `agent_teams_remove_member` | 移除成员（尽力打断其当前轮次） |
| `agent_teams_create_task` | 创建任务，支持 `dependencies` 依赖声明与 `assignee` 指派 |
| `agent_teams_claim_task` | 领取任务（校验依赖） |
| `agent_teams_update_task` | 推进任务状态并写入 `output` 结果 |
| `agent_teams_send_message` | 任意成员→任意成员/队长，直达邮箱并唤醒 |
| `agent_teams_status` | 团队全景：成员活动、任务清单、邮箱、待读消息 |
| `agent_teams_delete` | 结束团队：打断成员，目录归档保留 |

### 重启生效说明

!!! tip "重启 + 刷新"
    安装完成后需**重启正在运行的 DeepSeek Harness Web 服务并刷新页面**，工具与活动面板才会随 profile 加载。

---

## 2. 弊端与缺陷

!!! warning "成员无常驻轮询"
    成员仅在收到消息（被唤醒）后才行动，没有常驻轮询；队长离线时消息留在邮箱、待队长下次操作时投递。出处：`PLUGIN.md` 已知限制、`docs/usage.md` 已知限制章节。

!!! warning "一个队长同时只能带一个团队"
    与 Claude Code AgentTeams 一致，同一队长会话不能并行带多个团队。出处：`PLUGIN.md` 已知限制、`docs/usage.md` 已知限制章节。

!!! warning "多进程操作同一团队不保证一致"
    团队状态为文件级持久化（`<workspace>/.agent-teams/<teamId>/`），多进程同时操作同一团队不保证一致；同一 dsh 进程内已用锁串行化。出处：`PLUGIN.md` 已知限制。

!!! warning "成员 persona 替换部署默认 persona 且保留完整工具集"
    成员 persona 替换部署默认 persona；成员仍拥有完整工具集（bash/fs/web 等），无最小权限隔离。出处：`PLUGIN.md` 已知限制、`docs/usage.md` 已知限制章节。

!!! warning "活动面板与事件流相互独立"
    活动面板读磁盘真相（1s 轮询），与会话日志事件流相互独立；成员（模型）不总是严格走工具"仪式"（如完成时不调 `agent_teams_update_task`），面板如实反映磁盘真相。出处：`docs/usage.md` 已知限制章节。

!!! warning "内测版本兼容：服务键名在 rc.1 / rc.2 间不同"
    npm `latest`（`0.0.1-rc.1`）服务键为 `ctx.httpServer` / `ctx.workspace`，`next`（`rc.2`）重命名为 `ctx.webServer` / `ctx.workspaceRegistry`。插件对两组键都做了探测，但仍属 developer preview 期的 breaking change 风险。出处：`PLUGIN.md` 已知限制、`docs/usage.md` 工作原理章节。

!!! warning "DSH 主线 developer preview 期 breaking changes"
    插件 peer 依赖 `@deepseek-ai/*` 系列 rc 版本，DSH 主线仍在 developer preview，后续版本可能引入 breaking changes。

---

## 3. 后续拓展思路

### 可二次开发的方向

- **跨团队调度器**：在 `agent_teams_*` 工具之上封装一个"项目经理"层，支持多团队排队、队长资源池化，突破"一个队长同时只能带一个团队"的限制。
- **任务依赖图可视化**：当前活动面板展示任务栈与依赖提示，可基于磁盘状态文件（`team.json`）渲染完整的 DAG 依赖图，并支持点击节点跳转成员会话。
- **成员权限收敛**：为成员 persona 引入最小工具集白名单（如只读 fs、限定 web 域），缓解"成员拥有完整工具集"的安全顾虑。

### 可对接的 DSH 能力

引用 `docs/usage.md` 工作原理章节列出的能力接缝：

- **subagent**：复用 `ctx.subagents.startContinuable()` / `followup()` / `listChildren()` 创建、唤醒、查询成员。
- **tools**：通过 `ctx.tools` 注册表挂载 9 个团队工具（与 `tool-workflow` 同一注册路径）。
- **systemPrompt**：`ctx.systemPrompt.section()` 注册"AgentTeams 使用策略"提示段。
- **Web server 路由**：活动面板数据路由 `/plugins/dsh-agent-teams/state` + 鲸鱼图片静态服务。
- **workflow / skill**：可将团队协作协议封装为可复用 Skill（仓库已附 `skills/dsh-plugin-development/SKILL.md` 样例）。

### 与其它插件组合的可能性

- **dsh-agent-teams + dsh-vision-toolkit**：组合"视觉多智能体"——研究员成员用 `vision_glance`/`vision_ground` 看图，工程师成员用 `vision_html_screenshot` + `vision_pixel_diff` 做视觉回归，队长汇总。
- **dsh-agent-teams + dsh-better-sidebar**：团队活动面板与 better-sidebar 的子代理拓扑 tab（`subagent` 内置 tab）互补，前者看团队语义，后者看 agent 拓扑真相。
- **dsh-agent-teams + dsh-web-ui 任务看板**：把团队任务栈与 web-ui 的任务看板（五列状态 + cron 定时）打通，实现"团队产出回写看板"。
