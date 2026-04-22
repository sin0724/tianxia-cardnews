import { chromium, type Cookie, type Page, type Frame } from "playwright";
import * as fs from "fs";
import * as path from "path";

export type CafeBoardKey = "자유게시판" | "디카드" | "쓰레드" | "인스타그램유튜브";

export const CAFE_BOARDS: Record<CafeBoardKey, { menuId: string; label: string }> = {
  자유게시판:       { menuId: "1",  label: "자유게시판" },
  디카드:           { menuId: "6",  label: "디카드" },
  쓰레드:           { menuId: "21", label: "쓰레드" },
  인스타그램유튜브: { menuId: "23", label: "인스타그램/유튜브" },
};

const CAFE_CLUB_ID = "28285803";
const CAFE_URL_ID  = "hdhshjsjsj";

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

    // ── 2. 게시판 페이지로 이동 후 글쓰기 버튼 클릭 ──
    const boardUrl = `https://cafe.naver.com/f-e/cafes/${CAFE_CLUB_ID}/menus/${board.menuId}`;
    console.log(`[Cafe] 게시판 이동: ${boardUrl}`);
    await page.goto(boardUrl, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForTimeout(3000);

    if (page.url().includes("nidlogin") || page.url().includes("login.naver")) {
      throw new Error("카페 접근 실패 — 로그인이 필요합니다. 쿠키를 갱신하세요.");
    }

    // 확인된 write URL로 직접 이동
    const writeUrl = `https://cafe.naver.com/ca-fe/cafes/${CAFE_CLUB_ID}/menus/${board.menuId}/articles/write?boardType=L`;
    console.log(`[Cafe] write URL 이동: ${writeUrl}`);
    await page.goto(writeUrl, { waitUntil: "domcontentloaded", timeout: 30000 });

    // React + Smart Editor 렌더링 대기
    await page.waitForTimeout(5000);
    const currentUrl = page.url();
    const allFrames = page.frames().map((f) => f.url().slice(0, 80));
    const bodyText = await page.evaluate(() => document.body?.innerText?.slice(0, 300) ?? "").catch(() => "");
    console.log(`[Cafe] URL: ${currentUrl}`);
    console.log(`[Cafe] 프레임(${allFrames.length}): ${JSON.stringify(allFrames)}`);
    console.log(`[Cafe] body: ${bodyText.replace(/\s+/g, " ").slice(0, 200)}`);

    // ── 3. 에디터 진입 ──
    const editorFrame = await getEditorFrame(page);

    // ── 5. 팝업 닫기 ──
    await closePopups(editorFrame, page);

    // ── 6. 제목 입력 ──
    await inputTitle(editorFrame, page, title);

    // ── 7. 본문 입력 ──
    const validImages = (imagePaths ?? []).filter((p) => fs.existsSync(p));
    await inputBody(editorFrame, page, content, validImages);

    // ── 8. 등록 버튼 ──
    return await submitPost(page, editorFrame, context);
  } finally {
    await browser.close();
  }
}

// ─────────────────────────────────────────
// 에디터 프레임 탐색 — #cafe_main 우선
// ─────────────────────────────────────────

type FrameOrPage = Page | Frame;

async function getEditorFrame(page: Page): Promise<FrameOrPage> {
  console.log("[Cafe] 에디터 탐색 중...");

  // 최대 20초간 폴링 — textarea.textarea_input (카페 신 에디터 제목 필드)
  const deadline = Date.now() + 20000;
  while (Date.now() < deadline) {
    await page.waitForTimeout(1200);

    const titleEl = await page.$("textarea.textarea_input").catch(() => null);
    if (titleEl) {
      const visible = await titleEl.isVisible().catch(() => false);
      if (visible) {
        console.log("[Cafe] 에디터 로드 확인 (textarea.textarea_input)");
        return page;
      }
    }

    // 구형 폼: #subject
    const subjectEl = await page.$("#subject, input[name='subject']").catch(() => null);
    if (subjectEl) {
      console.log("[Cafe] 구형 에디터 감지 (#subject)");
      return page;
    }
  }

  const os = require("os") as typeof import("os");
  const snap = require("path").join(os.tmpdir(), "cafe-debug-fail.png");
  await page.screenshot({ path: snap, fullPage: true }).catch(() => null);
  console.log(`[Cafe] 실패 스크린샷: ${snap}`);

  throw new Error("[Cafe] 에디터를 찾을 수 없습니다.");
}

// ─────────────────────────────────────────
// 팝업 닫기
// ─────────────────────────────────────────

async function closePopups(frame: FrameOrPage, page: Page): Promise<void> {
  const selectors = [
    ".se-popup-button-cancel",
    ".se-help-panel-close-button",
    "button:has-text('확인')",
    ".btn_cancel",
  ];
  for (const sel of selectors) {
    try {
      const el = (frame as Frame).locator(sel).first();
      if (await el.isVisible({ timeout: 1500 })) {
        await el.click();
        await page.waitForTimeout(500);
      }
    } catch { /* 없으면 건너뜀 */ }
  }
}

