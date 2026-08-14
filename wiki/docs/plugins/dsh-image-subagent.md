# dsh-image-subagent

> **插件名**：dsh-image-subagent
> **来源仓库**：<https://github.com/yuqingsh/dsh-image-subagent>
> **许可证**：MIT（Copyright (c) 2026 dsh-image-subagent contributors）
> **commit SHA**：`0887ef9`（前 7 位）

让**纯文本主模型**（如 `deepseek-v4-pro`）也能接收图片附件的 DeepSeek Harness 插件：图片不再被准入门控拒绝，而是进入会话后投影为**显式文本占位符**，由主模型委托给**视觉子代理**（多模态模型）通过 `read_attachment` / `read_image` 原生读取。**零核心补丁**——全部通过插件级 seam 实现，npx 重装、版本升级都不会失效。

---

## 1. 使用指南

### 前置依赖

- `@deepseek-ai/dsh` `>= 0.1.0-rc.6`（依赖 `internal/get`、`llm/stream` 两个 seam 与附件服务）
- pnpm（`brew install pnpm`）
- 视觉子代理（用户预设里自行配置）：
  - 模型选**声明了 image 输入**的多模态模型（如 MiniMax M3 / Kimi 视觉模型）
  - 工具集勾选 `read_attachment`、`read_image`（由核心 `dsh-tool-fs` 提供）
  - 子代理必须在本会话内派生（spawn / fork）
  - 主模型保持纯文本（如 DeepSeek V4 Pro / Flash）

### 安装命令

```sh
# 从 GitHub（推荐锁定 commit，防止后续推送改变实际运行的代码）
dsh plugin --profile web add github:yuqingsh/dsh-image-subagent#<commit-sha>

# 或从 npm（发布后）
dsh plugin --profile web add dsh-image-subagent

# 或本地 checkout / tarball
dsh plugin --profile web add ./dsh-image-subagent
dsh plugin --profile web add ./dsh-image-subagent-0.1.0.tgz
```

安装后**重启 `dsh web` 并刷新页面**。卸载/升级：

```sh
dsh plugin --profile web remove dsh-image-subagent
dsh plugin --profile web up dsh-image-subagent
```

### 配置项

| 来源 | 字段 |
|---|---|
| `cordis.patch.yml`（bundle 层） | `id: image-subagent`、`name: 'dsh-image-subagent'`、`inject: [connection, llm]` |
| 视觉子代理预设（用户在 DSH 网页 Agent 预设里配置） | 子代理模型（须声明 image 输入）、工具集（含 `read_attachment` / `read_image`）、派生方式（spawn / fork） |

- 诊断通道（可选）：`POST http://127.0.0.1:3080/image-subagent/status` 探测桥接状态（`bridged` 应含 `image`，`real` 为路由真实声明）。

### 典型用法示例

一次性配置视觉子代理：在 DSH 网页的 Agent 预设里添加一个子代理（如 `observer`）——模型选声明了 image 输入的多模态模型；工具集勾选 `read_attachment`、`read_image`；主模型保持纯文本。

日常使用：贴图 → 委托 → 读图

```
你：[贴上截图] 看看这个面板报错是什么
主模型（纯文本）：收到占位符
  "[image attachment "image.png" (image/png, 774x542 px, id=sha256:…)
   — not visible to this text-only model route; a vision-capable
   subagent can inspect it with the read_attachment tool]"
主模型：把附件 id 交给 observer 子代理，请求读图
observer（多模态）：read_attachment(sha256:…) → 完整描述图片
主模型：基于描述继续推理作答（可继续追问细节）
```

验证安装是否生效（`bridged` 应含 `image`，`real` 为路由真实声明）：

```sh
curl -s -X POST http://127.0.0.1:3080/image-subagent/status \
  -H 'content-type: application/json' \
  -d '{"type":"client-request","rpcId":"s1","method":"status","payload":{}}'
```

### 重启生效说明

