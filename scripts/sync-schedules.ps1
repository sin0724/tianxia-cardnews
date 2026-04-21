param()

# .env.local 에서 설정 읽기
$EnvPath = "$PSScriptRoot\..\\.env.local"
$RailwayUrl = "https://tianxia-cardnews-production.up.railway.app"
$ApiKey = ""

if (Test-Path $EnvPath) {
  Get-Content $EnvPath | ForEach-Object {
    if ($_ -match "^RAILWAY_URL=(.+)") { $RailwayUrl = $Matches[1].Trim() }
    if ($_ -match "^ANTHROPIC_API_KEY=(.+)") { $ApiKey = $Matches[1].Trim() }
  }
}

if (-not $ApiKey) {
  Write-Host "[오류] ANTHROPIC_API_KEY 를 .env.local 에서 찾을 수 없습니다." -ForegroundColor Red
  exit 1
}

$ProjectDir = "$PSScriptRoot\.."
$RunScript  = "$ProjectDir\scripts\run-schedule.ps1"

# Railway 에서 스케줄 목록 가져오기
Write-Host "Railway 스케줄 조회 중..." -ForegroundColor Cyan
try {
  $schedules = Invoke-RestMethod -Uri "$RailwayUrl/api/schedule" `
    -Headers @{ "x-user-api-key" = $ApiKey } -TimeoutSec 15
} catch {
  Write-Host "[오류] Railway 연결 실패: $_" -ForegroundColor Red
  exit 1
}

$DayMap = @{ 0="Sunday"; 1="Monday"; 2="Tuesday"; 3="Wednesday"; 4="Thursday"; 5="Friday"; 6="Saturday" }

# 기존 TianxiaPoster_* 태스크 모두 제거
Get-ScheduledTask | Where-Object { $_.TaskName -like "TianxiaPoster_*" -or $_.TaskName -eq "TianxiaLocalPoster" -or $_.TaskName -eq "TianxiaNaverPoster" } | ForEach-Object {
  Unregister-ScheduledTask -TaskName $_.TaskName -Confirm:$false -ErrorAction SilentlyContinue
  Write-Host "  제거: $($_.TaskName)" -ForegroundColor DarkGray
}

$Action   = New-ScheduledTaskAction -Execute "powershell.exe" `
  -Argument "-WindowStyle Hidden -NonInteractive -ExecutionPolicy Bypass -File `"$RunScript`""
$Settings = New-ScheduledTaskSettingsSet -Hidden `
  -ExecutionTimeLimit (New-TimeSpan -Minutes 15) -StartWhenAvailable

$registered = 0

foreach ($s in $schedules) {
  if (-not $s.enabled) {
    Write-Host "  건너뜀 (비활성): $($s.label)" -ForegroundColor DarkGray
    continue
  }

  $atTime = $s.time  # HH:MM (KST = 로컬 시간)

  try {
    if ($s.type -eq "weekly" -and $s.weekdays -and $s.weekdays.Count -gt 0) {
      $days = $s.weekdays | ForEach-Object { $DayMap[[int]$_] }
      $trigger = New-ScheduledTaskTrigger -Weekly -DaysOfWeek $days -At $atTime
    } elseif ($s.type -eq "daily") {
      $trigger = New-ScheduledTaskTrigger -Daily -At $atTime
    } elseif ($s.type -eq "once" -and $s.date) {
      $trigger = New-ScheduledTaskTrigger -Once -At "$($s.date) $atTime"
    } else {
      continue
    }

    $taskName = "TianxiaPoster_$($s.id)"
    Register-ScheduledTask -TaskName $taskName -Action $Action -Trigger $trigger `
      -Settings $Settings -RunLevel Highest -Force | Out-Null
    Write-Host "  등록: $($s.label)  [$taskName]" -ForegroundColor Green
    $registered++
  } catch {
    Write-Host "  [오류] $($s.label): $_" -ForegroundColor Red
  }
}

Write-Host ""
if ($registered -eq 0) {
  Write-Host "등록된 스케줄이 없습니다. UI에서 스케줄을 먼저 추가하세요." -ForegroundColor Yellow
} else {
  Write-Host "$registered 개 스케줄 등록 완료. 창 없이 백그라운드로 실행됩니다." -ForegroundColor Cyan
}
Write-Host ""
Write-Host "현재 등록된 태스크 확인:" -ForegroundColor Gray
Write-Host "  Get-ScheduledTask | Where-Object { `$_.TaskName -like 'TianxiaPoster_*' }" -ForegroundColor Gray
