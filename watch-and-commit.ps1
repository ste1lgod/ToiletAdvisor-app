# Скрипт-вотчер: следит за изменениями и автоматически коммитит + пушит
$repoPath = 'c:\Users\zbaze\ToiletAdvisor'
$watcher = New-Object System.IO.FileSystemWatcher
$watcher.Path = $repoPath
$watcher.Filter = '*.*'
$watcher.IncludeSubdirectories = $false
$watcher.NotifyFilter = [System.IO.NotifyFilters]::LastWrite

$action = {
    $file = $Event.SourceEventArgs.FullPath
    # Только .html, .js, .json, .css файлы
    if ($file -match '\.(html|js|json|css)$') {
        Start-Sleep -Milliseconds 800  # ждём пока файл освободится
        Set-Location $repoPath
        $diff = git diff --name-only
        if ($diff) {
            git add -A
            git commit -m "auto: save changes"
            git push origin main
            Write-Host "[$(Get-Date -Format 'HH:mm:ss')] Auto-committed: $file"
        }
    }
}

Register-ObjectEvent $watcher 'Changed' -Action $action | Out-Null
Write-Host "Watching $repoPath for changes... (Ctrl+C to stop)"
while ($true) { Start-Sleep -Seconds 1 }
