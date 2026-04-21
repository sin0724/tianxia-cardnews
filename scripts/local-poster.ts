/**
 * 로컬 포스터 — 1분마다 백그라운드 실행 (Windows 작업 스케줄러)
 *
 * 역할:
 *  1. Railway 대기 포스트 처리 (UI에서 "자동 포스팅" 클릭 시)
 *  2. Railway 스케줄 확인 → 실행 시각이면 콘텐츠 생성 + 자동 포스팅
 *
 * 수동 실행:
 *   npx tsx scripts/local-poster.ts
 */
import { postToNaverBlogPlaywright } from "../lib/naverBlogPlaywright";
import type { PendingPost } from "../app/api/pending-post/route";
import type { ScheduleEntry } from "../lib/scheduler";
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

const API_HEADERS = { "x-user-api-key": API_KEY };

async function safeFetch(url: string, init?: RequestInit): Promise<Response | null> {
  try {
    return await fetch(url, { signal: AbortSignal.timeout(20000), ...init });
  } catch (e: unknown) {
    console.error(`[포스터] 연결 실패 (${url}):`, e instanceof Error ? e.message : e);
    return null;
  }
}

// ── 1. 대기 포스트 처리 ────────────────────────────────────────────────────

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

// ── 2. 스케줄 확인 + 자동 실행 ────────────────────────────────────────────

async function processSchedules(): Promise<void> {
  const res = await safeFetch(`${RAILWAY_URL}/api/schedule?due=1`, { headers: API_HEADERS });
  if (!res || !res.ok) return;

  const due = (await res.json()) as ScheduleEntry[];
  if (!Array.isArray(due) || due.length === 0) return;

  for (const schedule of due) {
    console.log(`[스케줄] 실행: "${schedule.label}"`);

    try {
      // 콘텐츠 생성 (Railway)
      const autoRes = await safeFetch(`${RAILWAY_URL}/api/auto-run`, {
        method: "POST",
        headers: { ...API_HEADERS, "Content-Type": "application/json" },
      });
      if (!autoRes || !autoRes.ok) {
        console.error("[스케줄] 콘텐츠 생성 실패");
        continue;
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
        console.error("[스케줄] 콘텐츠 데이터 오류:", autoData.error);
        continue;
      }

      console.log(`[스케줄] 콘텐츠 생성 완료: "${autoData.blogTitle}"`);

      // 네이버 포스팅 (이미지 없이 텍스트만)
      const url = await postToNaverBlogPlaywright(
        NAVER_ID, NAVER_PW, NAVER_BLOG_ID,
        autoData.blogTitle,
        autoData.blogContent,
        autoData.tags ?? [],
        []
      );
      console.log(`[스케줄] 포스팅 완료: ${url}`);

      // 실행 완료 기록
      await safeFetch(`${RAILWAY_URL}/api/schedule`, {
        method: "POST",
        headers: { ...API_HEADERS, "Content-Type": "application/json" },
        body: JSON.stringify({ action: "mark-ran", id: schedule.id }),
      });
    } catch (e: unknown) {
      console.error(`[스케줄] 실패:`, e instanceof Error ? e.message : e);
    }
  }
}

// ── main ───────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  if (!NAVER_ID || !NAVER_PW) {
    console.error("[포스터] NAVER_ID / NAVER_PW 미설정");
    return;
  }

  // 대기 포스트가 있으면 처리 (UI에서 수동 트리거)
  const posted = await processPendingPost();
  if (posted) return; // 이번 분에 이미 포스팅했으면 스케줄 체크 스킵

  // 스케줄 확인 및 실행
  await processSchedules();
}

main().catch((e: unknown) => {
  console.error("[포스터 오류]", e instanceof Error ? e.message : e);
});
