import { chromium, type Cookie, type Page, type Frame } from "playwright";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

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
  blogId: string,
  title: string,
  content: string,
  tags: string[],
  imagePaths?: string[]   // 여러 이미지 경로 (선택)
): Promise<string> {
  title   = (title   && title   !== "undefined") ? title   : "자동 포스팅";
  content = (content && content !== "undefined") ? content : "";
  tags    = Array.isArray(tags) ? tags : [];
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
      await loginWithCookies(context, page, cookiesJson, blogId);
    } else {
      await loginWithCredentials(page, naverId, naverPw);
    }

    // ── 2. 글쓰기 페이지 ──
    await page.goto(`https://blog.naver.com/${blogId}`, {
      waitUntil: "domcontentloaded",
      timeout: 20000,
    });
    await page.waitForTimeout(1500);

    await page.goto(`https://blog.naver.com/${blogId}?Redirect=Write`, {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });
    await page.waitForTimeout(3000);

    let mainFrameVisible = await page.locator("#mainFrame").isVisible().catch(() => false);
    if (!mainFrameVisible) {
      await page.goto(`https://blog.naver.com/PostWriteForm.naver?blogId=${blogId}`, {
        waitUntil: "domcontentloaded",
        timeout: 30000,
      });
      await page.waitForTimeout(3000);
      mainFrameVisible = await page.locator("#mainFrame").isVisible().catch(() => false);
    }

    if (!mainFrameVisible) {
      const bodySnippet = await page.evaluate(() =>
        document.body?.innerText?.slice(0, 150) ?? ""
      ).catch(() => "");
      throw new Error(`블로그 글쓰기 페이지 접근 실패 (URL: ${page.url()}).\n내용: ${bodySnippet}`);
    }

    // ── 3. mainFrame iframe 진입 ──
    await page.waitForSelector("#mainFrame", { timeout: 30000 });
    await page.waitForTimeout(3000);

    const mainFrame = getMainFrame(page);
    if (!mainFrame) throw new Error("블로그 에디터 iframe(#mainFrame)을 찾을 수 없습니다.");

    await mainFrame.waitForSelector(
      ".se-section-documentTitle, [contenteditable='true']",
      { timeout: 20000 }
    );
    await page.waitForTimeout(1000);

    // ── 4. 팝업 닫기 ──
    await closePopups(mainFrame);

    // ── 5. 제목 입력 ──
    await mainFrame.locator(".se-section-documentTitle").first().click();
    await page.waitForTimeout(500);
    await typeChars(page, title);
    await page.waitForTimeout(500);

    // ── 6. 본문 클릭 후 이미지 → 텍스트 순서로 입력 ──
    await mainFrame.locator(".se-section-text").first().click();
    await page.waitForTimeout(500);

    const validImages = (imagePaths ?? []).filter((p) => fs.existsSync(p));
    for (const imgPath of validImages) {
      await uploadImageToEditor(mainFrame, page, imgPath);
      await page.keyboard.press("Enter");
      await page.waitForTimeout(400);
    }

    await typeContent(page, content);
    await page.waitForTimeout(1000);

    // ── 7. 태그 입력 ──
    await inputTags(mainFrame, page, tags);

    // ── 8. 발행 버튼 클릭 ──
    const publishBtn = await mainFrame
      .locator(".publish_btn__m9KHH")
      .first()
      .elementHandle({ timeout: 10000 });

    if (!publishBtn) throw new Error("발행 버튼(.publish_btn__m9KHH)을 찾을 수 없습니다.");
    await mainFrame.evaluate((el) => (el as HTMLElement).click(), publishBtn);
    console.log("[Naver] 발행 버튼 클릭 완료");
    await page.waitForTimeout(2500);

    // ── 9. 발행 옵션 처리 ──
    const postUrl = await handlePublishOptions(page, context);
    return postUrl;
  } finally {
    await browser.close();
  }
}

// ─────────────────────────────────────────
// 이미지 업로드 (naverpost upload_image_to_editor 포팅)
// ─────────────────────────────────────────

async function uploadImageToEditor(mainFrame: Frame, page: Page, imagePath: string): Promise<void> {
  const absPath = path.resolve(imagePath);
  console.log(`[Naver] 이미지 업로드: ${path.basename(absPath)}`);

  // 방법 1: iframe 내 숨겨진 file input에 직접 주입 (naverpost 방식 1)
  try {
    const fileInputs = await mainFrame.locator("input[type='file']").all();
    for (const input of fileInputs) {
      try {
        await input.setInputFiles(absPath);
        await page.waitForTimeout(3000);
        console.log("[Naver] 이미지 업로드 완료 (숨겨진 input)");
        return;
      } catch { continue; }
    }
  } catch { /* 다음 방법으로 */ }

  // 방법 2: 이미지 툴바 버튼 클릭 후 file input (naverpost 방식 2)
  const imgBtnSelectors = [
    "button[data-name='image']",
    ".se-toolbar-button-image",
    "button[class*='image']",
    "button[aria-label*='이미지']",
  ];

  for (const sel of imgBtnSelectors) {
    try {
      const btn = mainFrame.locator(sel).first();
      if (await btn.isVisible({ timeout: 1500 })) {
        await mainFrame.evaluate((el) => (el as HTMLElement).click(), await btn.elementHandle());
        await page.waitForTimeout(1500);

        const fileInput = mainFrame.locator("input[type='file']").first();
        await fileInput.setInputFiles(absPath);
        await page.waitForTimeout(3000);
        console.log(`[Naver] 이미지 업로드 완료 (버튼 클릭: ${sel})`);
        return;
      }
    } catch { continue; }
  }

  // 방법 3: page 컨텍스트에서 file input 찾기 (iframe 밖에서 나타나는 경우)
  try {
    const fileInput = page.locator("input[type='file']").first();
    if (await fileInput.isVisible({ timeout: 1000 }).catch(() => false)) {
      await fileInput.setInputFiles(absPath);
      await page.waitForTimeout(3000);
      console.log("[Naver] 이미지 업로드 완료 (page 컨텍스트)");
      return;
    }
  } catch { /* ignore */ }

  console.warn("[Naver] 이미지 업로드 실패 — 텍스트만 포스팅 계속");
}

