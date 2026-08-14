# 竞品对比

本章节将 DeepSeek Harness（`dsh`）与主流 AI 编码代理工具进行系统对比，所有结论均源自对应工具的官方文档或官方仓库，并附链接可溯源。

## 方法论

!!! abstract "溯源原则"
    - **所有对比结论必须源自对应工具的官方文档**，禁止仅凭推测。
    - 每条结论后用 Markdown 链接标注来源，可点击溯源。
    - 若某项信息无法从官方文档确认，明确写「官方文档未明确」，不编造。
    - dsh 一方信息源自 [dsh 官方仓库](https://github.com/deepseek-ai/deepseek-harness)（README、AGENTS.md、架构文档及各包 README）。
    - 竞品一方信息源自各自官方文档：[Trae](https://docs.trae.cn/)、[OpenAI Codex CLI](https://github.com/openai/codex)、[Anthropic Claude Code](https://code.claude.com/docs/)、[Pi Agent](https://pi-agent.org/)。
    - AgentCLI 因未找到权威官方产品与文档，相应章节明确说明并暂略。

## 章节导航

### 逐项对比

| 竞品 | 简介 | 链接 |
|---|---|---|
| Trae | 字节跳动 TRAE 产品族（TraeCode/TraeWork/CLI/Plugin），闭源商业 IDE/工作台 | [trae.md](./trae.md) |
| OpenAI Codex CLI | OpenAI 本地终端编码代理，Rust 构建，Apache-2.0 开源 | [codex-cli.md](./codex-cli.md) |
| Anthropic Claude Code | Anthropic 官方智能体编码工具，闭源商业，含 Agent Teams | [claude-code.md](./claude-code.md) |
| Pi Agent | Earendil Works 极简终端编程脚手架，MIT 开源，TypeScript 扩展，树结构会话 | [pi.md](./pi.md) |
| AgentCLI | 无明确官方文档，暂略 | [agentcli.md](./agentcli.md) |

### 汇总视图

- [对比矩阵](./matrix.md) —— 17 个维度的横向对比大表格，每单元格附官方文档链接。
- [dsh 优势与缺陷小结](./summary.md) —— dsh 相对优势、相对缺陷与适用场景建议。

## 官方文档来源一览

| 工具 | 官方文档入口 |
|---|---|
| DeepSeek Harness | <https://github.com/deepseek-ai/deepseek-harness> |
| Trae | <https://docs.trae.cn/>（索引 <https://docs.trae.cn/llms.txt>） |
| OpenAI Codex CLI | <https://github.com/openai/codex>（文档 <https://developers.openai.com/codex>） |
| Anthropic Claude Code | <https://code.claude.com/docs/>（索引 <https://code.claude.com/docs/llms.txt>） |
| Pi Agent | <https://pi-agent.org/docs>（仓库 <https://github.com/earendil-works/pi>） |
| AgentCLI | 未找到权威官方文档 |

## 快速结论

!!! tip "一句话定位"
    - **dsh**：开源 MIT、Cordis 内核、「一切皆插件」的 agent harness，核心可替换，处于 developer preview。
    - **Trae**：闭源商业 IDE/工作台产品族，开箱即用、内置模型，积分计费。
    - **Codex CLI**：开源 Apache-2.0、Rust 构建的本地终端代理，实验性，跨平台原生沙箱。
    - **Claude Code**：闭源商业智能体编码工具，企业级部署，Agent Teams 原生协同。
    - **Pi**：开源 MIT、极简终端编程脚手架，TypeScript 扩展，树结构会话，30+ Provider 支持。

详细的逐项对比、矩阵与小结请见上方章节导航。
