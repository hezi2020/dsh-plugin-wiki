# dsh-humanizer

> **插件名**：dsh-humanizer
> **来源仓库**：<https://github.com/DEEP-IOS/dsh-humanizer>
> **许可证**：MIT
> **commit SHA**：前 7 位 `164ecf0`

DSH 原生中文文本 AI 痕迹消除与多重审核对抗工作流。你让模型写了一段中文，读起来很顺，但总觉得哪里不对——dsh-humanizer 管的就是这个「哪里不对」。它不做词表替换，给模型一套诊断和改写流程：从叙事结构、语言层次到三轮改写，每一层都有对应的检查方法，每一步都有程序守门。改完的东西，读者看不出是模型写的，内容也没有跑偏。它不是 AI 检测器。

---

## 1. 使用指南

### 前置依赖

- Node.js `>= 18`（package.json `engines`）
- DSH 运行时 peerDependencies：`@deepseek-ai/dsh-tools ^0.1.0-rc.6`、`@deepseek-ai/cordis ^4.0.1`
- 运行时依赖：`@deepseek-ai/schemastery ^3.18.1`
- 包管理器：`pnpm@10.30.3`
- DSH Web UI（client inject `slots`，`platform: "web"`）
- 与 dsh-humanize（RLCL 编码工作流）不是同一个项目；本插件处理的是文本

### 安装命令

```sh
# npm 源（推荐）
dsh plugin --profile web add dsh-humanizer

# Git 源（从 GitHub 拉取，始终最新）
dsh plugin --profile web add "github:DEEP-IOS/dsh-humanizer"
```

装完重启 web。bundle 层栈在 boot 时合成，Node half 改动需要重启才生效。

### 配置项

| 来源 | 字段 |
|---|---|
| profile `cordis.patch.yml`（bundle patch 自动挂载） | 自动注册，无需手写 |
| DSH Web 客户端注入 | `slots`（`platform: "web"`） |
| 工作流常驻 system prompt | 十步流程 + 十条铁律（模型执行到哪一步读 references/ 哪一章） |
| references/ | 19 章方法论随包分发（`00-工作流.md` 到 `18-实战迭代经验.md`） |

### 典型用法示例

对模型说「用 humanizer 处理这段文本」。工作流常驻 system prompt，模型按十步执行，用 `humanize_reference` 读方法论章节。

| 工具 | 作用 |
|---|---|
| `humanize_profile(text)` | 分布画像：全文与逐段的句长、短长句占比、连词密度、§18 特征字计数、内容锚点 |
| `humanize_guard(original, rewritten)` | 内容忠实守卫：锚点保真 + 禁止条件扫描 |
| `humanize_validate_artifact(artifact, source)` | 工件门禁：拒占位空话、空数组、假证据、短判断 |
| `humanize_reference(name)` | 读取 references/ 章节全文或小节（如 `04#4.7`） |

命令行冒烟：

```sh
node scripts/guard-humanizer.mjs profile ./文本.md
node scripts/guard-humanizer.mjs guard ./原文.md ./改写稿.md
```

十步流程（每步只产出一个工件，过 `humanize_validate_artifact` 门禁才进下一步）：

| 步 | 做什么 | 产出 |
|---|---|---|
| 0 | 接单卡：任务边界 + 内部基线 + 执行表字段 | 接单卡 |
| 1 | 十维叙事设计，逐维审计 | 工件 A |
| 2 | 功能路径图：八类路径逐形态 | 工件 B |
| 3 | 十五层语言分析：逐细分项 + 句式使用率 | 工件 C |
| 4 | 认识与来源图 | 工件 D |
| 5 | 问题清单：合并 A/B/C/D | 问题清单 |
| 6 | 改写轮一：只改材料/叙事/论证 | 修改记录 |
| 7 | 改写轮二：只改信息焦点/照应/句法 | 修改记录 |
| 8 | 改写轮三：只改词汇/搭配/虚词 | 修改记录 |
| 9 | 复核 | 复核报告 |
| 10 | 交付 | 改写稿 + 全部工件 |

### 重启生效说明

!!! tip "Node half 改动需重启 dsh web"
    bundle 层栈在 boot 时合成，Node half（`lib/guard.mjs`、`lib/reference.mjs`、`index.mjs`）改动需要重启才生效；client half（`lib/client.js`）改动硬刷新即可。

