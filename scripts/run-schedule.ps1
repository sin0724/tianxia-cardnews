Set-Location "C:\Users\ADMIN\Desktop\tianxia-cardnews"
& npx tsx scripts\local-poster.ts --schedule 2>&1 | Out-File -Append -FilePath "$env:TEMP\tianxia-schedule.log" -Encoding utf8
