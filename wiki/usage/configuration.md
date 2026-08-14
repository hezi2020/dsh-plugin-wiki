# 配置与 Profile

DeepSeek Harness 的配置体系由三层构成：**Profile**（插件组合）、**Settings**（用户设置）、**Credentials**（凭证管理）。三者各司其职，本页介绍其概念与用法。

## Profile：插件组合

一个运行中的 `dsh` 是一棵在 boot 时从有序层组合出的插件树。

### Profile 是什么

- **profile** 是存在 Harness home（`$DSH_HOME/profiles/<name>`）中的命名组合，列出它堆叠的 bundle、持有的 out-of-tree 插件，并保留用户自己的 `cordis.patch.yml`。
- **bundle** 是 Cordis 配置行及其所挂载代码的分发格式，使其插入的内容可被上层 patch 覆盖。
- 每个 bundle 在自己 `package.json` 的 `dsh` 字段下声明：`dsh.profile` 列出 profile 的 bundle，`dsh.bundle` 指向 bundle 的 patch 文件。

### 内置 bundle

| bundle | 作用 |
|---|---|
| [`dsh-base`](https://github.com/deepseek-ai/deepseek-harness/blob/master/packages/bundle/base/README.md) | 每个 profile 的第一层：模型适配器、工具、持久化、沙箱与审批策略、settings、credentials、遥测 |
| [`dsh-web-app`](https://github.com/deepseek-ai/deepseek-harness/blob/master/packages/bundle/web-app/README.md) | 添加浏览器应用（Web UI） |
| [`dsh-headless`](https://github.com/deepseek-ai/deepseek-harness/blob/master/packages/bundle/headless/README.md) | 添加无服务器的一次性 runner |

### 组合顺序

层在空根上按以下顺序叠加：

1. profile `dsh.profile.bundles` 列出的每个 bundle 的 patch（按列出顺序）
2. profile 的 `cordis.patch.yml`
3. home 级 `$DSH_HOME/cordis.patch.yml`
4. `--patch` 覆盖（按 argv 顺序）

patch 通过 id 定位一行并替换其整个 config，或插入新行。

### 内置 profile

- **`web`**：Web UI profile，首次使用时从模板自动初始化。
- **`headless`**：一次性 runner profile，首次使用时从模板自动初始化。
- **其他 profile**：必须通过 `dsh plugin` 创建。

!!! tip "查看实际组合树"
    ```bash
    dsh --profile web --dump-config           # 含用户层与 --patch
    dsh --profile web --dump-default-config   # 仅 bundle 层
    ```
    输出的任意一行都可被你自己的 patch 替换。详见 [CLI 命令](cli.md)。

## 如何组合插件到 Profile

### 1. 安装插件包

通过 `dsh plugin` 转发给 pnpm 安装到 profile 的 `node_modules`：

```bash
# 安装 npm 包
dsh plugin --profile web add @deepseek-ai/dsh-some-plugin

# 安装 git 仓库插件
dsh plugin --profile web add github:owner/repo

# 卸载
dsh plugin --profile web remove @deepseek-ai/dsh-some-plugin
```

`dsh.profile.bundles` 中命名的 bundle 先从 dsh 安装目录解析（`@deepseek-ai/dsh-base`、`@deepseek-ai/dsh-web-app`、`@deepseek-ai/dsh-headless`），再从 profile 自己的 `node_modules` 解析——pnpm 把 out-of-tree 插件装在这里。

### 2. 在 patch 中声明配置行

仅安装包不够，还需在 profile 的 `cordis.patch.yml`（或 `--patch` 覆盖）中声明对应的 cordis 配置行才会被挂载：

```yaml
# cordis.patch.yml 示例：插入一个新插件行
- id: my-custom-tool
  name: '@my-org/dsh-tool-custom'
  config:
    someOption: value
```

### 3. cordis.yml 的 `!!js` 规则

!!! warning "cordis.yml 表达式规则"
    cordis.yml 允许在插件 `config` 与条目 `disabled` 下使用 `!!js`（**绝不要用 `!js`**）；其他元数据保持字面量。条件组合也通过 overlay 实现。详见 [Cordis primer](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/cordis-primer.md#loader-configuration)。

```yaml
# 按平台禁用示例（来自内置 preset）
- id: tool-bash
  name: '@deepseek-ai/dsh-tool-bash'
  disabled: !!js process.platform === 'win32'
```

## Settings：用户设置

Settings seam（`dsh-settings`，`ctx.settings`）持有**一份用户拥有的文档**，按 namespace 组织。每个注册的 namespace 按 `schema 默认值 → 注册者的 composition base → 用户 section` 解析。

### 解析顺序

```
schema defaults  →  composition base  →  user section
```

- `update(patch)` 只把稀疏 patch 合并进**用户层**（绝不进 `base`）。
- `replace(section)` 整体替换用户层；缺失的键重新继承 `base` 与 schema 默认值（`replace({})` 重置全部）。
- 写入按调用顺序串行；解析值是深冻结快照。

### 效果时机

`applies` 是 UI 提示而非机制：

- `live`：owner 监听变化，立即生效（如模型路由）。
- `restart`：owner 不监听，值在构造时读一次；配置界面可标记"待重启生效"。

### Wire 表面必须脱敏

`describe({ redactSecrets: true })` 在每个 wire 表面是**强制**的：从 `value`/`base`/`user` 三层剥离 `role('secret')` 字段，并列出其 `{path, set}` 槽位。因此持有脱敏描述符的调用者无法安全重建 section——删除操作通过路径 op 而非整体 replace 传递。

## Credentials：凭证管理

Credentials seam（`dsh-credentials`，`ctx.credentials`）把密钥挡在配置之外：settings section 与 `cordis.yml` 条目携带**引用**（环境变量名），provider 拥有值，consumer **每次操作解析一次**。

### 解析机制

- `resolve(ref)` 返回值与提供它的 source layer，或 `undefined`。
- consumer **每次操作重新解析，绝不跨操作缓存**——这正是轮换的密钥能立即到达下一次请求（无需重启）的机制。
- 一条 seam 级规则绑定所有 provider：**空存储值在任何地方都视为 absent**。

### 本地 provider 的 source layer

`dsh-credentials-local` 使用以下来源层：

| source layer | 说明 |
|---|---|
| `env` | live 进程环境变量（`describe` 报告为 `writable: false`——写入会被遮蔽，故拒绝） |
| `file` | provider 管理的可写存储（如 `$DSH_HOME/.credentials.yaml`） |
| `project-env` | 项目级 `.env` |
| `user-env` | 用户级 `.env` |

### describe 不暴露值

`describe(ref)` 只返回：是否已配置、当前 supplying 的 source layer、`set` 当前是否会成功——**永不返回值**。被 live 环境变量遮蔽的引用报 `writable: false`，UI 可前置渲染为只读。

## 配置 API Key 的方式

DeepSeek API key 有两种配置路径，按推荐度排序：

### 方式一：Web UI Settings → Models（推荐）

1. 打开 **Settings → Models**。
2. 在 DeepSeek 卡片填入 API key 并保存。
3. 密钥存入 `$DSH_HOME/.credentials.yaml`，settings 只保留凭证引用。
4. 模型路由立即生效，**无需重启**（LLM 适配器每次请求解析一次引用）。

!!! note "密钥只写不读"
    页面保存后只接收脱敏描述符，永不返回明文。这是 `redactSecrets: true` 强制要求的体现。

### 方式二：环境变量 / .env

适合 headless 模式、CI、源码级测试与 demo：

```bash
# 直接设环境变量
export DEEPSEEK_API_KEY=sk-xxxxxxxx
export DEEPSEEK_BASE_URL=https://api.deepseek.com   # 可选

# 或写入仓库根目录 .env（会被读取）
echo "DEEPSEEK_API_KEY=sk-xxxxxxxx" > .env
```

!!! warning "env 来源只读"
    被 live 进程环境变量遮蔽的引用是 `writable: false`——`set` 会被拒绝（写入看似成功但解析仍返回遮蔽值）。要持久化密钥请用 Web UI（写入 `file` 层），或先 unset 环境变量。

### 其他 provider 的凭证

- **目录 provider**（Anthropic、OpenAI 等）：在 Models 页 Add provider，填其 API key。
- **原生认证 provider**（Bedrock/Vertex/Azure/Codex）：需原生凭证（AWS 凭证 + region、ADC project、api-version、OAuth 等），仅填 API-key 字段不够。
- **自定义 provider**：Add a custom provider，提供 Provider ID（永久不可改）、base URL、API 协议、凭证与至少一个模型。

## 高级：自定义 provider 的模型模态

手填的模型默认视为纯文本。要让一个模型接受图片，在 `$DSH_HOME/settings.yaml` 中给该模型加 `input`：

```yaml
llm-pi-ai:
  providers:
    my-gateway:
      apiKeyEnv: GATEWAY_API_KEY
      api: openai-completions
      baseURL: https://gateway.example/v1
      models:
        - id: legacy-chat
        - id: vision-preview
          input: [text, image]   # 仅此模型接受图片
```

若整条路由的手填模型都接受图片，用 `defaultInput` 设一次兜底：

```yaml
llm-pi-ai:
  providers:
    vision-gateway:
      apiKeyEnv: GATEWAY_API_KEY
      api: openai-completions
      baseURL: https://vision.example/v1
      defaultInput: [text, image]   # 兜底，不覆盖 catalog 已记录的模型
      models:
        - id: first-model
        - id: second-model
```

!!! note "defaultInput 是兜底不是覆盖"
    `defaultInput` 默认为 `[text]`，只对 catalog 未描述的模型生效——绝不会从 catalog 模型身上移除图片能力。要收窄某个 catalog 模型，用 `modelOverrides` 下该模型自己的 `input`：
    ```yaml
    llm-pi-ai:
      providers:
        anthropic:
          modelOverrides:
            claude-sonnet-4-5:
              input: [text]
    ```

更多字段与默认值见 [generated config catalog](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/config-catalog.md)，以及 [`dsh-llm-pi-ai`](https://github.com/deepseek-ai/deepseek-harness/blob/master/packages/llm/llm-pi-ai/README.md) 与 [`dsh-llm-deepseek`](https://github.com/deepseek-ai/deepseek-harness/blob/master/packages/llm/llm-deepseek/README.md) 的 README。

## 排障：模型相关错误

| 错误 | 原因 | 处理 |
|---|---|---|
| `MISSING_CREDENTIAL` | provider key 未存储或引用的环境变量未提供 | 通过 Models 页存储 key，或提供环境变量 |
| `UNKNOWN_MODEL` | 选了未配置的模型 | 选已配置模型，或把缺失模型加到 custom provider |
| Fetch available models 401 | key 错误 | 检查 key；不提供 `GET /models` 的端点需手动填模型 |
| 图片被拒发 | 模型未声明 image 模态 | 给 custom provider 模型加 `input: [text, image]` |
| provider 拒带图请求 | 模型声明了图片但端点不服务 | 从对应 `input` 或 `defaultInput` 移除 `image`，再开新 session |

更多排障见 [排障笔记](troubleshooting.md)。

## 下一步

- [安装指南](installation.md) —— 首次安装与构建
- [Web UI 使用指南](web-ui.md) —— Settings 视图的入口
- [CLI 命令](cli.md) —— `--dump-config` 与 `--patch` 的用法
- [运行时模式](runtime-modes.md) —— preset 即运行时模式
- [Session 与 Trajectory](session-trajectory.md) —— 持久化与 session 查询插件
