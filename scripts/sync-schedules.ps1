param()

$EnvPath    = "$PSScriptRoot\..\\.env.local"
$RailwayUrl = "https://tianxia-cardnews-production.up.railway.app"
$ApiKey     = ""

if (Test-Path $EnvPath) {
  Get-Content $EnvPath | ForEach-Object {
    if ($_ -match "^RAILWAY_URL=(.+)")        { $RailwayUrl = $Matches[1].Trim() }
    if ($_ -match "^ANTHROPIC_API_KEY=(.+)")  { $ApiKey     = $Matches[1].Trim() }
  }
}

if (-not $ApiKey) {
  Write-Host "[ERROR] ANTHROPIC_API_KEY not found in .env.local" -ForegroundColor Red
  exit 1
}

$ProjectDir = "$PSScriptRoot\.."
$RunScript  = "$ProjectDir\scripts\run-schedule.ps1"

Write-Host "Fetching schedules from Railway..." -ForegroundColor Cyan
try {
  $schedules = Invoke-RestMethod -Uri "$RailwayUrl/api/schedule" `
    -Headers @{ "x-user-api-key" = $ApiKey } -TimeoutSec 15
} catch {
  Write-Host "[ERROR] Cannot connect to Railway: $_" -ForegroundColor Red
  exit 1
}

$DayMap = @{ 0="Sunday"; 1="Monday"; 2="Tuesday"; 3="Wednesday"; 4="Thursday"; 5="Friday"; 6="Saturday" }

# Remove old tasks
Get-ScheduledTask | Where-Object { $_.TaskName -like "TianxiaPoster_*" -or $_.TaskName -eq "TianxiaLocalPoster" -or $_.TaskName -eq "TianxiaNaverPoster" } | ForEach-Object {
  Unregister-ScheduledTask -TaskName $_.TaskName -Confirm:$false -ErrorAction SilentlyContinue
  Write-Host "  Removed: $($_.TaskName)" -ForegroundColor DarkGray
}

$Action   = New-ScheduledTaskAction -Execute "powershell.exe" `
  -Argument "-WindowStyle Hidden -NonInteractive -ExecutionPolicy Bypass -File `"$RunScript`""
$Settings = New-ScheduledTaskSettingsSet -Hidden `
  -ExecutionTimeLimit (New-TimeSpan -Minutes 15) -StartWhenAvailable

$registered = 0

foreach ($s in $schedules) {
  if (-not $s.enabled) {
    Write-Host "  Skipped (disabled): $($s.id)" -ForegroundColor DarkGray
    continue
  }

  $atTime = $s.time

  try {
    if ($s.type -eq "weekly" -and $s.weekdays -and $s.weekdays.Count -gt 0) {
      $days    = $s.weekdays | ForEach-Object { $DayMap[[int]$_] }
      $daysStr = $days -join ", "
      $trigger = New-ScheduledTaskTrigger -Weekly -DaysOfWeek $days -At $atTime
    } elseif ($s.type -eq "daily") {
      $daysStr = "daily"
      $trigger = New-ScheduledTaskTrigger -Daily -At $atTime
    } elseif ($s.type -eq "once" -and $s.date) {
      $daysStr = $s.date
      $trigger = New-ScheduledTaskTrigger -Once -At "$($s.date) $atTime"
    } else {
      continue
    }

    $taskName = "TianxiaPoster_$($s.id)"
    Register-ScheduledTask -TaskName $taskName -Action $Action -Trigger $trigger `
      -Settings $Settings -RunLevel Highest -Force | Out-Null
    Write-Host "  Registered: [$taskName]  $daysStr at $atTime KST" -ForegroundColor Green
    $registered++
  } catch {
    Write-Host "  [ERROR] $($s.id): $_" -ForegroundColor Red
  }
}

Write-Host ""
if ($registered -eq 0) {
  Write-Host "No schedules registered. Add schedules in the UI first." -ForegroundColor Yellow
} else {
  Write-Host "$registered schedule(s) registered. Runs silently in background." -ForegroundColor Cyan
}

# Verify registered tasks
Write-Host ""
Write-Host "--- Registered TianxiaPoster tasks ---" -ForegroundColor White
$tasks = Get-ScheduledTask | Where-Object { $_.TaskName -like "TianxiaPoster_*" }
if ($tasks.Count -eq 0) {
  Write-Host "  (none)" -ForegroundColor DarkGray
} else {
  foreach ($t in $tasks) {
    $info = Get-ScheduledTaskInfo -TaskName $t.TaskName -ErrorAction SilentlyContinue
    $next = if ($info.NextRunTime) { $info.NextRunTime.ToString("yyyy-MM-dd HH:mm") } else { "N/A" }
    Write-Host "  $($t.TaskName)  state=$($t.State)  next=$next" -ForegroundColor Green
  }
}
Write-Host "--------------------------------------" -ForegroundColor White
