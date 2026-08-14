# 测试体系

本页说明 dsh 仓库的分层测试体系、各层的运行命令与策略约束。内容提取自 `docs/testing.md` 与 `AGENTS.md`；命令定义见 `package.json`，rationale 见链接的 Agent Notes。

!!! info "一句话原则"
    dsh 是 DeepSeek 自家产品——**不要吝惜真实 API 测试**。无 key 测试只证明管道通畅，**只有带 key 的运行才证明 agent 对真实模型有效**。

## 测试分层总表

| 层 | 命令 | 是否需要 key | CI 角色 |
|---|---|---|---|
| 单元 | `pnpm run test` | 否 | vitest 跑包与 example spec + 仓库脚本 spec |
| 覆盖率门禁 | `pnpm run test:coverage` | 否 | **CI 门禁**，per-file 100% on `packages/*/*/src` |
| 真实 API e2e | `pnpm run test:e2e` | 是（`DEEPSEEK_API_KEY` 等） | 无 key 自跳过，保持 keyless CI 绿 |
| Snapshot 回放 | `pnpm run test:snapshot` | 否 | keyless ACP/headless 回放对比期望输出 |
| Snapshot 重录 | `pnpm run test:snapshot:record` | 是 | 模型 transcript 变更时本地重录 |
| Web 浏览器 snapshot | `pnpm run test:web` | 否 | Linux PR gate；CI 强制只读 replay |
| Windows wine | `pnpm run check:windows-wine` | 否（需 wine） | **CI 拥有该信号**，本地仅诊断已知 Windows 失败 |

## 单元测试（`pnpm run test`）

vitest 跑包与 example spec（`tests/**` 目录）加上仓库脚本 spec（`scripts/**/*.spec.ts`）；测试与所验证的代码区域同处。

要求：

- **每个 registry 都要有 HMR-safety 测试**：dispose 贡献的 fiber，断言清理生效。
- 优先覆盖 edge case、错误路径、事件顺序、并发竞争、契约回归的永久测试（参考 `packages/core/agent-loop/tests/contract-regressions.spec.ts`）。

## 覆盖率门禁（`pnpm run test:coverage`）

这是 **CI 的覆盖率门禁**，不是 `pnpm run test`。规则：

- **per-file 100% on `packages/*/*/src`**。
- 未覆盖行往往是门禁正确标记的**死代码**，而非需要补的测试。
- 行覆盖率是必要条件，**永不充分**——它证明行跑过，不证明功能如发布版工作。
- **`packages/shell/pwsh-local/src` 的 per-file 100% 需要真实 `pwsh`**：没有时其 executor 套件自跳过，`vitest.config.ts` 豁免该文件让无 pwsh 的 host 保持绿色；CI runner 带 pwsh 并执行完整门槛。

## 真实 API e2e（`pnpm run test:e2e`）

带 key 的测试打活 provider API——DeepSeek 模型加上按各自 key gate 的 provider smoke（`EXA_API_KEY`、`PERPLEXITY_API_KEY`…）。**每个套件无各自 key 时自跳过**，所以 keyless CI 保持绿色。

with-key 策略——「推理在这里很便宜」：

- 不 ration 真实 API 测试。
- 覆盖写文件 prompt、多轮对话、工具使用、mid-stream 取消。
- **最高价值是 smoke 测试**：boot 真实 example，发一个 prompt，检查世界——它们抓到「单元绿、产品坏」这类 mock 抓不到的问题（见 postmortem 0001）。
- 自跳过保持无 secret 的 CI 与无 key 的贡献者不阻塞，**不是成本信号**。
- 每个 example 都带 keyless 与 with-key smoke（见 `examples/AGENTS.md`）。

!!! warning "验证世界，而非自报告"
    e2e 断言要**重跑命令或外部重读文件**；对 agent 自己输出的关键词探测会让作弊 agent 通过。断言未触碰文件 byte 级一致。e2e 测试拥有自己的资源：在测试里创建 harness，在 `afterEach` dispose（即使失败/重试/超时）；共享 fixture 放在普通 `tests/harness.ts`，**绝不放另一个 `*.e2e.ts`**（导入 spec 会重注册 `describe` 并重复真实 API 调用）。

## Snapshot 回放（`pnpm run test:snapshot`）

无 key 的期望输出覆盖外部行为——传输契约与呈现，而持久化日志 pin 装配后的后端行为。

- **ACP snapshot**：boot 真实 automation-server example，回放录制的 session，diff 归一化的 JSON-RPC 加 re-persisted 日志。
- **headless 后端场景**：通过未导出的 JSONL 测试 driver boot 显式 example 组合；`apps/cli` 单独拥有产品 `dsh --profile headless` 验收。
- 一个 ACP 场景（`text-turn`）pin 完整 system-prompt/tool-schema 内容；其他 fixture 对其 tokenize，让一次编辑只 churn 一行。
- 提交的 session-format JSONL 用规范的 packed-row 布局；keyless snapshot gate 按 `session` header 发现每个此类 fixture。

重录与刷新：

| 命令 | 用途 | 何时用 |
|---|---|---|
| `pnpm run test:snapshot` | 回放对比期望输出 | 常规验证 |
| `pnpm run test:snapshot:record` | 重录期望输出 | 模型 transcript 变更；**需要 key** |
| `pnpm run test:snapshot:refresh` | 刷新（replay 输入仍有效时） | replay 输入仍有效 |

**逐行 review 每个 JSONL 与期望输出 diff**。

## Web 浏览器 snapshot（`pnpm run test:web`）

