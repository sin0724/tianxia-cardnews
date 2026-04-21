@echo off
cd /d "C:\Users\ADMIN\Desktop\tianxia-cardnews"
npx tsx scripts\local-auto-run.ts >> "%TEMP%\tianxia-auto-run.log" 2>&1
