# 插件配置目录

每个 `config:` 块均可由 `cordis.yml` 条目设置：针对每个可加载的 harness 包，原样列出其 `apply` 函数或服务构造函数接收的配置声明（包括 JSDoc），并附上所有引用类型——包内类型直接粘贴，其他类型则提供链接。

!!! info "文档性质"
    这是**以部署为轴**的参考文档。粘贴的内容是插件声明的完整配置类型——运行时 schema 有意排除的字段是仅供运行时使用的 seam（其自身的 JSDoc 会如此说明），不能通过 `cordis.yml` 设置。

    - 插件作者所依据的连接方式请参阅各[子系统页面](https://deepseek-harness.github.io/deepseek-harness/reference/subsystems/core)中的生成 `cordis-surface` 区域
    - 面向模型的工具 schema 请参阅[工具目录](https://deepseek-harness.github.io/deepseek-harness/reference/tool-catalog)
    - [subsystems/](https://deepseek-harness.github.io/deepseek-harness/reference/subsystems/core) 记录了这些声明所引用的类型

## 如何阅读

- **`Requires:` 行**列出插件通过 `inject` 注入的服务键：其 `cordis.yml` 树还必须加载这些服务的提供者。
- **`依赖:` 行**列出配置类型引用的其它类型，包内类型直接粘贴，其他类型提供链接。
- **`来源:` 行**指向声明所在的源码文件与行号。
- 范围限定为 harness 层级（`packages/`）；配置树还可能加载的 vendored cordis 插件（`hmr`、控制台日志记录器等）固定为上游源代码，未收录于此目录。

英文源文件由源代码（`scripts/gen-config-catalog.ts`）生成，并通过 `pnpm run verify-config-catalog`（`doc-sync` 的一部分）验证新鲜度。英文生成器还会将运行时 schemastery schema 与粘贴的声明进行交叉核对——每个经 schema 验证的键（包括嵌套键）都必须能在声明的配置类型中找到——因此，粘贴内容无法隐藏加载器接受的字段。

## 常用包配置示例

以下是几个高频使用包的配置声明。完整目录（含所有 `packages/` 下的包）见[官方配置目录](https://deepseek-harness.github.io/deepseek-harness/reference/config-catalog)。

### `@deepseek-ai/dsh-agent-default-model`

组合条目，用于默认模型选择。

```ts
/** Composition entry for the default model selection. */
export interface Config {
  /** Registered provider route. */
  provider: string
  /** Provider-owned model id. */
  model: string
}
```

来源：[`packages/core/agent-default-model/src/index.ts`](https://github.com/deepseek-ai/deepseek-harness/blob/master/packages/core/agent-default-model/src/index.ts)

### `@deepseek-ai/dsh-agent-loop`

需要：`agents` · `sessions` · `llm` · `tools` · `systemPrompt`

```ts
/** Agent-loop plugin configuration. */
export interface Config {
  /**
   * Maximum parallel-safe calls in flight per agent step. `1` is serial;
   * omission defaults to DEFAULT_MAX_PARALLEL_TOOL_CALLS.
   */
  maxParallelToolCalls?: number
  /** Agents created or resumed at plugin startup. */
  agents: (AgentOptions & {
    /** Stable config label used in logs and as the fresh combined-id prefix. */
    id: string
    /** Optional stable identity; remounts resume its materialized history, while first use creates it fresh. */
    sessionId?: SessionId
    /** Optional workspace for a fresh session. */
    cwd?: string
    /** Persisted session to resume instead of creating a fresh session. */
    resumeSessionId?: SessionId
  })[]
}
```

依赖：[`AgentOptions`](https://deepseek-harness.github.io/deepseek-harness/reference/subsystems/core) · [`SessionId`](https://deepseek-harness.github.io/deepseek-harness/reference/subsystems/core)

来源：[`packages/core/agent-loop/src/index.ts`](https://github.com/deepseek-ai/deepseek-harness/blob/master/packages/core/agent-loop/src/index.ts)

### `@deepseek-ai/dsh-agent-instructions`

用户面向的 workspace 指令加载器配置。

```ts
/** User-facing workspace instruction loader configuration. */
export interface Config {
  /** Harness home containing the fixed user-global `AGENTS.md`; defaults to `$DSH_HOME` or `~/.dsh`. */
  dshHome?: string
  /** Directory entries that identify the project root while walking upward from the session cwd. */
  projectRootMarkers?: string[]
  /** UTF-8 byte cap for one rendered baseline or dynamic batch; non-positive or non-finite disables loading. */
  maxBytes: number
  /** Maximum UTF-8 bytes read from one instruction file; larger files are ignored. */
  maxSourceBytes?: number
  /**
   * Ordered same-directory project candidates; every existing file loads, with
   * per-directory trimmed-content duplicates collapsed to the earliest candidate.
   */
  instructionFileCandidates?: string[]
  /**
   * Ordered same-directory local-overlay candidates loaded after the base files
   * under the same per-directory trimmed-content dedup; empty disables the overlay.
   */
  localInstructionFileCandidates?: string[]
}
```

来源：[`packages/context/agent-instructions/src/config.ts`](https://github.com/deepseek-ai/deepseek-harness/blob/master/packages/context/agent-instructions/src/config.ts)

### `@deepseek-ai/dsh-acp`

需要：`agents`

```ts
/** Plugin config: the provider/model selection used for each ACP-created agent. */
export interface AcpConfig {
  /** Provider route for created agents. */
  provider?: string
  /** Model name for created agents. */
  model?: string
  /** Runtime-only transport override; production uses stdio. */
  stream?: Stream
}
```

依赖：`Stream`（`@agentclientprotocol/sdk`）

来源：[`packages/acp/acp/src/index.ts`](https://github.com/deepseek-ai/deepseek-harness/blob/master/packages/acp/acp/src/index.ts)

## 完整目录

本页仅列出常用包以供快速查阅。完整的自动生成配置目录（覆盖 `packages/` 下全部可加载包）请参阅官方文档：

→ [官方配置目录（完整）](https://deepseek-harness.github.io/deepseek-harness/reference/config-catalog)

!!! tip "保持新鲜"
    完整目录由 `scripts/gen-config-catalog.ts` 从源码生成，并通过 `pnpm run verify-config-catalog` 验证新鲜度。升级 dsh 后请以官方目录为准，避免使用过时的字段。
