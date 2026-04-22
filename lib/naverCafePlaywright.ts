import { chromium, type Cookie, type Page, type Frame } from "playwright";
import * as fs from "fs";
import * as path from "path";

export type CafeBoardKey = "자유게시판" | "디카드" | "쓰레드" | "인스타그램유튜브";

export const CAFE_BOARDS: Record<CafeBoardKey, { menuId: string; label: string }> = {
  자유게시판:    { menuId: "1",  label: "자유게시판" },
  디카드:        { menuId: "6",  label: "디카드" },
  쓰레드:        { menuId: "21", label: "쓰레드" },
  인스타그램유튜브: { menuId: "23", label: "인스타그램/유튜브" },
};

const CAFE_CLUB_ID = "28285803";
const CAFE_URL_ID  = "hdhshjsjsj";

/**
 * 네이버 카페 자동 포스팅 (Playwright)
 *
 * 인증 우선순위:
 *  1. NAVER_COOKIES 환경변수 (쿠키 주입)
 *  2. ID/PW 로그인
 */
export async function postToNaverCafe(
  naverId: string,
  naverPw: string,
  boardKey: CafeBoardKey,
  title: string,
  content: string,
  imagePaths?: string[]
): Promise<string> {
  title   = (title   && title   !== "undefined") ? title   : "자동 포스팅";
  content = (content && content !== "undefined") ? content : "";

  const board = CAFE_BOARDS[boardKey];
  if (!board) throw new Error(`알 수 없는 게시판: ${boardKey}`);

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
    Object.defineProperty(navigator, "plugins",   { get: () => [1, 2, 3, 4, 5] });
    Object.defineProperty(navigator, "languages", { get: () => ["ko-KR", "ko"] });
    (window as unknown as Record<string, unknown>)["chrome"] = { runtime: {} };
  });

  const page = await context.newPage();

  try {
    // ── 1. 인증 ──
    if (cookiesJson) {
      await loginWithCookies(context, page, cookiesJson);
    } else {
      await loginWithCredentials(page, naverId, naverPw);
    }

    // ── 2. 카페 글쓰기 페이지로 이동 ──
    const writeUrl = `https://cafe.naver.com/ArticleWrite.nhn?clubid=${CAFE_CLUB_ID}&menuid=${board.menuId}`;
    console.log(`[Cafe] 글쓰기 페이지: ${writeUrl}`);

    await page.goto(writeUrl, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForTimeout(3000);

    // 로그인 페이지로 리다이렉트됐는지 확인
    if (page.url().includes("nidlogin") || page.url().includes("login.naver")) {
      throw new Error("카페 글쓰기 접근 실패 — 로그인이 필요합니다. 쿠키를 갱신하세요.");
    }

    // ── 3. 에디터 진입 (iframe 또는 직접) ──
    const editorFrame = await getEditorFrame(page);

    // ── 4. 제목 입력 ──
    await inputTitle(editorFrame, page, title);

    // ── 5. 본문 입력 (이미지 포함) ──
    const validImages = (imagePaths ?? []).filter((p) => fs.existsSync(p));
    await inputBody(editorFrame, page, content, validImages);

    // ── 6. 등록/발행 버튼 클릭 ──
    const postUrl = await submitPost(page, editorFrame, context);

    console.log(`[Cafe] 게시 완료: ${postUrl}`);
    return postUrl;
  } finally {
    await browser.close();
  }
}

// ─────────────────────────────────────────
// 인증
// ─────────────────────────────────────────

async function loginWithCookies(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  context: any,
  page: Page,
  cookiesJson: string
): Promise<void> {
  let cookies: Cookie[];
  try {
    cookies = JSON.parse(cookiesJson) as Cookie[];
  } catch {
    throw new Error("NAVER_COOKIES 환경변수가 올바른 JSON 형식이 아닙니다.");
  }

  await context.addCookies(cookies);
  console.log(`[Cafe] 쿠키 ${cookies.length}개 주입 완료`);

  await page.goto("https://www.naver.com", { waitUntil: "domcontentloaded", timeout: 20000 });
  await page.waitForTimeout(1500);

  const afterUrl = page.url();
  if (afterUrl.includes("nidlogin") || afterUrl.includes("login.naver")) {
    throw new Error(
      "NAVER_COOKIES가 만료됐습니다. 로컬에서 'npx tsx scripts/extract-naver-cookies.ts'를 다시 실행하세요."
    );
  }
  console.log("[Cafe] 쿠키 인증 성공");
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
      "네이버 로그인 실패 — IP 차단 가능성.\n" +
      "해결: 로컬에서 'npx tsx scripts/extract-naver-cookies.ts' 후 NAVER_COOKIES 환경변수 설정"
    );
  }
  console.log("[Cafe] 로그인 완료");
}

// ─────────────────────────────────────────
// 에디터 프레임 탐색
// ─────────────────────────────────────────

type FrameOrPage = Page | Frame;

