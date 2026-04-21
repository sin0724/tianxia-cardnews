param()

$ProjectDir = "C:\Users\ADMIN\Desktop\tianxia-cardnews"

# ── 1. 로컬 포스터 (1분마다 Railway 대기열 처리) ──────────────────────────
$PosterTask  = "TianxiaLocalPoster"
$PosterBatch = "$ProjectDir\scripts\run-poster.bat"

@"
@echo off
cd /d "$ProjectDir"
npx tsx scripts\local-poster.ts >> "%TEMP%\tianxia-poster.log" 2>&1
"@ | Out-File -FilePath $PosterBatch -Encoding ascii

Unregister-ScheduledTask -TaskName $PosterTask -Confirm:$false -ErrorAction SilentlyContinue

$PosterTrigger  = New-ScheduledTaskTrigger -Once -At (Get-Date).AddSeconds(10) -RepetitionInterval (New-TimeSpan -Minutes 1)
$PosterAction   = New-ScheduledTaskAction -Execute "cmd.exe" -Argument "/c `"$PosterBatch`""
$PosterSettings = New-ScheduledTaskSettingsSet -ExecutionTimeLimit (New-TimeSpan -Minutes 5) -MultipleInstances IgnoreNew -StartWhenAvailable

Register-ScheduledTask -TaskName $PosterTask -Trigger $PosterTrigger -Action $PosterAction -Settings $PosterSettings -RunLevel Highest -Force | Out-Null

Write-Host "[$PosterTask] 등록 완료 — 1분마다 Railway 대기열 확인" -ForegroundColor Green

# ── 2. 일일 자동화 (매일 오전 9시) ───────────────────────────────────────
$AutoTask  = "TianxiaAutoRun"
$AutoBatch = "$ProjectDir\scripts\run-auto.bat"

@"
@echo off
cd /d "$ProjectDir"
npx tsx scripts\local-auto-run.ts >> "%TEMP%\tianxia-auto-run.log" 2>&1
"@ | Out-File -FilePath $AutoBatch -Encoding ascii

Unregister-ScheduledTask -TaskName $AutoTask -Confirm:$false -ErrorAction SilentlyContinue

$AutoTrigger  = New-ScheduledTaskTrigger -Daily -At "09:00AM"
$AutoAction   = New-ScheduledTaskAction -Execute "cmd.exe" -Argument "/c `"$AutoBatch`""
$AutoSettings = New-ScheduledTaskSettingsSet -ExecutionTimeLimit (New-TimeSpan -Minutes 15) -StartWhenAvailable

Register-ScheduledTask -TaskName $AutoTask -Trigger $AutoTrigger -Action $AutoAction -Settings $AutoSettings -RunLevel Highest -Force | Out-Null

Write-Host "[$AutoTask] 등록 완료 — 매일 오전 9시 자동 포스팅" -ForegroundColor Green

# ── 불필요한 중복 태스크 제거 ─────────────────────────────────────────────
Unregister-ScheduledTask -TaskName "TianxiaNaverPoster" -Confirm:$false -ErrorAction SilentlyContinue
Write-Host "[TianxiaNaverPoster] 중복 태스크 제거됨" -ForegroundColor DarkGray

Write-Host ""
Write-Host "설정 완료!" -ForegroundColor Cyan
Write-Host "  로컬 포스터 로그: `$env:TEMP\tianxia-poster.log" -ForegroundColor Gray
Write-Host "  자동화 로그:      `$env:TEMP\tianxia-auto-run.log" -ForegroundColor Gray
Write-Host ""
Write-Host "즉시 테스트:" -ForegroundColor Yellow
Write-Host "  Start-ScheduledTask -TaskName $PosterTask" -ForegroundColor Cyan
