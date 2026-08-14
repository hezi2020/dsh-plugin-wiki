# 从零编写一个最小插件

本 walkthrough 基于 `SKILL.md` 与 `developing-dsh-plugins.md` 的真实规范,目标是从零编写一个注册单个 `echo` 工具的 host-only 最小 DSH 插件,并通过 `dsh plugin` 安装测试。**host-only 无 client 需求**,因此不声明 `dsh.client`、不构建 client bundle。

## 目标

写一个 `dsh-echo` 插件,注册一个 `echo` 工具:模型调用时原样返回输入文本(带可选前缀),用于测试工具链或回显用户输入。

## 步骤 0:判断最小运行面

按 `SKILL.md` §1.4,先判断最小运行面:

- 工具、system prompt、HTTP、持久化、provider → **host**
- slot、Conversation Node、浏览器状态和浮层 → client
- host 能力且需要 Web 可视化 → host + client
- 没有 Web 需求 → **不要声明 `dsh.client`,也不要构建 client bundle**

我们的 echo 工具是纯 host 能力,**无 Web 需求**,因此选择 host-only。

## 步骤 1:目录结构

```text
dsh-echo/
├── package.json          # dsh.bundle + exports + peerDependencies
├── cordis.patch.yml      # 向 host 组合插入插件行
├── tsconfig.json         # host 编译(host-only 不需要 tsconfig.client.json)
├── src/
│   └── index.ts          # host 入口:name/inject/Config/apply + 工具注册
└── README.md             # 安装命令与验证步骤
```

host-only 不需要 `tsconfig.client.json`、`tsdown.config.ts`、`src/client/`。

## 步骤 2:package.json(dsh.bundle 声明)

```jsonc
{
  "name": "dsh-echo",
  "version": "0.1.0",
  "description": "最小 DSH 插件:注册一个 echo 工具",
  "type": "module",
  "main": "lib/index.js",
  "types": "lib/types/index.d.ts",
  "exports": {
    ".": { "types": "./lib/types/index.d.ts", "default": "./lib/index.js" },
    "./cordis.patch.yml": "./cordis.patch.yml",
    "./package.json": "./package.json"
  },
  "files": ["lib", "cordis.patch.yml", "README.md"],
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "typecheck": "tsc -p tsconfig.json --noEmit"
  },
  "dsh": {
    "bundle": { "patch": "./cordis.patch.yml" }
  },
  "peerDependencies": {
    "@deepseek-ai/cordis": "^4.0.1-rc.1",
    "@deepseek-ai/dsh-tools": "^0.0.1-rc.1",
    "@deepseek-ai/schemastery": "^3.18.1-rc.1"
  },
  "devDependencies": {
    "typescript": "^5.9.3",
    "@types/node": "^22.19.0"
  }
}
```

要点:

- **`dsh.bundle.patch`** 让 `dsh plugin add` 的 reconcile 认出这是 bundle 并加入 bundles 层。
- **host-only 包删除 `./client` 与 `dsh.client`**。
- **exports、`files` 和发布产物必须一致**:任何入口都不能指向不存在的文件。
- **共享运行时声明为 peer**:DSH/Cordis 等从 profile 的 `node_modules` 解析,不重复安装。

## 步骤 3:cordis.patch.yml(一行插件进组合)

```yaml
# bundle 补丁:顶层 YAML 数组,insert 追加组合行
- insert:
    - id: echo              # 行 id(全局唯一,后层按 id 覆盖)
      name: dsh-echo        # 包名(client-modules 按它解析 package.json)
      config:
        prefix: 'echo: '    # 可选:传入插件的 Config
```

要点:

- **`id` 是配置树中稳定的行身份;`name` 是 Node 可解析的包名**(必须等于 `package.json` 的 `name`)。
- **`config` 整段替换不是深合并**;覆盖时要重述所需键。
- 行挂在 host 组合,工具注册进全局 `tools` 注册表,该 profile 下所有会话可用。

## 步骤 4:tsconfig.json(host 编译)

```jsonc
{
  "compilerOptions": {
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "lib": ["ES2022"],
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "declaration": true,
    "declarationDir": "lib/types",
    "outDir": "lib",
    "rootDir": "src",
    "allowImportingTsExtensions": true,
    "rewriteRelativeImportExtensions": true,
    "types": ["node"]
  },
  "include": ["src"]
}
```

