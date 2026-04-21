import { chromium, type Cookie, type Page, type Frame } from "playwright";

/**
 * 네이버 블로그 자동 포스팅 — naverpost 방식 포팅
 *
 * 인증 우선순위:
 *  1. NAVER_COOKIES 환경변수 (쿠키 주입) — 서버에서 권장
 *  2. ID/PW 로그인 — 로컬 전용
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

    // ── 2. 글쓰기 페이지 (naverpost: GoBlogWrite.naver) ──
    await page.goto("https://blog.naver.com/GoBlogWrite.naver", {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });
    await page.waitForTimeout(2000);

    // ── 3. mainFrame iframe 진입 ──
    await page.waitForSelector("#mainFrame", { timeout: 20000 });
    await page.waitForTimeout(3000); // SmartEditor 초기화 대기

    const mainFrame = getMainFrame(page);
    if (!mainFrame) throw new Error("블로그 에디터 iframe(#mainFrame)을 찾을 수 없습니다.");

    await mainFrame.waitForSelector(
      ".se-section-documentTitle, [contenteditable='true']",
      { timeout: 20000 }
    );
    await page.waitForTimeout(1000);

    // ── 4. 팝업 닫기 (naverpost 방식) ──
    await closePopups(mainFrame);

    // ── 5. 제목 입력 ──
    await mainFrame.locator(".se-section-documentTitle").first().click();
    await page.waitForTimeout(500);
    await typeChars(page, title);
    await page.waitForTimeout(500);

    // ── 6. 본문 입력 ──
    await mainFrame.locator(".se-section-text").first().click();
    await page.waitForTimeout(500);
    await typeContent(page, content);
    await page.waitForTimeout(1000);

    // ── 7. 태그 입력 ──
    await inputTags(mainFrame, page, tags);

    // ── 8. 발행 버튼 — JS click (naverpost 방식) ──
    const publishBtn = await mainFrame
      .locator(".publish_btn__m9KHH")
      .first()
      .elementHandle({ timeout: 10000 });

    if (!publishBtn) throw new Error("발행 버튼(.publish_btn__m9KHH)을 찾을 수 없습니다.");
    await mainFrame.evaluate((el) => (el as HTMLElement).click(), publishBtn);
    console.log("[Naver] 발행 버튼 클릭 완료");
    await page.waitForTimeout(2500);

    // ── 9. 발행 옵션 처리 (새 창 or 현재 창) ──
    const postUrl = await handlePublishOptions(page, context);
    return postUrl;
  } finally {
    await browser.close();
  }
}

// ─────────────────────────────────────────
// 인증 함수들
// ─────────────────────────────────────────

async function loginWithCookies(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  context: any,
  page: Page,
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

  // 쿠키 유효성 확인 — 글쓰기 페이지 직접 접근
  await page.goto("https://blog.naver.com/GoBlogWrite.naver", {
    waitUntil: "domcontentloaded",
    timeout: 20000,
  });
  await page.waitForTimeout(2000);

  const url = page.url();
  if (url.includes("nidlogin") || url.includes("login.naver")) {
    throw new Error(
      "NAVER_COOKIES가 만료되었습니다. 로컬에서 'npx tsx scripts/extract-naver-cookies.ts'를 다시 실행해 쿠키를 갱신하세요."
    );
  }

  console.log(`[Naver] 쿠키 인증 성공 (blogId: ${naverId})`);
  // 이미 글쓰기 페이지에 있으므로 이후 goto 건너뜀을 위해 flag 설정
  // → 바깥에서 GoBlogWrite 재방문해도 무방 (리로드)
}

async function loginWithCredentials(page: Page, naverId: string, naverPw: string): Promise<void> {
  await page.goto("https://nid.naver.com/nidlogin.login?mode=form", {
    waitUntil: "domcontentloaded",
    timeout: 20000,
  });
  await page.waitForTimeout(1500);

  await fillNaverInput(page, "#id", naverId);
  await page.waitForTimeout(400);
  await fillNaverInput(page, "#pw", naverPw);
  await page.waitForTimeout(400);

  await page.click('[id="log.login"]').catch(() => page.click(".btn_login"));
  await page.waitForNavigation({ waitUntil: "networkidle", timeout: 20000 });

  if (page.url().includes("nidlogin") || page.url().includes("login.naver")) {
    throw new Error(
      "네이버 로그인 실패 — 서버 IP 차단 감지.\n" +
      "해결: 로컬에서 'npx tsx scripts/extract-naver-cookies.ts' 실행 후\n" +
      "출력된 JSON을 Railway 환경변수 NAVER_COOKIES에 저장하세요."
    );
  }
}

// ─────────────────────────────────────────
// 글쓰기 헬퍼
// ─────────────────────────────────────────

function getMainFrame(page: Page): Frame | undefined {
  return (
    page.frame({ name: "mainFrame" }) ??
    page.frames().find((f) => f.url().includes("blog.naver.com") && f !== page.mainFrame())
  );
}

/** naverpost: 팝업 닫기 (.se-popup-button-cancel, .se-help-panel-close-button) */
async function closePopups(frame: Frame): Promise<void> {
  for (const sel of [".se-popup-button-cancel", ".se-help-panel-close-button"]) {
    try {
      const el = frame.locator(sel).first();
      if (await el.isVisible({ timeout: 1500 })) {
        await el.click();
        await frame.waitForTimeout(500);
      }
    } catch { /* 없으면 건너뜀 */ }
  }
}

