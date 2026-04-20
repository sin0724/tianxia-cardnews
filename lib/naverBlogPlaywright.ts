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
      "--disable-blink-features=AutomationControlled", // 핵심: 봇 탐지 회피
      "--disable-infobars",
      "--window-size=1280,900",
    ],
  });

  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    locale: "ko-KR",
    viewport: { width: 1280, height: 900 },
    extraHTTPHeaders: { "Accept-Language": "ko-KR,ko;q=0.9" },
  });

  // navigator.webdriver 숨기기 (자동화 탐지 우회)
  await context.addInitScript(() => {
    Object.defineProperty(navigator, "webdriver", { get: () => undefined });
    Object.defineProperty(navigator, "plugins", { get: () => [1, 2, 3, 4, 5] });
    Object.defineProperty(navigator, "languages", { get: () => ["ko-KR", "ko"] });
    (window as unknown as Record<string, unknown>)["chrome"] = { runtime: {} };
  });

  const page = await context.newPage();

  try {
    // ── 1. 네이버 로그인 ──
    await page.goto(
      "https://nid.naver.com/nidlogin.login?mode=form&url=https://blog.naver.com",
      { waitUntil: "domcontentloaded", timeout: 20000 }
    );
    await page.waitForTimeout(1000);

    // React 호환 값 설정 (일반 fill이 Naver 폼에서 작동 안 할 때 대비)
    await fillNaverInput(page, "#id", naverId);
    await page.waitForTimeout(400);
    await fillNaverInput(page, "#pw", naverPw);
    await page.waitForTimeout(400);

    // 로그인 버튼 (id="log.login" 또는 class="btn_login")
    try {
      await page.click('[id="log.login"]', { timeout: 3000 });
    } catch {
      await page.click(".btn_login", { timeout: 3000 });
    }

    await page.waitForNavigation({ waitUntil: "networkidle", timeout: 20000 });

    const afterLoginUrl = page.url();
    if (afterLoginUrl.includes("nidlogin") || afterLoginUrl.includes("login.naver")) {
      // 디버그용 스크린샷 정보
      throw new Error(
        "네이버 로그인 실패 — 서버 IP 차단 또는 보안 로그인 감지. NAVER_COOKIES 방식으로 전환 필요."
      );
    }

    // ── 2. 블로그 글쓰기 페이지 ──
    await page.goto(
      `https://blog.naver.com/PostWriteForm.naver?blogId=${naverId}`,
      { waitUntil: "networkidle", timeout: 30000 }
    );

    // ── 3. mainFrame iframe 진입 (Python 코드 참고) ──
    await page.waitForSelector("#mainFrame", { timeout: 20000 });
    await page.waitForTimeout(3000); // SmartEditor 초기화 대기

    const mainFrame =
      page.frame({ name: "mainFrame" }) ??
      page.frames().find((f) => f.url().includes("blog.naver.com") && f !== page.mainFrame());

    if (!mainFrame) {
      throw new Error("블로그 에디터 iframe(#mainFrame)을 찾을 수 없습니다.");
    }

    // SmartEditor 로드 확인
    await mainFrame.waitForSelector(
      ".se-section-documentTitle, .se-title-text, [contenteditable='true']",
      { timeout: 20000 }
    );
    await page.waitForTimeout(2000);

    // ── 4. 제목 입력 (한 글자씩 0.03초 간격 — Python 방식 동일) ──
    const titleSel = ".se-section-documentTitle [contenteditable='true'], .se-title-text";
    await mainFrame.locator(titleSel).first().click();
    await page.waitForTimeout(300);
    await typeSlowly(page, title);

    await page.waitForTimeout(500);

    // ── 5. 본문 입력 ──
    const contentSel = ".se-section-text [contenteditable='true'], .se-text-paragraph [contenteditable='true']";
    await mainFrame.locator(contentSel).first().click();
    await page.waitForTimeout(300);
    await page.keyboard.press("Control+a");
    await page.keyboard.press("Delete");
    await page.waitForTimeout(200);
    await typeSlowly(page, content);

    await page.waitForTimeout(1000);

    // ── 6. 태그 입력 ──
    try {
      const tagSel = ".se-tag-input input, input[placeholder*='태그']";
      const tagEl = mainFrame.locator(tagSel).first();
      if (await tagEl.isVisible({ timeout: 3000 }).catch(() => false)) {
        for (const tag of tags.slice(0, 5)) {
          await tagEl.fill(tag);
          await page.keyboard.press("Enter");
          await page.waitForTimeout(300);
        }
      }
    } catch { /* 태그란 없으면 건너뜀 */ }

    // ── 7. 발행 ──
    const publishSel =
      ".publish_btn__m9KHH, button:has-text('발행'), .se-publishing-btn, .btn_publish";
    await mainFrame.locator(publishSel).first().click({ timeout: 10000 });
    await page.waitForTimeout(1500);

    // 발행 확인 팝업 처리
    try {
      const confirmSel = "button:has-text('발행'), button:has-text('확인')";
      const confirmBtns = mainFrame.locator(confirmSel);
      const count = await confirmBtns.count();
      if (count > 1) await confirmBtns.nth(count - 1).click();
    } catch { /* 팝업 없으면 건너뜀 */ }

    await page.waitForLoadState("networkidle", { timeout: 30000 });
    return page.url();
  } finally {
    await browser.close();
  }
}

/** React 호환 input 값 설정 (Naver 폼은 일반 value= 할당 무시) */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function fillNaverInput(page: any, selector: string, value: string): Promise<void> {
  await page.evaluate(
    ({ sel, val }: { sel: string; val: string }) => {
      const el = document.querySelector(sel) as HTMLInputElement | null;
      if (!el) return;
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
      setter?.call(el, val);
      el.dispatchEvent(new Event("input", { bubbles: true }));
      el.dispatchEvent(new Event("change", { bubbles: true }));
    },
    { sel: selector, val: value }
  );
}

/** 한 글자씩 0.03초 간격 입력 (naverpost Python 방식) */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function typeSlowly(page: any, text: string): Promise<void> {
  // 50자씩 묶어서 type — 너무 긴 텍스트도 처리
  const chunks = text.match(/[\s\S]{1,50}/g) ?? [text];
  for (const chunk of chunks) {
    await page.keyboard.type(chunk, { delay: 30 });
  }
}
