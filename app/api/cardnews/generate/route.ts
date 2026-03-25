import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getApiKey, missingKeyResponse, friendlyError } from "@/lib/getApiKey";

export async function POST(req: NextRequest) {
  const apiKey = getApiKey(req);
  if (!apiKey) return missingKeyResponse();

  const { topic } = await req.json();
  if (!topic?.trim()) {
    return NextResponse.json({ error: "주제를 입력해주세요." }, { status: 400 });
  }

  const client = new Anthropic({ apiKey });

  try {
    const response = await client.messages.create({
      model: "claude-opus-4-6",
      max_tokens: 2000,
      messages: [
        {
          role: "user",
          content: `대만 마케팅 전문 에이전시 TIANXIA의 인스타그램 카드뉴스 콘텐츠를 생성해주세요.

주제: ${topic}

타겟: 대만 진출에 관심 있는 한국 브랜드 담당자 / 광고주
언어: 한국어
톤: 전문적이고 신뢰감 있으면서도 접근하기 쉬운 어조
구성: 총 5장 카드뉴스

JSON 형식으로만 출력하세요. 설명 없이 JSON만:

{
  "category": "카테고리명 (예: 대만 마케팅 인사이트)",
  "card1": {
    "badge": "짧은 라벨 10자 이내 (예: 대만 진출 가이드)",
    "title_line1": "제목 첫 줄 8자 이내",
    "title_line2": "강조 제목 8자 이내 (어두운 박스에 들어감)",
    "subtitle": "독자 공감 유도 문장 1~2줄"
  },
  "card2": {
    "label": "소라벨 (예: 현황 분석)",
    "title": "후킹 제목 2줄, 강렬하게",
    "highlight": "제목에서 강조할 키워드 2~4자",
    "body": "구체적 수치나 사실 포함 본문 2~3줄"
  },
  "card3": {
    "category": "소카테고리",
    "title": "인사이트 제목 한 줄",
    "body": "본문 3~4줄, 하이라이트할 키워드는 [[키워드]] 형식으로 표시",
    "highlight": "body의 [[]] 안 키워드와 동일",
    "tip": "실무 팁 1~2줄"
  },
  "card4": {
    "category": "소카테고리",
    "title": "리스트 제목 (예: 핵심 전략 3가지)",
    "items": [
      { "tag": "전략 1", "title": "항목 제목 짧고 임팩트 있게", "desc": "한 줄 설명" },
      { "tag": "전략 2", "title": "항목 제목", "desc": "한 줄 설명" },
      { "tag": "전략 3", "title": "항목 제목", "desc": "한 줄 설명" }
    ]
  },
  "card5": {
    "main": "저장해두면 유용해요",
    "subtitle": "대만 마케팅 실무 정보를 꾸준히 공유드려요.",
    "cta": "저장하기"
  },
  "caption": "인스타그램 본문 캡션 150자 이내, 실무 담당자 공감 유도, 이모지 1~2개"
}`,
        },
      ],
    });

    const text =
      response.content[0].type === "text" ? response.content[0].text : "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("JSON 파싱 실패");

    return NextResponse.json(JSON.parse(jsonMatch[0]));
  } catch (e: unknown) {
    return NextResponse.json({ error: friendlyError(e) }, { status: 500 });
  }
}
