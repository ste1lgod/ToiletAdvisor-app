$file = "c:\Users\zbaze\ToiletAdvisor\index.html"
$lines = Get-Content $file -Encoding UTF8
$before = $lines[0..2815]
$after  = $lines[5811..($lines.Length-1)]
Write-Host "before last: $($before[-1])"
Write-Host "after first: $($after[0])"
Write-Host "Total: $($lines.Length)"
