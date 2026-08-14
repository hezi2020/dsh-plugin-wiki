# dsh-bottom-bar

> **插件名**：dsh-bottom-bar（DSH 底栏统计行插件）
> **来源仓库**：<https://github.com/kc0ed/dsh-bottom-bar>
> **许可证**：MIT © kc0ed（复刻的官方 UI 零件版权归原作者 DeepSeek 所有）
> **commit SHA**：`3fb6dff`（前 7 位）

DSH 底栏统计行插件（可组装 + 预估费用）：接管 `conversation.composer.dock` 的 stats cell，把官方统计行换成可配置的组装行，并在末尾追加预估费用标注（按模型 id 匹配价格表，支持 USD/CNY 多币种）。

---

## 1. 使用指南

### 前置依赖

- 已安装 DSH（`dsh web` 能启动，`dsh` 命令在 PATH 中）
- pnpm（`dsh plugin` 转发 pnpm，`npm i -g pnpm` 即可）
- DSH Web profile（`$DSH_HOME/profiles/web`）
- 依赖：`@deepseek-ai/cordis 4.0.1`、`@deepseek-ai/dsh-typert-protocol 0.1.0-rc.6`

### 安装命令

来源：README「安装（教程）- 官方安装（推荐，两条命令）」。

```powershell
# 1. 把仓库放进 profile 树内（推荐直接 clone 到这里，git pull 方便）
git clone https://github.com/kc0ed/dsh-bottom-bar "$env:USERPROFILE\.dsh\profiles\web\packages\dsh-bottom-bar"

# 2. 安装（在 profile 目录执行）
cd "$env:USERPROFILE\.dsh\profiles\web"
dsh plugin --profile web add ./packages/dsh-bottom-bar
```

验证（不必启动服务）：

```powershell
dsh web --dump-config    # 应看到 "# == dsh-bottom-bar" 层
```

卸载：

```powershell
dsh plugin --profile web remove dsh-bottom-bar
```

更新：

```powershell
git -C "$env:USERPROFILE\.dsh\profiles\web\packages\dsh-bottom-bar" pull
# junction 内容实时同步；若 package.json 的依赖声明变了，重跑 add 刷新锁文件
dsh plugin --profile web add ./packages/dsh-bottom-bar
```

### 配置项

| 来源 | 字段 |
|---|---|
| cordis.patch.yml | `- insert: { id: bottom-bar, name: dsh-bottom-bar }`（由 `dsh.bundle` 声明） |
| 设置页 → 底栏 | 段开关 / 拖拽排序 / 输入缓存口径（separate / combined）/ 黑条行为（auto / always）/ 费用精度（compact / full）/ 价格表（增删模型、改价、恢复默认） |
| cost-estimate.composition.json | 段组装 + 价格表（version 4） |
| cost-estimate.estimates.json | 预估结果磁盘缓存（可删，自动重建） |

### 典型用法示例

1. 设置 → **底栏**：
   - 段开关 / 拖拽排序 / ↑↓ 换序、效果预览（悬停字段高亮）
   - 输入/缓存口径（separate = 纯未命中输入 + 命中 token 数；combined = 官方口径 + 命中率）
   - 黑条行为（auto = 仅截断时显示 / always）、费用精度（compact / full）
   - 价格表（最底部折叠）：增删模型、改价、恢复默认
2. 8 个统计段可开关、可拖拽排序：轮/步、LLM 时长、工具调用时长、首 token 平均、吞吐 tok/s、缓存命中、输入/输出 token、**预估费用**。
3. 点击分段弹出明细面板：费用段显示逐模型单价 / 各桶 tokens / 金额 / 小计 / 总计；其他段显示原始数值。

### 重启生效说明

!!! tip "host 半体变更需重启 dsh web，client 改动经 HMR 生效"
    重启 `dsh web` 生效（host 半在启动时加载）。全新机器第一次运行会自动初始化 profile。出处：README「官方安装」「故障排查」。

---

## 2. 弊端与缺陷

!!! warning "Host 半体必须树内拷贝，树外 clone 会 MODULE_NOT_FOUND"
    Host 半体运行时 `import '@deepseek-ai/dsh-typert-protocol'` 与 `'@deepseek-ai/cordis'`，Node 从包的真实位置向上找 node_modules。profile 树内 parent-walk 能到达安装回退链接层；而树外仓库解析不到 → `MODULE_NOT_FOUND` → dsh web 启动即挂。tarball 安装不受此限。出处：README「为什么必须树内拷贝（血泪）」。

!!! warning "不要用 file: 协议安装（拷贝式，内容变更不更新）"
    不要用 `file:` 协议安装（`dsh plugin add file:./packages/...`）：它是拷贝式，内容变更时 pnpm 报 "Already up to date" 不更新。裸目录 spec（`add ./packages/...`，即 link: 协议）才是 junction，实时同步。出处：README「更新」「为什么必须树内拷贝」。

!!! warning "deepseek-chat / deepseek-reasoner 已随官方下架移除"
    `deepseek-chat` / `deepseek-reasoner` 已随官方下架移除（2026-08-14），价格表中不再包含这两个模型。出处：README「内置价格说明」。

!!! warning "缓存写无官方价，按缓存命中同价内置"
    缓存写无官方价，flash / pro 均按缓存命中同价内置（设置页可改；清空 = 无此桶，按输入价计费），与真实计费可能存在偏差。出处：README「内置价格说明」。

!!! warning "官方峰谷定价暂未实现"
    官方计划 2026-08-17 00:00 起改为峰谷定价（空闲时段为高峰一半），暂未实现——峰谷新政上线后预估费用会偏低。出处：README「内置价格说明」。

!!! warning "接管组件绝不返回 null，否则槽位回退官方实现"
    `conversation.composer.dock` 是 session 作用域 list 槽，以 `id: 'stats'` 与官方同 id 替换；接管组件绝不返回 null，否则槽位会回退官方实现。出处：README「架构」。

---

## 3. 后续拓展思路

### 可二次开发的方向

- **峰谷定价实现**：官方 2026-08-17 起改为峰谷定价，可在价格表中增加时段维度，按时段自动切换单价。
- **多模型混合计费**：当前按模型 id 匹配价格表，可扩展支持多模型混合会话的逐 turn 模型识别与分模型计费。
- **费用历史趋势**：当前仅显示当前会话费用，可引入历史趋势图（按天/会话/模型聚合），辅助用量分析。

### 可对接的 DSH 能力

- **skill**：费用明细查询可封装为 DSH Skill，由 Agent 自然语言触发「这个会话花了多少钱」。
- **hooks**：费用阈值告警可经 hooks 触发通知（如单会话费用超限告警）。
- **self-modification**：两级缓存（内存 5s + 磁盘 5min 持久化）与无状态全量折叠重算可作为 self-modification 的自愈范式——预估结果可删可重建。

### 与其它插件组合的可能性

- **dsh-bottom-bar + dsh-plugin-store**：用 store 的审计日志与 bottom-bar 的费用统计形成成本-合规联合视图。
- **dsh-bottom-bar + dsh-outline**：outline 提供会话结构导航，bottom-bar 提供会话成本反馈，组合形成「结构 + 成本」双视图。
- **dsh-bottom-bar + dsh-plugin-hub**：用 hub 管理 bottom-bar 的启用/停用，bottom-bar 反馈插件运行成本。
