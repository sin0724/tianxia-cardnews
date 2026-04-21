/**
 * 네이버 쿠키 추출 스크립트 — 로컬에서만 실행
 *
 * 사용법:
 *   npx tsx scripts/extract-naver-cookies.ts
 *
 * 출력된 JSON을 복사해서 Railway 환경변수 NAVER_COOKIES에 붙여넣으세요.
 * 쿠키는 약 30일간 유효합니다.
 */
import { chromium } from "playwright";
import * as readline from "readline";

async function prompt(question: string): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function main() {
  const naverId = process.env.NAVER_ID || await prompt("네이버 아이디: ");
  const naverPw = process.env.NAVER_PW || await prompt("네이버 비밀번호: ");

  console.log("\n브라우저를 열고 로그인합니다...");
  console.log("보안 인증(문자/앱 인증)이 뜨면 직접 완료해 주세요.\n");

  const browser = await chromium.launch({
    headless: false, // 로컬에서만 실행 — 창을 띄워야 로그인 가능
    args: [
      "--disable-blink-features=AutomationControlled",
      "--window-size=1024,768",
    ],
  });

  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    locale: "ko-KR",
    viewport: { width: 1024, height: 768 },
  });

  await context.addInitScript(() => {
    Object.defineProperty(navigator, "webdriver", { get: () => undefined });
  });

  const page = await context.newPage();

  await page.goto("https://nid.naver.com/nidlogin.login?mode=form", {
    waitUntil: "domcontentloaded",
  });
  await page.waitForTimeout(1500);

  // 아이디/비밀번호 클립보드 방식 입력
  await page.click("#id");
  await page.waitForTimeout(300);
  // evaluate로 값 주입 (React 폼 호환)
  await page.evaluate(
    ({ id, pw }: { id: string; pw: string }) => {
      const setVal = (el: HTMLInputElement, val: string) => {
        const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
        setter?.call(el, val);
        el.dispatchEvent(new Event("input", { bubbles: true }));
        el.dispatchEvent(new Event("change", { bubbles: true }));
      };
      const idEl = document.querySelector("#id") as HTMLInputElement;
      const pwEl = document.querySelector("#pw") as HTMLInputElement;
      if (idEl) setVal(idEl, id);
      if (pwEl) setVal(pwEl, pw);
    },
    { id: naverId, pw: naverPw }
  );
  await page.waitForTimeout(500);

  // 로그인 버튼
  await page.click('[id="log.login"]').catch(() => page.click(".btn_login"));
  await page.waitForTimeout(3000);

  // 보안 인증이 뜨면 수동 완료 대기 (최대 2분)
  console.log("로그인 중... 보안 인증이 있으면 브라우저에서 직접 완료하세요.");
  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
    const url = page.url();
    if (
      url.includes("blog.naver.com") ||
      url.includes("naver.com/") && !url.includes("nid") && !url.includes("login")
    ) {
      break;
    }
    await page.waitForTimeout(2000);
    process.stdout.write(".");
  }
  console.log();

  const finalUrl = page.url();
  if (finalUrl.includes("nidlogin") || finalUrl.includes("login")) {
    console.error("\n로그인 실패. 아이디/비밀번호를 확인하세요.");
    await browser.close();
    process.exit(1);
  }

  // 네이버 관련 모든 쿠키 추출
  const allCookies = await context.cookies([
    "https://naver.com",
    "https://www.naver.com",
    "https://blog.naver.com",
    "https://nid.naver.com",
  ]);

  const naverCookies = allCookies.filter(
    (c) => c.domain.includes("naver.com")
  );

  await browser.close();

  const json = JSON.stringify(naverCookies, null, 2);

  console.log("\n========== NAVER_COOKIES (Railway 환경변수에 붙여넣기) ==========\n");
  // 한 줄 압축 버전 (환경변수에 쓰기 편한 형태)
  console.log(JSON.stringify(naverCookies));
  console.log("\n====================================================================");
  console.log(`\n총 ${naverCookies.length}개 쿠키 추출 완료.`);
  console.log("위 JSON을 복사해서 Railway > Variables > NAVER_COOKIES 에 붙여넣으세요.");
  console.log("쿠키는 약 30일간 유효합니다.\n");

  // 파일로도 저장
  const fs = await import("fs");
  fs.writeFileSync("naver-cookies.json", json, "utf-8");
  console.log("naver-cookies.json 파일에도 저장됨 (백업용, git에 올리지 마세요!)");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