/** naverpost: ActionChains 방식 — 한 글자씩 0.03초 간격 */
async function typeChars(page: Page, text: string): Promise<void> {
  for (const char of text) {
    await page.keyboard.type(char, { delay: 30 });
  }
}

/** 본문 입력 — 줄바꿈은 Enter 키 (naverpost 방식) */
async function typeContent(page: Page, text: string): Promise<void> {
  const lines = text.split("\n");
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].length > 0) {
      await typeChars(page, lines[i]);
    }
    if (i < lines.length - 1) {
      await page.keyboard.press("Enter");
      await page.waitForTimeout(30);
    }
  }
}

async function inputTags(frame: Frame, page: Page, tags: string[]): Promise<void> {
  try {
    const tagSel = ".se-tag-input input, input[placeholder*='태그']";
    const tagEl = frame.locator(tagSel).first();
    if (await tagEl.isVisible({ timeout: 2000 }).catch(() => false)) {
      for (const tag of tags.slice(0, 5)) {
        await tagEl.fill(tag);
        await page.keyboard.press("Enter");
        await page.waitForTimeout(300);
      }
    }
  } catch { /* 태그란 없으면 건너뜀 */ }
}

/**
 * 발행 옵션 처리 — naverpost handle_publish_options 포팅
 * 새 창이 열리거나 현재 창에서 팝업이 처리됨
 */
async function handlePublishOptions(
  page: Page,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  context: any
): Promise<string> {
  // 새 창이 열리는 경우를 대기 (최대 5초)
  let targetPage: Page = page;
  try {
    const newPagePromise = context.waitForEvent("page", { timeout: 5000 }) as Promise<Page>;
    const newPage = await newPagePromise;
    await newPage.waitForLoadState("domcontentloaded");
    targetPage = newPage;
    console.log("[Naver] 발행 옵션 새 창 감지");
  } catch {
    // 새 창 없음 — 현재 페이지에서 처리
    console.log("[Naver] 현재 창에서 발행 옵션 처리");
  }

  await targetPage.waitForTimeout(1500);

  // iframe 안에 발행 옵션이 있을 수 있음
  let optionFrame: Page | Frame = targetPage;
  try {
    const iframes = targetPage.frames();
    if (iframes.length > 1) {
      // mainFrame 제외한 첫 번째 iframe 사용
      const candidate = iframes.find((f) => f !== targetPage.mainFrame() && f.url() !== "about:blank");
      if (candidate) optionFrame = candidate;
    }
  } catch { /* ignore */ }

  // 현재 발행 라디오 선택 (label[for='radio_time1'])
  try {
    await (optionFrame as Frame).locator("label[for='radio_time1']").first().click({ timeout: 5000 });
    console.log("[Naver] 현재 발행 라디오 선택");
    await targetPage.waitForTimeout(500);
  } catch {
    console.log("[Naver] 발행 라디오 버튼 없음 — 건너뜀");
  }

  // 최종 발행 버튼 클릭 (naverpost 셀렉터 순서)
  const finalSelectors = [
    "button[data-testid='seOnePublishBtn']",
    ".confirm_btn__WEaBq[data-testid='seOnePublishBtn']",
    "button.confirm_btn__WEaBq",
    "button:has-text('발행')",
  ];

  for (const sel of finalSelectors) {
    try {
      const btn = (optionFrame as Frame).locator(sel).first();
      if (await btn.isVisible({ timeout: 3000 })) {
        await btn.scrollIntoViewIfNeeded();
        await targetPage.waitForTimeout(300);
        await btn.click();
        console.log(`[Naver] 최종 발행 버튼 클릭: ${sel}`);
        break;
      }
    } catch { continue; }
  }

  await targetPage.waitForLoadState("networkidle", { timeout: 30000 }).catch(() => null);
  await targetPage.waitForTimeout(2000);

  return targetPage.url();
}

// ─────────────────────────────────────────
// 유틸
// ─────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function fillNaverInput(page: any, selector: string, value: string): Promise<void> {
  await page.evaluate(
    ([sel, val]: [string, string]) => {
      const el = document.querySelector(sel) as HTMLInputElement | null;
      if (!el) return;
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
      setter?.call(el, val);
      el.dispatchEvent(new Event("input", { bubbles: true }));
      el.dispatchEvent(new Event("change", { bubbles: true }));
    },
    [selector, value] as [string, string]
  );
}
