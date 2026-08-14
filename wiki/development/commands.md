# 命令系统

本页列出 dsh 仓库的全部 `pnpm` 命令与 `dsh` 子命令，说明每个的用途、运行时机与注意事项。所有命令与说明均提取自仓库根 `AGENTS.md` 的「Commands」段；脚本定义见 `package.json` 的 `scripts`，gate 组合见 `scripts/run-gates.ts`。

!!! info "环境前提"
    - Node.js：`^22.19.0 || >=24.0.0`（CI 覆盖 22.19、24、26）
    - pnpm：仓库 pin `pnpm@11.7.0`（`package.json` 的 `packageManager`），用 `corepack enable` 启用
    - 包管理器：pnpm workspaces

## pnpm 命令总表

| 命令 | 用途 | 何时运行 | 注意事项 |
|---|---|---|---|
| `pnpm install` | 安装 pnpm workspaces 依赖 | 首次设置或拉取新依赖后 | Node `^22.19 \|\| >=24`；`postinstall` 会跑 `scripts/install-lefthook.mjs` 配置 worktree-local Lefthook 与翻译配对 merge driver |
| `pnpm run clean` | 移除构建产物与已删包的安全残留 | 需要干净树或排查残留时 | 走 `tsx scripts/clean.ts` |
| `pnpm run test` | vitest 单元测试 | 改了包/脚本行为后 | 这是单元层，**不是 CI 覆盖率门禁**；CI 门禁是 `test:coverage` |
| `pnpm run test:coverage` | CI 覆盖率门禁 | CI；本地想验证覆盖率时 | **per-file 100% on `packages/*/*/src`**；`packages/shell/pwsh-local/src` 需真实 `pwsh`，否则其 executor 套件自跳过 |
| `pnpm run test:e2e` | 真实 API 测试 | 验证 provider 行为时 | **无 `DEEPSEEK_API_KEY` 自跳过**；其他 provider smoke 按各自 key（`EXA_API_KEY`、`PERPLEXITY_API_KEY`…）gate |
| `pnpm run test:snapshot` | 无 key 的 ACP/headless 回放对比期望输出 | 模型/用户输出变更后 | 可用 `-t <name>` 过滤；CI 强制只读 `DSH_SNAPSHOT=replay`，不写期望输出 |
| `pnpm run test:snapshot:record` | 重录期望输出 | 模型 transcript 变更时 | **需要 key**；逐行 review 每个 JSONL 与期望输出 diff |
| `pnpm run typecheck` | 类型检查 | 推送前（`pre-push` hook 跑它）；改类型后 | 实际是 `build:lib:host` + `typecheck:contracts-ready`，会先完成 Host lib 阶段（含 Typert 生成契约） |
| `pnpm run lint` | oxlint 检查 | 改代码后 | 实际是 `build:lib:host` + `lint:contracts-ready`（`tsx scripts/run-oxlint.ts .`） |
| `pnpm run duplication` | 跨文件 TypeScript 克隆检测 | 怀疑有重复代码时 | 走 `jscpd --config .jscpd.json packages scripts` |
| `pnpm run build` | 完整构建 | 需要构建产物时（如 demo、built-artifact smoke、`hygiene`） | `tsc` 产 `lib/types`，`tsdown` 打包运行时；顺序：Host tsc → Host tsdown → Client tsc → Client tsdown → Web build |
| `pnpm run hygiene` | 卫生检查组合 | 发布前、改包结构后 | `knip` + `publint` + workspace constraints + NodeNext consumer check + 多个 `verify-*` gate；`publint` 校验 entrypoint 对齐 built `lib/*.js` |
| `pnpm run check:windows-wine` | Windows wine 检查 | **仅**诊断已知 Windows 失败时 | **需要 wine**；CI 拥有该信号，本地默认不跑 |
| `pnpm run doc-sync` | 所有文档 gate | 文档变更后 | 叶子列表在 `scripts/run-gates.ts`；含 `verify-md-links`、`verify-mermaid`、`verify-type-equiv`、`verify-doc-budgets` 等 |
| `pnpm run website:build` | VitePress 构建 | 文档站点变更后 | 同时充当死链检查 |
| `pnpm run demo:cordis` | 自指 cordis demo | 演示 agent 修改自身运行时 | **需要 key**；默认 `web` profile，或 `acp` |
| `pnpm run demo:acp` | ACP 自动化服务器 demo | 演示 ACP | **需要 `DEEPSEEK_API_KEY`**；走 `packages/examples/acp-demo/src/bin.ts` |

## `dsh` CLI 子命令

`dsh` 是产品 CLI。`package.json` 的 `dsh` script 用 tsx ESM hook 从源码启动：`node --import tsx/esm apps/cli/src/bin.ts`。