async function getEditorFrame(page: Page): Promise<FrameOrPage> {
  // Smart Editor One이 로드되길 기다림
  await page.waitForTimeout(2000);

  // 카페 글쓰기는 iframe 내부에 에디터가 있을 수 있음 (cafe_main 등)
  const cafeFrameSelectors = ["#cafe_main", "#ArticleWriteFrame", "#writeFrame"];
  for (const sel of cafeFrameSelectors) {
    const frameEl = await page.$(sel);
    if (frameEl) {
      const frame = await frameEl.contentFrame();
      if (frame) {
        // Smart Editor가 있는지 확인
        const hasEditor = await frame.$(
          ".se-section-documentTitle, .se-placeholder, [contenteditable='true']"
        ).catch(() => null);
        if (hasEditor) {
          console.log(`[Cafe] 에디터 iframe 발견: ${sel}`);
          return frame;
        }
      }
    }
  }

  // iframe이 없으면 page에서 직접 Smart Editor를 찾음
  const hasDirectEditor = await page.$(
    ".se-section-documentTitle, .se-placeholder, [contenteditable='true']"
  ).catch(() => null);
  if (hasDirectEditor) {
    console.log("[Cafe] 직접 에디터 발견 (iframe 없음)");
    return page;
  }

  // 페이지 내 모든 iframe 중 에디터가 있는 것 찾기
  const frames = page.frames();
  for (const frame of frames) {
    if (frame === page.mainFrame()) continue;
    const hasEditor = await frame.$(
      ".se-section-documentTitle, .se-placeholder, [contenteditable='true']"
    ).catch(() => null);
    if (hasEditor) {
      console.log(`[Cafe] 에디터 iframe 발견: ${frame.url()}`);
      return frame;
    }
  }

  // 마지막 수단: 새 Smart Editor One URL 패턴 기다리기
  await page.waitForSelector(
    ".se-section-documentTitle, #subject, input[name='subject']",
    { timeout: 15000 }
  );
  return page;
}

// ─────────────────────────────────────────
// 제목 입력
// ─────────────────────────────────────────

async function inputTitle(frame: FrameOrPage, page: Page, title: string): Promise<void> {
  // Smart Editor One 제목
  const seTitle = (frame as Frame).locator(".se-section-documentTitle").first();
  if (await seTitle.isVisible({ timeout: 3000 }).catch(() => false)) {
    await seTitle.click();
    await page.waitForTimeout(300);
    await typeChars(page, title);
    console.log("[Cafe] SE1 제목 입력 완료");
    return;
  }

  // 일반 input 제목 (#subject 또는 name="subject")
  for (const sel of ["#subject", "input[name='subject']", "input[placeholder*='제목']"]) {
    const el = (frame as Frame).locator(sel).first();
    if (await el.isVisible({ timeout: 2000 }).catch(() => false)) {
      await el.fill(title);
      console.log(`[Cafe] 제목 입력 완료 (${sel})`);
      return;
    }
  }

  throw new Error("[Cafe] 제목 입력 필드를 찾을 수 없습니다.");
}

// ─────────────────────────────────────────
// 본문 입력
// ─────────────────────────────────────────

async function inputBody(
  frame: FrameOrPage,
  page: Page,
  content: string,
  validImages: string[]
): Promise<void> {
  // Smart Editor One 본문 영역 클릭
  const seText = (frame as Frame).locator(".se-section-text").first();
  if (await seText.isVisible({ timeout: 3000 }).catch(() => false)) {
    await seText.click();
    await page.waitForTimeout(300);
  } else {
    // 일반 textarea
    const textarea = (frame as Frame).locator("textarea[name='content'], #content").first();
    if (await textarea.isVisible({ timeout: 2000 }).catch(() => false)) {
      await textarea.fill(content);
      console.log("[Cafe] textarea 본문 입력 완료");
      return;
    }
  }

  if (validImages.length === 0) {
    await typeContent(page, content);
  } else {
    const paragraphs = content.split(/\n\n+/).filter((p) => p.trim().length > 0);
    const sections = splitIntoSections(paragraphs, validImages.length);

    for (let i = 0; i < validImages.length; i++) {
      await uploadImage(frame, page, validImages[i]);
      await page.keyboard.press("Enter");
      await page.waitForTimeout(400);

      if (sections[i].length > 0) {
        await typeContent(page, sections[i].join("\n\n"));
        await page.keyboard.press("Enter");
        await page.keyboard.press("Enter");
        await page.waitForTimeout(300);
      }
    }
  }

  console.log("[Cafe] 본문 입력 완료");
}

// ─────────────────────────────────────────
// 이미지 업로드
// ─────────────────────────────────────────