!!! warning "TypeScript 5.7+ 必需"
    `rewriteRelativeImportExtensions` 是 TS 5.7 新增(让源码里的 `./x.ts` 导入在产物里重写为 `.js`)。旧版会报 `TS5096` + `TS5023`。固定 `typescript@^5.9.3`。

## 步骤 5:src/index.ts(工具注册)

```ts
import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import { defineTool } from '@deepseek-ai/dsh-tools'
// 声明合并触发器:让 ctx.tools 类型可见(DSH 各包通过 declare module 扩展 Context)
import type {} from '@deepseek-ai/dsh-tools'

export const name = 'dsh-echo'
// 必需 service:未满足时 fiber 保持 pending,框架在服务就绪后激活
export const inject = ['tools']

export interface Config {
  prefix: string
}

// Config 用 @deepseek-ai/schemastery 的 z.object(不是 zod);默认值放 schema
export const Config: z<Config> = z.object({
  prefix: z.string().default('echo: '),
})

export function apply(ctx: Context, config: Config): void {
  ctx.tools.register(
    defineTool({
      name: 'echo',
      // description 是模型契约:写清何时用/怎么用
      description:
        '原样返回输入文本(带前缀)。当需要测试工具链或回显用户输入时调用。',
      // parameters 是 DSL 属性描述对象(每个 key 一个 schema);隐式开放对象根
      parameters: {
        text: { type: 'string', required: true, description: '要回显的文本' },
      },
      // output.schema 是普通 JSON Schema,注册时被 assertSupportedJsonSchema 强制校验
      output: {
        schema: {
          type: 'object',
          additionalProperties: false,
          properties: {
            echoed: { type: 'string', required: true },
          },
        },
        // render 给模型稳定、紧凑、可判定的文本
        render: (_args, value) => [{ type: 'text', text: value.echoed }],
      },
      async execute(args, exec) {
        // exec.agent 是调用者 Agent:agent.session.header.cwd 是工作区
        const caller = exec.agent
        if (!caller) throw new Error('echo requires a calling agent')
        return { echoed: `${config.prefix}${args.text}` }
      },
    }),
  )
}
```

要点(摘自 `SKILL.md` §4.4 与 `developing-dsh-plugins.md` §2.2):

- **`z` 从 `@deepseek-ai/schemastery` 导入(不是 zod)**;`static Config = Config` 引用导出的 schema。
- **`inject` 只等服务(`tools` service 存在),不等 provider 注册**;不要在 `apply` 里校验 provider。
- **`parameters` 是 DSL 属性描述对象**;`output.schema` 是普通 JSON Schema;二者是同一 DSL 的两个面。
- **`exec.agent` 是调用者 Agent**:不从全局进程状态猜。
- **`import type {} from '<包>'` 是声明合并触发器**:必须把该包加载进 program 才能看见 `ctx.tools` 成员。

## 步骤 6:本地调试

### 6.1 开发期类型链接

DSH 包不在 npm registry 发布(pre-release),开发期把依赖符号链接进项目 `node_modules`:

```sh
mkdir -p node_modules/@deepseek-ai
# 链接到源码 checkout 的构建产物(不要链到运行实例的 staging 目录)
ln -sfn /path/to/DSH/vendor/cordis             node_modules/@deepseek-ai/cordis
ln -sfn /path/to/DSH/packages/core/tools       node_modules/@deepseek-ai/dsh-tools
ln -sfn /path/to/DSH/packages/util/schemastery node_modules/@deepseek-ai/schemastery
```

!!! warning "必须链接到源码 checkout 的构建产物"
    不要链到运行实例的 staging 目录——staging 快照可能是旧构建(`declare module 'cordis'` 而非 `'@deepseek-ai/cordis'`,声明合并不生效)。checkout 的 `lib` 可能过期(源码更新但未重建),症状是类型缺失;此时补链或改用源码 `paths` 映射。

### 6.2 构建链

```sh
pnpm install          # 安装 typescript 等开发依赖
pnpm typecheck        # tsc --noEmit(host program)
pnpm build            # tsc emit → lib/index.js + lib/types/index.d.ts
```

host-only 不需要 `tsc -p tsconfig.client.json` 和 `tsdown`。