| 命令 | 用途 | 注意事项 |
|---|---|---|
| `pnpm dsh --profile headless "task"` | 从源码跑一个一次性 headless 任务 | **需要 `DEEPSEEK_API_KEY`** |
| `pnpm dsh --profile <name> --dump-config` | 打印实际 boot 的插件树 | 任何打印出的行都可被自己的 patch 替换；用于理解 profile 组合 |

`docs/architecture.md` 还提到 `dsh` 的 profile 体系：`web` 与 `headless` 作为模板随仓库发布；profile 在 Harness home 中命名，列出堆叠的 bundle、持有的 out-of-tree 插件、用户自己的 `cordis.patch.yml`。patch 叠加顺序为：profile 列出的 bundle → profile 的 `cordis.patch.yml` → home 级 `cordis.patch.yml` → 任何 `--patch` overlay。

!!! warning "dsh 源码启动契约"
    `dsh` CLI 的源码启动走 tsx 的 ESM-only hook（`node --import tsx/esm`）；它触及的模块必须保持 ESM（不能有 CJS-only export）——Node 原生 TypeScript 模式在所支持引擎范围内不可用。详见 Agent Note `2026-07-29-dsh-source-launch-tsx-esm.md`。

## 运行相关检查的本地纪律

`AGENTS.md` 明确：**推送前通过 [dsh-pre-push-checks](https://github.com/deepseek-ai/deepseek-harness/blob/master/.agents/skills/dsh-pre-push-checks/SKILL.md) 跑相关检查，只报告跑过的命令**。核心原则：

- **按表面匹配证据**：行为用聚焦测试；模型或用户输出用 snapshot；文档用 `doc-sync`；发布路径用 build/hygiene + built smoke；provider 行为用真实 API e2e。
- **不要默认跑全套**：CI 拥有穷尽覆盖与平台矩阵；只有显式请求、CI 诊断、或不可削减的仓库级改动才本地全套演练。
- **覆盖率门禁是 `test:coverage`，不是 `test`**（理由见 `docs/testing.md`）。
- `gh stack sync` 后立即验证；检查不过不合并。

### Host 沙箱失败处理

当必需的 `gh`、`pnpm`、build、test 或 generator 命令因 agent 沙箱阻止 credential / network / IPC / file watching / 嵌套 `sandbox-exec` 而失败时：**用最窄的 host 提权原样重试**，再去诊断认证或项目失败。要求沙箱证据；**绝不绕过真实测试失败或被测产品沙箱**。

## 额外 gate 入口（节选）

`package.json` 还提供更细粒度的 gate（`AGENTS.md` 未单列但 `scripts/run-gates.ts` 与 `package.json` 拥有），供定向诊断：

| 命令 | 用途 |
|---|---|
| `pnpm run check:all` | 完整本地 gate 集合（独立于 Git hook，非 agent 指令） |
| `pnpm run check:ci` | CI 主 lane |
| `pnpm run check:ci:linux-primary` | CI Linux 主 lane |
| `pnpm run check:ci:static` | CI 静态 lane |
| `pnpm run check:ci:coverage` | CI 覆盖率 lane |
| `pnpm run check:ci:snapshot` | CI snapshot lane |
| `pnpm run check:ci:artifacts` | CI 产物 lane |
| `pnpm run check:ci:consumers` | CI 消费者 lane |
| `pnpm run check:node-compat` | Node 兼容性 |
| `pnpm run knip` | 死代码检测（`--treat-config-hints-as-errors`） |
| `pnpm run publint` | 包 entrypoint 校验 |
| `pnpm run constraints` | workspace 约束（`tsx scripts/check-workspace-constraints.ts`） |
| `pnpm run verify-cordis-config` | 校验 `cordis.yml` bare plugin 出现在 resolver manifest 的 `dependencies` |
| `pnpm run verify-mermaid` | Mermaid 图校验 |
| `pnpm run verify-md-links` | Markdown 交叉链接校验 |
| `pnpm run verify-doc-budgets` | 文档字数预算校验 |
| `pnpm run gen-module-graph` | 生成 `docs/module-graph.md`（CI freshness gate） |

完整脚本与 gate 清单以 `package.json` 的 `scripts` 与 `scripts/run-gates.ts` 为准。

## 延伸阅读

- 命令清单权威：`deepseek-harness/AGENTS.md` 的「Commands」段
- 脚本定义：`deepseek-harness/package.json` 的 `scripts`
- gate 编排：`deepseek-harness/scripts/run-gates.ts`
- 贡献者日常与 CI 组织：`deepseek-harness/docs/development.md`
- 测试策略：`deepseek-harness/docs/testing.md`
