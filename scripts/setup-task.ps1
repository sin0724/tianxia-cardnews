param()

$ProjectDir = "C:\Users\ADMIN\Desktop\tianxia-cardnews"

# ── 기존 태스크 모두 제거 ────────────────────────────────────────────────────
foreach ($old in @("TianxiaLocalPoster", "TianxiaNaverPoster", "TianxiaAutoRun", "TianxiaServer")) {
  Unregister-ScheduledTask -TaskName $old -Confirm:$false -ErrorAction SilentlyContinue
  Write-Host "[$old] 제거 완료" -ForegroundColor DarkGray
}
Get-ScheduledTask | Where-Object { $_.TaskName -like "TianxiaPoster_*" } | ForEach-Object {
  Unregister-ScheduledTask -TaskName $_.TaskName -Confirm:$false -ErrorAction SilentlyContinue
}

# ── 즉시발행 로컬 서버 (TianxiaServer) — PC 시작 시 자동 실행 ──────────────
$ServerTask   = "TianxiaServer"
$ServerScript = "$ProjectDir\scripts\run-server.ps1"

$ServerAction   = New-ScheduledTaskAction -Execute "powershell.exe" `
  -Argument "-WindowStyle Hidden -NonInteractive -ExecutionPolicy Bypass -File `"$ServerScript`""
$ServerTrigger  = New-ScheduledTaskTrigger -AtLogOn
$ServerSettings = New-ScheduledTaskSettingsSet -Hidden `
  -ExecutionTimeLimit ([TimeSpan]::Zero) -StartWhenAvailable `
  -MultipleInstances IgnoreNew -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1)

Register-ScheduledTask -TaskName $ServerTask -Action $ServerAction -Trigger $ServerTrigger `
  -Settings $ServerSettings -RunLevel Highest -Force | Out-Null

Write-Host "[$ServerTask] 등록 완료 — PC 시작 시 localhost:3939 자동 실행" -ForegroundColor Green

# 바로 시작
Start-ScheduledTask -TaskName $ServerTask
Write-Host "[$ServerTask] 지금 바로 시작됨" -ForegroundColor Cyan

Write-Host ""
Write-Host "예약발행 스케줄 등록:" -ForegroundColor Yellow
Write-Host "  powershell -ExecutionPolicy Bypass -File `"$ProjectDir\scripts\sync-schedules.ps1`"" -ForegroundColor White
Write-Host ""
Write-Host "로그 확인:" -ForegroundColor Gray
Write-Host "  서버: Get-Content `$env:TEMP\tianxia-server.log -Tail 20" -ForegroundColor Gray
Write-Host "  예약: Get-Content `$env:TEMP\tianxia-schedule.log -Tail 20" -ForegroundColor Gray
