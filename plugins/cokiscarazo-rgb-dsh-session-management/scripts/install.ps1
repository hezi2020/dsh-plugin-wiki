# dsh-session-management installer (Windows / PowerShell)
# 一键安装：复制插件包到 DSH profile 并注册到 cordis.patch.yml
$ErrorActionPreference = 'Stop'

$pkgName = 'dsh-session-management'
$dshHome = if ($env:DSH_HOME) { $env:DSH_HOME } else { Join-Path $HOME '.dsh' }
$repoRoot = Split-Path -Parent $PSScriptRoot
$pkgDir = Join-Path $dshHome "profiles\node_modules\$pkgName"
$patchFile = Join-Path $dshHome 'profiles\web\cordis.patch.yml'

Write-Host "[$pkgName] DSH home: $dshHome"

# 1) 复制插件包
New-Item -ItemType Directory -Path $pkgDir -Force | Out-Null
Copy-Item (Join-Path $repoRoot 'package.json') $pkgDir -Force
Copy-Item (Join-Path $repoRoot 'lib') $pkgDir -Recurse -Force
Write-Host "[$pkgName] package copied -> $pkgDir"

# 2) 注册 loader 条目（幂等）
if (Test-Path $patchFile) {
    $content = [System.IO.File]::ReadAllText($patchFile)
    if ($content.Contains('id: ' + $pkgName)) {
        Write-Host "[$pkgName] already registered in cordis.patch.yml"
    } else {
        $entry = "`n# $pkgName : session management plugin`n- insert:`n    - id: $pkgName`n      name: $pkgName`n"
        [System.IO.File]::AppendAllText($patchFile, $entry, [System.Text.UTF8Encoding]::new($false))
        Write-Host "[$pkgName] registered in cordis.patch.yml"
    }
} else {
    Write-Host "[$pkgName] WARNING: $patchFile not found. Add manually:"
    Write-Host "  - insert:"
    Write-Host "      - id: $pkgName"
    Write-Host "        name: $pkgName"
}

Write-Host ""
Write-Host "[$pkgName] Done. Restart 'dsh web', then open Settings > Session Manager."
