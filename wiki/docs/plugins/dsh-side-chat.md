# dsh-side-chat

> **插件名**：dsh-side-chat（@ahggg/dsh-side-chat）
> **来源仓库**：<https://github.com/AHGGG/dsh-side-chat>
> **许可证**：MIT
> **commit SHA**：`cf2c807`（前 7 位 `cf2c807`）

Codex 风格的 DSH 侧边对话：在不离开当前 DeepSeek Harness 主会话的情况下，针对选中的文本发起一个独立的侧边对话进行追问，主会话保持不被打断。第一次发送时会在所选消息处创建一个真实的 DSH Session fork，child 继承完整事件前缀、模型配置、preset 与 workspace。

---

## 1. 使用指南

### 前置依赖

- **严格兼容 `@deepseek-ai/dsh@0.1.0-rc.6`**：所有 DSH peer 依赖均 pin 到 rc.6，不对其它版本做兼容承诺。
- Node.js `^22.19.0 || >=24.0.0`（package.json `engines`）
- 运行时 dependencies：`@deepseek-ai/cordis 4.0.1`、`zod 4.4.3`
- peer 依赖（均为 `0.1.0-rc.6`）：`@deepseek-ai/dsh-agent`、`@deepseek-ai/dsh-agent-presets`、`@deepseek-ai/dsh-api-remotes`、`@deepseek-ai/dsh-client-runtime`、`@deepseek-ai/dsh-client-ui-layout`、`@deepseek-ai/dsh-client-ui-slots`、`@deepseek-ai/dsh-session`、`@deepseek-ai/dsh-typert-protocol`、`@deepseek-ai/dsh-user-questions`、`@deepseek-ai/dsh-workspace`；以及 `react >=18.2.0 <20.0.0`
- Host 侧 inject 服务：`agents`、`sessionPersistence`、`workspaceRegistry`（`DshSideChatPlugin.static inject`）
- 客户端 inject 种子模块：`@deepseek-ai/dsh-client-runtime`、`@deepseek-ai/dsh-api-remotes`、`@deepseek-ai/dsh-client-ui-conversation`、`@deepseek-ai/dsh-client-ui-layout`、`@deepseek-ai/dsh-client-ui-slots`

### 安装命令

必须先安装 DSH rc.6，再把插件添加到 Web profile：

```powershell
npm install --global @deepseek-ai/dsh@0.1.0-rc.6
dsh plugin --profile web add @ahggg/dsh-side-chat
```

从希望 Agent 操作的真实工程目录启动 DSH：

```powershell
cd E:\path\to\your-project
dsh web --port 3080
```

打开 DSH 输出的网址，插件会自动加载到 Web 客户端。`cordis.patch.yml` 仅一行 `- insert: - id: side-chat`，挂载由 `dsh.bundle.patch` 自动完成，无需手改文件。

### 配置项

本插件未暴露任何用户可配置项（`src/index.ts` 的 `DshSideChatPlugin` 继承自 `TypertRemoteService`，无 `Config` / `schema` 定义）。所有行为均为内置常量：

| 常量 | 含义 |
|---|---|
| 选区上限 16 KiB（UTF-8） | 选区文本经 UTF-8 编码后不得超过 16 KiB |
| 选区必须位于同一条已完成消息内 | 跨消息选区被拒绝 |
| Typert Remote namespace | `sideChatArchived`（继承自 `TypertRemoteService(ctx, 'sideChat', { namespace: 'sideChatArchived' })`） |

### 典型用法

1. 在主会话中至少完成一轮对话；
2. 在一条已完成的用户或助手消息内选中文字；
3. 点击 `Ask in side chat`；
4. 输入问题，按 `Enter` 发送；
5. 完成后按 `Esc`，或点击 `×` 关闭。

常用操作：

- `Shift+Enter` 换行；
- 输入框会随内容自动增高，达到最大高度后在内部滚动；
- hover `1 annotation` 可预览所选文本；
- 第一次发送前，hover annotation 并点击 `×` 可移除引用；
- 主会话会一直保留在页面中，不会自动切换到 child Session。

**会话与数据处理**：第一次发送时，插件在所选消息处创建一个真实的 DSH Session fork，child 继承完整事件前缀、模型配置、preset 与 workspace。保持前缀不变有利于供应商 prompt cache 复用，但不保证一定命中。关闭 Side Chat 时停止正在运行的任务、归档 child Session 并释放其 Agent，不删除磁盘历史。

### 重启生效说明

!!! tip "安装/升级/卸载后需重启 DSH Web"
    `dsh plugin add` / `remove` 后需重启 `dsh web`，插件才会被 Web 客户端加载或卸载。升级同用 `dsh plugin --profile web add @ahggg/dsh-side-chat` 覆盖安装并重启。

!!! tip "Side Chat 用 Esc 或 × 关闭，关闭即归档"
    关闭 Side Chat 会停止活动任务、归档 child Session 并释放 Agent；不会删除 child 的磁盘历史。如需彻底清理，需手动在 Session 存储中删除归档的 child。

---

## 2. 弊端与缺陷

!!! warning "严格仅适配 DSH 0.1.0-rc.6，不对其它版本做兼容承诺"
    README 顶部与 `docs/dsh-compatibility.md` 明确声明：所有 DSH peer 依赖均 pin 到 `0.1.0-rc.6`，不对其它版本做兼容承诺。DSH 升级后插件可能失效，需等待作者更新。出处：README 顶部兼容性声明、`docs/dsh-compatibility.md`、package.json `peerDependencies`。

