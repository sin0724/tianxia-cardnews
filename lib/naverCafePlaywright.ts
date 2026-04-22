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

    // 글쓰기 버튼 대기 후 클릭
    const writeBtnSelectors = [
      "a:has-text('글쓰기')",
      "button:has-text('글쓰기')",
      ".write_btn",
      "a.btn_write",
      "[class*='WriteButton']",
      "[class*='write_btn']",
      "a[href*='write']",
    ];
    let writeClicked = false;
    for (const sel of writeBtnSelectors) {
      try {
        await page.waitForSelector(sel, { timeout: 4000 });
        const btns = await page.locator(sel).all();
        for (const btn of btns) {
          if (await btn.isVisible()) {
            await btn.click();
            console.log(`[Cafe] 글쓰기 버튼 클릭: ${sel}`);
            writeClicked = true;
            break;
          }
        }
        if (writeClicked) break;
      } catch { continue; }
    }

    if (!writeClicked) {
      // 글쓰기 버튼 못 찾으면 SPA write URL 직접 이동
      const writeUrl = `https://cafe.naver.com/f-e/cafes/${CAFE_CLUB_ID}/write?menuId=${board.menuId}&boardType=L`;
      console.log(`[Cafe] 글쓰기 버튼 없음 — 직접 이동: ${writeUrl}`);
      await page.goto(writeUrl, { waitUntil: "domcontentloaded", timeout: 30000 });
    }

    // React SPA 렌더링 완료 대기
    await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => null);
    await page.waitForTimeout(4000);

    // 디버그: 스크린샷 + 로그
    const os = require("os") as typeof import("os");
    const debugPath = require("path").join(os.tmpdir(), "cafe-debug.png");
    await page.screenshot({ path: debugPath, fullPage: true });
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
  // networkidle 대기 (SPA 렌더링 완료)
  await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => null);
  await page.waitForTimeout(2000);

  // ① #cafe_main iframe (네이버 카페 메인 구조)
  try {
    await page.waitForSelector("#cafe_main", { timeout: 8000 });
    const cafeMainEl = await page.$("#cafe_main");
    if (cafeMainEl) {
      const cafeFrame = await cafeMainEl.contentFrame();
      if (cafeFrame) {
        console.log("[Cafe] #cafe_main iframe 진입");
        // iframe 내부 로드 대기
        await cafeFrame.waitForLoadState("domcontentloaded", { timeout: 10000 }).catch(() => null);
        await page.waitForTimeout(2000);

        // Smart Editor One (신형)
        const hasSE1 = await cafeFrame.$(".se-section-documentTitle, .se-placeholder").catch(() => null);
        if (hasSE1) {
          console.log("[Cafe] Smart Editor One 감지");
          return cafeFrame;
        }

        // 구형 폼 에디터 (#subject)
        const hasSubject = await cafeFrame.$("#subject, input[name='subject']").catch(() => null);
        if (hasSubject) {
          console.log("[Cafe] 구형 폼 에디터 감지 (#subject)");
          return cafeFrame;
        }

        // contenteditable 에디터
        const hasEditable = await cafeFrame.$("[contenteditable='true']").catch(() => null);
        if (hasEditable) {
          console.log("[Cafe] contenteditable 에디터 감지");
          return cafeFrame;
        }

        // 에디터를 못 찾아도 #cafe_main 프레임 반환 (추가 대기 후 사용)
        console.log("[Cafe] #cafe_main 내 에디터 직접 미확인 — 프레임 반환");
        return cafeFrame;
      }
    }
  } catch {
    console.log("[Cafe] #cafe_main 없음 — 다른 방법 시도");
  }

  // ② 다른 iframe들 순회 (GNB 더미 제외)
  const frames = page.frames();
  console.log(`[Cafe] 프레임 목록: ${frames.map((f) => f.url().slice(0, 60)).join(" | ")}`);
  for (const frame of frames) {
    if (frame === page.mainFrame()) continue;
    // 0×0 GNB 패딩 iframe 제외
    const frameEl = await frame.frameElement().catch(() => null);
    if (frameEl) {
      const box = await frameEl.boundingBox().catch(() => null);
      if (box && box.width === 0 && box.height === 0) continue;
    }
    const hasEditor = await frame.$(
      ".se-section-documentTitle, #subject, input[name='subject'], [contenteditable='true']"
    ).catch(() => null);
    if (hasEditor) {
      console.log(`[Cafe] 에디터 프레임 발견: ${frame.url().slice(0, 80)}`);
      return frame;
    }
  }

  // ③ page 직접 (iframe 없는 SPA 구조)
  const hasDirectEditor = await page.$(
    ".se-section-documentTitle, #subject, input[name='subject'], [contenteditable='true']"
  ).catch(() => null);
  if (hasDirectEditor) {
    console.log("[Cafe] 직접 에디터 감지 (iframe 없음)");
    return page;
  }

  // ④ 최후 수단: 더 오래 기다리고 더 많은 셀렉터 시도
  console.log("[Cafe] 에디터 장시간 대기 중 (30초)...");
  const broadSelectors = [
    "#cafe_main",
    ".se-section-documentTitle",
    "#subject",
    "input[name='subject']",
    "[contenteditable='true']",
    "input[placeholder*='제목']",
    "textarea[placeholder*='내용']",
    ".write_editor",
    ".editor_wrap",
    "iframe",
  ];
  await page.waitForSelector(broadSelectors.join(", "), { timeout: 30000 });

  // #cafe_main 재시도
  const retryEl = await page.$("#cafe_main");
  if (retryEl) {
    const retryFrame = await retryEl.contentFrame();
    if (retryFrame) return retryFrame;
  }

  // iframe이 1개라도 있으면 진입
  const iframes = page.frames().filter((f) => f !== page.mainFrame());
  for (const f of iframes) {
    const hasEl = await f.$(".se-section-documentTitle, #subject, [contenteditable='true']").catch(() => null);
    if (hasEl) return f;
  }

  return page;
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
  await page.waitForTimeout(1000);

  // Smart Editor One 제목
  const titleSelectors = [
    ".se-section-documentTitle",
    ".se-documentTitle-placeholder",
  ];
  for (const sel of titleSelectors) {
    try {
      const el = (frame as Frame).locator(sel).first();
      if (await el.isVisible({ timeout: 3000 })) {
        await el.click();
        await page.waitForTimeout(300);
        await typeChars(page, title);
        console.log(`[Cafe] SE1 제목 입력: ${sel}`);
        return;
      }
    } catch { /* 다음 */ }
  }

  // 구형 input 제목
  const inputSelectors = [
    "#subject",
    "input[name='subject']",
    "input[placeholder*='제목']",
    "input[class*='title']",
    "input[class*='subject']",
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

  throw new Error("[Cafe] 제목 입력 필드를 찾을 수 없습니다. 카페 에디터 구조를 확인하세요.");
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
  // Smart Editor One 본문
  try {
    const seText = (frame as Frame).locator(".se-section-text").first();
    if (await seText.isVisible({ timeout: 3000 })) {
      await seText.click();
      await page.waitForTimeout(300);
      if (validImages.length === 0) {
        await typeContent(page, content);
      } else {
        await typeWithImages(frame, page, content, validImages);
      }
      console.log("[Cafe] SE1 본문 입력 완료");
      return;
    }
  } catch { /* 다음 */ }

  // Smart Editor 구형 iframe 내 에디터
  try {
    const seFrame = (frame as Frame).frameLocator("iframe[id*='SE2'], iframe[name*='se2']").first();
    const seBody = seFrame.locator("body");
    if (await seBody.isVisible({ timeout: 2000 })) {
      await seBody.click();
      await typeContent(page, content);
      console.log("[Cafe] Smart Editor 2 본문 입력 완료");
      return;
    }
  } catch { /* 다음 */ }

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

  // contenteditable fallback
  try {
    const editable = (frame as Frame).locator("[contenteditable='true']").last();
    if (await editable.isVisible({ timeout: 2000 })) {
      await editable.click();
      await typeContent(page, content);
      console.log("[Cafe] contenteditable 본문 입력");
      return;
    }
  } catch { /* ignore */ }

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
    "button:has-text('등록')",
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

  // page 레벨 등록 버튼
  const registerInPage = [
    "button:has-text('등록')",
    "input[value='등록']",
    "a:has-text('등록')",
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
  // Smart Editor One 발행 확인 팝업
  try {
    const newPagePromise = context.waitForEvent("page", { timeout: 4000 }) as Promise<Page>;
    const newPage = await newPagePromise;
    await newPage.waitForLoadState("domcontentloaded");
    for (const sel of ["button[data-testid='seOnePublishBtn']", "button:has-text('발행')", "button:has-text('등록')"]) {
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
  } catch { /* 새 창 없음 */ }

  await page.waitForLoadState("networkidle", { timeout: 20000 }).catch(() => null);
  await page.waitForTimeout(2000);

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
