/**
 * 로컬 포스터 — Railway에서 생성된 대기 글을 가져와 로컬 Playwright로 Naver에 포스팅
 *
 * 사용법:
 *   npx tsx scripts/local-poster.ts
 *
 * Windows 예약 작업으로 등록하려면:
 *   scripts/setup-task.ps1 실행
 */
import { postToNaverBlogPlaywright } from "../lib/naverBlogPlaywright";
import type { PendingPost } from "../app/api/pending-post/route";

const RAILWAY_URL = process.env.RAILWAY_URL ?? "https://tianxia-cardnews.up.railway.app";
const NAVER_ID    = process.env.NAVER_ID    ?? "";
const NAVER_PW    = process.env.NAVER_PW    ?? "";
const NAVER_BLOG_ID = process.env.NAVER_BLOG_ID ?? NAVER_ID;

async function main() {
  console.log(`[로컬 포스터] ${new Date().toLocaleString("ko-KR")} 시작`);

  if (!NAVER_ID || !NAVER_PW) {
    console.error("[로컬 포스터] NAVER_ID / NAVER_PW 환경변수 필요");
    process.exit(1);
  }

  // 1. Railway에서 대기 글 조회
  const res = await fetch(`${RAILWAY_URL}/api/pending-post`).catch((e) => {
    console.error("[로컬 포스터] Railway 연결 실패:", e.message);
    process.exit(1);
  });

  const post = (await res.json()) as PendingPost | null;
  if (!post) {
    console.log("[로컬 포스터] 대기 중인 포스팅 없음. 종료.");
    return;
  }

  console.log(`[로컬 포스터] 대기 글 발견: "${post.title}"`);
  console.log(`[로컬 포스터] 저장 시각: ${post.savedAt}`);

  // 2. 로컬 Playwright로 Naver 블로그 포스팅 (로컬 IP 사용 → 차단 없음)
  try {
    const url = await postToNaverBlogPlaywright(
      NAVER_ID,
      NAVER_PW,
      NAVER_BLOG_ID,
      post.title,
      post.content,
      post.tags
    );
    console.log(`[로컬 포스터] 포스팅 완료: ${url}`);

    // 3. 완료 후 대기열 삭제
    await fetch(`${RAILWAY_URL}/api/pending-post`, { method: "DELETE" });
    console.log("[로컬 포스터] 대기열 삭제 완료");
  } catch (e) {
    console.error("[로컬 포스터] 포스팅 실패:", e instanceof Error ? e.message : e);
    process.exit(1);
  }
}

main();
