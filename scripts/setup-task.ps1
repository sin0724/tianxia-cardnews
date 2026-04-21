# 네이버 블로그 로컬 포스터 Windows 예약 작업 등록
# 실행: PowerShell에서 .\scripts\setup-task.ps1

$ProjectDir = "C:\Users\ADMIN\Desktop\tianxia-cardnews"
$TaskName   = "TianxiaNaverPoster"

# 환경변수 (여기에 직접 입력)
$NaverId    = $env:NAVER_ID
$NaverPw    = $env:NAVER_PW
$NaverBlogId = "influencercompany"
$RailwayUrl  = "https://tianxia-cardnews.up.railway.app"

if (-not $NaverId -or -not $NaverPw) {
    Write-Host "NAVER_ID / NAVER_PW 환경변수가 설정되어 있지 않습니다." -ForegroundColor Red
    Write-Host "먼저 Railway 환경변수와 동일하게 설정해주세요:" -ForegroundColor Yellow
    Write-Host '  $env:NAVER_ID = "your_id"' -ForegroundColor Cyan
    Write-Host '  $env:NAVER_PW = "your_pw"' -ForegroundColor Cyan
    exit 1
}

# 실행 배치 파일 생성
$BatchFile = "$ProjectDir\scripts\run-poster.bat"
@"
@echo off
set NAVER_ID=$NaverId
set NAVER_PW=$NaverPw
set NAVER_BLOG_ID=$NaverBlogId
set RAILWAY_URL=$RailwayUrl
set NAVER_COOKIES=
cd /d "$ProjectDir"
npx tsx scripts\local-poster.ts >> "%TEMP%\tianxia-poster.log" 2>&1
"@ | Out-File -FilePath $BatchFile -Encoding utf8

Write-Host "배치 파일 생성: $BatchFile" -ForegroundColor Green

# 기존 작업 삭제 후 재등록
Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false -ErrorAction SilentlyContinue

# 매일 오전 9시 5분 실행 (Railway 자동화가 9시에 콘텐츠 생성하고 5분 후 포스팅)
$Trigger = New-ScheduledTaskTrigger -Daily -At "09:05AM"
$Action  = New-ScheduledTaskAction -Execute "cmd.exe" -Argument "/c `"$BatchFile`""
$Settings = New-ScheduledTaskSettingsSet -ExecutionTimeLimit (New-TimeSpan -Minutes 10) -StartWhenAvailable

Register-ScheduledTask `
    -TaskName $TaskName `
    -Trigger $Trigger `
    -Action $Action `
    -Settings $Settings `
    -RunLevel Highest `
    -Force | Out-Null

Write-Host ""
Write-Host "✅ 예약 작업 등록 완료!" -ForegroundColor Green
Write-Host "   작업명: $TaskName" -ForegroundColor Cyan
Write-Host "   실행 시각: 매일 오전 9시 5분" -ForegroundColor Cyan
Write-Host ""
Write-Host "확인: 작업 스케줄러 > $TaskName" -ForegroundColor Yellow
Write-Host "즉시 테스트: Start-ScheduledTask -TaskName '$TaskName'" -ForegroundColor Yellow
