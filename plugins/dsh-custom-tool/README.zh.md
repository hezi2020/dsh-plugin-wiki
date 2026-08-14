# dsh-custom-tool

DeepSeek Harness 的自定义工具插件：用户在设置界面的「Custom Tool」页用 Monaco（VS Code）编辑器 + TypeScript 智能提示编写自己的 JavaScript 工具；模型也可以通过 `custom_tool_create` / `custom_tool_remove` / `custom_tools_list` 自主扩展和修剪同一套工具。所有工具持久化、热注册，并在下一步写入模型提示词。

![Custom Tool 设置页](assets/screenshots/settings-section.png)

![工具编辑器](assets/screenshots/tool-editor.png)

## 解决的问题

- **用户无法扩展自己的 agent**：以前加能力要发布 harness 包；现在一个工具就是设置里的一张表单——名字、描述、参数、代码，保存即生效、模型立即可调。
- **模型无法自我成长**：`custom_tool_create` 让模型在会话中途持久化工具（热注册，下一步即可见），且与 UI 共用同一道校验门——UI 会拒绝的东西模型同样存不进去。
- **不可信代码在进程内执行**：每次调用在独立 worker 线程的全新 `node:vm` 环境里按白名单执行并受硬预算约束，而不是在 agent 进程里裸 `eval`。

## 功能

- **设置界面**（Custom Tool 区，专属导航图标）：列表、新建、编辑、启停、删除；模型创建与工作区工具带徽章。全部文案接入 harness 语言体系（中文 / English），随语言偏好即时切换。
- **Monaco 编辑器**：VS Code 引擎 + TypeScript 语言服务；`args` 按参数 schema 生成类型，`env`/沙箱全局量有声明，补全与报错实时。编辑器与 TS worker 内联打包——客户端 bundle 单文件。
- **持久化存储**：工具存在 `custom-tools` 设置命名空间（schema 默认值、组合 base、用户文档三层，与 harness 其他设置一致）。改动即时生效，重启自动恢复。
- **热注册**：启用的工具在设置写入提交的瞬间注册进 `ctx.tools`；停用/删除立即注销。工具 schema 由 harness 自动汇入系统提示词。
- **模型自助**：`custom_tool_create`（按名 upsert）、`custom_tools_list`、`custom_tool_remove` 与 UI 共享校验门和下述归属规则。

## 作用域与权限边界

每个工具声明两种执行作用域之一。这条边界是本插件的核心安全契约：

| | `global`（默认） | `workspace` |
|---|---|---|
| 用途 | 纯计算、外部数据、工作流 | workspace 内重复性的文件任务 |
| `fetch` 网络 | 受 `allowNetwork` 配置控制 | 受 `allowNetwork` 配置控制 |
| `console`、定时器、`TextEncoder`、`URL` 等 | 有 | 有 |
| `fs` 文件能力 | **无** | `readFile` / `writeFile` / `list`，限定在本会话 workspace 根目录内 |
| `require` / `import` / `process` | 永不 | 永不 |

**workspace 作用域的隔离规则**

- 根目录 = 会话 workspace 目录（发起 agent 的 `cwd`），调用时解析。
- 相对路径从根解析；绝对路径必须落在根内；任何越界路径被显式拒绝。
- 无会话上下文时 workspace 工具直接报 `no workspace root`，不会在无边界下运行。
- 隔离是词法级的（`resolve` + 前缀检查）。workspace 内的符号链接仍可指向外部——workspace 作用域是可信代码，不是对抗恶意宿主的沙箱。下列活性预算两种作用域通用。

**存在位置**

每个工具还声明它存在哪里：

- `location: 'global'`：存在共享设置命名空间，所有 workspace 都可用，直到被删除。
- `location: 'workspace'`：存在 `<dsh home>/workspace-tools/` 下按 workspace 根路径哈希命名的独立文件里，仅对该 workspace 的会话可见（注册进对应 agent 自己的工具作用域）。

两个维度自由组合：location global + scope workspace（用户想永久保留的文件类工具，如 pdf_read）在任意被调用的 workspace 上执行 fs，授权只在创建时发生一次。

**模型的操作权限与授权**

