/**
 * 로컬 포스터 — Windows 작업 스케줄러에서 호출됨
 *
 * 모드:
 *  - 기본 (no flag): 대기 포스트 처리 (즉시 발행 대기열)
 *  - --schedule:     카드뉴스 생성 → 이미지 캡처 → 네이버 발행 (예약 발행)
 */
import { postToNaverBlogPlaywright } from "../lib/naverBlogPlaywright";
import type { PendingPost } from "../app/api/pending-post/route";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { chromium } from "playwright";

function loadEnv(): void {
  const envPath = path.join(__dirname, "..", ".env.local");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf-8").split("\n")) {
    const m = line.match(/^([^#=\s][^=]*)=(.*)/);
    if (m) process.env[m[1].trim()] = m[2].trim().replace(/^['"]|['"]$/g, "");
  }
}

loadEnv();

const RAILWAY_URL   = process.env.RAILWAY_URL ?? "https://tianxia-cardnews-production.up.railway.app";
const NAVER_ID      = process.env.NAVER_ID ?? "";
const NAVER_PW      = process.env.NAVER_PW ?? "";
const NAVER_BLOG_ID = process.env.NAVER_BLOG_ID ?? NAVER_ID;
const API_KEY       = process.env.ANTHROPIC_API_KEY ?? "";
const API_HEADERS   = { "x-user-api-key": API_KEY };

const SCHEDULE_MODE = process.argv.includes("--schedule");

async function safeFetch(url: string, init?: RequestInit): Promise<Response | null> {
  try {
    return await fetch(url, { signal: AbortSignal.timeout(20000), ...init });
  } catch (e: unknown) {
    console.error(`[포스터] 연결 실패:`, e instanceof Error ? e.message : e);
    return null;
  }
}

/** Railway 대기 포스트 처리 (즉시 발행 모드) */
async function processPendingPost(): Promise<boolean> {
  const res = await safeFetch(`${RAILWAY_URL}/api/pending-post`, { headers: API_HEADERS });
  if (!res || !res.ok) return false;

  const post = (await res.json()) as PendingPost | null;
  if (!post || typeof post !== "object") return false;

  if (!post.title || !post.content) {
    if ("title" in post) {
      console.log("[포스터] 유효하지 않은 대기 포스트 — 자동 삭제");
      await safeFetch(`${RAILWAY_URL}/api/pending-post`, { method: "DELETE", headers: API_HEADERS });
    }
    return false;
  }

  console.log(`[포스터] 대기 포스트 발견: "${post.title}"`);

  const tmpDir = path.join(os.tmpdir(), `tianxia-post-${Date.now()}`);
  const imagePaths: string[] = [];

  if (post.images && post.images.length > 0) {
    fs.mkdirSync(tmpDir, { recursive: true });
    for (let i = 0; i < post.images.length; i++) {
      const base64 = post.images[i].replace(/^data:image\/\w+;base64,/, "");
      const filePath = path.join(tmpDir, `card_${i + 1}.jpg`);
      fs.writeFileSync(filePath, Buffer.from(base64, "base64"));
      imagePaths.push(filePath);
    }
    console.log(`[포스터] 이미지 ${imagePaths.length}장 준비 완료`);
  }

  try {
    const url = await postToNaverBlogPlaywright(
      NAVER_ID, NAVER_PW, NAVER_BLOG_ID,
      post.title, post.content, post.tags ?? [],
      imagePaths
    );
    console.log(`[포스터] 포스팅 완료: ${url}`);
    await safeFetch(`${RAILWAY_URL}/api/pending-post`, { method: "DELETE", headers: API_HEADERS });
    return true;
  } finally {
    if (fs.existsSync(tmpDir)) fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

/** Playwright로 /render 페이지에서 카드 이미지 캡처 */
async function captureCardImages(template: string, cardContent: unknown): Promise<string[]> {
  const encoded = Buffer.from(JSON.stringify(cardContent)).toString("base64");
  const url = `${RAILWAY_URL}/render?t=${template}&d=${encodeURIComponent(encoded)}`;

  console.log(`[포스터] 카드 이미지 캡처 시작: ${url}`);

  const tmpDir = path.join(os.tmpdir(), `tianxia-cards-${Date.now()}`);
  fs.mkdirSync(tmpDir, { recursive: true });
  const imagePaths: string[] = [];

  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.setViewportSize({ width: 600, height: 800 });
    await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });
    await page.waitForTimeout(2000);

    for (let i = 0; i < 5; i++) {
      const el = page.locator(`#card-${i}`);
      const count = await el.count();
      if (count === 0) break;
      const filePath = path.join(tmpDir, `card_${i + 1}.png`);
      await el.screenshot({ path: filePath });
      imagePaths.push(filePath);
    }
    console.log(`[포스터] 카드 이미지 ${imagePaths.length}장 캡처 완료`);
  } finally {
    await browser.close();
  }

  return imagePaths;
}

/** 예약 발행 모드: 카드뉴스 생성 → 이미지 캡처 → 네이버 발행 */
async function runScheduledPost(): Promise<void> {
  console.log("[포스터] 예약 발행 시작 — 콘텐츠 생성 중...");

  const autoRes = await safeFetch(`${RAILWAY_URL}/api/auto-run`, {
    method: "POST",
    headers: { ...API_HEADERS, "Content-Type": "application/json" },
  });
  if (!autoRes || !autoRes.ok) {
    console.error("[포스터] 콘텐츠 생성 실패");
    return;
  }

  const autoData = (await autoRes.json()) as {
    success: boolean;
    topic?: string;
    blogTitle?: string;
    blogContent?: string;
    tags?: string[];
    cardContent?: unknown;
    error?: string;
  };

  if (!autoData.success || !autoData.blogTitle || !autoData.blogContent) {
    console.error("[포스터] 콘텐츠 데이터 오류:", autoData.error);
    return;
  }

  console.log(`[포스터] 콘텐츠 생성 완료: "${autoData.blogTitle}"`);

  const templates = ["A", "B", "C", "D"];
  const template = templates[Math.floor(Math.random() * templates.length)];
  let imagePaths: string[] = [];
  const tmpDir = path.join(os.tmpdir(), `tianxia-cards-${Date.now()}`);

  if (autoData.cardContent) {
    try {
      imagePaths = await captureCardImages(template, autoData.cardContent);
    } catch (e: unknown) {
      console.error("[포스터] 이미지 캡처 실패 (텍스트만 포스팅):", e instanceof Error ? e.message : e);
    }
  }

  try {
    const url = await postToNaverBlogPlaywright(
      NAVER_ID, NAVER_PW, NAVER_BLOG_ID,
      autoData.blogTitle,
      autoData.blogContent,
      autoData.tags ?? [],
      imagePaths
    );
    console.log(`[포스터] 예약 발행 완료: ${url}`);
  } finally {
    if (fs.existsSync(tmpDir)) fs.rmSync(tmpDir, { recursive: true, force: true });
    for (const p of imagePaths) {
      if (fs.existsSync(p)) fs.unlinkSync(p);
    }
  }
}

async function main(): Promise<void> {
  if (!NAVER_ID || !NAVER_PW) {
    console.error("[포스터] NAVER_ID / NAVER_PW 미설정 — .env.local 확인");
    return;
  }

  console.log(`[포스터] ${new Date().toLocaleString("ko-KR")} 시작 (모드: ${SCHEDULE_MODE ? "예약발행" : "즉시발행 대기열"})`);

  if (SCHEDULE_MODE) {
    await runScheduledPost();
  } else {
    await processPendingPost();
  }

  console.log(`[포스터] ${new Date().toLocaleString("ko-KR")} 완료`);
}

main().catch((e: unknown) => {
  console.error("[포스터 오류]", e instanceof Error ? e.message : e);
});
