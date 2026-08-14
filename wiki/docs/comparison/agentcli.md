# AgentCLI 对比

## 说明：未找到明确官方文档，本节暂略

经检索，**「AgentCLI」不存在一个明确的、权威的官方产品及其官方文档**与之对应。搜索结果中出现多个同名或近名的独立项目，但它们定位各异、均非可与 DeepSeek Harness / Trae / Codex CLI / Claude Code 同级对照的「官方 AgentCLI 产品」：

| 候选项目 | 来源 | 定位 | 是否为权威官方产品 |
|---|---|---|---|
| `amittell/agentcli` | [GitHub](https://github.com/amittell/agentcli) | 受治理代理与 CLI 工作流的**控制平面**（manifest 合约：执行身份、凭证绑定、信任边界、审批证明、审计记录、签名证据），并非完整的 agent harness 运行时 | 个人项目，非官方产品 |
| `galpratama/agent-cli` | [GitHub](https://github.com/galpratama/agent-cli) | AI 命令行工具 | 个人项目，非官方产品 |
| `agent-cli/agent-cli` | [GitHub](https://github.com/agent-cli/agent-cli) | fork 自 `QwenLM/qwen-code` 的 AI 命令行工作流工具 | 社区 fork，非独立官方产品 |

其中 `amittell/agentcli` 维护了一份 [Manifest Spec（v0.2）](https://github.com/amittell/agentcli/blob/main/docs/spec.md)，但该项目自述为「不是持久运行时」，而是用于「编写、校验、执行、检查并编译受治理工作流合约」的治理层，定位与 dsh 这类 agent harness 运行时完全不同。

!!! warning "不进行强行对比"
    遵循「所有对比结论必须源自对应工具的官方文档」的原则，由于不存在权威的 AgentCLI 官方产品与官方文档，本节**不编造对比结论**，暂略。后续若出现明确的 AgentCLI 官方产品与文档，可补充本节。

    在 [对比矩阵](./matrix.md) 中，AgentCLI 一列均标注为「无明确官方文档」。
