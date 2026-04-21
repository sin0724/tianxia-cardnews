import { chromium, type Cookie } from "playwright";

/**
 * 네이버 블로그 자동 포스팅
 *
 * 인증 방식 우선순위:
 *  1. NAVER_COOKIES 환경변수 (쿠키 주입) — 서버 IP 차단 우회, 권장
 *  2. ID/PW 로그인 — 로컬 환경에서만 동작 (서버에서는 IP 차단됨)
 */
export async function postToNaverBlogPlaywright(
  naverId: string,
  naverPw: string,
  title: string,
  content: string,
  tags: string[]
): Promise<string> {
  const cookiesJson = process.env.NAVER_COOKIES;

  const browser = await chromium.launch({
    headless: true,
    executablePath: process.env.CHROMIUM_EXECUTABLE_PATH || undefined,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
      "--disable-blink-features=AutomationControlled",
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

  await context.addInitScript(() => {
    Object.defineProperty(navigator, "webdriver", { get: () => undefined });
    Object.defineProperty(navigator, "plugins", { get: () => [1, 2, 3, 4, 5] });
    Object.defineProperty(navigator, "languages", { get: () => ["ko-KR", "ko"] });
    (window as unknown as Record<string, unknown>)["chrome"] = { runtime: {} };
  });

  const page = await context.newPage();

  try {
    // ── 1. 인증 ──
    if (cookiesJson) {
      await loginWithCookies(context, page, cookiesJson, naverId);
    } else {
      await loginWithCredentials(page, naverId, naverPw);
    }

    // ── 2. 블로그 글쓰기 페이지 ──
    await page.goto(
      `https://blog.naver.com/PostWriteForm.naver?blogId=${naverId}`,
      { waitUntil: "networkidle", timeout: 30000 }
    );

    // ── 3. mainFrame iframe 진입 ──
    await page.waitForSelector("#mainFrame", { timeout: 20000 });
    await page.waitForTimeout(3000);

    const mainFrame =
      page.frame({ name: "mainFrame" }) ??
      page.frames().find((f) => f.url().includes("blog.naver.com") && f !== page.mainFrame());

    if (!mainFrame) {
      throw new Error("블로그 에디터 iframe(#mainFrame)을 찾을 수 없습니다.");
    }

    await mainFrame.waitForSelector(
      ".se-section-documentTitle, .se-title-text, [contenteditable='true']",
      { timeout: 20000 }
    );
    await page.waitForTimeout(2000);

    // ── 4. 제목 입력 ──
    const titleSel = ".se-section-documentTitle [contenteditable='true'], .se-title-text";
    await mainFrame.locator(titleSel).first().click();
    await page.waitForTimeout(300);
    await typeSlowly(page, title);
    await page.waitForTimeout(500);

    // ── 5. 본문 입력 ──
    const contentSel =
      ".se-section-text [contenteditable='true'], .se-text-paragraph [contenteditable='true']";
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

/** 쿠키 주입 방식 (서버 환경 권장) */
async function loginWithCookies(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  context: any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  page: any,
  cookiesJson: string,
  naverId: string
): Promise<void> {
  let cookies: Cookie[];
  try {
    cookies = JSON.parse(cookiesJson) as Cookie[];
  } catch {
    throw new Error("NAVER_COOKIES 환경변수가 올바른 JSON 형식이 아닙니다.");
  }

  await context.addCookies(cookies);

  // 쿠키 유효성 확인 — 블로그 페이지 접근 시도
  await page.goto("https://www.naver.com", { waitUntil: "domcontentloaded", timeout: 15000 });
  await page.waitForTimeout(1000);

  // 로그인 상태 확인
  const isLoggedIn = await page.evaluate(() => {
    // 네이버 메인의 로그인 상태 확인 (로그인 버튼이 없으면 로그인된 것)
    return !document.querySelector(".gnb_login_btn, a[href*='nidlogin']");
  });

  if (!isLoggedIn) {
    throw new Error(
      "NAVER_COOKIES가 만료되었습니다. 로컬에서 'npx tsx scripts/extract-naver-cookies.ts'를 다시 실행해 쿠키를 갱신하세요."
    );
  }

  console.log(`[Naver] 쿠키 인증 성공 (blogId: ${naverId})`);
}

/** ID/PW 로그인 방식 (로컬 전용) */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function loginWithCredentials(page: any, naverId: string, naverPw: string): Promise<void> {
  await page.goto(
    "https://nid.naver.com/nidlogin.login?mode=form&url=https://blog.naver.com",
    { waitUntil: "domcontentloaded", timeout: 20000 }
  );
  await page.waitForTimeout(1000);

  await fillNaverInput(page, "#id", naverId);
  await page.waitForTimeout(400);
  await fillNaverInput(page, "#pw", naverPw);
  await page.waitForTimeout(400);

  try {
    await page.click('[id="log.login"]', { timeout: 3000 });
  } catch {
    await page.click(".btn_login", { timeout: 3000 });
  }

  await page.waitForNavigation({ waitUntil: "networkidle", timeout: 20000 });

  const afterLoginUrl = page.url();
  if (afterLoginUrl.includes("nidlogin") || afterLoginUrl.includes("login.naver")) {
    throw new Error(
      "네이버 로그인 실패 — 서버 IP 차단 감지.\n" +
      "해결책: 로컬에서 'npx tsx scripts/extract-naver-cookies.ts' 실행 후\n" +
      "출력된 JSON을 Railway 환경변수 NAVER_COOKIES에 저장하세요."
    );
  }
}

/** React 호환 input 값 설정 */
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

/** 50자씩 묶어 30ms 간격 입력 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function typeSlowly(page: any, text: string): Promise<void> {
  const chunks = text.match(/[\s\S]{1,50}/g) ?? [text];
  for (const chunk of chunks) {
    await page.keyboard.type(chunk, { delay: 30 });
  }
}
