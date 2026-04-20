import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getApiKey, missingKeyResponse, friendlyError } from "@/lib/getApiKey";

// 대만 뉴스 RSS — 서버 IP 차단이 없는 직접 소스를 우선, Google News는 보조
const NEWS_FEEDS = [
  // 자유時報 즉시뉴스 (서버 친화적)
  "https://news.ltn.com.tw/rss/all.xml",
  // ETtoday 실시간 뉴스
  "https://feeds.feedburner.com/ettoday/realtime",
  // Google News TW (데이터센터에서 차단될 수 있으나 가능하면 포함)
  "https://news.google.com/rss?hl=zh-TW&gl=TW&ceid=TW:zh-Hant",
];

const FETCH_TIMEOUT_MS = 10000;

export async function GET(req: NextRequest) {
  const apiKey = getApiKey(req);
  if (!apiKey) return missingKeyResponse();

  try {
    // 모든 피드를 병렬로 가져오고, 실패한 것은 조용히 무시
    const rawTitles = await fetchNewsTitlesParallel();

    if (rawTitles.length === 0) {
      throw new Error("대만 뉴스를 가져오지 못했습니다. 잠시 후 다시 시도해주세요.");
    }

    const client = new Anthropic({ apiKey });

    const response = await client.messages.create({
      model: "claude-opus-4-6",
      max_tokens: 800,
      messages: [
        {
          role: "user",
          content: `대만 최신 뉴스 헤드라인 ${rawTitles.length}건:
${rawTitles.map((t, i) => `${i + 1}. ${t}`).join("\n")}

위 뉴스를 참고해서, 대만 진출을 준비하는 한국 브랜드 담당자/광고주를 위한 인스타그램 카드뉴스 주제 6개를 추천해주세요.

조건:
- 한국어로 작성
- 대만 마케팅/진출 전략 관점에서 실용적이고 구체적인 주제
- 뉴스 흐름과 연관된 비즈니스 인사이트
- 각 주제는 25자 이내
- 뉴스성보다 마케팅 인사이트 중심

JSON 배열만 출력하세요 (설명 없이):
["주제1", "주제2", "주제3", "주제4", "주제5", "주제6"]`,
        },
      ],
    });

    const text =
      response.content[0].type === "text" ? response.content[0].text : "";
    const jsonMatch = text.match(/\[[\s\S]*?\]/);
    if (!jsonMatch) throw new Error("주제 파싱 실패");

    const suggestions = JSON.parse(jsonMatch[0]) as string[];

    return NextResponse.json({
      suggestions,
      rawTrends: rawTitles,
      fetchedAt: new Date().toISOString(),
    });
  } catch (e) {
    return NextResponse.json({ error: friendlyError(e) }, { status: 500 });
  }
}

/** 모든 피드를 병렬로 요청, 타임아웃 6초, 실패 피드는 빈 배열로 처리 */
async function fetchNewsTitlesParallel(): Promise<string[]> {
  const results = await Promise.allSettled(
    NEWS_FEEDS.map((url) => fetchSingleFeed(url))
  );

  const seen = new Set<string>();
  const titles: string[] = [];

  for (const result of results) {
    if (result.status === "fulfilled") {
      for (const t of result.value) {
        if (!seen.has(t) && titles.length < 20) {
          seen.add(t);
          titles.push(t);
        }
      }
    }
  }

  return titles;
}

/** 단일 RSS 피드를 타임아웃 포함해서 가져옴 */
async function fetchSingleFeed(url: string): Promise<string[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
        Accept: "application/rss+xml, application/xml, text/xml, */*",
        "Accept-Language": "zh-TW,zh;q=0.9",
        "Cache-Control": "no-cache",
      },
      cache: "no-store",
    });

    if (!res.ok) return [];

    const xml = await res.text();
    return parseTitlesFromXml(xml);
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
}

function parseTitlesFromXml(xml: string): string[] {
  const titles: string[] = [];

  // CDATA 형식 우선
  const cdataRe = /<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>/g;
  let m: RegExpExecArray | null;
  while ((m = cdataRe.exec(xml)) !== null) {
    const t = m[1].trim();
    if (t) titles.push(t);
    if (titles.length >= 20) return titles;
  }

  // 일반 텍스트 형식 (첫 번째 <title>은 피드 제목이므로 건너뜀)
  if (titles.length === 0) {
    const plainRe = /<title>([\s\S]*?)<\/title>/g;
    let isFirst = true;
    while ((m = plainRe.exec(xml)) !== null) {
      if (isFirst) { isFirst = false; continue; }
      const t = decodeXmlEntities(m[1].trim());
      if (t) titles.push(t);
      if (titles.length >= 20) return titles;
    }
  }

  return titles;
}

function decodeXmlEntities(str: string): string {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
}
