/**
 * 로컬 자동화 스크립트 — 뉴스 수집 → 블로그 원고 생성 → 네이버 포스팅
 *
 * 사용법:
 *   npx tsx scripts/local-auto-run.ts
 *
 * 계정 설정:
 *   config/naver-accounts.json (여러 계정 지원)
 *   또는 .env.local 에 NAVER_ID / NAVER_PW / NAVER_BLOG_ID
 *
 * 필수 환경변수:
 *   ANTHROPIC_API_KEY
 */
import Anthropic from "@anthropic-ai/sdk";
import { postToNaverBlogPlaywright, downloadTopicImage } from "../lib/naverBlogPlaywright";
import { loadUsedTopics, saveUsedTopics, pickUnusedTopic } from "../lib/topicHistory";
import { loadAccounts, type NaverAccount } from "../lib/accountConfig";
import * as fs from "fs";
import * as path from "path";

// .env.local 수동 로드
function loadEnv(): void {
  const envPath = path.join(__dirname, "..", ".env.local");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf-8").split("\n")) {
    const m = line.match(/^([^#=\s][^=]*)=(.*)$/);
    if (m) process.env[m[1].trim()] = m[2].trim().replace(/^['"]|['"]$/g, "");
  }
}

loadEnv();

const API_KEY      = process.env.ANTHROPIC_API_KEY ?? "";
const PEXELS_KEY   = process.env.PEXELS_API_KEY ?? "";

const NEWS_FEEDS = [
  "https://news.ltn.com.tw/rss/all.xml",
  "https://feeds.feedburner.com/ettoday/realtime",
  "https://news.google.com/rss?hl=zh-TW&gl=TW&ceid=TW:zh-Hant",
];

async function fetchNews(): Promise<string[]> {
  const results = await Promise.allSettled(NEWS_FEEDS.map(fetchFeed));
  const seen = new Set<string>();
  const titles: string[] = [];
  for (const r of results) {
    if (r.status !== "fulfilled") continue;
    for (const t of r.value) {
      if (!seen.has(t) && titles.length < 20) { seen.add(t); titles.push(t); }
    }
  }
  return titles;
}

async function fetchFeed(url: string): Promise<string[]> {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(8000),
      headers: { "User-Agent": "Mozilla/5.0", "Accept-Language": "zh-TW,zh;q=0.9" },
    });
    if (!res.ok) return [];
    const xml = await res.text();
    return parseTitles(xml);
  } catch {
    return [];
  }
}

function parseTitles(xml: string): string[] {
  const titles: string[] = [];
  const cdataRe = /<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>/g;
  let m: RegExpExecArray | null;
  while ((m = cdataRe.exec(xml)) !== null) {
    const t = m[1].trim();
    if (t) titles.push(t);
    if (titles.length >= 20) return titles;
  }
  if (titles.length === 0) {
    const plainRe = /<title>([\s\S]*?)<\/title>/g;
    let first = true;
    while ((m = plainRe.exec(xml)) !== null) {
      if (first) { first = false; continue; }
      const t = m[1].trim();
      if (t) titles.push(t);
      if (titles.length >= 20) return titles;
    }
  }
  return titles;
}

async function selectTopic(client: Anthropic, headlines: string[]): Promise<string[]> {
  const res = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 400,
    messages: [{
      role: "user",
      content: `대만 뉴스 헤드라인:\n${headlines.slice(0, 15).map((t, i) => `${i + 1}. ${t}`).join("\n")}\n\n대만 진출 한국 브랜드 담당자를 위한 카드뉴스 주제 6개를 추천하세요.\n조건: 한국어, 25자 이내, 마케팅 인사이트 중심\nJSON 배열만 출력: ["주제1","주제2","주제3","주제4","주제5","주제6"]`,
    }],
  });
  const text = res.content[0].type === "text" ? res.content[0].text : "";
  const match = text.match(/\[[\s\S]*?\]/);
  if (!match) throw new Error("주제 파싱 실패");
  return JSON.parse(match[0]) as string[];
}

