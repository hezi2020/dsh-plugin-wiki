# dsh.bundle 声明规范与 Profile Bundle

`dsh.bundle` 是 `package.json` 中 `dsh` 字段下的子对象,用于声明一个 npm 包为 **DSH 可安装的 profile bundle**。它是 `dsh plugin add` 识别 bundle 并加入 profile 层列表的依据;没有 `dsh.bundle` 的包只会成为普通依赖,不会自动成为 profile 层。

## 两个核心概念

| 概念 | 定义 | 位置 |
|---|---|---|
| **Bundle** | 作者分发的包,`dsh.bundle.patch` 指向配置层 | 插件 `package.json` |
| **Profile** | 用户运行的组合,`dsh.profile.bundles` 保存有序 bundle 列表 | `$DSH_HOME/profiles/<name>/package.json` |

插件作者写 bundle;`dsh plugin` 命令创建和维护 profile。**不要手写用户 profile manifest**。

## dsh.bundle 字段文档

字段提取自 `SKILL.md` 与真实 `package.json`(`dsh-base`、`dsh-agent-teams`)。

### `dsh.bundle.patch`

- **类型**: `string`(指向相对路径)
- **必需**: 是(若要成为 bundle)
- **作用**: 指向 bundle 的 `cordis.patch.yml` 补丁层文件。`dsh plugin add` 的 reconcile 据此把包加入 bundles 层。

```jsonc
{
  "dsh": {
    "bundle": { "patch": "./cordis.patch.yml" }
  }
}
```

### `dsh.client`(可选,客户端插件才需要)

当插件需要向浏览器注入 UI 时声明。字段:

| 子字段 | 类型 | 必需 | 说明 |
|---|---|---|---|
| `platform` | `string` | 是 | 必须为 `"web"` |
| `inject` | `string[]` | 否 | 随图下发的信息性元数据(预检展示 / HMR diff 用),**不决定** client fiber 激活顺序 |
| `immediately` | `boolean` | 否 | 仅供启动关键入口使用的预取标记;普通第三方插件**不要默认开启** |

```jsonc
{
  "dsh": {
    "bundle": { "patch": "./cordis.patch.yml" },
    "client": {
      "platform": "web",
      "inject": ["@deepseek-ai/dsh-client-runtime"]
    }
  }
}
```

!!! warning "权威字段与历史兼容"
    当前权威字段是 `dsh.client`。历史兼容字段(如 `dshClient`)只有在目标正式部署仍明确读取时才添加。`dsh-agent-teams` 同时声明了 `dsh.client` 与 `dshClient` 作为过渡期兼容,新插件不要照抄 `dshClient`。

!!! info "inject 不保证激活顺序"
    `dsh.client.inject` 是 package graph/prefetch/HMR 元数据,**不保证** apply 顺序。等待 slot declaration 用 `ctx.slots.inject()`,等待 service 用 client plugin 的 `export const inject`。预取由 `dsh.client.immediately` 驱动,真正的依赖等待来自 client bundle 导出的 `export const inject`。

## cordis.patch.yml 规范

`cordis.patch.yml` 是 bundle 的实质内容,**必须是顶层数组**,每个元素是一个 patch 操作。

### 最小示例

```yaml
- insert:
    - id: my-plugin
      name: dsh-my-plugin
      config: {}
```

### 行字段

| 字段 | 类型 | 必需 | 说明 |
|---|---|---|---|
| `id` | `string` | 是 | 配置树中稳定的行身份(全局唯一);后层按 `id` 覆盖前层 |
| `name` | `string` | 是 | Node 可解析的包名或导出路径(如 `@deepseek-ai/dsh-tool-subagent/list-agents`) |
| `config` | `object` | 否 | 传入插件的 Config;**整段替换不是深合并**,覆盖时要重述所需键 |
| `disabled` | `boolean` \| `!!js` | 否 | 禁用该行;支持 `!!js` 表达式 |
| `inject` | `string[]` | 否 | 行级额外注入的服务 |

### 关键规则

1. **`id` 是身份,`name` 是解析目标**:`id` 稳定不变,`name` 是 `require.resolve` 能找到的包名(必须等于包 `package.json` 的 `name`)。
2. **`config` 整段替换**:profile overrides 必须重述每个字段,没有深合并层。模式特定值放在模式 bundle 里,不放 base。
3. **行顺序无加载语义**:激活由 service-availability 驱动,不是顺序驱动。
4. **`!!js` 表达式**:允许在 `config` 和 `disabled` 下使用 `!!js`(不是 `!js`);其他元数据保持字面量。

### 生效顺序

