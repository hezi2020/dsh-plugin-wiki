# 事件系统

事件是 Cordis 插件间通信的核心机制。Harness 大量使用事件来实现松耦合的扩展点。

## 基本用法

### 监听事件

```ts
ctx.on('event-name', (payload) => {
  // 处理事件
})
```

### 触发事件

```ts
ctx.emit('event-name', payload)
```

## 事件模式

Cordis 提供多种事件模式，适用于不同的交互契约。

### emit — 广播

所有监听器同步执行，返回值会被忽略：

```ts
// 触发
ctx.emit('my-plugin/ready', { id: 'worker-1' })

// 监听
ctx.on('my-plugin/ready', ({ id }) => {
  console.log(`${id} is ready`)
})
```

### bail — 短路

监听器按顺序运行，第一个不是 `null`、`false` 或 `undefined` 的返回值会成为最终结果：

```ts
// 派发
const result = ctx.bail('some-check', input)

// 监听：返回值会停止后续监听器
ctx.on('some-check', (input) => {
  if (shouldBlock(input)) return 'blocked'
  // 返回 null、false 或 undefined 以继续到下一个监听器
})
```

### serial — 顺序执行

监听器按注册顺序依次执行，并等待异步结果；第一个不是 `null`、`false` 或 `undefined` 的返回值会终止后续执行：

```ts
await ctx.serial('setup-phase', context)
```

### waterfall（瀑布式事件）— 流水线

每个监听器可以包装下游返回值，形成处理链。**必须调用 `next()` 传递给下游**，不调用即会短路流水线：

```ts
// 派发
const output = await ctx.waterfall('my-plugin/transform', input, async () => input)

// 监听：next() 是必需的
ctx.on('my-plugin/transform', async (_input, next) => {
  const downstream = await next()
  return downstream.trim()
})
```

!!! warning "waterfall 监听器必须调用 next()"
    不调用 `next` 会短路整个流水线，这是故意为之的设计——用于实现拦截/网关逻辑。

## 类型安全的事件

Harness 使用 TypeScript 声明合并来为事件提供类型安全：

```ts
import '@deepseek-ai/cordis'

declare module '@deepseek-ai/cordis' {
  interface Events {
    'my-plugin/ready': (payload: { id: string }) => void
    'my-plugin/check': (input: string) => boolean | undefined
    'my-plugin/transform': (input: string, next: () => Promise<string>) => Promise<string>
  }
}

// ctx.on('my-plugin/ready', ...) 和 ctx.emit('my-plugin/ready', ...)
// 现在都能正确推断类型
```

## Cordis 事件与会话记录

Harness 的 Cordis 事件遵循 `namespace/action` 命名，例如 `agent/step`、`agent/request`、`agent/request-error`、`tools/result` 和 `session/event`。完整签名与触发模式见[子系统页面](https://deepseek-harness.github.io/deepseek-harness/reference/subsystems/core)上生成的 `cordis-surface` 区块。

!!! info "持久化会话事件 ≠ 同名 Cordis 事件"
    `turn/*`、`step/*`、`tool/call`、`tool/result` 和 `compaction/*` 是持久化的会话事件类型，不是同名 Cordis 事件。需要观察它们时，监听 `session/event` 并检查 `event.type`。

## 事件监听器也是效果

通过 `ctx.on()` 注册的监听器会在插件卸载时自动移除：

```ts
export function apply(ctx: Context) {
  // 该监听器在插件 dispose 时移除
  ctx.on('tools/result', handler)
}
```

## 示例：日志插件

这个插件记录工具调用和工具结果：

```ts
import type { Context } from '@deepseek-ai/cordis'
import '@deepseek-ai/dsh-tools'

export const name = 'tool-logger'

export function apply(ctx: Context) {
  ctx.on('tools/result', (exec, result) => {
    console.log(`[tool] ${exec.name}(${JSON.stringify(exec.arguments)})`)
    const text = result.content
      .map(block => block.type === 'text' ? block.text : '')
      .join('')
    console.log(`[tool result] ${text.slice(0, 100)}`)
  })
}
```

## 下一步

- [能力分层](../practice/capability-layers.md) — 了解能力接口中的事件
- [LLM 适配器](../practice/llm-adapter.md) — 实现一个完整的 LLM 后端