- 模型可以自主创建、列出、删除**模型自己创建**的工具（`source: model`）。
- 创建 **global 位置**的工具需要**用户明确授权**：`custom_tool_create` 会发起 harness 审批请求（GUI 弹窗），拒绝或不可用即失败关闭。workspace 位置的工具完全自主。
- 模型**不能**删除**用户创建**的工具（`source: user`）：`custom_tool_remove` 会拒绝，提示词指引模型请用户在设置界面删除。
- 设置界面管理一切：两种来源、两种作用域、两种位置、启停、删除。

**执行预算（两种作用域通用）**

- 每次调用一个 worker 线程；超时、取消或完成即终止。
- 墙钟上限（`timeoutMs`）、堆内存上限（`memoryLimitMb`）、结果文本上限（`maxResultChars`）、代码体积上限（`maxCodeBytes`）、存储数量上限（`maxTools`）。

## 安装

```sh
dsh plugin --profile web add https://github.com/omdsh-dev/dsh-custom-tool/archive/refs/heads/main.tar.gz
dsh web   # 重启服务器以加载插件
```

包声明了 `dsh.bundle.patch`（挂载 host 插件）与 `dsh.client`（浏览器半在 `/plugins/dsh-custom-tool/client.js` 提供）。`lib/` 已提交，因此 GitHub tarball 安装无需构建即可运行。

**Harness 前置条件**：设置命名空间要通过 `packages/host/apiproxy/src/api-proxy.ts` 中的 `WEB_SETTINGS_NAMESPACES` 白名单暴露给 web 配置客户端，名单里必须有 `'custom-tools'`（上游 harness 提交 `d6ea05b5` 已加入）。缺少它时界面能渲染，但保存会被静默拒绝（`settings-not-exposed`）。

## 工具代码契约

代码字段是**一个异步函数体** `async (args, env) => value`：

```js
// args 按你声明的参数 JSON Schema 生成类型。
const url = `https://api.example.com/weather?city=${encodeURIComponent(args.city)}`
const response = await fetch(url)
if (!response.ok) throw new Error(`upstream returned ${response.status}`)
return await response.json()
```

- **返回值**必须是 JSON 值（string / number / boolean / null / array / 普通对象）；`undefined` 或非 JSON 值会使调用失败。
- **参数**：object 根的 JSON Schema，仅限 harness 子集——`type`、`properties`、`required`、`items`、`enum`、`const`、`oneOf`、`additionalProperties`、`description`、`title`、`default`、`examples`。
- **全局量**：`fetch`（`allowNetwork: false` 时被禁）、`console`、`TextEncoder`/`TextDecoder`、`URL`/`URLSearchParams`、`atob`/`btoa`、`structuredClone`、`AbortController`、`setTimeout`/`setInterval` 及 clear 函数。`env` 为 `{ tool, scope }`。workspace 作用域额外有 `fs`。

## 配置

所有可调参数均为 cordis.yml 里 `dsh-custom-tool` 条目的 `config` 字段：

| 字段 | 默认值 | 含义 |
|---|---|---|
| `timeoutMs` | 30000 | 单次调用的墙钟预算（毫秒） |
| `memoryLimitMb` | 128 | 单次调用的 worker 老年代堆上限（MB） |
| `maxResultChars` | 16000 | 结果渲染文本的字符预算 |
| `maxCodeBytes` | 65536 | 单个工具代码的 UTF-8 字节预算 |
| `maxTools` | 100 | 可存储的工具数上限 |
| `allowNetwork` | true | 是否允许工具代码调用 `fetch` |

## 开发

```sh
pnpm install        # 以链接方式引用同级 dsh 仓库，用于类型与测试
pnpm run build      # worker 打包 -> 内联源 -> 类型声明 -> 打包
pnpm run test       # pretest 先构建 worker，再跑 vitest
pnpm run typecheck
pnpm run lint
pnpm run check      # typecheck + lint + test + build
```

Node 环境测试把 `@deepseek-ai/dsh-client-runtime/client` 别名到源码、`monaco-editor` 别名到 mock（见 `vitest.config.ts`）。

## 已知限制与后续工作

- 自定义工具名不能遮蔽其他包的工具；冲突会以逐工具注册失败的形式出现在 `custom_tools_list`。
- workspace 隔离是词法级的，不防符号链接（见作用域表）。
- 界面尚无「试运行」按钮；工具通过模型调用或 headless 运行验证。
