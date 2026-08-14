# dsh-vision-router

> **插件名**：dsh-vision-router
> **来源仓库**：<https://github.com/ysr666/dsh-vision-router>
> **许可证**：LGPL-3.0
> **commit SHA**：`ee9362d`（前 7 位 `ee9362d`）

给 DeepSeek Harness 的纯文本 Agent 装上"眼睛"——开箱免费、无 Python、一条命令安装。发图即用：DeepSeek 始终负责思考，内置视觉链（OVHcloud Qwen2.5-VL-72B，免 Key）和 10 个像素级视觉工具负责"看"，图片轮 = 调用工具的文本轮。

---

## 1. 使用指南

### 前置依赖

- DeepSeek Harness 的 Web profile，且 `dsh plugin` 可用 `pnpm`
- Node.js `>= 22`（host 侧）
- 运行时依赖：`@deepseek-ai/schemastery`、`@deepseek-ai/dsh-llm-deepseek`、`@deepseek-ai/dsh-anonymous-user-id`、`sharp`、`potrace`、`puppeteer-core`、`undici`
- Host 侧 inject 服务：`tools`、`llm`
- 客户端 inject 种子模块：`@deepseek-ai/dsh-client-ui-settings`、`@deepseek-ai/dsh-client-runtime`
- 默认免费链路无需 API Key；付费 `httpProviders` 需提供凭据引用 `apiKeyEnv`
- `vision_html_screenshot` 需要系统 Chrome / Chromium / Edge；其余工具无浏览器可用
- `vision_ocr` 优先用本地 tesseract（chi_sim+eng），缺失时自动退回视觉模型（可选）

### 安装命令

```sh
dsh plugin --profile web add github:ysr666/dsh-vision-router
dsh --profile web --dump-config | grep vision-router   # 一行，由 bundle 补丁挂载
```

> 长期运行的 Web profile 需重启。包自带 `dsh.bundle.patch`（`cordis.patch.yml`）自动完成：挂载插件行、接管官方 `deepseek-official` 路由（隐身模式）、放宽附件限制到 20MB / 1 亿像素——不用手改任何文件。

### 配置项

全部可选，默认即可用。通过 Web 卡片「设置 → 插件 → 插件配置 → 视觉路由（自动识图）」或 profile 补丁修改：

| 字段 | 默认值 | 含义 |
|---|---|---|
| `provider` / `model` | `vision-http` / `ovh/Qwen2.5-VL-72B-Instruct` | 简写链路（有适配器的供应商 + 模型） |
| `fallbacks` | `[]` | 简写供应商的备用模型 |
| `providers` | `[]` | 多供应商链路 `{ provider, model, fallbacks[] }`，按序尝试；优先于简写形式 |
| `httpProviders` | 内置 OVH 条目 | OpenAI 兼容直连端点 `{ name, baseURL, model, apiKeyEnv, maxTokens }` |
| `routing` | `false` | 旧版整轮链路由（一次性整轮回答）；`false` = 工具优先流程（推荐） |
| `reverseRouting` | `true` | 开启 `routing` 时，文字轮路由回 `textProvider` |
| `wrapperRoute` / `chainRoute` | `deepseek-vision` / `vision-chain` | 准入包装路由名 / 降级链路由名（置空关闭） |
| `stealth` | `true` | 接管官方 `deepseek-official` 路由 |
| `textProvider` | `deepseek-official` / `deepseek-v4-pro` | 负责思考的模型（你的日常模型） |
| `tool` / `progressiveTools` / `autoActivateOnImage` | `true` ×3 | 视觉工具开关 / 渐进式挂载 / 图片轮自动挂载 |
| `rewriteImages` | `true` | 模型输入层改写图片块（缓存描述或工具提示标记）；界面日志保留图片 |
| `downscale` / `downscaleMaxPixels` | `true` / `4000000` | 调用前压缩及其像素预算（延迟保护） |
| `cache` / `cacheTtlSeconds` / `cacheMaxEntries` | `true` / `3600` / `200` | 视觉答案缓存 |
| `timeoutMs` | `120000` | 单次视觉调用超时 |
| `artifactsDir` | `.dsh-vision-router/artifacts` | 产物目录（相对会话工作区） |
| `proxy` / `proxyHosts` | `''` / openrouter 等域名 | 仅视觉供应商域名可选的本地代理 |

### 典型用法

**发图即用**：安装并重启 `dsh web` 后，直接往对话里贴一张图。Agent 自动挂载视觉工具，通过 `vision_describe`（以及其余 9 个工具）看图，需要时连续多步。上传图片在会话界面里照常显示为图片；指向视觉工具的改写只发生在模型输入层，从不写入会话日志。