!!! warning "选区限制严格：必须位于同一条已完成消息内且 ≤ 16 KiB"
    rc.6 Client 仅读取出现在 `[data-chat-flow]` 与某条 `[data-chat-anchor-key]` 消息内的浏览器选区。合法选区需：含可见非空文本、位于同一条已完成的 user/assistant/context 消息内、UTF-8 编码后 ≤ 16 KiB、首次发送时仍属于当前父会话。跨消息、超长、跨会话选区均被拒绝。出处：`docs/selection-contract.md`、README「当前限制」。

!!! warning "暂不支持附件、Add to conversation 与 /side"
    当前版本不支持在 Side Chat 中发送附件、把 Side Chat 内容追加回主会话，以及 `/side` 命令。出处：README「当前限制」。

!!! warning "关闭后不能从面板重新打开原 Side Chat"
    关闭 Side Chat 后无法从面板重新打开同一 Side Chat；如需继续需重新选中文本发起。出处：README「当前限制」。

!!! warning "无自动历史清理，child 与复制前缀占用正常 Session 存储"
    关闭仅归档 child Session 并释放 Agent，不删除磁盘历史；child 与复制的完整事件前缀会占用正常的 DSH Session 存储空间，长期使用会累积。无"保留为普通会话"或自动清理操作。出处：README「会话和数据如何处理」、`docs/privacy-and-retention.md`。

!!! warning "崩溃或强制退出可能阻止归档，child 仍可见"
    若发生崩溃或强制退出，归档流程可能未执行，child Session 仍会出现在普通会话导航中，需手动处理。出处：`docs/privacy-and-retention.md`。

!!! warning "父子共享同一 workspace，Side Chat 副作用是真实的且不回滚"
    父会话与 child 共享同一 workspace 与正常 DSH 工具权限。Side Chat 中的文件修改、命令执行及外部副作用都是真实的，关闭面板不会撤销。误操作会直接影响主工程。出处：README「会话和数据如何处理」、`docs/privacy-and-retention.md`、`docs/threat-model.md`。

!!! warning "选中文本会被写入 child 首条 prompt 并落入 Session 存储"
    选中文本会被放入 child 的首条 prompt（作为引用展示在面板并加入首条 child prompt）。插件本身不记录选中文本，但 child Session 会落入正常 Session 存储，受 Session 存储策略约束。出处：`docs/selection-contract.md`、`docs/privacy-and-retention.md`。

!!! warning "部署模型限定为本地 DSH Web/Desktop，远端暴露需单独评审"
    `docs/threat-model.md` 明确：预期部署为本地 DSH Web/Desktop profile。将 DSH Host 暴露给不可信远端用户需单独做访问控制评审。Host 侧解析 parent、fork 前缀、模型选项、preset、workspace 与 child id，浏览器无法提供这些内部值；create/close Remote 仅接受操作所需的小字段，close 只能针对本插件实例当前持有的 child。出处：`docs/threat-model.md`。

!!! warning "child 复制完整前缀不插入额外 system/developer 消息，不保证缓存命中"
    child 复制完整合法事件前缀，并在第一条新 user 问题前不插入额外 system/developer 消息（对 prompt cache 友好），但不保证一定命中供应商缓存——缓存未命中时成本可能高于预期。出处：`docs/privacy-and-retention.md`。

---

## 3. 后续拓展思路

### 可二次开发的方向

- **附件与 Add to conversation 支持**：补齐当前缺失的附件发送、把 Side Chat 关键结论追加回主会话（`Add to conversation`），以及 `/side` 命令入口，形成完整侧路工作流。
- **归档 child 的清理与复活**：增加自动清理策略（按时间/按数量）与"保留为普通会话"操作；支持从归档列表重新打开某次 Side Chat。
- **多 Side Chat 并行**：当前面板为单实例，可扩展为多标签侧边对话，针对不同选段同时追问。
- **选区上限可配置**：把 16 KiB 选区上限抽成配置，适配更长代码块的侧路讨论需求。

### 可对接的 DSH 能力

- **TypertRemoteService**：本插件是继承 `TypertRemoteService` 并以 `namespace: 'sideChatArchived'` 注册 Remote 的范例，可作为其它"宿主侧 Remote 服务 + 客户端面板"型插件的模板。
- **shell.overlay slot**：客户端经 `@deepseek-ai/dsh-client-ui-slots` 的 `shell.overlay` 加性槽位挂载面板，是覆盖层式 UI 的参考。
- **Session fork**：基于 `sessionPersistence` 与 `workspaceRegistry` 在指定消息处创建 fork，是"基于历史分叉"模式的范例。
- **data-chat-* DOM 锚点**：选区契约依赖 `[data-chat-flow]` / `[data-chat-anchor-key]`，可作为对 DOM 结构敏感的客户端插件的兼容性参考。

### 与其它插件组合的可能性

- **dsh-side-chat + dsh-workspace-search**：在 Side Chat 中追问时，用工作区搜索快速定位相关文件并引用，辅助针对选中代码的边路调研。
- **dsh-side-chat + dsh-vision-router**：对主会话中的截图结果在 Side Chat 里发起 `vision_describe` 追问，不打断主会话节奏。
- **dsh-side-chat + dsh-token-monitor**：Side Chat 产生的 fork 与追问会消耗 token，可由 token-monitor 统一观测，避免侧路用量失控。
- **dsh-side-chat + dsh-better-sidebar**：Side Chat 面板与 better-sidebar 的多 Tab 侧栏在 UI 层可互为补充——侧边对话做短期聚焦，better-sidebar 做长期文件/搜索导航。
