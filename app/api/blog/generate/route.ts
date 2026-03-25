import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import type { CardNewsContent } from "@/components/CardTemplates";
import { getApiKey, missingKeyResponse } from "@/lib/getApiKey";

export async function POST(req: NextRequest) {
  const apiKey = getApiKey(req);
  if (!apiKey) return missingKeyResponse();

  try {
    const { topic, cardContent } = (await req.json()) as {
      topic: string;
      cardContent?: CardNewsContent;
    };

    if (!topic) {
      return NextResponse.json({ error: "주제가 없습니다." }, { status: 400 });
    }

    const cardSummary = cardContent
      ? `
카드뉴스 핵심 내용:
- 주제: ${cardContent.category}
- 커버 제목: ${cardContent.card1.title_line1} ${cardContent.card1.title_line2}
- 부제: ${cardContent.card1.subtitle}
- 핵심 메시지: ${cardContent.card2.title}
- 인사이트: ${cardContent.card3.title}
- 핵심 포인트: ${cardContent.card4.items.map((it) => it.title).join(", ")}
- CTA: ${cardContent.card5.main}
`
      : "";

    const client = new Anthropic({ apiKey });

    const response = await client.messages.create({
      model: "claude-opus-4-6",
      max_tokens: 3000,
      messages: [
        {
          role: "user",
          content: `당신은 한국 브랜드 마케터를 위한 콘텐츠 전문가입니다.
대만 시장 진출을 고민하는 한국 기업 마케팅 담당자를 독자로 하는 블로그 원고를 작성해 주세요.

주제: ${topic}
${cardSummary}

아래 형식으로 블로그 원고를 JSON으로 출력하세요 (설명 없이 JSON만):
{
  "title": "SEO 최적화된 블로그 제목 (매력적이고 구체적으로)",
  "summary": "2-3문장 핵심 요약 (메타 디스크립션용)",
  "content": "본문 전체 (마크다운 형식, ## 소제목 3~4개 포함, 총 1200~1800자)",
  "tags": ["태그1", "태그2", "태그3", "태그4", "태그5"]
}

작성 가이드라인:
- 독자: 대만 시장 진출을 검토 중인 한국 브랜드 마케팅 담당자
- 톤: 전문적이지만 읽기 쉽게, 실용적인 인사이트 중심
- 구성: 도입부 → 핵심 내용 3~4파트 → 실행 가능한 팁 → 마무리 CTA
- 각 소제목 아래 2~3 단락
- 구체적인 수치나 사례 포함
- 마지막 단락에 티엔샤 마케팅 에이전시 활용 자연스럽게 언급`,
        },
      ],
    });

    const text =
      response.content[0].type === "text" ? response.content[0].text : "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("블로그 원고 파싱 실패");

    const parsed = JSON.parse(jsonMatch[0]);
    return NextResponse.json(parsed);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "블로그 원고 생성 실패";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
