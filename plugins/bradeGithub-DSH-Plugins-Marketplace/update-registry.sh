#!/usr/bin/env bash
# update-registry.sh —— 手动立即更新 DSH 插件市场索引（不受每 2 小时定时限制）
#
# 原理：触发 GitHub Actions 的 build-registry workflow（workflow_dispatch），
# CI 在云端重新拉取 topic:dsh-plugin 并提交最新 registry.json。
# 本机不需要 node/git，只需要 gh CLI（https://cli.github.com）已登录。
#
# 用法：
#   ./update-registry.sh           # 触发并等待 CI 完成（默认最多等 10 分钟）
#   ./update-registry.sh --nowatch # 只触发，不等待
set -euo pipefail

REPO="bradeGithub/DSH-Plugins-Marketplace"
WORKFLOW="registry.yml"
TIMEOUT_SEC="${TIMEOUT_SEC:-600}"
NOWATCH="${1:-}"

echo ""
echo "=============================================="
echo "  DSH 插件市场 · 立即更新索引"
echo "=============================================="

if ! command -v gh >/dev/null 2>&1; then
  echo "✗ 未找到 gh CLI。请先安装 https://cli.github.com 并执行 gh auth login" >&2
  exit 1
fi
if ! gh auth status >/dev/null 2>&1; then
  echo "✗ gh 未登录。请先执行 gh auth login" >&2
  exit 1
fi

echo "正在触发 $REPO 的 $WORKFLOW ..."
TRIGGERED_AT="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
gh workflow run "$WORKFLOW" --repo "$REPO" >/dev/null 2>&1 || {
  echo "✗ 触发失败（workflow 可能刚推送还未被 Actions 索引，等一两分钟重试）" >&2
  exit 1
}
echo "✔ 已触发。Actions 页面：https://github.com/$REPO/actions"

if [[ "$NOWATCH" == "--nowatch" ]]; then
  echo "（--nowatch：跳过等待。索引重建约需 1 分钟，可稍后查看 Actions 页面）"
  exit 0
fi

echo "等待 CI 完成（最多 ${TIMEOUT_SEC} 秒）..."
DEADLINE=$(( $(date +%s) + TIMEOUT_SEC ))
OUT=""
while (( $(date +%s) < DEADLINE )); do
  sleep 10
  # 只认触发时间之后创建的 workflow_dispatch 运行，输出 "id status conclusion"
  OUT="$(gh run list --workflow="$WORKFLOW" --repo "$REPO" --limit 5 --json databaseId,status,conclusion,event,createdAt \
    --jq "[.[] | select(.event == \"workflow_dispatch\" and .createdAt >= \"$TRIGGERED_AT\")][0] | \"\(.databaseId) \(.status) \(.conclusion)\"" 2>/dev/null || true)"
  if [[ -n "$OUT" && "$OUT" != "null" ]]; then
    ID="$(printf '%s' "$OUT" | cut -d' ' -f1)"
    STATUS="$(printf '%s' "$OUT" | cut -d' ' -f2)"
    echo "  运行 #$ID：$STATUS ..."
    if [[ "$STATUS" == "completed" ]]; then break; fi
  fi
done

if [[ -z "$OUT" || "$OUT" == "null" || "$(printf '%s' "$OUT" | cut -d' ' -f2)" != "completed" ]]; then
  echo "✗ 等待超时（${TIMEOUT_SEC} 秒）。请到 https://github.com/$REPO/actions 查看运行状态" >&2
  exit 1
fi

CONCLUSION="$(printf '%s' "$OUT" | cut -d' ' -f3)"
if [[ "$CONCLUSION" != "success" ]]; then
  echo "✗ CI 运行失败（conclusion=$CONCLUSION）。查看：https://github.com/$REPO/actions" >&2
  exit 1
fi

echo ""
echo "✔ 索引更新完成（run #$ID）"
echo "  提示：jsDelivr CDN 同步通常只需几分钟，随后在市场页面点「刷新」即可看到最新列表。"
echo ""