**10 个视觉工具**（图片轮自动挂载，文字轮经 `vision_activate` 或 `/vision-tools` 技能挂载）：

| 工具 | 作用 | 产物 |
|---|---|---|
| `vision_describe` | 看图问答 / 多图对比 / 结构化证据 JSON 模式（摘要 + 布局区域 + 实体清单 + 原文转写） | — |
| `vision_ground` | 定位目标 → 原图像素框 x1/y1/x2/y2 | 标注 PNG（可选） |
| `vision_detect` | 盘点某类元素（按钮/输入框/链接…）→ 编号清单 + 原图像素框 | 编号标注 PNG |
| `vision_crop` | 按像素框裁剪放大 | PNG |
| `vision_pixel_diff` | 逐像素对比：差异率 + 最差 8×8 网格区域 | 红色热力图 PNG + JSON 报告 |
| `vision_colors` | 主色提取（十六进制 + 占比） | — |
| `vision_ocr` | 文字转写：本地 tesseract（中英）优先，视觉模型兜底 | — |
| `vision_trace` | SVG 矢量化（potrace 分色；图标/logo） | SVG |
| `vision_extract_foreground` | 边界洪泛抠图（纯色背景） | 透明 PNG |
| `vision_html_screenshot` | 给本地 HTML 文件截图（无头系统 Chrome） | PNG |

常用流程示例：

```text
vision_ground image="ref.png" target="发送按钮"
vision_detect image="page.png" target="输入框"
vision_crop   image="ref.png" region="1067,841,1108,881"
vision_describe paths=["ref.png","impl.png"] question="列出两图的差异" json=true
vision_pixel_diff original="ref.png" rebuilt="screenshot.png"
vision_ocr image="screenshot.png"
vision_colors image="ref.png" top=8
vision_trace image="icon.png" steps=4
vision_extract_foreground image="logo.png"
vision_html_screenshot source="page.html" width=1200 height=720
```

**供应商降级链**（按顺序逐个尝试，全部失败才报错）：

1. 内置免费端点（`vision-http` → `ovh/Qwen2.5-VL-72B-Instruct`）——免 Key、尽力而为、每 IP 2 次/分钟；
2. 配置的 `httpProviders`（OpenAI 兼容直连端点，可选 `apiKeyEnv`）；
3. 配置的 `providers` / `provider` + `fallbacks`（任何有适配器的供应商，例如 OpenRouter 或智谱）。

### 重启生效说明

!!! tip "安装/升级/禁用需重启 Web profile"
    `dsh plugin add` / `update` / `remove` 后需重启长期运行的 Web profile，宿主在启动时通过 `dsh.client` 发现浏览器端包。配置变更经设置服务的 schema 校验 + 修订号检查，保存即生效（无需重启）；但 `stealth` / `wrapperRoute` 等影响路由组合的字段建议重启以避免状态不一致。

!!! tip "出问题时用一行 profile 覆写恢复官方 DeepSeek 行"
    在 `~/.dsh/profiles/<profile>/cordis.patch.yml` 加：
    ```yaml
    - id: llm-deepseek
      name: '@deepseek-ai/dsh-llm-deepseek'
    ```
    官方行在场时插件回退为选择器里可见的「DeepSeek + 自动识图」包装入口。

---

## 2. 弊端与缺陷

!!! warning "隐身模式默认禁用官方 llm-deepseek 行，强依赖插件自建适配器"
    `cordis.patch.yml` 中 `- id: llm-deepseek` `disabled: true`，插件读取同一个 `llm-deepseek` 设置段与凭据自建原生 DeepSeek 适配器。若插件本身异常，官方 DeepSeek 路由也不可用，需手动在 profile 补丁里恢复 `- id: llm-deepseek` `name: '@deepseek-ai/dsh-llm-deepseek'`。出处：`cordis.patch.yml`、README「隐身模式」。

!!! warning "默认免费端点为匿名 OVHcloud，2 次/分钟每 IP 且尽力而为"
    内置 `vision-http` → `ovh/Qwen2.5-VL-72B-Instruct` 免注册、免 Key，但每 IP 2 次/分钟、尽力而为；高频、生产或团队场景必须配置付费 `httpProviders` / `providers`，否则极易触发限流。出处：README「供应商降级链」「Why this exists」。

!!! warning "旧版 routing:true 模式下 httpProviders（含免费兜底）不参与降级"
    `routing: true`（旧版整轮链路由）整轮只走 `provider + fallbacks`，`httpProviders`（含免费兜底）不参与；默认 `routing: false`（工具优先）才会尝试全部。误开 `routing: true` 会丢失免费兜底。出处：README「供应商降级链」注释。

