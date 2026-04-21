Set-Location "C:\Users\ADMIN\Desktop\tianxia-cardnews"
& npx tsx scripts\local-server.ts 2>&1 | Out-File -Append -FilePath "$env:TEMP\tianxia-server.log" -Encoding utf8