async function generateBlog(
  client: Anthropic,
  topic: string
): Promise<{ title: string; content: string; tags: string[] }> {
  const res = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 3000,
    messages: [{
      role: "user",
      content: `주제: "${topic}"\n\n대만 진출을 준비하는 한국 브랜드 담당자를 위한 네이버 블로그 포스팅을 작성해주세요.\n\n조건:\n- 제목: SEO 최적화, 40자 이내\n- 본문: 800-1200자, 실용적 인사이트 중심\n- 태그: 5개 (한국어)\n\nJSON 형식으로만 출력:\n{"title":"제목","content":"본문","tags":["태그1","태그2","태그3","태그4","태그5"]}`,
    }],
  });
  const text = res.content[0].type === "text" ? res.content[0].text : "";
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("블로그 원고 파싱 실패");
  return JSON.parse(match[0]) as { title: string; content: string; tags: string[] };
}

async function runForAccount(
  client: Anthropic,
  account: NaverAccount,
  headlines: string[]
): Promise<void> {
  console.log(`\n  ▶ 계정: ${account.name} (${account.blogId})`);

  // 주제 선택
  const suggestions = await selectTopic(client, headlines);
  const usedTopics = loadUsedTopics();
  const topic = pickUnusedTopic(suggestions, usedTopics);
  console.log(`    주제: "${topic}"`);

  // 블로그 원고 생성
  const blog = await generateBlog(client, topic);
  console.log(`    제목: "${blog.title}"`);

  // 주제 히스토리 저장
  saveUsedTopics([...usedTopics, topic]);

  // 이미지 다운로드 (PEXELS_API_KEY 있을 때만)
  const imagePaths: string[] = [];
  if (PEXELS_KEY) {
    const downloaded = await downloadTopicImage(topic, PEXELS_KEY);
    if (downloaded) imagePaths.push(downloaded);
  }

  // 네이버 포스팅
  const postUrl = await postToNaverBlogPlaywright(
    account.naverId,
    account.naverPw,
    account.blogId,
    blog.title,
    blog.content,
    blog.tags,
    imagePaths
  );
  console.log(`    포스팅 완료: ${postUrl}`);
}

async function main(): Promise<void> {
  console.log(`\n[자동화] ${new Date().toLocaleString("ko-KR")} 시작`);

  if (!API_KEY) { console.error("[오류] ANTHROPIC_API_KEY 미설정"); process.exit(1); }

  // 계정 목록 — config/naver-accounts.json 우선, 없으면 env fallback
  let accounts = loadAccounts();
  if (accounts.length === 0) {
    const naverId = process.env.NAVER_ID ?? "";
    const naverPw = process.env.NAVER_PW ?? "";
    const blogId  = process.env.NAVER_BLOG_ID ?? naverId;
    if (!naverId || !naverPw) {
      console.error("[오류] 계정 없음 — config/naver-accounts.json 또는 .env.local에 NAVER_ID/NAVER_PW 설정 필요");
      process.exit(1);
    }
    accounts = [{ name: "기본", naverId, naverPw, blogId }];
  }
  console.log(`[계정] ${accounts.length}개 계정 로드`);

  const client = new Anthropic({ apiKey: API_KEY });

  // 뉴스 수집 (공유)
  console.log("[1] 대만 뉴스 수집 중...");
  const headlines = await fetchNews();
  if (headlines.length === 0) { console.error("[오류] 뉴스 수집 실패"); process.exit(1); }
  console.log(`    ${headlines.length}개 헤드라인 수집`);

  // 각 계정에 대해 순차 실행
  let successCount = 0;
  for (const account of accounts) {
    try {
      await runForAccount(client, account, headlines);
      successCount++;
    } catch (e) {
      console.error(`    [실패] ${account.name}: ${e instanceof Error ? e.message : e}`);
    }
  }

  console.log(`\n✅ 완료 — ${successCount}/${accounts.length}개 계정 포스팅 성공`);
}

main().catch((e) => {
  console.error("[자동화 오류]", e instanceof Error ? e.message : e);
  process.exit(1);
});