!!! warning "vision_html_screenshot 强依赖系统 Chrome / Chromium / Edge"
    `puppeteer-core` 不自带浏览器，`vision_html_screenshot` 需要系统已安装 Chrome / Chromium / Edge；无浏览器时该工具不可用（其余 9 个工具不受影响）。出处：README「环境要求」、package.json `puppeteer-core`。

!!! warning "vision_ocr 退回视觉模型会消耗视觉链额度"
    `vision_ocr` 优先用本地 tesseract（chi_sim+eng），缺失时退回视觉模型；退回路径会消耗视觉链额度，且本地未装 tesseract 时 OCR 成本不可控。出处：README「Tools」「环境要求」。

!!! warning "附件限制被 bundle 补丁强制放宽到 20MB / 1 亿像素"
    `cordis.patch.yml` 中 `- id: attachment-local` `config: { maxImageBytes: 20971520, maxImagePixels: 100000000 }`，会覆写部署默认的 5MB / 4000 万像素。若 profile 已有更严格限制或合规要求，需在 profile 补丁层再次覆写。出处：`cordis.patch.yml`。

!!! warning "图片文字被标注为不可信证据，Agent 不执行图片内指令"
    描述、OCR 输出与自动挂载提示都告知 Agent 绝不执行图片内出现的指令。这是安全设计，但也意味着用户无法通过图片让 Agent 执行指令（如图片中的"请运行 xxx"）。出处：README「安全说明」。

!!! warning "产物写入工作区且无自动清理"
    产物只写入 `<workspace>/.dsh-vision-router/artifacts`；缓存最多 200 条、TTL 3600 秒，但 artifacts 目录无自动清理机制，长期使用会累积 PNG/SVG 文件。出处：README「安全说明」「配置项」。

!!! warning "单次视觉调用硬超时 120 秒，超大图自动压缩"
    `timeoutMs` 默认 120000ms，超时即失败并尝试下一供应商；超大上传图在调用前自动压缩到 `downscaleMaxPixels`（默认 400 万像素），可能影响需要原图细节的场景。出处：README「供应商降级链」「配置项」。

!!! warning "强依赖 host 服务 tools 与 llm，且客户端需注入两个种子模块"
    `inject: ['tools', 'llm']`；客户端 `dsh.client.inject` 要求 `@deepseek-ai/dsh-client-ui-settings` 与 `@deepseek-ai/dsh-client-runtime`。任一缺失插件无法正常加载。出处：`index.js` `inject`、package.json `dsh.client.inject`。

---

## 3. 后续拓展思路

### 可二次开发的方向

- **更多视觉供应商适配器**：当前 `httpProviders` 走 OpenAI 兼容协议；可扩展 Gemini、Claude、Qwen 国产端点等专用适配器，丰富降级链。
- **artifacts 自动清理与导出**：为 `.dsh-vision-router/artifacts` 增加按会话/按时间的自动清理策略，以及一键打包导出某轮视觉证据链（PNG + JSON 报告）。
- **本地 tesseract 自动安装**：首次调用 `vision_ocr` 时检测 tesseract 缺失并引导安装（或封装一个轻量 WASM OCR），降低退回视觉模型的额度消耗。
- **视觉链健康度看板**：复用 `vision_describe` 的分类错误（地区/风控/额度/限流/上下文/网络）做统计，给出每条链路的成功率与建议。

### 可对接的 DSH 能力

- **tools + llm 双注入**：本插件是同时注入 `tools` 与 `llm`、做"工具优先 + 路由降级"的范例，可作为其它多模型路由类插件的模板。
- **stealth 路由接管**：`cordis.patch.yml` 中 `disabled: true` + 自建适配器的模式，可复用于其它需要"无感增强"官方路由的插件。
- **settings 卡片**：`@deepseek-ai/dsh-client-ui-settings` 注入让插件在原生设置页注册卡片，可作为带配置 UI 的插件参考。
- **ctx.fs 沙盒感知**：工具输入经 `ctx.fs` 解析是沙盒友好的文件访问范例。

### 与其它插件组合的可能性

- **dsh-vision-router + dsh-np-ppt**：用 `vision_html_screenshot` 给 PPTD 项目截图，再用 `vision_pixel_diff` 与设计稿逐像素比对，自动化校验 PPTX 还原度。
- **dsh-vision-router + dsh-workspace-search**：搜索定位文件后，对截图类结果用 `vision_ocr` / `vision_describe` 做内容级二次筛选，构建"看图找文件"流程。
- **dsh-vision-router + dsh-token-monitor**：把视觉链的调用次数与分类错误接入 token-monitor 的统计维度，监控视觉用量与失败率。
- **dsh-vision-router + dsh-side-chat**：在 side chat 中对选中代码截图做 `vision_pixel_diff` 比对，辅助 UI 还原的边路讨论。
