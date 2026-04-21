param()

$LocalCache = "$PSScriptRoot\..\tianxia-schedules.json"
$ProjectDir = "$PSScriptRoot\.."
$RunScript  = "$ProjectDir\scripts\run-schedule.ps1"

if (-not (Test-Path $LocalCache)) {
  Write-Host "[ERROR] $LocalCache not found. Add schedules in the UI first." -ForegroundColor Red
  exit 1
}

$schedules = Get-Content $LocalCache -Raw | ConvertFrom-Json

if (-not $schedules -or $schedules.Count -eq 0) {
  Write-Host "[ERROR] No schedules in local cache. Add schedules in the UI first." -ForegroundColor Red
  exit 1
}

Write-Host "Loaded $($schedules.Count) schedule(s) from local cache." -ForegroundColor Cyan

$DayMap = @{ 0="Sunday"; 1="Monday"; 2="Tuesday"; 3="Wednesday"; 4="Thursday"; 5="Friday"; 6="Saturday" }

# Remove old tasks
Get-ScheduledTask | Where-Object { $_.TaskName -like "TianxiaPoster_*" } | ForEach-Object {
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
  Write-Host "No tasks registered." -ForegroundColor Yellow
} else {
  Write-Host "$registered task(s) registered successfully." -ForegroundColor Cyan
}

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
