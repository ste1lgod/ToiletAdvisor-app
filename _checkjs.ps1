$html = Get-Content "C:\Users\zbaze\ToiletAdvisor\index.html" -Raw -Encoding UTF8
$scripts = [regex]::Matches($html, '(?s)<script>(.*?)</script>') | ForEach-Object { $_.Groups[1].Value }
$combined = $scripts -join "`n"
Set-Content "C:\Users\zbaze\ToiletAdvisor\_check.js" $combined -Encoding UTF8
node -e "try{new Function(require('fs').readFileSync('C:/Users/zbaze/ToiletAdvisor/_check.js','utf8'));console.log('OK')}catch(e){console.error('ERROR:',e.message)}"
Remove-Item "C:\Users\zbaze\ToiletAdvisor\_check.js" -ErrorAction SilentlyContinue
Remove-Item "C:\Users\zbaze\ToiletAdvisor\_checkjs.ps1" -ErrorAction SilentlyContinue
