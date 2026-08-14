# PLUGIN 元数据 — dsh-humanizer

## 插件名称
dsh-humanizer（DSH 中文文本 AI 痕迹消除工作流）

## 来源仓库 URL
https://github.com/DEEP-IOS/dsh-humanizer

## 克隆时的 commit SHA
前 7 位：`164ecf0`

## 功能描述（一句话）
DSH 原生中文文本 AI 痕迹消除与多重审核对抗工作流：模型做人味（十维叙事审计、十五层语言分析、功能路径诊断、三轮改写、三重审核），程序守内容（分布画像、内容忠实守卫、工件门禁），改完读者看不出是模型写的且内容不跑偏；不是 AI 检测器。

## 前置依赖
- Node.js `>= 18`（package.json `engines`）
- DSH 运行时 peerDependencies：`@deepseek-ai/dsh-tools ^0.1.0-rc.6`、`@deepseek-ai/cordis ^4.0.1`
- 运行时依赖：`@deepseek-ai/schemastery ^3.18.1`
- 包管理器：`pnpm@10.30.3`（package.json `packageManager`）
- DSH Web UI（client inject `slots`，`platform: "web"`）
- 与 dsh-humanize（RLCL 编码工作流）不是同一个项目；本插件处理的是文本

## 安装命令
```sh
# npm 源（推荐）
dsh plugin --profile web add dsh-humanizer

# Git 源（从 GitHub 拉取，始终最新）
dsh plugin --profile web add "github:DEEP-IOS/dsh-humanizer"
```

装完重启 web。bundle 层栈在 boot 时合成，Node half 改动需要重启才生效。

## 配置项
| 来源 | 字段 |
|---|---|
| profile `cordis.patch.yml`（bundle patch 自动挂载） | 自动注册，无需手写 |
| DSH Web 客户端注入 | `slots`（`platform: "web"`） |
| 工作流常驻 system prompt | 十步流程 + 十条铁律（模型执行到哪一步读 references/ 哪一章） |
| references/ | 19 章方法论随包分发（`00-工作流.md` 到 `18-实战迭代经验.md`） |

## 已知限制
- **不是 AI 检测器**：不输出概率，不识别作者，不要求把文本提交给任何外部检测；不承诺任何检测器给出某个分数。目标只是让文本经得起读者和编辑的眼睛。
- **程序规则刻意少**：三个工具（`humanize_profile`、`humanize_guard`、`humanize_validate_artifact` + `humanize_reference`）只做确定性的事（分布画像、内容忠实守卫、工件门禁）。程序不判断像不像人，只核对数字还在不在、格子填没填。规则越多越僵化，把「逐项判断」写成正则得到的是机械替换机，恰好是这套方法最反对的。
- **十步不可跳**：诊断有固定顺序，缺一章不准进改写；一次一步，做完报「第 N 步完成，下一步第 N+1 步」；一次做完等于偷工减料。
- **三轮改写顺序不可颠倒**：先动材料和叙事，再动信息组织和句法，最后动词汇；顺序反了改出来的是「看着自然、分布依旧」。
- **禁止配额化**：把任何手法做成每章配额，配额就是新指纹——这是十条铁律之一。
- **禁止英文思考**：思考、字段、标签、理由一律中文，原文术语除外。
- **工件逐格填**：每个工件逐格填，每格引用原文；不许用「已检查」「无异常」填空。
- **命令行冒烟需手动**：`node scripts/guard-humanizer.mjs profile ./文本.md` / `guard ./原文.md ./改写稿.md`。

## 本地运行状态
未实测安装（本任务仅克隆源码，未实际通过 dsh plugin 加载或运行 `pnpm test`）

## 许可证
MIT（来源：package.json `license: "MIT"`、README「License」，确定性层 `lib/guard.mjs`、`lib/reference.mjs` 零依赖，测试用 Node 内置 `node:test`）
