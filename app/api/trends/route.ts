import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getApiKey, missingKeyResponse } from "@/lib/getApiKey";

// Google News 대만 RSS 엔드포인트
const NEWS_FEEDS = [
  "https://news.google.com/rss?hl=zh-TW&gl=TW&ceid=TW:zh-Hant",
  "https://news.google.com/rss/topics/CAAqJggKIiBDQkFTRWdvSUwyMHZNRFZqTkhjU0FtdHZHZ0pWVXlnQVAB?hl=zh-TW&gl=TW&ceid=TW:zh-Hant",
];

export async function GET(req: NextRequest) {
  const apiKey = getApiKey(req);
  if (!apiKey) return missingKeyResponse();

  try {
    const rawTitles = await fetchNewsTitles();

    if (rawTitles.length === 0) {
      throw new Error("뉴스 데이터를 가져오지 못했습니다.");
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
    const msg = e instanceof Error ? e.message : "트렌드 불러오기 실패";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

async function fetchNewsTitles(): Promise<string[]> {
  const titles: string[] = [];
  const seen = new Set<string>();

  for (const url of NEWS_FEEDS) {
    if (titles.length >= 20) break;
    try {
      const res = await fetch(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
          Accept: "application/rss+xml, application/xml, text/xml, */*",
        },
        next: { revalidate: 1800 },
      });

      if (!res.ok) continue;

      const xml = await res.text();

      const cdataRe = /<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>/g;
      const plainRe = /<title>([\s\S]*?)<\/title>/g;
      let m: RegExpExecArray | null;
      let isFirst = true;

      while ((m = cdataRe.exec(xml)) !== null) {
        const t = m[1].trim();
        if (t && !seen.has(t)) { seen.add(t); titles.push(t); }
        if (titles.length >= 20) break;
      }

      if (titles.length === 0) {
        while ((m = plainRe.exec(xml)) !== null) {
          if (isFirst) { isFirst = false; continue; }
          const t = decodeXmlEntities(m[1].trim());
          if (t && !seen.has(t)) { seen.add(t); titles.push(t); }
          if (titles.length >= 20) break;
        }
      }
    } catch {
      continue;
    }
  }

  return titles.slice(0, 20);
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
