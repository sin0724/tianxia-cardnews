@echo off
cd /d "C:\Users\ADMIN\Desktop\tianxia-cardnews"
npx tsx scripts\local-poster.ts >> "%TEMP%\tianxia-poster.log" 2>&1
