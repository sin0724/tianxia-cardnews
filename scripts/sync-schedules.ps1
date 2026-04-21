param()

$EnvPath       = "$PSScriptRoot\..\\.env.local"
$RailwayUrl    = "https://tianxia-cardnews-production.up.railway.app"
$ApiKey        = ""
$LocalCache    = "$PSScriptRoot\..\tianxia-schedules.json"

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

# Fetch schedules from Railway
Write-Host "Fetching schedules from Railway..." -ForegroundColor Cyan
$schedules = $null
try {
  $schedules = Invoke-RestMethod -Uri "$RailwayUrl/api/schedule" `
    -Headers @{ "x-user-api-key" = $ApiKey } -TimeoutSec 15
} catch {
  Write-Host "[WARN] Cannot connect to Railway: $_" -ForegroundColor Yellow
}

# If Railway returned empty/null but we have a local cache, restore it
if ((-not $schedules -or $schedules.Count -eq 0) -and (Test-Path $LocalCache)) {
  Write-Host "Railway returned no schedules. Loading from local cache..." -ForegroundColor Yellow
  $schedules = Get-Content $LocalCache -Raw | ConvertFrom-Json

  # Push cached schedules back to Railway
  if ($schedules -and $schedules.Count -gt 0) {
    Write-Host "Restoring $($schedules.Count) schedule(s) to Railway..." -ForegroundColor Cyan
    foreach ($s in $schedules) {
      try {
        $body = $s | ConvertTo-Json -Compress
        Invoke-RestMethod -Uri "$RailwayUrl/api/schedule" -Method POST `
          -Headers @{ "x-user-api-key" = $ApiKey; "Content-Type" = "application/json" } `
          -Body $body -TimeoutSec 10 | Out-Null
      } catch {
        Write-Host "  [WARN] Could not restore schedule $($s.id): $_" -ForegroundColor Yellow
      }
    }
    Write-Host "Restore complete. Fetching updated list..." -ForegroundColor Cyan
    try {
      $schedules = Invoke-RestMethod -Uri "$RailwayUrl/api/schedule" `
        -Headers @{ "x-user-api-key" = $ApiKey } -TimeoutSec 15
    } catch { }
  }
}

if (-not $schedules) {
  Write-Host "[ERROR] No schedules available. Add schedules in the UI first." -ForegroundColor Red
  exit 1
}

# Save to local cache
$schedules | ConvertTo-Json -Depth 5 | Out-File -FilePath $LocalCache -Encoding utf8
Write-Host "Local cache updated: $LocalCache" -ForegroundColor DarkGray

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

# Verify
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
