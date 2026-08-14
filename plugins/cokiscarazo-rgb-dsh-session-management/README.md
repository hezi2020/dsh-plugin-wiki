# dsh-session-management · DSH 会话管理

中文 | [English](README.en.md)

![会话管理设置页](docs/screenshots/settings.png)

dsh-session-management 是 DeepSeek Harness（DSH）Web 的会话管理插件。在「设置」面板内集中管理聊天会话：归档、取消归档、**真正删除本地聊天记录**、导出数据。界面采用克制的 Apple/macOS 设计语言，支持中英双语，随 DSH 语言设置即时切换。

![已归档聊天管理弹窗](docs/screenshots/manage.png)

## 功能

### 已归档的聊天管理

点击「管理」打开管理窗口，两种分组视图随心切换：

- **按工作区**：每个工作区一个分组，组内按时间排序；
- **按月份**：按年月分组（`2026年8月`、`2026年7月`…），月份自动携带年份，跨年归档一目了然。

支持按创建日期 / 更新日期排序（升序 / 降序）、分组折叠与一键展开、按组批量操作——取消归档该组、**删除该组已归档的聊天**（仅作用于该组的归档会话，不影响未归档记录）。

| 分组与排序 | 组头批量操作 |
| --- | --- |
| ![归档管理弹窗](docs/screenshots/manage.png) | ![归档管理弹窗](docs/screenshots/manage.png) |

### 归档所有聊天

一键归档全部会话：记录完整保留，仅从侧边栏列表隐藏，随时可在管理窗口取消归档。

### 删除所有聊天

**真正删除**本地聊天记录：删除磁盘上的会话日志文件（`session.jsonl` / `session.jsonl.zstd` 及对偶文件），并同步清理工作区记账与归档标记。运行中的会话自动跳过，防止日志被写回。

### 导出数据

复用官方导出端点，为每个根会话生成与官方格式一致的 ZIP 归档（`dsh-session-<id>.zip`）：会话日志、子代理会话与媒体附件一并打包，字节级兼容官方工具。

### 中英双语

界面文案随「设置 → 通用设置 → 语言」即时切换，中英文档与界面同步维护。

## 安装

DSH 插件通过 **profile** 挂载（`dsh web` 对应 `web` profile）。安装后需**重启 `dsh web`** 生效。

### 方式一：从 npm 安装（推荐）

插件已发布到 npm（`dsh-session-management`），一条命令装齐：

```sh
dsh plugin --profile web add dsh-session-management
```

装完重启 `dsh web`，打开「设置」即可看到「会话管理」入口。升级：`dsh plugin --profile web update dsh-session-management`。

> 首次安装若提示 `ERR_PNPM_IGNORED_BUILDS`（pnpm 拒绝依赖的构建脚本），按提示把相关包加入 profile 的 `pnpm-workspace.yaml` `allowBuilds` 后重新执行即可。

### 方式二：从 GitHub 仓库安装

```sh
git clone https://github.com/cokiscarazo-rgb/dsh-session-management.git
cd dsh-session-management

# Windows（PowerShell）
powershell -ExecutionPolicy Bypass -File scripts/install.ps1

# macOS / Linux
bash scripts/install.sh
```

安装脚本幂等，重复执行安全。它会完成两步：

1. 复制插件包到 `$DSH_HOME/profiles/node_modules/dsh-session-management/`；
2. 在 `$DSH_HOME/profiles/web/cordis.patch.yml` 注册 loader 条目：

```yaml
- insert:
    - id: dsh-session-management
      name: dsh-session-management
```

### 验证与卸载

安装成功后重启 `dsh web`，打开「设置」出现「会话管理」即生效；也可用 `dsh --profile web --dump-config` 确认插件配置层已挂载。若侧边栏没有新入口，多半是安装后没有重启。

卸载：移除 `$DSH_HOME/profiles/node_modules/dsh-session-management/` 目录，并从 `cordis.patch.yml` 删除对应 insert 条目，重启 `dsh web`。

## 工作原理与边界

- **归档**：基于官方 `workspaceRegistry.archiveSession`，归档集持久化于 workspace 域，客户端经官方帧机制自动同步；**取消归档**为官方未提供的操作，插件直接更新 workspace 域归档集合，变化经官方 `domain/changed` 事件自动广播。
- **删除即真删**：定位会话日志文件（含 zstd 对偶文件）后经系统命令删除，随后清理工作区记账与归档标记；搜索索引由官方 SQLite 自动 reconcile 清理。
- **边界说明**：
  - 运行中的会话拒绝删除（避免日志被重新写回）；
  - 聊天中的图片附件采用 content-addressed 存储、可能被多会话共享，删除会话不会连带删除附件；
  - 子代理会话为独立记录，删除父会话不级联删除（可单独删除）。

## License

[MIT](LICENSE) © cokiscarazo-rgb
