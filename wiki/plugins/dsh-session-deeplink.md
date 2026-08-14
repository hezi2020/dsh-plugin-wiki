# dsh-session-deeplink

> **插件名**：dsh-session-deeplink（DSH 会话深链接）
> **来源仓库**：<https://github.com/R3alloc/dsh-session-deeplink>
> **许可证**：MIT（Copyright (c) 2026 R3alloc）
> **commit SHA**：`e9942e9`（前 7 位）

DSH Web 客户端插件：让会话能被 URL 直接定位。打开 `/?session=<id>` 直接进入指定会话；活动会话切换时地址栏自动同步；保留无关 query 参数与 URL fragment。完全运行在浏览器侧，无 host 端服务。

---

## 1. 使用指南

### 前置依赖

- DeepSeek Harness `0.1.0-rc.6`（开发时对照版本；DSH 当前为开发者预览版，未来版本可能需要插件更新）
- 本机需要 pnpm（GitHub 安装方式需在 profile 的 `pnpm-workspace.yaml` 显式允许构建）
- 浏览器：官方 Web UI

### 安装命令

把 bundle 安装到 `web` profile：

```sh
dsh plugin --profile web add dsh-session-deeplink
```

重启 `dsh web`，然后打开一个会话。浏览器 URL 会变为：

```text
http://127.0.0.1:3080/?session=session-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

再次打开该 URL，只要会话仍存在于 DSH 会话列表中即可恢复同一会话。

从 GitHub 安装（Git 依赖通过 `prepare` 脚本本地构建）：

```sh
dsh plugin --profile web add github:R3alloc/dsh-session-deeplink
```

pnpm 10 可能需要在 profile 的 `pnpm-workspace.yaml` 显式允许构建后再重试：

```yaml
allowBuilds:
  dsh-session-deeplink: true
```

日常安装推荐用 npm 包（已内置构建好的 client bundle）。

### 配置项

| 来源 | 字段 |
|---|---|
| 源材料未提及 | 该插件为纯客户端 URL 行为插件，README 与 package.json 未声明用户可配置项 |

### 典型用法示例

- **直接定位会话**：在浏览器地址栏输入 `http://127.0.0.1:3080/?session=<会话id>`，直接打开该会话。
- **会话切换自动同步**：在 UI 中切换到另一会话，地址栏 `?session=<id>` 自动更新为当前会话 id，可复制分享或加入书签。
- **保留无关参数**：URL 上的其他 query 参数与 fragment 不会被插件破坏。

### 重启生效说明

!!! tip "安装后必须重启 dsh web"
    装完插件后必须重启 `dsh web` 才能生效。

!!! tip "日常安装优先用 npm 包"
    npm 包已内置构建好的 client bundle；GitHub 安装方式需通过 `prepare` 脚本本地构建，pnpm 10 用户需额外在 `pnpm-workspace.yaml` 配置 `allowBuilds`。

---

## 2. 弊端与缺陷

!!! warning "会话需仍存在，删除/归档后 URL 失效"
    通过 `/?session=<id>` 打开 URL 恢复会话的前提是该会话仍存在于 DSH 会话列表中；会话被删除或归档后，原 URL 无法恢复。出处：README「Install」。

!!! warning "DSH 版本耦合，未来版本可能需要插件更新"
    开发时对照 DeepSeek Harness `0.1.0-rc.6`；DSH 当前为开发者预览版，未来 releases 可能需要插件更新。出处：README「Compatibility」。

!!! warning "GitHub 安装方式需 pnpm 显式允许构建"
    通过 `github:R3alloc/dsh-session-deeplink` 安装时，pnpm 10 可能需要在 profile 的 `pnpm-workspace.yaml` 显式 `allowBuilds: dsh-session-deeplink: true` 才能完成 `prepare` 脚本的本地构建。出处：README「Install from GitHub」。

!!! warning "仅面向 web profile，不提供 host 端服务"
    插件只面向 `web` profile，纯客户端实现，不提供 host 端服务；其他 profile 不适用。出处：README「Install」、package.json `dsh.client.platform: web`。

---

## 3. 后续拓展思路

### 可二次开发的方向

- **会话命名 slug 化**：当前深链接用裸 session id（UUID），可扩展为支持自定义 slug（如 `/?session=重构方案讨论`）便于人类记忆与分享。
- **会话集合分享**：可扩展为支持分享一组会话的 URL（如 `/?sessions=id1,id2,id3`），用于团队评审或多会话对比。
- **历史快照深链接**：与会话历史快照机制结合，支持 `/?session=<id>&rev=<快照>` 定位到某一历史时刻的会话状态。

### 可对接的 DSH 能力

- **skill**：可把"打开某会话""分享当前会话链接"封装为 DSH Skill，由 Agent 自然语言触发；Agent 可在回答中直接给出深链接。
- **hooks**：会话切换事件可经 hooks 触发外部记录（如写入工作日志），与地址栏同步形成可追溯的会话切换轨迹。
- **self-modification**：地址栏自动同步机制可作为 self-modification 的最小样例——客户端无需 host 干预即可根据状态变化自我调整 URL。

### 与其它插件组合的可能性

- **dsh-session-deeplink + dsh-session-hub**：会话枢纽把远端会话聚合到本地树后，深链接可定位到任一远端会话；用户可把远端会话链接加入书签直接访问。
- **dsh-session-deeplink + dsh-notification-center**：通知中心推送的会话完成/报错通知可携带深链接，点击即跳转到对应会话。
- **dsh-session-deeplink + dsh-auto-memory**：auto-memory 的每日日志可记录当天访问过的会话深链接，形成可追溯的会话浏览历史。
