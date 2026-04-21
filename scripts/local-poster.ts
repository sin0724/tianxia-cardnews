/**
 * 로컬 포스터 — Windows 작업 스케줄러에서 설정된 시간에 호출됨
 *
 * 역할:
 *  1. Railway 대기 포스트 처리 (UI에서 "자동 포스팅" 클릭 시)
 *  2. 대기 포스트가 없으면 콘텐츠 자동 생성 + 네이버 포스팅
 *
 * 스케줄 설정:
 *   scripts/sync-schedules.ps1 실행 → Windows 작업 스케줄러에 요일/시간 등록
 *
 * 수동 실행:
 *   npx tsx scripts/local-poster.ts
 */
import { postToNaverBlogPlaywright } from "../lib/naverBlogPlaywright";
import type { PendingPost } from "../app/api/pending-post/route";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

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

async function safeFetch(url: string, init?: RequestInit): Promise<Response | null> {
  try {
    return await fetch(url, { signal: AbortSignal.timeout(20000), ...init });
  } catch (e: unknown) {
    console.error(`[포스터] 연결 실패:`, e instanceof Error ? e.message : e);
    return null;
  }
}

/** Railway 대기 포스트 처리 */
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

/** 대기 포스트가 없을 때 자동으로 콘텐츠 생성 후 포스팅 */
async function runAutoPost(): Promise<void> {
  console.log("[포스터] 대기 포스트 없음 — 자동 콘텐츠 생성 시작");

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
    error?: string;
  };

  if (!autoData.success || !autoData.blogTitle || !autoData.blogContent) {
    console.error("[포스터] 콘텐츠 데이터 오류:", autoData.error);
    return;
  }

  console.log(`[포스터] 콘텐츠 생성 완료: "${autoData.blogTitle}"`);

  const url = await postToNaverBlogPlaywright(
    NAVER_ID, NAVER_PW, NAVER_BLOG_ID,
    autoData.blogTitle,
    autoData.blogContent,
    autoData.tags ?? [],
    []
  );
  console.log(`[포스터] 자동 포스팅 완료: ${url}`);
}

async function main(): Promise<void> {
  if (!NAVER_ID || !NAVER_PW) {
    console.error("[포스터] NAVER_ID / NAVER_PW 미설정 — .env.local 확인");
    return;
  }

  console.log(`[포스터] ${new Date().toLocaleString("ko-KR")} 시작`);

  const hasPending = await processPendingPost();
  if (!hasPending) {
    await runAutoPost();
  }

  console.log(`[포스터] ${new Date().toLocaleString("ko-KR")} 완료`);
}

main().catch((e: unknown) => {
  console.error("[포스터 오류]", e instanceof Error ? e.message : e);
});
