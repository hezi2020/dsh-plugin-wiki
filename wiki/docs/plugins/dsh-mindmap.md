# dsh-mindmap

> **插件名**：dsh-mindmap（思维导图模式）
> **来源仓库**：<https://github.com/chenw2759-wq/dsh-mindmap>
> **许可证**：未声明（仓库根无 LICENSE 文件；`package.json` 的 `license` 字段写为 `"BSD-3-Clause"`，但缺对应 LICENSE 文本，按 SPDX 规范视为未声明）
> **commit SHA**：`0d929b4`（前 7 位）

DSH 双面包插件（Host + Browser）+ Agent 预设「思维导图模式」。Host 端注册 `/api/dsh-mindmap/{generate,preview,list}` 路由、`mm_generate` / `mm_extract` 工具与系统 prompt 通告；浏览器端在侧边栏新增「思维导图」入口（资料 / 生成 / 预览三页签），并在新建会话的预设选择器中加「思维导图模式」。`mm_generate` 接受结构化 `MindmapDoc` JSON（或 .json 文件路径）+ 输出 HTML 路径，生成 A3 横向、每主干一页、大括号式横向布局、宋体大字、6 套主题色按页轮换、右侧留白笔记区、封面总览 + 可选交互式测试题的打印级 HTML，并按字符量预算字号、报告每页溢出。`mindmap-builder` skill 固化「大括号式横向思维导图」的完整构建方法。

---

## 1. 使用指南

### 前置依赖

- DSH Web profile（`~/.dsh/profiles/web`）。
- Node.js `^22.19.0 || >=24.0.0`，pnpm@11.7.0（仓库 `package.json` `engines` / `packageManager` 声明）。
- peer 依赖：`@deepseek-ai/dsh-client-locale` / `dsh-client-runtime` / `dsh-client-ui-slots` / `dsh-host-webserver` / `dsh-llm` / `dsh-system-prompt` / `dsh-tools`，以及 `react` / `react-dom ^18.2.0`。
- 构建：`tsdown 0.22.2`、`typescript ~5.7.2`、`vitest ^3.0.0`、`lightningcss`、`schemastery ^3.18.0`。
- 课件解析（强烈推荐）：本机 MinerU（`mineru_parse_document`）。插件本身只读取纯文本源（.md/.txt/.html），PPT/PDF/DOCX 需先用 MinerU 解析。
- Agent 预设目录：`~/.dsh/.agent-presets/mindmap/`（由 dsh-agent-presets roster 自动发现，无需额外注册）。

### 安装命令

```powershell
# 1. 构建插件（在插件目录）
cd ~/.dsh/plugins/dsh-mindmap
pnpm install --no-frozen-lockfile
pnpm exec tsc -p tsconfig.build.json
pnpm exec tsdown

# 2. 安装到 web profile（依赖 + bundle 均已加入 package.json）
cd ~/.dsh/profiles/web
pnpm install --no-frozen-lockfile

# 3. 清理 pnpm 引入的 harness 嵌套副本（每次 install 后必做）
cd ~/.dsh/profiles/web/node_modules/@deepseek-ai
Remove-Item cordis,cosmokit,dsh-credentials,dsh-home-paths,dsh-tools,schemastery -Recurse -Force -ErrorAction SilentlyContinue

# 4. 重启 dsh web（加载新 bundle 与预设）
```

> `package.json` 已声明 `dsh.bundle.patch: ./cordis.patch.yml`，patch 内容为单行 `insert: mindmap → @deepseek-ai/dsh-mindmap`，理论上可经 `dsh plugin add` 注册；但 README 给出的是上述手工 PowerShell 流程，含「清理 harness 嵌套副本」步骤，更适合源码部署。

### 配置项

| 来源 | 字段 |
|---|---|
| Cordis 插件行 config（`@deepseek-ai/dsh-mindmap`） | `enabled`（默认 `true`，关闭后路由 / 工具 / prompt 通告均不挂载）、`announceToAgent`（默认 `true`，向每个 agent 注入 mindmap 模式能力通告，order=160） |

- Agent 预设「思维导图模式」由 `~/.dsh/.agent-presets/mindmap/` 下的 `agent.cordis.yml` + `preset.yml` + skill 副本组成，新建会话时与「标准模式 / 创造模式」并列。
- 浏览器端：侧边栏新增「思维导图」入口 → 三页签（资料 / 生成 / 预览）。
- 路由：`/api/dsh-mindmap/{generate,preview,list}`（由 `ctx.webServer.register` 挂载）。

### 典型用法示例

**方式一：让 Agent 生成（推荐）**

新建会话时选择「思维导图模式」，然后说：

