import { chromium } from "playwright";

export async function postToNaverBlogPlaywright(
  naverId: string,
  naverPw: string,
  title: string,
  content: string,
  tags: string[]
): Promise<string> {
  const browser = await chromium.launch({
    headless: true,
    executablePath: process.env.CHROMIUM_EXECUTABLE_PATH || undefined,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
    ],
  });

  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    locale: "ko-KR",
  });

  const page = await context.newPage();

  try {
    // ── 1. 네이버 로그인 ──
    await page.goto(
      "https://nid.naver.com/nidlogin.login?mode=form&url=https://blog.naver.com",
      { waitUntil: "domcontentloaded", timeout: 20000 }
    );

    await page.fill("#id", naverId);
    await page.fill("#pw", naverPw);
    await page.click(".btn_login");

    await page.waitForNavigation({ waitUntil: "networkidle", timeout: 20000 });

    if (page.url().includes("nidlogin") || page.url().includes("login.naver")) {
      throw new Error(
        "네이버 로그인 실패 — ID/비밀번호 확인 또는 2단계 인증 해제 필요"
      );
    }

    // ── 2. 블로그 글쓰기 페이지 이동 ──
    await page.goto(
      `https://blog.naver.com/PostWriteForm.naver?blogId=${naverId}`,
      { waitUntil: "networkidle", timeout: 30000 }
    );

    // SmartEditor 초기화 대기
    await page.waitForSelector(".se-documentTitle-text, [contenteditable='true']", {
      timeout: 25000,
    });
    await page.waitForTimeout(3000);

    // ── 3. 제목 입력 ──
    const titleEl = page.locator(".se-documentTitle-text").first();
    await titleEl.click({ timeout: 5000 });
    await page.keyboard.press("Control+a");
    await page.keyboard.insertText(title);

    await page.waitForTimeout(500);

    // ── 4. 본문 입력 ──
    const contentEl = page.locator(".se-content").first();
    await contentEl.click({ timeout: 5000 });
    await page.keyboard.press("Control+a");
    await page.keyboard.press("Delete");
    await page.waitForTimeout(300);
    await page.keyboard.insertText(content);

    await page.waitForTimeout(1000);

    // ── 5. 태그 입력 (가능한 경우) ──
    try {
      const tagInputEl = page
        .locator('.se-tag-input input, input[placeholder*="태그"]')
        .first();
      const tagVisible = await tagInputEl.isVisible({ timeout: 3000 });
      if (tagVisible) {
        for (const tag of tags.slice(0, 5)) {
          await tagInputEl.fill(tag);
          await page.keyboard.press("Enter");
          await page.waitForTimeout(300);
        }
      }
    } catch {
      // 태그 입력란 없으면 넘어감
    }

    // ── 6. 발행 ──
    const publishBtn = page
      .locator(
        'button:has-text("발행"), button:has-text("게시"), .se-publishing-btn, button.btn_post_ok'
      )
      .first();
    await publishBtn.click({ timeout: 10000 });

    // 발행 확인 팝업이 있으면 처리
    try {
      const confirmBtn = page
        .locator('button:has-text("발행"), button:has-text("확인")')
        .nth(1);
      const confirmVisible = await confirmBtn.isVisible({ timeout: 3000 });
      if (confirmVisible) await confirmBtn.click();
    } catch {
      // 팝업 없으면 넘어감
    }

    await page.waitForLoadState("networkidle", { timeout: 30000 });

    return page.url();
  } finally {
    await browser.close();
  }
}
