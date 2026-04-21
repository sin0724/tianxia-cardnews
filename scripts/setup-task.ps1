param()

$ProjectDir = "C:\Users\ADMIN\Desktop\tianxia-cardnews"

# ── 기존 태스크 모두 제거 ────────────────────────────────────────────────────
foreach ($old in @("TianxiaLocalPoster", "TianxiaNaverPoster", "TianxiaAutoRun")) {
  Unregister-ScheduledTask -TaskName $old -Confirm:$false -ErrorAction SilentlyContinue
  Write-Host "[$old] 제거 완료" -ForegroundColor DarkGray
}
Get-ScheduledTask | Where-Object { $_.TaskName -like "TianxiaPoster_*" } | ForEach-Object {
  Unregister-ScheduledTask -TaskName $_.TaskName -Confirm:$false -ErrorAction SilentlyContinue
}

# ── 1. 즉시발행 대기열 폴러 (TianxiaLocalPoster) ─────────────────────────────
# 1분마다 실행 — 창 없이 백그라운드, pending-post가 있을 때만 실제 발행
$PosterTask   = "TianxiaLocalPoster"
$PosterScript = "$ProjectDir\scripts\run-poster.ps1"

$PosterAction   = New-ScheduledTaskAction -Execute "powershell.exe" `
  -Argument "-WindowStyle Hidden -NonInteractive -ExecutionPolicy Bypass -File `"$PosterScript`""
$PosterTrigger  = New-ScheduledTaskTrigger -RepetitionInterval (New-TimeSpan -Minutes 1) `
  -Once -At (Get-Date) -RepetitionDuration ([TimeSpan]::MaxValue)
$PosterSettings = New-ScheduledTaskSettingsSet -Hidden `
  -ExecutionTimeLimit (New-TimeSpan -Minutes 10) -StartWhenAvailable `
  -MultipleInstances IgnoreNew

Register-ScheduledTask -TaskName $PosterTask -Action $PosterAction -Trigger $PosterTrigger `
  -Settings $PosterSettings -RunLevel Highest -Force | Out-Null

Write-Host "[$PosterTask] 등록 완료 — 1분마다 대기열 확인 (백그라운드)" -ForegroundColor Green

# ── 2. 예약발행 스케줄 등록 (TianxiaPoster_*) ────────────────────────────────
Write-Host ""
Write-Host "예약발행 스케줄 등록:" -ForegroundColor Yellow
Write-Host "  powershell -ExecutionPolicy Bypass -File `"$ProjectDir\scripts\sync-schedules.ps1`"" -ForegroundColor White
Write-Host ""
Write-Host "로그 확인:" -ForegroundColor Gray
Write-Host "  즉시발행: Get-Content `$env:TEMP\tianxia-poster.log -Tail 20" -ForegroundColor Gray
Write-Host "  예약발행: Get-Content `$env:TEMP\tianxia-schedule.log -Tail 20" -ForegroundColor Gray
