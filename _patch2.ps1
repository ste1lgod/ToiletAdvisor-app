$file = "c:\Users\zbaze\ToiletAdvisor\index.html"
$lines = Get-Content $file -Encoding UTF8

# Находим первый <script> (строка 2817, индекс 2816)
# Находим последний </script> перед <!-- FAV CONFIRM DIALOG -->
# Из предыдущего анализа: before = 0..2815, after начинается с <!-- FAV CONFIRM DIALOG -->
# Но теперь нам нужно найти их заново, т.к. файл уже изменён

$firstScript = -1
$lastScript  = -1

for($i=0; $i -lt $lines.Length; $i++){
  $l = $lines[$i].Trim()
  if($l -eq '<script>' -and $firstScript -eq -1){ $firstScript = $i }
  if($l -eq '</script>'){ $lastScript = $i }
  if($lines[$i].Trim() -eq '<!-- FAV CONFIRM DIALOG -->'){ break }
}

Write-Host "firstScript line (0-based): $firstScript  =>  $($lines[$firstScript])"
Write-Host "lastScript  line (0-based): $lastScript   =>  $($lines[$lastScript])"

$before = $lines[0..($firstScript-1)]
$after  = $lines[($lastScript+1)..($lines.Length-1)]

$inject = @'
<!-- Константы, переводы, данные -->
<script src="js/constants.js" charset="utf-8"></script>
<!-- Firebase init + hashPassword -->
<script src="js/firebase.js" charset="utf-8"></script>
<!-- UI: toast, theme, lang, skeleton, offline -->
<script src="js/ui.js" charset="utf-8"></script>
<!-- Карта, маркеры, геолокация -->
<script src="js/map.js" charset="utf-8"></script>
<!-- Шторка, отзывы -->
<script src="js/sheet.js" charset="utf-8"></script>
<!-- Избранное -->
<script src="js/favorites.js" charset="utf-8"></script>
<!-- Профиль, авторизация -->
<script src="js/profile.js" charset="utf-8"></script>
<!-- Админ: визард, модерация, логи, статистика -->
<script src="js/admin.js" charset="utf-8"></script>
<!-- Переменные состояния + инициализация приложения -->
<script src="js/init.js" charset="utf-8"></script>
'@

$result = $before + $inject.Split("`n") + $after
[System.IO.File]::WriteAllLines($file, $result, [System.Text.UTF8Encoding]::new($false))
Write-Host "Done. Total lines: $($result.Length)"