!!! tip "安装后重启 dsh web 并刷新页面，与核心补丁幂等共存"
    安装后**重启 `dsh web` 并刷新页面**。与核心补丁方案兼容：若已打过核心补丁，插件投影在前、核心投影在后，二者幂等共存。已在未打任何核心补丁的 rc.6 上端到端验证：贴图准入放行（`accepted: true`）、图片入库为持久化附件、主模型收到占位符、本轮正常完成。出处：README「安装」「兼容性」。

---

## 2. 弊端与缺陷

!!! warning "插件只放行+投影，没有视觉子代理时无人能读图"
    插件只负责"放行图片 + 投影占位符"；真正看图的是用户预设里的视觉子代理。没有视觉子代理时，占位符会进入对话，但无人能读图——主模型会告知用户这一情况。出处：README「使用方法 1」。

!!! warning "子代理读图四项硬性要求缺一不可"
    子代理读图的硬性要求（缺一不可）：①子代理模型必须声明 image 输入（若子代理也是纯文本路由，本插件的投影会把图片同样变成占位符，子代理只能拿到元数据、看不到像素）；②工具集包含 `read_attachment` / `read_image`；③子代理必须在本会话内派生（附件读取按会话日志的引用授权，独立新会话无权读取该 id）；④主模型委托时把占位符里的 `attachmentId` 一并传给子代理。出处：README「使用方法 1」。

!!! warning "机制 2 是机会式原地投影的保险丝，仅覆盖绕开 ctx.llm 的直接调用"
    机制 2（`llm/stream` 瀑布）是机会式原地投影的保险丝，对绕开 `ctx.llm` 属性路径、且 options 可变的直接调用做原地改写；主流路径（agent 主循环等经 `ctx.llm` 的调用）由机制 1（`internal/get` 桥接克隆）覆盖。出处：index.js 注释、README「工作原理」。

!!! warning "仅 resolveModelInfo 补报 image，listModels 保持真实"
    仅 `resolveModelInfo` 补报 image 能力；`listModels`（模型目录/选择器）保持真实，不会误导 UI 把 DeepSeek 标成视觉模型——这是有意设计但也是限制：用户在模型选择器里看不到 DeepSeek 标成视觉模型，需理解贴图靠占位符+子代理而非主模型原生视觉。出处：README「工作原理 1」。

---

## 3. 后续拓展思路

### 可二次开发的方向

- **自带视觉子代理预设**：当前需用户手动配置 `observer` 子代理；可让插件自带一个默认视觉子代理预设（多模态模型 + `read_attachment` / `read_image`），降低配置门槛。
- **占位符多语言化**：当前占位符是英文固定文案；可随 DSH 语言设置切换中英文案。
- **多图批量投影优化**：当前逐图投影；可优化多图场景的占位符聚合（如"3 张图片附件，id 分别为…"）。

### 可对接的 DSH 能力

- **`internal/get` 瀑布**：已用此包装 `ctx.llm` 服务（resolveModelInfo 补报 + prepareCall/stream 惰性生成器 + 其余属性原样绑定）；可作为"插件级 seam 改写 LLM 服务"样例。
- **`llm/stream` 瀑布**：已用此做保险丝；可作为"机会式原地投影"样例。
- **`connection.rpc.handle`**：已用此注册诊断通道 `/image-subagent/status`；可作为"loopback 诊断 RPC"样例。

### 与其它插件组合的可能性

- **dsh-image-subagent + dsh-vision**：前者主模型委托子代理读图（无核心补丁），后者主模型直接调用 `vision` 工具（需核心补丁才能贴图）；二者可互补——前者适合"主模型 + 视觉子代理"架构，后者适合"主模型直接调用工具"架构。
- **dsh-image-subagent + modlens**：前者投影占位符 + 委托子代理，后者注册 `read_image` 工具直接读图；可让前者做"准入放行"，后者做"主模型直接读图"——但需注意二者都改 `llm` 服务可能冲突。
- **dsh-image-subagent + dsh-imagecraft**：前者主模型委托子代理读图，后者主模型直接调用 `image_vision` 工具；可按主模型是否支持工具调用选择方案。
