@echo off
REM Автоматический коммит и пуш изменений
REM Запуск: git-push.bat (из корня проекта)

setlocal enabledelayedexpansion

REM Переходим в папку, где лежит этот .bat файл
cd /d "%~dp0"

REM Проверяем, что это git-репозиторий
if not exist ".git" (
    echo ERROR: Текущая папка не является git-репозиторием
    exit /b 1
)

REM Проверяем, есть ли remote origin
git remote get-url origin >nul 2>&1
if errorlevel 1 (
    echo ERROR: git remote "origin" не настроен
    exit /b 1
)

REM Добавляем все изменения
git add -A

REM Проверяем, есть ли что коммитить
git diff --cached --quiet
if errorlevel 1 (
    for /f "tokens=*" %%t in ('powershell -NoProfile -Command "Get-Date -Format 'yyyy-MM-dd HH:mm:ss'"') do set timestamp=%%t
    git commit -m "auto: save changes (!timestamp!)"
    if errorlevel 1 (
        echo ERROR: Не удалось создать коммит
        exit /b 1
    )
    echo Committed at !timestamp!
) else (
    echo No changes to commit
    exit /b 0
)

REM Пушим
git push origin main
if errorlevel 1 (
    echo ERROR: Не удалось отправить изменения на remote
    exit /b 1
)

echo Successfully pushed to origin/main
exit /b 0
