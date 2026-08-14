#!/usr/bin/env bash
# dsh-session-management installer (macOS / Linux)
# 一键安装：复制插件包到 DSH profile 并注册到 cordis.patch.yml
set -euo pipefail

PKG_NAME="dsh-session-management"
DSH_HOME="${DSH_HOME:-$HOME/.dsh}"
REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PKG_DIR="$DSH_HOME/profiles/node_modules/$PKG_NAME"
PATCH_FILE="$DSH_HOME/profiles/web/cordis.patch.yml"

echo "[$PKG_NAME] DSH home: $DSH_HOME"

# 1) 复制插件包
mkdir -p "$PKG_DIR"
cp "$REPO_ROOT/package.json" "$PKG_DIR/"
cp -R "$REPO_ROOT/lib" "$PKG_DIR/"
echo "[$PKG_NAME] package copied -> $PKG_DIR"

# 2) 注册 loader 条目（幂等）
if [ -f "$PATCH_FILE" ]; then
  if grep -q "id: $PKG_NAME" "$PATCH_FILE"; then
    echo "[$PKG_NAME] already registered in cordis.patch.yml"
  else
    cat >> "$PATCH_FILE" <<EOF

# $PKG_NAME : session management plugin
- insert:
    - id: $PKG_NAME
      name: $PKG_NAME
EOF
    echo "[$PKG_NAME] registered in cordis.patch.yml"
  fi
else
  echo "[$PKG_NAME] WARNING: $PATCH_FILE not found. Add manually:"
  echo "  - insert:"
  echo "      - id: $PKG_NAME"
  echo "        name: $PKG_NAME"
fi

echo ""
echo "[$PKG_NAME] Done. Restart 'dsh web', then open Settings > Session Manager."