### 6.3 离线验证(不启动服务)

```sh
# 验证 lib 产物存在
ls lib/index.js lib/types/index.d.ts cordis.patch.yml
```

## 步骤 7:通过 dsh plugin 安装测试

### 7.1 安装到 scratch profile

!!! info "独立 profile 验证"
    验证全程使用**独立 profile**,不触碰正在运行的实例。

```sh
# 内测阶段:固定 CLI 版本与 latest 对齐(避免 rc.1/rc.2 混装)
npx -p @deepseek-ai/dsh@0.0.1-rc.1 dsh plugin --profile echo-scratch add /absolute/path/to/dsh-echo
```

### 7.2 转储配置验证(离线,不 boot)

```sh
dsh --profile echo-scratch --dump-config
```

确认输出中出现 `echo` 行:`id: echo`、`name: dsh-echo`、`config.prefix`。

若 `cordis.patch.yml` 损坏,用 `--dump-default-config` 恢复诊断(只打印 bundle 层,跳过用户层与 `--patch`)。

### 7.3 重启生效

!!! warning "plugin add 后必须重启"
    `package.json` manifest、bundles 层在进程内缓存,plugin add 后需要重启该 profile。只有 bundle 内容(`lib/index.js`)变化可走 host HMR;manifest/exports/插件集合/profile bundles 变化都需要重启。

    - 重启正在运行的 dsh(若 web profile,kill 后重启 + 刷新浏览器)。
    - headless profile 每次命令都是新进程,无需额外重启。

### 7.4 真实任务验证

```sh
# headless 真实任务(需 DEEPSEEK_API_KEY)
dsh --profile echo-scratch "用 echo 工具回显 hello,然后告诉我结果"
```

!!! info "不要发明 dsh run 子命令"
    真实任务用 `dsh --profile headless "<task>"`。`echo-scratch` 是自定义 profile,若未配置 headless runner,可改用 `dsh --profile headless --patch <你的 patch>` 或在 web profile 中验证。

## 步骤 8:Git 分发验证(可选)

仓库仍私有时,可把待发布内容复制到临时 Git repo 并提交,再通过 `git+file://...` 安装:

```sh
# 1. 准备临时 Git repo
SCRATCH="$(mktemp -d)"
cp -r /path/to/dsh-echo "$SCRATCH/dsh-echo"
cd "$SCRATCH/dsh-echo"
git init && git add -A && git commit -m "init dsh-echo"

# 2. 通过 git+file:// 安装(验证"Git 获取的内容",而非当前 checkout 未提交文件)
npx -p @deepseek-ai/dsh@0.0.1-rc.1 dsh plugin --profile echo-git add "git+file://$SCRATCH/dsh-echo"

# 3. 清理(只删除本任务创建的精确临时目录)
rm -rf "$SCRATCH"
```

前提:`git` 在 PATH;目录是已提交的真实 Git 仓库;若包声明了 `prepare`,还需在 profile 的 `pnpm-workspace.yaml` 加 `allowBuilds`。

## 验证金字塔(从快到慢)

按 `developing-dsh-plugins.md` §6:

1. `pnpm typecheck`(host program)→ 2. `pnpm build` → 3. 离线 `ls lib/` 产物 → 4. `dsh --profile echo-scratch --dump-config`(组合树含 echo 行)→ 5. headless 真实任务(`dsh --profile echo-scratch "..."`,需 `DEEPSEEK_API_KEY`)→ 6. web profile 真实浏览器验证(若需要 UI)。

## 完成标准

按 `SKILL.md` §9,完成前逐项确认:

- 运行面最小(host-only),manifest、exports、patch 与产物一致。
- 必需 inject(`tools`)边界清楚;pending/failed 状态可诊断。
- 工具注册可清理(`ctx.tools.register` 返回 disposer,框架管理)。
- typecheck、build、真实组合、从零安装验证通过。
- README 安装命令与实际分发形态一致。

## 下一步

- [插件机制总览](overview.md) —— Service/Consumer 模型与能力类型
- [dsh.bundle 声明规范](dsh-bundle.md) —— 字段级文档
- [dsh plugin 命令](plugin-command.md) —— 安装流程细节
- [Skill 规范](skill.md) —— 给 echo 插件附带一个 runtime skill
