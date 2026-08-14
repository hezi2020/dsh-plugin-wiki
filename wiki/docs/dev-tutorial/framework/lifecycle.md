# 插件与生命周期

本页介绍 Cordis 插件模型和生命周期状态机。

## Fiber 状态机

每个被加载的插件都拥有一个 **Fiber** 作用域，其状态如下：

```text
PENDING → LOADING → ACTIVE
                  ↘ FAILED
ACTIVE → UNLOADING → DISPOSED
```

| 状态 | 含义 |
|---|---|
| PENDING | 已声明，但所需依赖未就绪 |
| LOADING | 依赖就绪，正在执行 `apply` |
| ACTIVE | 插件运行中 |
| FAILED | `apply` 抛出异常 |
| UNLOADING | 插件正在卸载并释放资源 |
| DISPOSED | 已完全卸载 |

## 依赖驱动的加载

声明了 `inject` 的插件会等待所有必需服务就绪：

```ts
export const inject = ['tools', 'llm']

export function apply(ctx: Context) {
  // ctx.tools 和 ctx.llm 在这里就绪
}
```

如果依赖的服务消失（例如提供方被替换时），插件会被自动卸载（ACTIVE → DISPOSED），待服务恢复后重新加载。

## 自动清理机制

通过 `ctx` 做的任何注册，在插件卸载时都会自动撤销：

```ts
export function apply(ctx: Context) {
  // 事件监听：卸载时自动移除
  ctx.on('some-event', handler)

  // 自定义资源：返回的 disposer 在卸载时运行
  ctx.effect(() => {
    const connection = createConnection()
    return () => connection.close()
  })
}
```

以下操作都会被自动追踪和清理：

- `ctx.on(event, handler)` — 事件监听
- `ctx.tools.register(tool)` — 工具注册
- `ctx.llm.registerAdapter(names, adapter)` — LLM 适配器注册
- `ctx.effect(() => cleanup)` — 自定义资源

!!! note "disposer 执行顺序"
    插件卸载时，处置器按注册顺序的逆序开始调用，但多个异步处置器会并发执行，不保证逐个完成。存在顺序依赖的清理步骤必须放进同一个 `ctx.effect()` 返回的处置器中，由该处置器负责串行等待。

## 嵌套上下文

`ctx.plugin()` 创建子 Fiber，它继承父上下文但有独立的生命周期：

```ts
export function apply(ctx: Context) {
  // 注册一个子插件
  ctx.plugin(childPlugin)

  // 子插件有自己的 Fiber，并随父插件一同卸载
}
```

## dispose（资源释放）语义

当你需要提前终止一个插件实例：

```ts
import type { Context } from '@deepseek-ai/cordis'

declare const ctx: Context
declare function myPlugin(ctx: Context): void

const fiber = ctx.plugin(myPlugin)

// 之后手动释放
await fiber.dispose()
```

`dispose` 保证：

1. 该插件拥有的所有注册均被移除
2. 它的子插件也被递归卸载
3. 返回的 Promise 会在所有异步清理完成后兑现

## HMR（热模块替换）

通过 `cordis.yml` 加载 `@deepseek-ai/cordis-plugin-hmr` 后，修改插件源文件会触发：

1. 卸载旧插件（清理所有注册）
2. 重新加载新代码
3. 执行新的 `apply`

因为插件注册会被自动清理，所以热替换不会保留旧实例的注册。

## 生命周期示例

```ts
export function apply(ctx: Context) {
  console.log('plugin loading')

  ctx.effect(() => {
    console.log('effect registered')
    return () => console.log('effect cleaned up')
  })
}
```

加载时输出：

```text
plugin loading
effect registered
```

卸载时输出：

```text
effect cleaned up
```

## 下一步

- [服务与依赖](./service.md) — 让插件向其他插件提供能力
- [事件系统](./events.md) — 在插件之间通信
- [Cordis 框架教程](../cordis-tutorial/index.md) — 在 Cordis 运行时上逐步搭出同一套生命周期、服务与事件
