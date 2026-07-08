@echo off
cd /d c:\Users\zbaze\ToiletAdvisor
git add -A
git diff --cached --quiet
if errorlevel 1 (
    git commit -m "auto: save changes"
)
git push origin main
