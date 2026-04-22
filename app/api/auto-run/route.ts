import { NextRequest, NextResponse } from "next/server";
import { getApiKey, missingKeyResponse, friendlyError } from "@/lib/getApiKey";
import { loadUsedTopics, saveUsedTopics, pickUnusedTopic } from "@/lib/topicHistory";
import type { CafeBoardKey } from "@/lib/naverCafePlaywright";

function baseUrl(req: NextRequest): string {
  const proto = req.headers.get("x-forwarded-proto") ?? "https";
  const host = req.headers.get("host") ?? "localhost:3000";
  return `${proto}://${host}`;
}

export async function POST(req: NextRequest) {
  const apiKey = getApiKey(req);
  if (!apiKey) return missingKeyResponse();

  const body = await req.json().catch(() => ({})) as { cafeBoard?: CafeBoardKey };
  const cafeBoard: CafeBoardKey | undefined = body.cafeBoard;

  const base = baseUrl(req);
  const headers = { "Content-Type": "application/json", "x-user-api-key": apiKey };
  const log: string[] = [];

  try {
    // 1. 대만 뉴스 트렌드 수집
    log.push("트렌드 수집 중...");
    const trendsRes = await fetch(`${base}/api/trends`, { headers });
    const trendsData = (await trendsRes.json()) as { suggestions?: string[]; error?: string };
    if (!trendsRes.ok || !trendsData.suggestions?.length) {
      throw new Error(trendsData.error ?? "트렌드 수집 실패");
    }

    // 2. 중복 없는 주제 선택
    const usedTopics = loadUsedTopics();
    const topic = pickUnusedTopic(trendsData.suggestions, usedTopics);
    log.push(`주제 선택: "${topic}"`);

    // 3. 카드뉴스 콘텐츠 생성
    log.push("카드뉴스 생성 중...");
    const cardRes = await fetch(`${base}/api/cardnews/generate`, {
      method: "POST",
      headers,
      body: JSON.stringify({ topic }),
    });
    const cardData = await cardRes.json();
    if (!cardRes.ok) throw new Error(cardData.error ?? "카드뉴스 생성 실패");
    log.push("카드뉴스 생성 완료");

    // 4. 블로그 원고 생성
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

    // 5. 주제 히스토리 저장
    saveUsedTopics([...usedTopics, topic]);

    // 6. (선택) 카페 발행
    let cafeResult: { success: boolean; postUrl?: string; error?: string } | null = null;
    if (cafeBoard) {
      log.push(`카페 발행 중... (게시판: ${cafeBoard})`);
      try {
        const cafeRes = await fetch(`${base}/api/cafe/post-now`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            title: blogData.title,
            content: blogData.content,
            board: cafeBoard,
          }),
        });
        cafeResult = await cafeRes.json() as { success: boolean; postUrl?: string; error?: string };
        if (cafeResult.success) {
          log.push(`카페 발행 완료: ${cafeResult.postUrl}`);
        } else {
          log.push(`카페 발행 실패: ${cafeResult.error}`);
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        log.push(`카페 발행 오류: ${msg}`);
        cafeResult = { success: false, error: msg };
      }
    }

    return NextResponse.json({
      success: true,
      topic,
      blogTitle: blogData.title,
      blogSummary: blogData.summary,
      blogContent: blogData.content,
      tags: blogData.tags,
      cardContent: cardData,
      cafeResult,
      generatedAt: new Date().toISOString(),
      log,
    });
  } catch (e) {
    return NextResponse.json({ success: false, error: friendlyError(e), log }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  return POST(req);
}
