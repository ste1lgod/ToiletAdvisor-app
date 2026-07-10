$content = Get-Content "C:\Users\zbaze\ToiletAdvisor\index.html" -Raw -Encoding UTF8
$content = $content -replace 'tagIco">[^<]*</span><span>Мыло', 'tagIco">🧼</span><span>Мыло'
Set-Content "C:\Users\zbaze\ToiletAdvisor\index.html" $content -Encoding UTF8 -NoNewline
Write-Host "Done"