// ─────────────────────────────────────────
// 인증 함수들
// ─────────────────────────────────────────

async function loginWithCookies(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  context: any,
  page: Page,
  cookiesJson: string,
  blogId: string
): Promise<void> {
  let cookies: Cookie[];
  try {
    cookies = JSON.parse(cookiesJson) as Cookie[];
  } catch {
    throw new Error("NAVER_COOKIES 환경변수가 올바른 JSON 형식이 아닙니다.");
  }

  await context.addCookies(cookies);
  console.log(`[Naver] 쿠키 ${cookies.length}개 주입 완료`);

  await page.goto("https://www.naver.com", { waitUntil: "domcontentloaded", timeout: 20000 });
  await page.waitForTimeout(1500);

  const afterUrl = page.url();
  const isLoginPage =
    afterUrl.includes("nidlogin") ||
    afterUrl.includes("login.naver") ||
    afterUrl.includes("nid.naver.com/user2/help");

  if (isLoginPage) {
    throw new Error(
      "NAVER_COOKIES가 만료되었습니다. 로컬에서 'npx tsx scripts/extract-naver-cookies.ts'를 다시 실행해 쿠키를 갱신하세요."
    );
  }
  console.log(`[Naver] 쿠키 인증 성공 (blogId: ${blogId})`);
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

async function typeChars(page: Page, text: string): Promise<void> {
  for (const char of text) {
    await page.keyboard.type(char, { delay: 30 });
  }
}

async function typeContent(page: Page, text: string): Promise<void> {
  const lines = text.split("\n");
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].length > 0) await typeChars(page, lines[i]);
    if (i < lines.length - 1) {
      await page.keyboard.press("Enter");
      await page.waitForTimeout(30);
    }
  }
}

async function inputTags(frame: Frame, page: Page, tags: string[]): Promise<void> {
  try {
    const tagEl = frame.locator(".se-tag-input input, input[placeholder*='태그']").first();
    if (await tagEl.isVisible({ timeout: 2000 }).catch(() => false)) {
      for (const tag of tags.slice(0, 5)) {
        await tagEl.fill(tag);
        await page.keyboard.press("Enter");
        await page.waitForTimeout(300);
      }
    }
  } catch { /* 태그란 없으면 건너뜀 */ }
}

async function handlePublishOptions(
  page: Page,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  context: any
): Promise<string> {
  let targetPage: Page = page;
  try {
    const newPagePromise = context.waitForEvent("page", { timeout: 5000 }) as Promise<Page>;
    const newPage = await newPagePromise;
    await newPage.waitForLoadState("domcontentloaded");
    targetPage = newPage;
    console.log("[Naver] 발행 옵션 새 창 감지");
  } catch {
    console.log("[Naver] 현재 창에서 발행 옵션 처리");
  }

  await targetPage.waitForTimeout(1500);

  let optionFrame: Page | Frame = targetPage;
  try {
    const iframes = targetPage.frames();
    const candidate = iframes.find((f) => f !== targetPage.mainFrame() && f.url() !== "about:blank");
    if (candidate) optionFrame = candidate;
  } catch { /* ignore */ }

  try {
    await (optionFrame as Frame).locator("label[for='radio_time1']").first().click({ timeout: 5000 });
    console.log("[Naver] 현재 발행 라디오 선택");
    await targetPage.waitForTimeout(500);
  } catch {
    console.log("[Naver] 발행 라디오 버튼 없음 — 건너뜀");
  }

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
// 이미지 다운로드 (Pexels API)
// ─────────────────────────────────────────

export async function downloadTopicImage(topic: string, pexelsApiKey: string): Promise<string | null> {
  try {
    const query = encodeURIComponent(topic + " taiwan business");
    const res = await fetch(`https://api.pexels.com/v1/search?query=${query}&per_page=5&orientation=landscape`, {
      headers: { Authorization: pexelsApiKey },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;

    const data = await res.json() as { photos?: Array<{ src: { landscape: string } }> };
    const imageUrl = data.photos?.[0]?.src?.landscape;
    if (!imageUrl) return null;

    const imgRes = await fetch(imageUrl, { signal: AbortSignal.timeout(15000) });
    if (!imgRes.ok) return null;

    const buffer = Buffer.from(await imgRes.arrayBuffer());
    const tmpPath = path.join(os.tmpdir(), `tianxia-img-${Date.now()}.jpg`);
    fs.writeFileSync(tmpPath, buffer);
    console.log(`[Image] 다운로드 완료: ${path.basename(tmpPath)}`);
    return tmpPath;
  } catch (e) {
    console.warn(`[Image] 다운로드 실패: ${e instanceof Error ? e.message : e}`);
    return null;
  }
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
