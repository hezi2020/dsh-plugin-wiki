# dsh plugin 命令与安装流程

`dsh plugin` 是 profile 目录里的 pnpm 转发层,成功后按安装状态和 `dsh.bundle` 对账 bundle 列表。它支持 npm 包、本地路径、tarball 和 Git 等多种来源。

## 主命令:add

### 从 GitHub 安装

```sh
npx -p @deepseek-ai/dsh dsh plugin --profile web add github:<owner>/<repo>
```

例如安装 `dsh-agent-teams`:

```sh
npx -p @deepseek-ai/dsh dsh plugin --profile web add github:NanmiCoder/dsh-agent-teams
```

### 从本地路径安装

未发布 npm 前,可用本地绝对路径安装:

```sh
npx -p @deepseek-ai/dsh dsh plugin --profile web add /absolute/path/to/dsh-my-plugin
```

### 从 tarball / npm 包安装

`dsh plugin` 是 pnpm 转发层,因此支持 pnpm 接受的所有包说明符:

```sh
# npm 包名
dsh plugin --profile web add dsh-my-plugin

# tarball
dsh plugin --profile web add ./dsh-my-plugin-0.1.0.tgz
```

## 安装流程

`dsh plugin --profile <p> add <source>` 执行以下步骤:

1. **pnpm 安装**:在 `$DSH_HOME/profiles/<p>/` 目录跑 pnpm,把包装进 profile 的 `node_modules`。
2. **对账 bundle 列表**:扫描已安装依赖的 `package.json`,凡带 `dsh.bundle` 声明的包,按安装状态 reconcile 进 profile manifest 的 `dsh.profile.bundles` 有序列表。
3. **patch 层挂载**:bundle 的 `cordis.patch.yml` 作为补丁层,在下次启动时把插件行插进组合树。
4. **工具/系统提示/Web 入口随 profile 加载**:插件注册的工具进全局 `tools` 注册表(该 profile 下所有会话可用);系统提示 section、Web 路由、浏览器名册(`window.__DSH_BOOT__`)随 profile 加载。

## 重启生效

!!! warning "plugin add 后必须重启目标 profile"
    `package.json` manifest、bundles 层和 client package metadata 在进程内缓存,**plugin add 后需要重启该 profile**。只有 bundle 内容(`lib/client.js`)变化可走 client HMR;package manifest、exports、插件集合、profile bundles 和 host 代码变化都需要重启。

    - 重启正在运行的 `dsh web`(kill 后重新启动)。
    - 刷新浏览器页面。
    - 普通 build 后没有 watcher 时,刷新现有 DSH 页面即可。

    服务已启动后的用户 `cordis.patch.yml` 由 boot HMR 事务性重读,能更新配置并挂载/移除 patch 行;但 plugin add 涉及 manifest/bundles 层变化,不走 HMR。

## Git 分发的构建策略

GitHub 分发不要求发布 npm,但 Git 获取的是源码不是构建产物,必须选择一种构建策略:

### 官方主推:自包含 `prepare`

提供自包含 `prepare` 脚本(官方 turtle-ui 模式)。

!!! warning "pnpm ≥10 拦截 Git 依赖构建脚本"
    pnpm ≥10 默认拦截 Git 依赖的构建脚本。用户需在 profile 的 `pnpm-workspace.yaml` 显式 `allowBuilds` 后重跑 `add`。这会执行第三方代码,应**固定 commit 并只信任已审查仓库**。

### 备选:提交 `lib/` 到 Git

把 exports 指向的完整、最新 `lib/` 提交进 Git。用户无需执行依赖脚本,但**非官方推荐路径**。

## 内测版本兼容性

!!! warning "CLI 与 bundle 版本必须同通道"
    内测阶段 `@deepseek-ai` scope 需要官方只读 token(`.npmrc` scope 鉴权)。peer 范围必须写成 rc 通道(如 `^0.0.1-rc.1`),普通 `^0.0.1` 不匹配 `0.0.1-rc.x`,安装会解析失败。

    npx 默认 CLI 可能是 `next`(rc.2),而 `dsh plugin add` 默认装 `latest`(rc.1)——混装时 rc.2 独有的 client 条目会等待 rc.2 才提供的服务,页面报 "Failed to load plugins … waiting for service"。固定 `npx -p @deepseek-ai/dsh@0.0.1-rc.1`(与 latest 对齐),或全部升级 `next`。

## 其他子命令与诊断

### 离线配置诊断

不启动服务,验证组合树是否包含插件行:

```sh
# 完整配置转储(含用户层与 --patch)
dsh --profile <scratch> --dump-config

# 仅打印 bundle 层,跳过用户层与 --patch(坏 cordis.patch.yml 时的恢复诊断)
dsh --profile <scratch> --dump-default-config
```

### 真实任务验证

```sh
# headless 真实任务(需 DEEPSEEK_API_KEY)
dsh --profile headless "一个小而可判定的任务"
```

!!! info "不要发明子命令"
    `dsh run` 子命令不存在。真实任务用 `dsh --profile headless "<task>"`。`dsh plugin` 的子命令以 `SKILL.md` 与源码为准,不要假设未文档化的子命令。

### 独立测试 profile

独立测试 profile 是安全的验证环境(不碰运行实例):

- headless 模板自动初始化。
- 自定义 profile 可用 `dsh plugin --profile <name> add ...` 从零搭。
- 内置 `web`/`headless` profile 可由 launcher 初始化。

## 离线/本地路径安装注意事项

仓库仍私有时,可把待发布内容复制到临时 Git repo 并提交,再通过 `git+file://...` 安装;这能验证"Git 获取的内容"而不是当前 checkout 的未提交文件。

前提:

- `git` 在 PATH。
- 目录是已提交的真实 Git 仓库。
- 若包声明了 `prepare`,还需在 profile 的 `pnpm-workspace.yaml` 加 `allowBuilds`(与 GitHub 安装相同门禁)。
- 只删除本任务创建的精确临时目录。

## 从零安装验证清单

按 `SKILL.md` §8.4,从零安装验证应逐项确认:

1. 使用全新临时 `DSH_HOME`/profile。
2. 按 README 的精确命令安装。
3. 断言 profile dependency 与 `dsh.profile.bundles`。
4. 断言所有 exports、host/client bundle、patch 和静态资源存在。
5. `--dump-config` 必须出现插件层。
6. 启动后检查 host route、client roster 和真实 UI。

## 下一步

- [dsh.bundle 声明规范](dsh-bundle.md) —— 安装前要先写好 bundle 声明
- [Profile 概念](profile.md) —— `--profile` 的含义
- [最小插件 walkthrough](walkthrough.md) —— 端到端安装测试示例