// ─────────────────────────────────────────
// 제목 입력
// ─────────────────────────────────────────

async function inputTitle(frame: FrameOrPage, page: Page, title: string): Promise<void> {
  await page.waitForTimeout(800);

  // 카페 신 에디터 — textarea.textarea_input
  try {
    const el = page.locator("textarea.textarea_input").first();
    if (await el.isVisible({ timeout: 3000 })) {
      await el.click();
      await page.waitForTimeout(200);
      await el.fill(title);
      console.log("[Cafe] 제목 입력 완료 (textarea.textarea_input)");
      return;
    }
  } catch { /* 다음 */ }

  // 구형 input 제목
  const inputSelectors = [
    "#subject",
    "input[name='subject']",
    "input[placeholder*='제목']",
  ];
  for (const sel of inputSelectors) {
    try {
      const el = (frame as Frame).locator(sel).first();
      if (await el.isVisible({ timeout: 2000 })) {
        await el.fill(title);
        console.log(`[Cafe] 구형 제목 입력: ${sel}`);
        return;
      }
    } catch { /* 다음 */ }
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
  // 카페 신 에디터 — .se-component-content 또는 .se-placeholder 클릭 후 타이핑
  const seBodySelectors = [
    ".se-component-content",
    ".se-section-text",
    ".se-placeholder",
  ];
  for (const sel of seBodySelectors) {
    try {
      const el = page.locator(sel).first();
      if (await el.isVisible({ timeout: 3000 })) {
        await el.click();
        await page.waitForTimeout(400);
        if (validImages.length === 0) {
          await typeContent(page, content);
        } else {
          await typeWithImages(frame, page, content, validImages);
        }
        console.log(`[Cafe] 본문 입력 완료 (${sel})`);
        return;
      }
    } catch { /* 다음 */ }
  }

  // 구형 textarea
  const textareaSelectors = [
    "textarea[name='body']",
    "textarea[name='content']",
    "#body",
    "#content",
    "textarea.write_body",
  ];
  for (const sel of textareaSelectors) {
    try {
      const el = (frame as Frame).locator(sel).first();
      if (await el.isVisible({ timeout: 2000 })) {
        await el.fill(content);
        console.log(`[Cafe] textarea 본문 입력: ${sel}`);
        return;
      }
    } catch { /* 다음 */ }
  }

  console.warn("[Cafe] 본문 입력 필드를 찾지 못했습니다 — 등록 시도 계속");
}

async function typeWithImages(
  frame: FrameOrPage,
  page: Page,
  content: string,
  validImages: string[]
): Promise<void> {
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

// ─────────────────────────────────────────
// 이미지 업로드
// ─────────────────────────────────────────

async function uploadImage(frame: FrameOrPage, page: Page, imagePath: string): Promise<void> {
  const absPath = path.resolve(imagePath);
  console.log(`[Cafe] 이미지 업로드: ${path.basename(absPath)}`);

  // 방법 1: 프레임 내 file input
  try {
    const inputs = await (frame as Frame).locator("input[type='file']").all();
    for (const input of inputs) {
      try {
        await input.setInputFiles(absPath);
        await page.waitForTimeout(3000);
        console.log("[Cafe] 이미지 업로드 완료 (file input)");
        return;
      } catch { continue; }
    }
  } catch { /* 다음 */ }

  // 방법 2: 이미지 버튼 클릭
  const imgBtns = [
    "button[data-name='image']",
    ".se-toolbar-button-image",
    "button[class*='image']",
    "button[aria-label*='이미지']",
    "a.tool_image",
  ];
  for (const sel of imgBtns) {
    try {
      const btn = (frame as Frame).locator(sel).first();
      if (await btn.isVisible({ timeout: 1500 })) {
        await btn.click();
        await page.waitForTimeout(1500);
        const fi = (frame as Frame).locator("input[type='file']").first();
        await fi.setInputFiles(absPath);
        await page.waitForTimeout(3000);
        console.log(`[Cafe] 이미지 업로드 완료 (버튼: ${sel})`);
        return;
      }
    } catch { continue; }
  }

  // 방법 3: page 레벨
  try {
    const fi = page.locator("input[type='file']").first();
    if (await fi.isVisible({ timeout: 1000 }).catch(() => false)) {
      await fi.setInputFiles(absPath);
      await page.waitForTimeout(3000);
      console.log("[Cafe] 이미지 업로드 완료 (page 레벨)");
      return;
    }
  } catch { /* ignore */ }

  console.warn("[Cafe] 이미지 업로드 실패 — 텍스트만 계속");
}

// ─────────────────────────────────────────
// 등록 제출
// ─────────────────────────────────────────

async function submitPost(
  page: Page,
  frame: FrameOrPage,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  context: any
): Promise<string> {
  await page.waitForTimeout(500);

  // Smart Editor One 발행 버튼
  const sePublish = [
    ".publish_btn__m9KHH",
    "button[data-testid='seOnePublishBtn']",
    "button.publish_btn",
  ];
  for (const sel of sePublish) {
    try {
      const btn = (frame as Frame).locator(sel).first();
      if (await btn.isVisible({ timeout: 2000 })) {
        await btn.click();
        console.log(`[Cafe] SE1 발행 버튼: ${sel}`);
        await page.waitForTimeout(2500);
        return await handleAfterSubmit(page, context);
      }
    } catch { continue; }
  }

  // 구형 등록 버튼 (프레임 내)
  const registerInFrame = [
    "input[type='submit']",
    "button[type='submit']",
    "#btn_upload",
    "a.btn_write",
    "button:text-is('등록')",
    "input[value='등록']",
  ];
  for (const sel of registerInFrame) {
    try {
      const btn = (frame as Frame).locator(sel).first();
      if (await btn.isVisible({ timeout: 2000 })) {
        await btn.click();
        console.log(`[Cafe] 프레임 내 등록 버튼: ${sel}`);
        await page.waitForTimeout(2500);
        return await handleAfterSubmit(page, context);
      }
    } catch { continue; }
  }

  // page 레벨 등록 버튼 (카페 신 에디터 포함) — "임시등록"과 구분
  const registerInPage = [
    "a.BaseButton--skinGreen",       // 카페 신 에디터 등록 버튼
    ".publish_btn",
    "button[class*='publish']",
    "button:text-is('등록')",
    "input[value='등록']",
    "a:text-is('등록')",
    "button[type='submit']",
  ];
  for (const sel of registerInPage) {
    try {
      const btn = page.locator(sel).first();
      if (await btn.isVisible({ timeout: 2000 })) {
        await btn.click();
        console.log(`[Cafe] page 레벨 등록 버튼: ${sel}`);
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
  // Smart Editor One 발행 확인 팝업 (새 창)
  try {
    const newPagePromise = context.waitForEvent("page", { timeout: 3000 }) as Promise<Page>;
    const newPage = await newPagePromise;
    await newPage.waitForLoadState("domcontentloaded");
    for (const sel of ["button[data-testid='seOnePublishBtn']", "button:has-text('발행')", "button:has-text('등록')"]) {
      try {
        const btn = newPage.locator(sel).first();
        if (await btn.isVisible({ timeout: 3000 })) {
          await btn.click();
          break;
        }
      } catch { continue; }
    }
    await newPage.waitForLoadState("networkidle", { timeout: 20000 }).catch(() => null);
    await newPage.waitForTimeout(2000);
    return newPage.url();
  } catch { /* 새 창 없음 */ }

  // URL 이 write 페이지에서 벗어날 때까지 최대 10초 대기
  const writePattern = /\/articles\/write/;
  const deadline = Date.now() + 10000;
  while (Date.now() < deadline) {
    await page.waitForTimeout(1000);
    const u = page.url();
    if (!writePattern.test(u) && u.includes("cafe.naver.com")) {
      console.log(`[Cafe] 발행 후 이동: ${u}`);
      return u;
    }
  }

  await page.waitForLoadState("networkidle", { timeout: 10000 }).catch(() => null);
  const finalUrl = page.url();
  if (finalUrl.includes("cafe.naver.com")) return finalUrl;
  return `https://cafe.naver.com/${CAFE_URL_ID}`;
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
  console.log(`[Cafe] 쿠키 ${cookies.length}개 주입`);
  await page.goto("https://www.naver.com", { waitUntil: "domcontentloaded", timeout: 20000 });
  await page.waitForTimeout(1500);
  const url = page.url();
  if (url.includes("nidlogin") || url.includes("login.naver")) {
    throw new Error("NAVER_COOKIES가 만료됐습니다. 'npx tsx scripts/extract-naver-cookies.ts'로 갱신하세요.");
  }
  console.log("[Cafe] 쿠키 인증 성공");
}

async function loginWithCredentials(page: Page, naverId: string, naverPw: string): Promise<void> {
  await page.goto("https://nid.naver.com/nidlogin.login?mode=form", {
    waitUntil: "domcontentloaded", timeout: 20000,
  });
  await page.waitForTimeout(1500);
  await fillNaverInput(page, "#id", naverId);
  await page.waitForTimeout(400);
  await fillNaverInput(page, "#pw", naverPw);
  await page.waitForTimeout(400);
  await page.click('[id="log.login"]').catch(() => page.click(".btn_login"));
  await page.waitForNavigation({ waitUntil: "networkidle", timeout: 20000 });
  if (page.url().includes("nidlogin") || page.url().includes("login.naver")) {
    throw new Error("네이버 로그인 실패 — IP 차단 가능. NAVER_COOKIES 방식을 사용하세요.");
  }
  console.log("[Cafe] 로그인 완료");
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
