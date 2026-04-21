param()

$ProjectDir = "C:\Users\ADMIN\Desktop\tianxia-cardnews"

# ── 1분 폴링 태스크 완전 제거 ──────────────────────────────────────────────
foreach ($old in @("TianxiaLocalPoster", "TianxiaNaverPoster")) {
  Unregister-ScheduledTask -TaskName $old -Confirm:$false -ErrorAction SilentlyContinue
  Write-Host "[$old] 제거 완료" -ForegroundColor DarkGray
}
Get-ScheduledTask | Where-Object { $_.TaskName -like "TianxiaPoster_*" } | ForEach-Object {
  Unregister-ScheduledTask -TaskName $_.TaskName -Confirm:$false -ErrorAction SilentlyContinue
}

# ── 일일 자동화 (TianxiaAutoRun) — 백그라운드 전용 ────────────────────────
$AutoTask   = "TianxiaAutoRun"
$AutoScript = "$ProjectDir\scripts\run-auto.ps1"

@"
Set-Location "$ProjectDir"
& npx tsx scripts\local-auto-run.ts 2>&1 | Out-File -Append -FilePath "`$env:TEMP\tianxia-auto-run.log" -Encoding utf8
"@ | Out-File -FilePath $AutoScript -Encoding utf8

Unregister-ScheduledTask -TaskName $AutoTask -Confirm:$false -ErrorAction SilentlyContinue

$AutoAction   = New-ScheduledTaskAction -Execute "powershell.exe" `
  -Argument "-WindowStyle Hidden -NonInteractive -ExecutionPolicy Bypass -File `"$AutoScript`""
$AutoTrigger  = New-ScheduledTaskTrigger -Daily -At "09:00AM"
$AutoSettings = New-ScheduledTaskSettingsSet -Hidden `
  -ExecutionTimeLimit (New-TimeSpan -Minutes 15) -StartWhenAvailable

Register-ScheduledTask -TaskName $AutoTask -Action $AutoAction -Trigger $AutoTrigger `
  -Settings $AutoSettings -RunLevel Highest -Force | Out-Null

Write-Host "[$AutoTask] 등록 완료 — 매일 09:00 백그라운드 실행" -ForegroundColor Green

Write-Host ""
Write-Host "설정 완료!" -ForegroundColor Cyan
Write-Host ""
Write-Host "스케줄 등록 (UI에서 추가한 요일/시간 적용):" -ForegroundColor Yellow
Write-Host "  powershell -ExecutionPolicy Bypass -File `"$ProjectDir\scripts\sync-schedules.ps1`"" -ForegroundColor White
Write-Host ""
Write-Host "로그 확인:" -ForegroundColor Gray
Write-Host "  Get-Content `$env:TEMP\tianxia-poster.log -Tail 20" -ForegroundColor Gray
