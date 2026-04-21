param()

$ProjectDir = "C:\Users\ADMIN\Desktop\tianxia-cardnews"

foreach ($old in @("TianxiaLocalPoster", "TianxiaNaverPoster", "TianxiaAutoRun", "TianxiaServer")) {
  Unregister-ScheduledTask -TaskName $old -Confirm:$false -ErrorAction SilentlyContinue
  Write-Host "[$old] removed" -ForegroundColor DarkGray
}
Get-ScheduledTask | Where-Object { $_.TaskName -like "TianxiaPoster_*" } | ForEach-Object {
  Unregister-ScheduledTask -TaskName $_.TaskName -Confirm:$false -ErrorAction SilentlyContinue
}

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

Write-Host "[$ServerTask] registered - starts at logon on localhost:3939" -ForegroundColor Green

Start-ScheduledTask -TaskName $ServerTask
Write-Host "[$ServerTask] started now" -ForegroundColor Cyan

Write-Host ""
Write-Host "To register scheduled posts, run:" -ForegroundColor Yellow
Write-Host "  powershell -ExecutionPolicy Bypass -File `"$ProjectDir\scripts\sync-schedules.ps1`"" -ForegroundColor White
Write-Host ""
Write-Host 'Server log: Get-Content $env:TEMP\tianxia-server.log -Tail 20' -ForegroundColor Gray
Write-Host 'Schedule log: Get-Content $env:TEMP\tianxia-schedule.log -Tail 20' -ForegroundColor Gray
