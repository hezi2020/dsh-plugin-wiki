# Web UI 使用指南

Web UI 是 DeepSeek Harness 最常用的交互入口。本页介绍如何启动并使用它的各个视图。

## 启动 Web UI

通过 npm 包或源码启动，二者等价：

```bash
# npm 快速路径
npx @deepseek-ai/dsh web

# 源码路径（仓库根目录下）
pnpm dsh web
```

`dsh web` 是 `dsh --profile web` 的别名，启动后输出：

```text
dsh web: http://127.0.0.1:3080
```

!!! info "默认端口 3080"
    Web UI 默认监听 `127.0.0.1:3080`。如需指定端口，把 `--port` 传给 web app（注意它属于 app 参数，不是 launcher 参数）：
    ```bash
    dsh web --port 8080
    ```

`dsh` 进程以其调用目录作为默认文件系统位置，但**全新 Web UI 在你添加一个 workspace 之前不会选中任何 workspace**。

## 首次使用流程

### 1. 配置模型

打开 **Settings → Models**，在 DeepSeek 卡片中填入 API key 并保存。模型路由立即生效，**无需重启服务**。

!!! note "密钥只写不读"
    密钥是 write-only 的：页面保存后只接收脱敏描述符，永不返回明文。密钥存储在 `$DSH_HOME/.credentials.yaml`，settings 中只保留其凭证引用。

其他 provider（Anthropic、OpenAI、Bedrock、Vertex、Azure 等）或自定义 OpenAI 兼容端点，参见 [配置与 Profile](configuration.md)。

### 2. 选择 workspace

点击 **Choose workspace**，添加你启动 `dsh` 时所在的项目目录并选中它。

!!! warning "未选 workspace 不可发任务"
    会话编辑器（session composer）在未选中 workspace 时不可用。必须先选 workspace 才能发送任务。

### 3. 运行任务

启动一个会话，发送例如：

> Summarize this repository and identify its main packages.

agent 可以读写 workspace 文件、运行命令、委派子任务、维护计划。在活跃权限策略下，需要审批的操作会先征求你同意。

## 各视图说明

Web UI 主要由以下视图组成。

### Chat（对话）

主对话视图，是你与 agent 交互的核心区域。

- 发送任务、接收回复、附加文件。
- agent 的工具调用、计划、子代理调度等都会在此呈现为 Conversation Node。
- 需要审批的操作会以交互卡片形式弹出。

### Trajectory（轨迹 / 会话日志）

轨迹视图基于 session 的 append-only 事件流，按 **source** 分类展示会话的完整历史。

!!! tip "什么是 Trajectory"
    每个 session 是一个 append-only 的 `SessionEvent` 日志，包含系统提示、推理、工具调用与结果、子代理调度、上下文注入等。Trajectory 视图把这些事件按来源（source）分类呈现，让你看清 agent 每一步的来龙去脉。详见 [Session 与 Trajectory](session-trajectory.md)。

可观察的内容包括：

| 事件类型 | 说明 |
|---|---|
| `user/message` | 用户输入或注入的上下文（文件变更通知、skill 内容等） |
| `assistant/message` | 模型回复（含 provider/model 信息与 token 用量） |
| `assistant/chunk` | 原始流式分片，保留 token 级回放保真度 |
| `tool/call` → `tool/result` | 工具调用与结果 |
| `turn/*` / `step/*` | 回合与步骤边界 |
| `todo/write` | todo 列表快照 |

### Skills（技能）

技能视图展示已注册的 skill 目录。skill 是 agent 可加载的领域知识包，例如仓库约定、插件开发指南等。

- 标准模式下，agent 通过 `tool-skill` 工具加载技能。
- 技能来源包括部署级全局注册与 preset 自带的本地技能目录。
- 创造模式（cordis preset）额外携带 `editing-cordis-compositions` 与 `cordis-plugin-development` 技能，用于指导 preset 创作。详见 [运行时模式](runtime-modes.md)。

### Settings（设置）

设置视图管理用户配置，核心是 **Models** 子页：

- **DeepSeek 卡片**：单个 API-key 字段，填入即用。
- **Add provider**：从已安装目录选择 provider（如 Anthropic、OpenAI），填入其 API key。
- **Add a custom provider**：为公司网关、自托管服务器或目录外的 provider 配置——需提供 Provider ID、base URL、API 协议、凭证与至少一个模型。

!!! note "Provider ID 永久不可改"
    Provider ID 是永久标识，请求、保存的会话、模型默认值与凭证引用都使用它。要"改名"需新增 provider 再删除旧的；显示名、base URL、协议、凭证、模型列表则可编辑。

!!! warning "原生认证的 provider"
    Bedrock、Vertex、Azure、Codex 等需要原生凭证（AWS 凭证 + region、ADC project、api-version、OAuth 等），仅填 API-key 字段无法配置它们。

模型配置的详细字段（`input` 模态、`defaultInput`、`modelOverrides` 等）参见 [配置与 Profile](configuration.md)。

## 运行时模式入口

Web UI 中可选用不同的 agent preset（运行时模式）。四种内置模式：

| 模式 | 适用场景 | 详见 |
|---|---|---|
| 标准模式（standard） | 功能完整的编码 Agent | [运行时模式](runtime-modes.md) |
| PTC 模式（code） | 标准 + Code Mode SDK，多步操作合为一个 TypeScript 程序 | [运行时模式](runtime-modes.md) |
| 极简模式（minimal） | 仅 bash + str_replace_editor，适合 benchmark | [运行时模式](runtime-modes.md) |
| 创造模式（cordis） | 标准 + 运行时检查与插件实验，用于创作新 preset | [运行时模式](runtime-modes.md) |

!!! warning "创造模式是信任边界"
    创造模式的 `cordis_mount` 会执行模型生成的 JavaScript，其创作的 composition 会被其他 session 挂载。**将该模式的会话视同 shell 访问**。

## 常见问题

- **页面能打开但发不出任务** —— 未配置 API key 或未选 workspace。先到 Settings → Models 配置密钥，再 Choose workspace。
- **`MISSING_CREDENTIAL`** —— 通过 Models 页面存储 provider key，或提供引用的环境变量。
- **`UNKNOWN_MODEL`** —— 选择一个已配置的模型，或把缺失模型加到 custom provider。
- **Fetch available models 返回 401** —— 检查 key；模型发现调用 OpenAI 兼容的 `GET /models`，不提供该端点的服务需手动填模型。
- **图片被拒发** —— 模型未声明 image 模态。给 custom provider 的模型加 `input: [text, image]`；DeepSeek 自有 chat-completions 路由仅文本，不可配置。

更多排障见 [排障笔记](troubleshooting.md)。

## 下一步

- [CLI 命令](cli.md) —— 了解 `dsh web` 之外的入口（headless、plugin 管理）
- [运行时模式](runtime-modes.md) —— 选择合适的 agent preset
- [Session 与 Trajectory](session-trajectory.md) —— 深入会话日志与可观测性
- [配置与 Profile](configuration.md) —— profile 组合与凭据管理
