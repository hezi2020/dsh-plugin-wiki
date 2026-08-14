#!/usr/bin/env bash
# DSH 插件市场（dsh-plugin-marketplace）一键安装脚本
#
# 支持三种执行方式：
#   1) 本仓库直接运行：  git clone 后运行 ./install.sh
#   2) 一行命令（推荐）：curl -sL https://raw.githubusercontent.com/bradeGithub/DSH-Plugins-Marketplace/main/install.sh | bash
#   3) 由 DSH 插件市场执行（repo 被识别为 script 类型时自动调用）
#
# 安装内容：
#   - 复制本体到 ~/.dsh/profiles/web/node_modules/dsh-plugin-marketplace/
#   - 在 ~/.dsh/profiles/web/cordis.patch.yml 中注册（已存在则跳过）
# 完成后需重启 DSH（重新运行 dsh web）再刷新页面。
set -euo pipefail

REPO_URL="https://github.com/bradeGithub/DSH-Plugins-Marketplace"

# 定位源码目录：直接运行 = 脚本所在目录；curl|bash 模式 = 无路径，改为下载仓库 tarball
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [[ -f "$SCRIPT_DIR/package.json" ]]; then
  SRC="$SCRIPT_DIR"
else
  TMP="$(mktemp -d)"
  echo "Downloading $REPO_URL ..."
  curl -fsSL "$REPO_URL/archive/refs/heads/main.tar.gz" | tar xz -C "$TMP"
  SRC="$TMP/DSH-Plugins-Marketplace-main"
fi

DEST="$HOME/.dsh/profiles/web/node_modules/dsh-plugin-marketplace"
mkdir -p "$(dirname "$DEST")"
rm -rf "$DEST"
cp -r "$SRC" "$DEST"
rm -rf "$DEST/.git"
rm -f "$DEST/install.ps1" "$DEST/install.sh" "$DEST/.ca-bundle.crt"

# 注册到 web profile 补丁（幂等；行级精确匹配，避免前缀子串误判）
PATCH="$HOME/.dsh/profiles/web/cordis.patch.yml"
if [[ -f "$PATCH" ]] && grep -qE '^name:[[:space:]]+dsh-plugin-marketplace[[:space:]]*$' "$PATCH"; then
  echo "Already registered in cordis.patch.yml (skipped)"
else
  printf '\n- insert:\n    - id: dsh-plugin-marketplace\n      name: dsh-plugin-marketplace\n' >> "$PATCH"
  echo "Registered in cordis.patch.yml"
fi

echo ""
echo "✔ dsh-plugin-marketplace installed to $DEST"
echo "  Restart DSH (re-run dsh web), then refresh the page."
echo "  请重启 DSH（重新运行 dsh web）后刷新页面生效。"
