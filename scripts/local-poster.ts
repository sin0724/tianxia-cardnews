/**
 * 로컬 포스터 — Railway에 저장된 대기 포스트를 가져와 Playwright로 네이버에 포스팅
 *
 * Windows 예약 작업으로 1분마다 실행:
 *   scripts/setup-task.ps1 참고
 *
 * 수동 실행:
 *   npx tsx scripts/local-poster.ts
 */
import { postToNaverBlogPlaywright } from "../lib/naverBlogPlaywright";
import type { PendingPost } from "../app/api/pending-post/route";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

// .env.local 수동 로드
function loadEnv(): void {
  const envPath = path.join(__dirname, "..", ".env.local");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf-8").split("\n")) {
    const m = line.match(/^([^#=\s][^=]*)=(.*)/);
    if (m) process.env[m[1].trim()] = m[2].trim().replace(/^['"]|['"]$/g, "");
  }
}

loadEnv();

const RAILWAY_URL  = process.env.RAILWAY_URL ?? "https://tianxia-cardnews.up.railway.app";
const NAVER_ID     = process.env.NAVER_ID ?? "";
const NAVER_PW     = process.env.NAVER_PW ?? "";
const NAVER_BLOG_ID = process.env.NAVER_BLOG_ID ?? NAVER_ID;
const API_KEY      = process.env.ANTHROPIC_API_KEY ?? "";

async function main(): Promise<void> {
  if (!NAVER_ID || !NAVER_PW) {
    console.error("[포스터] NAVER_ID / NAVER_PW 미설정 — .env.local 확인");
    process.exit(1);
  }

  // 1. Railway에서 대기 포스트 조회
  const res = await fetch(`${RAILWAY_URL}/api/pending-post`, {
    headers: { "x-user-api-key": API_KEY },
  }).catch((e: unknown) => {
    console.error("[포스터] Railway 연결 실패:", e instanceof Error ? e.message : e);
    process.exit(1);
  });

  const post = (await res.json()) as PendingPost | null;
  if (!post) {
    console.log(`[포스터] ${new Date().toLocaleTimeString("ko-KR")} — 대기 포스트 없음`);
    return;
  }

  console.log(`[포스터] 대기 포스트 발견: "${post.title}" (저장: ${post.savedAt})`);

  // 2. base64 이미지 → 임시 파일
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

  // 3. Playwright로 포스팅
  try {
    const url = await postToNaverBlogPlaywright(
      NAVER_ID, NAVER_PW, NAVER_BLOG_ID,
      post.title, post.content, post.tags,
      imagePaths
    );
    console.log(`[포스터] 포스팅 완료: ${url}`);

    // 4. 대기열 삭제
    await fetch(`${RAILWAY_URL}/api/pending-post`, {
      method: "DELETE",
      headers: { "x-user-api-key": API_KEY },
    });
    console.log("[포스터] 대기열 삭제 완료");
  } finally {
    if (fs.existsSync(tmpDir)) fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

main().catch((e: unknown) => {
  console.error("[포스터 오류]", e instanceof Error ? e.message : e);
  process.exit(1);
});
