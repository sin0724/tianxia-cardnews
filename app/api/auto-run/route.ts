import { NextRequest, NextResponse } from "next/server";
import { getApiKey, missingKeyResponse, friendlyError } from "@/lib/getApiKey";
import { loadUsedTopics, saveUsedTopics, pickUnusedTopic } from "@/lib/topicHistory";
import { postToNaverBlogPlaywright } from "@/lib/naverBlogPlaywright";

function baseUrl(req: NextRequest): string {
  const proto = req.headers.get("x-forwarded-proto") ?? "https";
  const host = req.headers.get("host") ?? "localhost:3000";
  return `${proto}://${host}`;
}

export async function POST(req: NextRequest) {
  const apiKey = getApiKey(req);
  if (!apiKey) return missingKeyResponse();

  const base = baseUrl(req);
  const headers = { "Content-Type": "application/json", "x-user-api-key": apiKey };

  const log: string[] = [];

  try {
    // ── 1. 대만 뉴스 트렌드 수집 ──
    log.push("트렌드 수집 시작...");
    const trendsRes = await fetch(`${base}/api/trends`, { headers });
    const trendsData = (await trendsRes.json()) as { suggestions?: string[]; error?: string };
    if (!trendsRes.ok || !trendsData.suggestions?.length) {
      throw new Error(trendsData.error ?? "트렌드 수집 실패");
    }

    // ── 2. 중복 없는 주제 선택 ──
    const usedTopics = loadUsedTopics();
    const topic = pickUnusedTopic(trendsData.suggestions, usedTopics);
    log.push(`주제 선택: "${topic}"`);

    // ── 3. 카드뉴스 콘텐츠 생성 ──
    log.push("카드뉴스 생성 중...");
    const cardRes = await fetch(`${base}/api/cardnews/generate`, {
      method: "POST",
      headers,
      body: JSON.stringify({ topic }),
    });
    const cardData = await cardRes.json();
    if (!cardRes.ok) throw new Error(cardData.error ?? "카드뉴스 생성 실패");
    log.push("카드뉴스 생성 완료");

    // ── 4. 블로그 원고 생성 ──
    log.push("블로그 원고 생성 중...");
    const blogRes = await fetch(`${base}/api/blog/generate`, {
      method: "POST",
      headers,
      body: JSON.stringify({ topic, cardContent: cardData }),
    });
    const blogData = (await blogRes.json()) as {
      title?: string; summary?: string; content?: string; tags?: string[]; error?: string;
    };
    if (!blogRes.ok) throw new Error(blogData.error ?? "블로그 생성 실패");
    log.push(`블로그 원고 생성 완료: "${blogData.title}"`);

    // ── 5. 주제 히스토리 저장 (포스팅 전에 저장 — 실패해도 재생성 방지) ──
    saveUsedTopics([...usedTopics, topic]);

    // ── 6. 네이버 블로그 포스팅 (Playwright 브라우저 자동화) ──
    const naverId = process.env.NAVER_ID;
    const naverPw = process.env.NAVER_PW;
    // 로그인 ID와 블로그 ID가 다를 수 있음 (NAVER_BLOG_ID 없으면 NAVER_ID 사용)
    const naverBlogId = process.env.NAVER_BLOG_ID || naverId;

    let postUrl = "";
    if (naverId && naverPw) {
      log.push("네이버 블로그 포스팅 중 (브라우저 자동화)...");
      try {
        postUrl = await postToNaverBlogPlaywright(
          naverId,
          naverPw,
          naverBlogId ?? naverId,
          blogData.title ?? topic,
          blogData.content ?? "",
          blogData.tags ?? []
        );
        log.push(`포스팅 완료: ${postUrl}`);
      } catch (naverErr) {
        const errMsg = naverErr instanceof Error ? naverErr.message : String(naverErr);
        log.push(`⚠️ 서버 포스팅 실패 — 로컬 포스터 대기열에 저장: ${errMsg.slice(0, 80)}`);
        // 로컬 PC 포스터가 처리할 수 있도록 pending-post에 저장
        await fetch(`${base}/api/pending-post`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            title: blogData.title ?? topic,
            content: blogData.content ?? "",
            tags: blogData.tags ?? [],
            topic,
          }),
        }).catch(() => null);
      }
    } else {
      log.push("⚠️ NAVER_ID / NAVER_PW 환경변수 미설정 — 포스팅 건너뜀");
    }

    return NextResponse.json({
      success: true,
      topic,
      blogTitle: blogData.title,
      blogSummary: blogData.summary,
      postUrl,
      generatedAt: new Date().toISOString(),
      log,
    });
  } catch (e) {
    return NextResponse.json({ success: false, error: friendlyError(e), log }, { status: 500 });
  }
}

// 수동 테스트용 GET (브라우저에서 쉽게 확인)
export async function GET(req: NextRequest) {
  return POST(req);
}
