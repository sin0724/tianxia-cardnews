param()

$ProjectDir  = "C:\Users\ADMIN\Desktop\tianxia-cardnews"
$TaskName    = "TianxiaNaverPoster"
$NaverBlogId = "influencercompany"
$RailwayUrl  = "https://tianxia-cardnews.up.railway.app"
$NaverId     = $env:NAVER_ID
$NaverPw     = $env:NAVER_PW

if (-not $NaverId -or -not $NaverPw) {
    Write-Host "NAVER_ID / NAVER_PW 환경변수 미설정" -ForegroundColor Red
    Write-Host "먼저 실행: `$env:NAVER_ID=`"your_id`"; `$env:NAVER_PW=`"your_pw`"" -ForegroundColor Yellow
    exit 1
}

$BatchFile = "$ProjectDir\scripts\run-poster.bat"

$lines = @(
    "@echo off",
    "set NAVER_ID=$NaverId",
    "set NAVER_PW=$NaverPw",
    "set NAVER_BLOG_ID=$NaverBlogId",
    "set RAILWAY_URL=$RailwayUrl",
    "cd /d `"$ProjectDir`"",
    "npx tsx scripts\local-poster.ts >> `"%TEMP%\tianxia-poster.log`" 2>&1"
)
$lines | Out-File -FilePath $BatchFile -Encoding ascii

Write-Host "배치 파일 생성: $BatchFile" -ForegroundColor Green

Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false -ErrorAction SilentlyContinue

$Trigger  = New-ScheduledTaskTrigger -Daily -At "09:05AM"
$Action   = New-ScheduledTaskAction -Execute "cmd.exe" -Argument "/c `"$BatchFile`""
$Settings = New-ScheduledTaskSettingsSet -ExecutionTimeLimit (New-TimeSpan -Minutes 10) -StartWhenAvailable

Register-ScheduledTask -TaskName $TaskName -Trigger $Trigger -Action $Action -Settings $Settings -RunLevel Highest -Force | Out-Null

Write-Host ""
Write-Host "예약 작업 등록 완료!" -ForegroundColor Green
Write-Host "  작업명: $TaskName" -ForegroundColor Cyan
Write-Host "  실행: 매일 오전 9시 5분" -ForegroundColor Cyan
Write-Host ""
Write-Host "즉시 테스트:" -ForegroundColor Yellow
Write-Host "  Start-ScheduledTask -TaskName $TaskName" -ForegroundColor Cyan