patch 层按以下顺序叠加,**后者获胜**:

```
profile bundles → profile cordis.patch.yml → $DSH_HOME/cordis.patch.yml → 命令行 --patch
```

## Profile Bundle 概念

Profile bundle 是 `packages/bundle/` 下的 installable patch-layer bundles,即"可安装的补丁层包"。DSH 内置三个 profile bundle:

| 包 | 角色 | ctx key |
|---|---|---|
| `@deepseek-ai/dsh-base` | 每个 profile 第一层,插入所有基础插件行(模型适配、工具、持久化、策略、设置/凭据、遥测、host 级 subagent provider) | — (仅 patch) |
| `@deepseek-ai/dsh-web-app` | 浏览器界面:web patch 层 + 运行时 glue 插件 | 挂载多行 |
| `@deepseek-ai/dsh-headless` | 一次性任务模式,直接基于 base,无 Host/Web 层 | 挂载 `headless-runner` |

内置 bundle 从 dsh 安装目录解析;外部 bundle 通过 `dsh plugin --profile <name> add <package>` 安装进 profile。

### base bundle 示例(真实结构摘录)

`dsh-base` 的 `cordis.patch.yml` 是一个顶层 `insert` 数组,插入几十个基础行,例如:

```yaml
- insert:
    - id: timer
      name: '@deepseek-ai/cordis-plugin-timer'

    - id: llm
      name: '@deepseek-ai/dsh-llm'

    - id: session
      name: '@deepseek-ai/dsh-session'

    - id: tools
      name: '@deepseek-ai/dsh-tools'

    - id: system-prompt
      name: '@deepseek-ai/dsh-system-prompt'
      config:
        persona: ''
    # ……更多行
```

### web-app bundle 覆盖示例

`dsh-web-app` 的 patch 通过 `id` 覆盖 base 行,并 `insert` 浏览器专属行:

```yaml
# 覆盖 base 的 system-prompt 行(整段替换 config)
- id: system-prompt
  config:
    persona: >-
      You are a coding agent powered by the {{model}} model. Your working directory is {{cwd}}.

# 禁用 base 的 hmr 行
- id: hmr
  disabled: true

# 插入浏览器专属行
- insert:
    - id: webserver
      name: '@deepseek-ai/dsh-host-webserver'
      inject: [webStartup]
      config:
        host: !!js ctx.webStartup.host ?? '127.0.0.1'
        port: !!js ctx.webStartup.port ?? 3080
    - id: modules
      name: '@deepseek-ai/dsh-client-modules'
```

## 最小 dsh.bundle 示例

基于真实结构(host-only,无 client),这是注册单个工具的最小 bundle 声明:

```jsonc
{
  "name": "dsh-echo",
  "type": "module",
  "main": "lib/index.js",
  "types": "lib/types/index.d.ts",
  "exports": {
    ".": { "types": "./lib/types/index.d.ts", "default": "./lib/index.js" },
    "./cordis.patch.yml": "./cordis.patch.yml",
    "./package.json": "./package.json"
  },
  "files": ["lib", "cordis.patch.yml", "README.md"],
  "dsh": {
    "bundle": { "patch": "./cordis.patch.yml" }
  },
  "peerDependencies": {
    "@deepseek-ai/cordis": "^4.0.1-rc.1",
    "@deepseek-ai/dsh-tools": "^0.0.1-rc.1",
    "@deepseek-ai/schemastery": "^3.18.1-rc.1"
  }
}
```

对应的 `cordis.patch.yml`:

```yaml
- insert:
    - id: echo
      name: dsh-echo
      config: {}
```

## 规则汇总

- **exports、`files` 和发布产物必须一致**:任何入口都不能指向不存在的文件。
- **`exports["./client"]` 是名册扫描硬要求**:client-modules 读它找浏览器 bundle,缺失直接拒绝该包。
- **Host-only 包删除 `./client` 与 `dsh.client`**;没有 Web 需求就不要声明 `dsh.client`,也不要构建 client bundle。
- **Client 包必须同时有 `dsh.client.platform: "web"` 和真实存在的 `exports["./client"]`**。
- **DSH/Cordis/React 等共享运行时声明为 peer**,避免复制 runtime identity;版本范围从目标正式版 package metadata 取证。
- **包元数据和负结论按名称缓存**,新增/删除 client 声明、修正 export 后必须重启 host。

## 下一步

- [dsh plugin 命令](plugin-command.md) —— 如何用 `dsh plugin add` 安装 bundle
- [Profile 概念](profile.md) —— bundle 如何组合进 profile
- [最小插件 walkthrough](walkthrough.md) —— 完整可复现示例
