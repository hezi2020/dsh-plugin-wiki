<#
  update-registry.ps1 —— 手动立即更新 DSH 插件市场索引（不受每 2 小时定时限制）

  原理：触发 GitHub Actions 的 build-registry workflow（workflow_dispatch），
  CI 在云端重新拉取 topic:dsh-plugin 并提交最新 registry.json。

  本机不需要 node/git，只需要：
    - gh CLI（https://cli.github.com）已安装并登录：gh auth login
    - 对 DSH-Plugins-Marketplace 仓库有权限（workflow_dispatch 只需 repo scope）

  用法：
    .\update-registry.ps1                 # 触发并等待 CI 完成（默认最多等 10 分钟）
    .\update-registry.ps1 -NoWatch        # 只触发，不等待
#>
[CmdletBinding()]
param(
  [string]$Repo = "bradeGithub/DSH-Plugins-Marketplace",
  [string]$Workflow = "registry.yml",
  [int]$TimeoutSec = 600,
  [switch]$NoWatch
)

$ErrorActionPreference = "Stop"

function Fail($msg) {
  Write-Host ""
  Write-Host "✗ $msg" -ForegroundColor Red
  exit 1
}

Write-Host ""
Write-Host "==============================================" -ForegroundColor Cyan
Write-Host "  DSH 插件市场 · 立即更新索引" -ForegroundColor Cyan
Write-Host "==============================================" -ForegroundColor Cyan

# 1) gh CLI 可用性
if (-not (Get-Command gh -ErrorAction SilentlyContinue)) {
  Fail "未找到 gh CLI。请先安装 https://cli.github.com 并执行 gh auth login"
}

# 2) 登录状态
gh auth status *> $null
if ($LASTEXITCODE -ne 0) {
  Fail "gh 未登录。请先执行 gh auth login"
}

# 3) 触发 workflow_dispatch
Write-Host "正在触发 $Repo 的 $Workflow ..."
$triggeredAt = [DateTime]::UtcNow
gh workflow run $Workflow --repo $Repo *> $null
if ($LASTEXITCODE -ne 0) {
  Fail "触发失败（workflow 可能刚推送还未被 Actions 索引，等一两分钟重试）"
}
Write-Host "✔ 已触发。Actions 页面：https://github.com/$Repo/actions"

if ($NoWatch) {
  Write-Host "（-NoWatch：跳过等待。索引重建约需 1 分钟，可稍后查看 Actions 页面）"
  exit 0
}

# 4) 轮询本次运行直到完成（只认触发时间之后创建的 workflow_dispatch 运行）
Write-Host "等待 CI 完成（最多 ${TimeoutSec} 秒）..."
$deadline = (Get-Date).AddSeconds($TimeoutSec)
$run = $null
while ((Get-Date) -lt $deadline) {
  Start-Sleep -Seconds 10
  try {
    $runs = gh run list --workflow=$Workflow --repo $Repo --limit 5 --json databaseId,status,conclusion,event,createdAt 2>$null | ConvertFrom-Json
  } catch { $runs = $null }
  if ($runs) {
    $run = $runs | Where-Object {
      $_.event -eq "workflow_dispatch" -and
      ([DateTime]::Parse($_.createdAt).ToUniversalTime() -ge $triggeredAt)
    } | Select-Object -First 1
  }
  if ($run) {
    Write-Host "  运行 #$($run.databaseId)：$($run.status) ..."
    if ($run.status -eq "completed") { break }
  }
}

if (-not $run -or $run.status -ne "completed") {
  Fail "等待超时（${TimeoutSec} 秒）。请到 https://github.com/$Repo/actions 查看运行状态"
}
if ($run.conclusion -ne "success") {
  Fail "CI 运行失败（conclusion=$($run.conclusion)）。查看：https://github.com/$Repo/actions/runs/$($run.databaseId)"
}

Write-Host ""
Write-Host "✔ 索引更新完成（run #$($run.databaseId)）" -ForegroundColor Green
Write-Host "  运行详情：https://github.com/$Repo/actions/runs/$($run.databaseId)"
Write-Host "  提示：jsDelivr CDN 同步通常只需几分钟，随后在市场页面点「刷新」即可看到最新列表。"
Write-Host ""
