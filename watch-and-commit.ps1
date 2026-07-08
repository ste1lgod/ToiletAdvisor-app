# Скрипт-вотчер: следит за изменениями и автоматически коммитит + пушит
# Запуск: powershell -ExecutionPolicy Bypass -File watch-and-commit.ps1
# Остановка: Ctrl+C

$repoPath = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $repoPath

# Проверяем, что мы в git-репозитории
if (-not (Test-Path "$repoPath\.git")) {
    Write-Host "ERROR: $repoPath не является git-репозиторием" -ForegroundColor Red
    exit 1
}

# Проверяем, есть ли remote origin
$hasRemote = git remote get-url origin 2>$null
if (-not $hasRemote) {
    Write-Host "ERROR: git remote 'origin' не настроен" -ForegroundColor Red
    exit 1
}

$watcher = New-Object System.IO.FileSystemWatcher
$watcher.Path = $repoPath
$watcher.Filter = '*.*'
$watcher.IncludeSubdirectories = $true
$watcher.NotifyFilter = [System.IO.NotifyFilters]::LastWrite -bor [System.IO.NotifyFilters]::FileName -bor [System.IO.NotifyFilters]::DirectoryName

# Папки, которые игнорируем
$ignoreDirs = @('node_modules', '.git', 'server\node_modules', 'server\data')

function Test-Ignored($filePath) {
    foreach ($dir in $ignoreDirs) {
        $fullDir = Join-Path $repoPath $dir
        if ($filePath -like "$fullDir*") { return $true }
    }
    return $false
}

function Invoke-GitCommit {
    param([string]$reason)
    try {
        Set-Location $repoPath
        git add -A 2>$null
        $diff = git diff --cached --name-only
        if ($diff) {
            $timestamp = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
            $commitMsg = "auto: $reason ($timestamp)"
            git commit -m $commitMsg 2>$null
            $pushResult = git push origin main 2>&1
            if ($LASTEXITCODE -eq 0) {
                Write-Host "[$timestamp] Committed & pushed: $reason" -ForegroundColor Green
                Write-Host "  Files: $($diff -join ', ')" -ForegroundColor Gray
            } else {
                Write-Host "[$timestamp] Committed but push failed: $pushResult" -ForegroundColor Yellow
            }
        }
    } catch {
        Write-Host "[$(Get-Date -Format 'HH:mm:ss')] Error: $_" -ForegroundColor Red
    }
}

$action = {
    $filePath = $Event.SourceEventArgs.FullPath
    # Только .html, .js, .json, .css, .bat, .ps1 файлы
    if ($filePath -match '\.(html|js|json|css|bat|ps1|yml|md)$') {
        # Проверяем, не в игнорируемой ли папке
        $script:ignoreDirs = @('node_modules', '.git', 'server\node_modules', 'server\data')
        foreach ($dir in $script:ignoreDirs) {
            $fullDir = Join-Path $script:repoPath $dir
            if ($filePath -like "$fullDir*") { return }
        }
        Start-Sleep -Milliseconds 800
        $fileName = Split-Path $filePath -Leaf
        & $script:InvokeGitCommit -reason "file change: $fileName"
    }
}

# Передаём переменные в область видимости события
$script:repoPath = $repoPath
$script:InvokeGitCommit = ${function:Invoke-GitCommit}

Register-ObjectEvent $watcher 'Changed' -Action $action | Out-Null
Register-ObjectEvent $watcher 'Created' -Action $action | Out-Null
Register-ObjectEvent $watcher 'Deleted' -Action $action | Out-Null

Write-Host "Watching $repoPath for changes..." -ForegroundColor Cyan
Write-Host "Tracked: .html .js .json .css .bat .ps1 .yml .md" -ForegroundColor Gray
Write-Host "Ignored: node_modules, .git, server\data" -ForegroundColor Gray
Write-Host "Press Ctrl+C to stop" -ForegroundColor Gray
Write-Host ""

while ($true) { Start-Sleep -Seconds 1 }
