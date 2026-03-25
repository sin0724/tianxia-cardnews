import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getApiKey, missingKeyResponse, friendlyError } from "@/lib/getApiKey";

interface PowerPageInfo {
  storeName: string;
  address: string;
  menus: string;
  keywords: string;
  slogan: string;
}

interface ImageInput {
  base64: string;
  mediaType: "image/jpeg" | "image/png" | "image/gif" | "image/webp";
}

export async function POST(req: NextRequest) {
  const apiKey = getApiKey(req);
  if (!apiKey) return missingKeyResponse();

  const { topic, powerPage, powerPageInfo, powerPageImages } = (await req.json()) as {
    topic?: string;
    powerPage?: boolean;
    powerPageInfo?: PowerPageInfo;
    powerPageImages?: ImageInput[];
  };

  const client = new Anthropic({ apiKey });

  try {
    if (powerPage && powerPageInfo) {
      const promptText = buildPowerPagePrompt(powerPageInfo);
      const hasImages = powerPageImages && powerPageImages.length > 0;

      const imageBlocks: Anthropic.ImageBlockParam[] = hasImages
        ? powerPageImages!.map((img) => ({
            type: "image" as const,
            source: {
              type: "base64" as const,
              media_type: img.mediaType,
              data: img.base64,
            },
          }))
        : [];

      const textBlock: Anthropic.TextBlockParam = {
        type: "text",
        text: hasImages
          ? `위 ${powerPageImages!.length}장의 업체 사진을 참고해서, 아래 업체 정보 기반 카드뉴스를 생성해주세요.\n\n${promptText}`
          : promptText,
      };

      const response = await client.messages.create({
        model: "claude-opus-4-6",
        max_tokens: 2000,
        messages: [{ role: "user", content: [...imageBlocks, textBlock] }],
      });

      const text =
        response.content[0].type === "text" ? response.content[0].text : "";
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("JSON 파싱 실패");
      return NextResponse.json(JSON.parse(jsonMatch[0]));
    }

    // 일반 모드
    const response = await client.messages.create({
      model: "claude-opus-4-6",
      max_tokens: 2000,
      messages: [{ role: "user", content: buildNormalPrompt(topic?.trim() || "대만 마케팅 인사이트") }],
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

function buildPowerPagePrompt(info: PowerPageInfo): string {
  const { storeName, address, menus, keywords, slogan } = info;
  const keywordPart = keywords ? `\n키워드: ${keywords}` : "";
  const sloganPart = slogan ? `\n슬로건: ${slogan}` : "";

  return `당신은 대만 현지 소비자를 위한 한국 맛집/업체 소개 인스타그램 카드뉴스 전문가입니다.
아래 업체 정보를 바탕으로 대만 여행자 및 현지인을 타겟으로 한 카드뉴스 5장을 생성해주세요.

업체 정보:
상호명: ${storeName}
주소: ${address}
대표 메뉴: ${menus}${keywordPart}${sloganPart}

생성 조건:
1. 모든 텍스트는 繁體中文 (대만 번체 중국어)으로 작성
2. 상호명은 번체 중국어로 음역/의역하여 표기 (예: 토라슌 → 吐拉順, 대청마루 → 大廳마루)
3. 상호명(${storeName})을 영문으로 자동 번역/음역할 것 (예: 토라슌 → Torasun, 홍대갈비 → Hongdae Galbi)
4. card5.subtitle 형식: "영문 상호명 | 영문 키워드 또는 주소" + 줄바꿈 + 한국어 원문 주소 (한 줄로 간결하게)
5. card2~5는 사진 하단 한 줄 텍스트로만 표시되므로 각 필드를 짧고 간결하게 작성
6. card2.title: 대표 메뉴명 번체 번역 (20자 이내)
7. card3.title: 분위기/특징 핵심 한 줄 (20자 이내)
8. card4.items의 title: 메뉴명만 짧게 (5자 이내씩)
9. 업체 사진이 제공된 경우 사진 속 분위기·메뉴·인테리어를 텍스트에 반영할 것

JSON 형식으로만 출력하세요. 설명 없이 JSON만:

{
  "category": "번체 카테고리명 (예: 首爾美食推薦)",
  "card1": {
    "badge": "번체 라벨 6자 이내 (예: 必吃推薦)",
    "title_line1": "번체 음역 상호명",
    "title_line2": "번체 슬로건 8자 이내",
    "subtitle": "대만 여행자 공감 유도 한 문장 (번체)"
  },
  "card2": {
    "label": "번체 소라벨 (예: 招牌菜色)",
    "title": "대표 메뉴명 번체 번역 — 짧고 임팩트 있게 (20자 이내)",
    "highlight": "강조 키워드 2~4자 (번체)",
    "body": ""
  },
  "card3": {
    "category": "번체 소카테고리 (예: 用餐環境)",
    "title": "분위기·특징 핵심 한 줄 (번체, 20자 이내)",
    "body": "",
    "highlight": "",
    "tip": ""
  },
  "card4": {
    "category": "번체 소카테고리 (예: 菜單精選)",
    "title": "",
    "items": [
      { "tag": "", "title": "메뉴명 번체 번역 5자 이내", "desc": "" },
      { "tag": "", "title": "메뉴명 번체 번역 5자 이내", "desc": "" },
      { "tag": "", "title": "메뉴명 번체 번역 5자 이내", "desc": "" }
    ]
  },
  "card5": {
    "main": "",
    "subtitle": "영문 주소 또는 키워드 + 한국어 원문 주소 (한 줄)",
    "cta": "행동 유도 짧은 문구 (번체, 예: 收藏起來 / 立刻出發)"
  },
  "caption": "인스타그램 캡션 150자 이내, 繁體中文, 대만 여행자 공감 유도, 이모지 1~2개"
}`;
}

function buildNormalPrompt(topic: string): string {
  return `대만 마케팅 전문 에이전시 TIANXIA의 인스타그램 카드뉴스 콘텐츠를 생성해주세요.

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
}`;
}
