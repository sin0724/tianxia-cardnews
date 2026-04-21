Set-Location "C:\Users\ADMIN\Desktop\tianxia-cardnews"
& npx tsx scripts\local-poster.ts 2>&1 | Out-File -Append -FilePath "$env:TEMP\tianxia-poster.log" -Encoding utf8
