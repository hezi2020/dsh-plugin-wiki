# CLI 命令

`dsh` 命令是 DeepSeek Harness 的产品启动器，负责加载 profile（一组有序的插件 bundle patch 层，叠加用户自己的覆盖）。本页介绍其命令语法与常用用法。

## 命令概览

`dsh` 的命令语法由 [`apps/cli/src/args.ts`](https://github.com/deepseek-ai/deepseek-harness/blob/master/apps/cli/src/args.ts) 定义。launcher 只解析自己的 flag，**第一个它不认识的 token 起就交给所启动的 profile 内部 app 插件解析**。因此 launcher flag 必须放在前面。

| 命令 | 用途 |
|---|---|
| `dsh web` | 启动 Web UI（`--profile web` 的别名），默认监听 `127.0.0.1:3080` |
| `dsh --profile <name>` | 启动命名 profile，位于 `$DSH_HOME/profiles/<name>` |
| `dsh --profile headless "task"` | 跑一次全新持久化 session，打印最终答案后退出 |
| `dsh plugin --profile <name> <pnpm args>` | 管理 profile 的插件（在 profile 目录下转发给 pnpm） |

!!! info "profile 自动初始化"
    `web` 和 `headless` profile 首次使用时从内置模板自动初始化；**其他 profile 必须通过 `dsh plugin` 创建**。

## 启动 Web UI

```bash
# npm 包
npx @deepseek-ai/dsh web

# 源码（仓库根目录）
pnpm dsh web
```

`web` 子命令是 `--profile web` 的硬编码别名。web app 自己的 flag 跟在后面：

```bash
dsh web --port 8080          # --port 属于 web app
dsh web --help               # 打印 web app 自己的帮助（非 launcher 帮助）
```

详见 [Web UI 使用指南](web-ui.md)。

## 无头模式（headless）

跑一次性任务，打印结果即退出，**不启动服务器**：

```bash
# npm 包
npx @deepseek-ai/dsh --profile headless "run the tests"

# 源码
pnpm dsh --profile headless "run the tests"
```

!!! warning "需要 API Key"
    headless 模式跑真实任务需要 `DEEPSEEK_API_KEY`。源码级的真实 API 测试与 demo 通过环境变量读取凭据：`DEEPSEEK_API_KEY`（必需）、`DEEPSEEK_BASE_URL`（可选）、根目录 `.env`。CI 的 e2e 测试在缺失 key 时自动跳过。

## 插件管理

`dsh plugin` 在指定 profile 目录下把参数**原样转发给 pnpm**，因此所有 pnpm 子命令都可用：

```bash
# 安装插件（npm 包名或 git 仓库）
dsh plugin --profile web add <package>
dsh plugin --profile web add github:owner/repo

# 卸载
dsh plugin --profile web remove <package>

# 查询为何依赖
dsh plugin --profile web why <package>

# 列出已安装（pnpm list）
dsh plugin --profile web list
```

!!! note "git 仓库形式的插件"
    `dsh plugin --profile <name> add github:owner/repo` 之所以可用，是因为它转发给 pnpm，而 pnpm 原生支持 git 仓库地址作为包来源。安装后该插件会出现在 profile 的 `node_modules` 中，并可被 profile 的 `cordis.patch.yml` 引用。

插件安装到 profile 的 `node_modules` 后，还需在 profile 的 `cordis.patch.yml`（或 `--patch` 覆盖）中声明对应的 cordis 配置行才会被挂载。详见 [配置与 Profile](configuration.md)。

## 常用 Flag

| Flag | 说明 |
|---|---|
| `--profile <name>` | 启动哪个 profile（位于 `$DSH_HOME/profiles/<name>`） |
| `--patch <path>` | 额外的 patch-list 覆盖，叠加在 profile 层之后；**可重复**（`--patch a.yml --patch b.yml`） |
| `--dump-config` | 打印组合后的 profile 树并退出（含用户层与 `--patch`） |
| `--dump-default-config` | 仅打印 bundle 层（不含用户层与 `--patch`），退出 |
| `-V, --version` | 输出版本号 |

!!! warning "互斥与限制"
    - `--dump-config` 与 `--dump-default-config` 互斥。
    - config dump 不接受 app 参数（它不启动 app，无法显示 app flag 会决定什么）。
    - `--dump-default-config` 不接受 `--patch`。
    - `plugin` 子命令不接受父级 `--profile`/`--patch`/`--dump-*`（`--profile` 是 `plugin` 自己的必填项）。

## 检查组合后的配置

在启动前查看机器实际会 boot 的插件树：

```bash
dsh --profile web --dump-config
dsh --profile web --dump-default-config
```

输出的任意一行都可通过你自己的 patch 替换。详见 [配置与 Profile](configuration.md)。

## Profile 概念简介

一个运行中的 `dsh` 是一棵在 boot 时从有序层组合出的插件树。

- **profile** 是存在 Harness home 中的命名组合，列出它堆叠的 bundle、持有的 out-of-tree 插件，并保留用户自己的 `cordis.patch.yml`。
- **bundle** 是 Cordis 配置行及其所挂载代码的分发格式，使其插入的内容可被上层 patch 覆盖。
- [`dsh-base`](https://github.com/deepseek-ai/deepseek-harness/blob/master/packages/bundle/base/README.md) 是每个 profile 的第一层：模型适配器、工具、持久化、沙箱与审批策略、settings、credentials、遥测。
- [`dsh-web-app`](https://github.com/deepseek-ai/deepseek-harness/blob/master/packages/bundle/web-app/README.md) 添加浏览器应用；[`dsh-headless`](https://github.com/deepseek-ai/deepseek-harness/blob/master/packages/bundle/headless/README.md) 添加无服务器的一次性 runner。

组合顺序（在空根上依次叠加）：

1. profile `dsh.profile.bundles` 列出的每个 bundle 的 patch（按列出顺序）
2. profile 的 `cordis.patch.yml`
3. home 级 `$DSH_HOME/cordis.patch.yml`
4. `--patch` 覆盖

!!! tip "深入 profile 组合"
    profile 的精确层优先级、flag、关闭行为、部署默认值与源码执行，见 [配置与 Profile](configuration.md) 与 [CLI 行为参考](https://github.com/deepseek-ai/deepseek-harness/blob/master/apps/cli/reference/README.md)。

## 源码运行

生产运行需要已构建的包与前端产物。在仓库根目录：

```bash
pnpm run build          # 先构建
pnpm dsh <args...>      # 通过 tsx 的 ESM hook 跑 TypeScript 入口，转发所有参数
```

!!! note "源码执行的模块契约"
    `dsh` CLI 的源码启动通过 tsx 的 ESM-only hook（`node --import tsx/esm`）运行，因此它触达的模块必须保持 ESM（不能是 CJS-only 导出）。在 `^22.19 || >=24` 的 Node 引擎范围内，原生 TypeScript 模式不可用。

## 下一步

- [运行时模式](runtime-modes.md) —— 了解四种 agent preset
- [配置与 Profile](configuration.md) —— 深入 profile 组合、settings 与 credentials
- [Session 与 Trajectory](session-trajectory.md) —— 会话日志与可观测性
- [Web UI 使用指南](web-ui.md) —— `dsh web` 启动后的使用
- [排障笔记](troubleshooting.md) —— 常见命令问题
