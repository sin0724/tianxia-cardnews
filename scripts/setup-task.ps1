param()

$ProjectDir = "C:\Users\ADMIN\Desktop\tianxia-cardnews"

# ── 1. 로컬 포스터 (1분마다 백그라운드 실행) ──────────────────────────────
$PosterTask = "TianxiaLocalPoster"

Unregister-ScheduledTask -TaskName $PosterTask -Confirm:$false -ErrorAction SilentlyContinue
Unregister-ScheduledTask -TaskName "TianxiaNaverPoster" -Confirm:$false -ErrorAction SilentlyContinue

$PosterAction = New-ScheduledTaskAction `
  -Execute "powershell.exe" `
  -Argument "-WindowStyle Hidden -NonInteractive -ExecutionPolicy Bypass -File `"$ProjectDir\scripts\run-poster.ps1`""

$PosterTrigger  = New-ScheduledTaskTrigger -Once -At (Get-Date).AddSeconds(30) `
  -RepetitionInterval (New-TimeSpan -Minutes 1)
$PosterSettings = New-ScheduledTaskSettingsSet `
  -Hidden `
  -ExecutionTimeLimit (New-TimeSpan -Minutes 5) `
  -MultipleInstances IgnoreNew `
  -StartWhenAvailable

Register-ScheduledTask -TaskName $PosterTask `
  -Action $PosterAction -Trigger $PosterTrigger -Settings $PosterSettings `
  -RunLevel Highest -Force | Out-Null

Write-Host "[$PosterTask] 등록 완료 — 1분마다 백그라운드 실행 (창 없음)" -ForegroundColor Green

# ── 2. 일일 자동화 (매일 오전 9시, 백그라운드) ────────────────────────────
$AutoTask  = "TianxiaAutoRun"
$AutoBatch = "$ProjectDir\scripts\run-auto.ps1"

@'
Set-Location "C:\Users\ADMIN\Desktop\tianxia-cardnews"
& npx tsx scripts\local-auto-run.ts 2>&1 | Out-File -Append -FilePath "$env:TEMP\tianxia-auto-run.log" -Encoding utf8
'@ | Out-File -FilePath $AutoBatch -Encoding utf8

Unregister-ScheduledTask -TaskName $AutoTask -Confirm:$false -ErrorAction SilentlyContinue

$AutoAction = New-ScheduledTaskAction `
  -Execute "powershell.exe" `
  -Argument "-WindowStyle Hidden -NonInteractive -ExecutionPolicy Bypass -File `"$AutoBatch`""

$AutoTrigger  = New-ScheduledTaskTrigger -Daily -At "09:00AM"
$AutoSettings = New-ScheduledTaskSettingsSet `
  -Hidden `
  -ExecutionTimeLimit (New-TimeSpan -Minutes 15) `
  -StartWhenAvailable

Register-ScheduledTask -TaskName $AutoTask `
  -Action $AutoAction -Trigger $AutoTrigger -Settings $AutoSettings `
  -RunLevel Highest -Force | Out-Null

Write-Host "[$AutoTask] 등록 완료 — 매일 오전 9시 백그라운드 실행" -ForegroundColor Green

Write-Host ""
Write-Host "설정 완료!" -ForegroundColor Cyan
Write-Host "  포스터 로그:  Get-Content `$env:TEMP\tianxia-poster.log -Tail 20" -ForegroundColor Gray
Write-Host "  자동화 로그:  Get-Content `$env:TEMP\tianxia-auto-run.log -Tail 20" -ForegroundColor Gray