Chromium 把回放的浏览器输出与 `apps/web/tests/snapshots/` 对比。

- **Linux PR gate**（必需）。
- CI 强制只读 `DSH_SNAPSHOT=replay`，**绝不写期望输出**；record/refresh 留在本地，每个 diff 都要 review。
- `test:web` 先 build（为了插件 CSS）。

## Windows wine 检查（`pnpm run check:windows-wine`）

```sh
pnpm run check:windows-wine
```

!!! warning "仅诊断用"
    `AGENTS.md` 明确：**仅当诊断已知 Windows 失败时才跑**，需要 wine。**CI 拥有该信号**，本地默认不跑。走 `bash scripts/wine-windows-gates.sh`。

## 测试解析：仅源码面

- 每个 vitest config 把 vite-tsconfig-paths 指向 `tsconfig.base.json`；bare workspace 导入解析到 `src`，**绝不**通过包 `exports` 到 built `lib/`——后者会加载模块单例的第二份拷贝。
- built artifact 只在显式消费时用：`lib` 模式子进程与下面的 built smoke。

## 测试子进程启动模式

- CI 与有 build 的测试 lane 通过共享 dual-mode launcher 从 built `lib/` 跑每个 example 或 Cordis-config 子进程。**不要手写 `--import tsx`**。
- 不加载 Cordis 的协议/操作系统 fixture 用 Node 直接跑可擦除 `.ts`，不带 tsx 或 root paths map。
- 只有 subject 是源码路径解析的测试才可选 `src`；在测试里声明该契约。

## 何时需要 snapshot 测试

每个**非平凡的、模型/协议/人可见的**变更，必须在**同一个 PR** 里通过可运行 example 的 owning snapshot suite 增加或更新 keyless 场景。

- 包测试、e2e 断言、mock/test-only 组合、PR rationale **都不能**替代装配后的 transcript。
- 需要时扩展 harness。
- ACP 自动化场景用 `examples/<name>/tests/snapshots/`，基于 `dsh-acp-snapshot` suite factory（`examples/acp-agent` 是 primary）。
- `examples/headless-agent` 拥有内部 canonical-event JSONL snapshot 与 replay fixture。
- `pwsh-tool-turn` ACP 场景 boot 真实 `pwsh`，无则跳过。
- 完成的交互式 terminal journey 用 `apps/cli/tests/snapshots/` 下的 JSONL 驱动场景。
- 浏览器渲染的 web GUI journey 用 `apps/web/tests/snapshots/`。
- 新能力 seam、生命周期变体、transcript 表面在 plan 时命名每个覆盖层，并在实现前验证 harness 能表达它。

## 产品可见插件的 REAL-composition 测试

`packages/AGENTS.md` 要求：**产品可见插件需要非单元 REAL-composition 测试**。

- 手工 `ctx.plugin(...)` 套件**不足**。
- 通过 Loader 与 app/process boot 测试用 `cordis.yml`。
- 只 mock 外部服务或非确定性输入。
- 断言模型可见请求/日志、持久状态、或用户可见输出。
- 把 opt-in 排除在 shipped default 之外。

### 真实入口路径

- 「真实入口路径」指发布产物：包 `bin` 在普通 `node` 下跑 built `lib/bin.js`，暴露 tsx 掩盖的失败（settle race、模块解析、吞掉的 load 失败）。
- 同理适用于非 index 运行时入口（worker-thread 兄弟 `lib/worker.cjs`）与跨 bundle 共享的 singleton 模块。
- 保持 built-artifact smoke 绿（`packages/examples/*/tests/built-bin.e2e.ts`、`packages/code-runtime/code-runtime-worker-thread/tests/built-lib.e2e.ts`）。
- 断言真正缺失 config 时非零退出。

### 无 `inject` 插件的 Loader smoke 加固

一个 guard 只有在回归真的让它失败时才 guard。对于无 `inject` 的插件（bundle/composition 插件），Loader smoke 在默认导出替换了所需命名导出时仍绿——加显式 `expect('default' in mod).toBe(false)` 加 `unwrapExports` round-trip 断言，并证明：引入回归、看红、回退。

## 偏好真实实现而非 mock

只 mock 昂贵或非确定性的边界（LLM adapter、网络、时钟）；下游全部保持真实。手写替身只证明桥搬字节，不证明发布的工具如断言那样工作。

bridge tool-call 测试用脚本化 mock 模型加真实工具与 executor：`makeBridgeHarness({ withBash: true })` 插入 `dsh-bash-local` 与 `dsh-tool-bash`，然后跑 `echo`。

恢复测试按 step 分开 pre/post-chunk 失败，证明失败 chunk 不派生 message 或 tool 副作用。覆盖耗尽、取消、策略组合、持久化、状态、wire count、transport-closing idle timeout、shipping Loader 组合。

## 延伸阅读

- 测试策略权威：`deepseek-harness/docs/testing.md`
- 命令清单：`deepseek-harness/AGENTS.md` 的「Commands」段
- 包级测试规则：`deepseek-harness/packages/AGENTS.md`
- 真实 API e2e CI Agent Note：`.agents/notes/implemented/testing/2026-06-19-real-api-e2e-ci.md`
- ACP snapshot Agent Note：`.agents/notes/implemented/testing/2026-06-19-acp-snapshot-tests.md`
- Web GUI 浏览器 e2e lane：`.agents/notes/implemented/testing/2026-07-24-web-gui-browser-e2e-lane.md`
- postmortem 0001（green unit / broken product）：`deepseek-harness/docs/postmortem/0001-acp-default-export-drops-inject.md`