async function uploadImage(frame: FrameOrPage, page: Page, imagePath: string): Promise<void> {
  const absPath = path.resolve(imagePath);
  console.log(`[Cafe] 이미지 업로드: ${path.basename(absPath)}`);

  // 방법 1: iframe 내 숨겨진 file input
  try {
    const fileInputs = await (frame as Frame).locator("input[type='file']").all();
    for (const input of fileInputs) {
      try {
        await input.setInputFiles(absPath);
        await page.waitForTimeout(3000);
        console.log("[Cafe] 이미지 업로드 완료 (숨겨진 input)");
        return;
      } catch { continue; }
    }
  } catch { /* 다음 방법 */ }

  // 방법 2: 이미지 툴바 버튼
  const imgBtnSelectors = [
    "button[data-name='image']",
    ".se-toolbar-button-image",
    "button[class*='image']",
    "button[aria-label*='이미지']",
  ];
  for (const sel of imgBtnSelectors) {
    try {
      const btn = (frame as Frame).locator(sel).first();
      if (await btn.isVisible({ timeout: 1500 })) {
        await btn.click();
        await page.waitForTimeout(1500);
        const fileInput = (frame as Frame).locator("input[type='file']").first();
        await fileInput.setInputFiles(absPath);
        await page.waitForTimeout(3000);
        console.log(`[Cafe] 이미지 업로드 완료 (버튼: ${sel})`);
        return;
      }
    } catch { continue; }
  }

  // 방법 3: page 컨텍스트
  try {
    const fileInput = page.locator("input[type='file']").first();
    if (await fileInput.isVisible({ timeout: 1000 }).catch(() => false)) {
      await fileInput.setInputFiles(absPath);
      await page.waitForTimeout(3000);
      console.log("[Cafe] 이미지 업로드 완료 (page 컨텍스트)");
      return;
    }
  } catch { /* ignore */ }

  console.warn("[Cafe] 이미지 업로드 실패 — 텍스트만 계속");
}

// ─────────────────────────────────────────
// 게시 제출
// ─────────────────────────────────────────

async function submitPost(
  page: Page,
  frame: FrameOrPage,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  context: any
): Promise<string> {
  // Smart Editor One 발행 버튼 (블로그와 동일한 클래스)
  const sePublishSelectors = [
    ".publish_btn__m9KHH",
    "button[data-testid='seOnePublishBtn']",
    "button.publish_btn",
  ];
  for (const sel of sePublishSelectors) {
    try {
      const btn = (frame as Frame).locator(sel).first();
      if (await btn.isVisible({ timeout: 2000 })) {
        await btn.click();
        console.log(`[Cafe] SE1 발행 버튼 클릭: ${sel}`);
        await page.waitForTimeout(2500);
        return await handleAfterSubmit(page, context);
      }
    } catch { continue; }
  }

  // 일반 등록 버튼 (page 레벨 — 카페 구형 에디터)
  const registerSelectors = [
    "button:has-text('등록')",
    "input[value='등록']",
    "a:has-text('등록')",
    "#btn_upload",
    ".btn_register",
    "button[type='submit']",
  ];
  for (const sel of registerSelectors) {
    try {
      const btn = page.locator(sel).first();
      if (await btn.isVisible({ timeout: 2000 })) {
        await btn.click();
        console.log(`[Cafe] 등록 버튼 클릭: ${sel}`);
        await page.waitForTimeout(2500);
        return await handleAfterSubmit(page, context);
      }
    } catch { continue; }
  }

  throw new Error("[Cafe] 등록/발행 버튼을 찾을 수 없습니다.");
}

async function handleAfterSubmit(
  page: Page,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  context: any
): Promise<string> {
  // 새 창이 열리는 경우 (Smart Editor One 발행 옵션 팝업)
  try {
    const newPagePromise = context.waitForEvent("page", { timeout: 4000 }) as Promise<Page>;
    const newPage = await newPagePromise;
    await newPage.waitForLoadState("domcontentloaded");

    // 최종 발행 버튼
    for (const sel of [
      "button[data-testid='seOnePublishBtn']",
      "button:has-text('발행')",
      "button:has-text('등록')",
    ]) {
      try {
        const btn = newPage.locator(sel).first();
        if (await btn.isVisible({ timeout: 3000 })) {
          await btn.click();
          await newPage.waitForLoadState("networkidle", { timeout: 20000 }).catch(() => null);
          await newPage.waitForTimeout(2000);
          return newPage.url();
        }
      } catch { continue; }
    }
    return newPage.url();
  } catch {
    // 새 창 없음 — 현재 페이지에서 완료 대기
  }

  await page.waitForLoadState("networkidle", { timeout: 20000 }).catch(() => null);
  await page.waitForTimeout(2000);

  // 게시 후 카페 URL로 이동됐는지 확인
  const finalUrl = page.url();
  if (finalUrl.includes("cafe.naver.com")) {
    return finalUrl;
  }

  return `https://cafe.naver.com/${CAFE_URL_ID}`;
}

// ─────────────────────────────────────────
// 유틸
// ─────────────────────────────────────────

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

function splitIntoSections(paragraphs: string[], count: number): string[][] {
  const sections: string[][] = Array.from({ length: count }, () => []);
  if (paragraphs.length === 0) return sections;
  const perSection = Math.ceil(paragraphs.length / count);
  paragraphs.forEach((p, i) => {
    const idx = Math.min(Math.floor(i / perSection), count - 1);
    sections[idx].push(p);
  });
  return sections;
}

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