---

## 2. 弊端与缺陷

!!! warning "不是 AI 检测器，不输出概率不识别作者"
    本插件不输出概率，不识别作者，不要求把文本提交给任何外部检测；不承诺任何检测器给出某个分数。目标只是让文本经得起读者和编辑的眼睛。若用户期待「过检测器」效果会落空。出处：README「边界」。

!!! warning "程序规则刻意少，判断依赖模型语境"
    三个工具只做确定性的事（分布画像、内容忠实守卫、工件门禁）；程序不判断像不像人，只核对数字还在不在、格子填没填。判断依赖模型语境（这个排比在这里有没有用、这个心理动词要不要换成动作），程序答不了。规则越多越僵化，把「逐项判断」写成正则得到的是机械替换机。出处：README「怎么改 · 程序守内容」。

!!! warning "十步不可跳，一次一步"
    诊断有固定顺序，缺一章不准进改写；一次一步，做完报「第 N 步完成，下一步第 N+1 步」；一次做完等于偷工减料。这对追求快速出稿的用户是较重的工作流负担。出处：README「十条铁律」第 6、9 条、「十步」。

!!! warning "三轮改写顺序不可颠倒"
    先动材料和叙事，再动信息组织和句法，最后动词汇；顺序反了改出来的是「看着自然、分布依旧」。改写必须严格按 6→7→8 顺序，不可并行或调换。出处：README「十步」末尾「三轮改写的顺序不能颠倒」。

!!! warning "禁止配额化，配额即新指纹"
    把任何手法做成每章配额，配额就是新指纹——这是十条铁律最重要的一条。意味着不能简单「每章删 3 个『此外』」式机械操作，必须逐句判断。出处：README「十条铁律」第 8 条。

!!! warning "禁止英文思考，原文术语除外"
    思考、字段、标签、理由一律中文，原文术语除外。这对英文为主的 Agent 协作链路（如英文 system prompt 的 DSH）是约束，需工作流强制中文思考。出处：README「十条铁律」第 5 条。

!!! warning "工件逐格填，禁占位空话"
    每个工件逐格填，每格引用原文；不许用「已检查」「无异常」填空。`humanize_validate_artifact` 会拒占位空话、空数组、假证据、短判断，模型偷工会被门禁拦下。出处：README「十条铁律」第 1 条、「使用」工具表。

---

## 3. 后续拓展思路

### 可二次开发的方向

- **英文版方法论扩展**：当前 19 章 references 与十条铁律针对中文；可扩展英文版方法论（十五层语言分析针对英语语素构词），覆盖双语写作场景。
- **章节任务四类轮换自动化**：references/18 实战迭代经验提到「章节任务四类轮换、七类高危模式」；可把轮换策略封装为更高层 skill，让模型自动选择当前章节的改写侧重。
- **检测原理反馈闭环**：references/14 检测原理列出七类检测信号；可扩展为 `humanize_detect_signal(text)` 工具，让模型在改写前后自检七类信号变化，形成「改写 → 检测 → 再改写」闭环。

### 可对接的 DSH 能力

- **skill**：工作流常驻 system prompt 已是 skill 形态；可把「处理这段文本」封装为更高层 skill，让 Agent 自然语言触发十步流程。
- **hooks**：`humanize_validate_artifact` 门禁失败可经 hooks 触发外部通知（如提醒人工介入）；`humanize_guard` 内容忠实守卫失败可触发回退。
- **self-modification**：十步流程 + 工件门禁是 self-modification 的「分步验证」范例——Agent 自主改写文本时每步过门禁，防止偷工。

### 与其它插件组合的可能性

- **dsh-humanizer + dsh-track**：把十步流程的每步工件作为 dsh-track 的 task evidence 累计，形成「文本改写任务可追溯」的工作流；决策点（如改写轮选择）接入 dsh-track 决策账本。
- **dsh-humanizer + dsh-github**：用 dsh-github 把改写后的文档开 PR 评审，`reviewMode: "model"` 的子代理可额外审「改写是否引入事实错误」（补 `humanize_guard` 内容忠实守卫的盲区）。
- **dsh-humanizer + ego-browser**：用 ego-browser 抓取目标站点的真人写作样本（如知乎高赞回答），`humanize_profile` 对比样本分布，让改写后的文本分布逼近真人样本。
