param()

$ProjectDir = "C:\Users\ADMIN\Desktop\tianxia-cardnews"
$TaskName   = "TianxiaAutoRun"
$BatchFile  = "$ProjectDir\scripts\run-auto.bat"

# run-auto.bat 생성
@"
@echo off
cd /d "$ProjectDir"
npx tsx scripts\local-auto-run.ts >> "%TEMP%\tianxia-auto-run.log" 2>&1
"@ | Out-File -FilePath $BatchFile -Encoding ascii

Write-Host "배치 파일 생성: $BatchFile" -ForegroundColor Green

Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false -ErrorAction SilentlyContinue

$Trigger  = New-ScheduledTaskTrigger -Daily -At "09:00AM"
$Action   = New-ScheduledTaskAction -Execute "cmd.exe" -Argument "/c `"$BatchFile`""
$Settings = New-ScheduledTaskSettingsSet -ExecutionTimeLimit (New-TimeSpan -Minutes 15) -StartWhenAvailable

Register-ScheduledTask -TaskName $TaskName -Trigger $Trigger -Action $Action -Settings $Settings -Force | Out-Null

Write-Host ""
Write-Host "예약 작업 등록 완료!" -ForegroundColor Green
Write-Host "  작업명: $TaskName" -ForegroundColor Cyan
Write-Host "  실행: 매일 오전 9시 (KST)" -ForegroundColor Cyan
Write-Host ""
Write-Host "즉시 테스트:" -ForegroundColor Yellow
Write-Host "  Start-ScheduledTask -TaskName $TaskName" -ForegroundColor Cyan
Write-Host ""
Write-Host "로그 확인:" -ForegroundColor Yellow
Write-Host "  Get-Content `$env:TEMP\tianxia-auto-run.log -Tail 30" -ForegroundColor Cyan