> 把 `D:\课件\` 下的 PPT 与电子书按 mindmap-builder skill 整理成思维导图，每个主干一页，输出到 `D:\复习\思维导图_01.html`，附带测试题。

Agent 会：用 MinerU 解析资料 → 提取课件与电子书共同重点 → 组织 `MindmapDoc` JSON → 调 `mm_generate` 生成 → 按溢出报告拆分 / 压缩直到每页放得下。

`MindmapDoc` JSON 结构（详见 README）：

```json
{
  "title": "人体发育总论",
  "course": "组织胚胎学自学课件",
  "ebook": "组织学与胚胎学（第10版）",
  "branches": [
    {
      "id": "一",
      "title": "概述与胚胎分期",
      "en": "overview",
      "groups": [
        {
          "heading": "（一）人体发生",
          "items": [
            { "text": "从受精卵到胎儿出生，历时约 <span class=\"k\">266 天（38 周）</span>" },
            { "text": "<b>胚（前 8 周）</b>：关键时期，易受环境因素影响致畸",
              "subs": ["细节子条目"] }
          ]
        }
      ]
    }
  ],
  "quiz": [
    { "type": "choice", "question": "…", "options": ["A","B","C","D"], "answer": 1,
      "explanation": "…", "pitfall": "…" }
  ]
}
```

`mm_generate` 输出含每页 `fontSizePt` / `usedMm` / `budgetMm` / `overflow` 报告与 `warnings` 数组；某页 `overflow:true` 时 Agent 应按 skill 拆分主干页或压缩措辞后重跑。

**方式二：前端面板**

侧边栏「思维导图」→ 三页签：

1. **资料**：填目录 → 列出课件文件（供参考）。
2. **生成**：粘贴 `MindmapDoc` JSON + 输出路径 → 生成（面板显示逐页字号 / 溢出）。
3. **预览**：填 HTML 路径 → 内嵌预览。

### 重启生效说明

!!! tip "构建 / install 后必须重启 dsh web"
    插件 bundle 与预设均需重启 `dsh web` 才会重新加载。`pnpm install` 后必须执行第 3 步「清理 pnpm 引入的 harness 嵌套副本」，否则 harness 会有嵌套副本导致加载异常。`enabled` / `announceToAgent` 行 config 修改经 `watchUserPatches` 热重载，但稳妥兜底仍是重启。

---

## 2. 弊端与缺陷

!!! warning "PPT/PDF/DOCX 解析依赖本机 MinerU，否则 mm_extract 拒绝处理"
    插件本身只读取纯文本源（.md/.txt/.html）；`mm_extract` 对 PPT/PDF/DOCX 返回 `ok:false` 并提示「请用 mineru_parse_document 解析后再构建思维导图（本机已安装 MinerU）」。若无 MinerU，重格式课件无法进入流程。出处：`src/host/tools.ts` `mmExtractTool` `execute`、README「限制」。

!!! warning "溢出报告为估算，极端字体环境下以实际打印为准"
    `mm_generate` 按汉字数 / 行高预算字号与每页用量；`SKILL.md` §4「防溢出预算」给出粗估（`.mm-h` 约 10mm/个、`.mm-item` 约 9mm/行、13.5pt 宋体行宽约 48 汉字）。极端字体环境下预算与实际打印可能偏差，必要时按报告拆分主干页。出处：README「限制」、`skills/mindmap-builder/SKILL.md` §4。

!!! warning "许可证状态不明：仓库无 LICENSE 文件，package.json 声明 BSD-3-Clause 但缺文本"
    仓库根无 LICENSE 文件；`package.json` 的 `license` 字段写为 `"BSD-3-Clause"`，但缺对应 LICENSE 文本，按 SPDX 规范视为未声明（NONE）。正式使用前建议先与作者确认并要求补 LICENSE 文件。出处：仓库 LS（无 LICENSE 文件）、`package.json` `license` 字段。

!!! warning "安装流程需手工清理 pnpm 引入的 harness 嵌套副本"
    README 给出的安装流程第 3 步「清理 pnpm 引入的 harness 嵌套副本（每次 install 后必做）」需 `Remove-Item cordis,cosmokit,dsh-credentials,dsh-home-paths,dsh-tools,schemastery`；遗忘这步会导致 harness 加载异常。这是 pnpm workspace 解析的副作用，门槛高于一般 `dsh plugin add`。出处：README「安装」第 3 步。

!!! warning "内容铁律禁止概括过简与篡改，AI 整理质量取决于模型"
    `SKILL.md` §0「总原则（铁律）」要求：一页 = 一个主干知识点；严禁概括过简（细节知识点尽量保留原文）；严禁篡改知识点（必须以 ppt 与电子书共同出现的知识点为主，原文优先，不得改写意思）。最终整理质量受模型理解能力与课件原文质量约束，需人工复核。出处：`skills/mindmap-builder/SKILL.md` §0。

---

## 3. 后续拓展思路

### 可二次开发的方向

- **更多课件格式直读**：在 `mm_extract` 中集成轻量 PDF / DOCX 解析（如 pdfjs / mammoth），降低对 MinerU 的强依赖；保留 MinerU 作为高精度通道。
- **溢出预算精确化**：把估算从字符数升级为基于实际字体度量的真实排版计算（如 headless 浏览器测量 DOM 高度），减少极端字体环境下的偏差。
- **多课件合并 / 章节编排**：支持一次输入多个课件 + 多本电子书，按章节自动编排主干序号（如「十一、鳃器发生（一）」「十一、鳃器发生（二）」），生成跨章节合集。

### 可对接的 DSH 能力

- **agent-presets**：「思维导图模式」即预设样例；可参考其 `agent.cordis.yml` + `preset.yml` + skill 副本结构为其它工作流（如论文综述、考点速记）定制预设。
- **system-prompt section**：插件以 `order: 160` 向 agent 注入能力通告；同类工具型插件可复用此模式让 agent 感知能力边界。
- **dsh-tools**：`mm_generate` / `mm_extract` 用 `defineTool` 注册，输出 schema 含结构化 `pages` 数组，是工具回传可读 + 可机读双视图的范例。

### 与其它插件组合的可能性

- **dsh-mindmap + dsh-plugin-mineru**：MinerU 是本插件重格式解析的依赖；二者组合是课件 → 思维导图的标准管线。
- **dsh-mindmap + dsh-testgen**：`mm_generate` 已内建交互式测试题页（choice / tf / fill / short + 一键批改）；如需更系统的题库生成，可让 dsh-testgen 先生成题库 JSON，再喂给 `mm_generate` 的 `quiz` 字段。
- **dsh-mindmap + dsh-md-preview**：本插件生成的 HTML 是自包含单文件，可被 dsh-md-preview 同类预览抽屉直接打开；组合后可在 DSH 内闭环「生成 → 预览 → 打印」。
