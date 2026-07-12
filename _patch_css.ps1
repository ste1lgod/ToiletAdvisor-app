$file = "c:\Users\zbaze\ToiletAdvisor\index.html"
$lines = Get-Content $file -Encoding UTF8

# Найдём индексы всех <style> и </style>
$styleStarts = @()
$styleEnds   = @()
for($i = 0; $i -lt $lines.Length; $i++){
  $l = $lines[$i].Trim()
  if($l -eq '<style>')   { $styleStarts += $i }
  if($l -eq '</style>')  { $styleEnds   += $i }
}

Write-Host "style blocks: $($styleStarts.Count)"
for($i=0; $i -lt $styleStarts.Count; $i++){
  Write-Host "  block $($i+1): lines $($styleStarts[$i]+1) .. $($styleEnds[$i]+1)"
}

# Берём часть ДО первого <style>
$before = $lines[0..($styleStarts[0]-1)]

# Берём часть ПОСЛЕ последнего </style>
$after = $lines[($styleEnds[-1]+1)..($lines.Length-1)]

# Блок <link> тегов вместо всех <style>
$links = @(
  '<link rel="stylesheet" href="css/base.css">',
  '<link rel="stylesheet" href="css/sheet.css">',
  '<link rel="stylesheet" href="css/modals.css">',
  '<link rel="stylesheet" href="css/profile.css">',
  '<link rel="stylesheet" href="css/admin.css">',
  '<link rel="stylesheet" href="css/ui.css">'
)

$result = $before + $links + $after
[System.IO.File]::WriteAllLines($file, $result, [System.Text.UTF8Encoding]::new($false))
Write-Host "Done. Lines: $($result.Length)"
