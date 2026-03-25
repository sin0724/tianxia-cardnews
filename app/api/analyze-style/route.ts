import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import type { CardStyleConfig } from "@/components/DynamicCards";
import { getApiKey, missingKeyResponse, friendlyError } from "@/lib/getApiKey";

export async function POST(req: NextRequest) {
  const apiKey = getApiKey(req);
  if (!apiKey) return missingKeyResponse();

  try {
    const { images } = (await req.json()) as {
      images: Array<{ base64: string; mediaType: "image/jpeg" | "image/png" | "image/gif" | "image/webp" }>;
    };

    if (!images || images.length === 0) {
      return NextResponse.json({ error: "이미지 데이터가 없습니다." }, { status: 400 });
    }

    const client = new Anthropic({ apiKey });

    const imageBlocks = images.map((img) => ({
      type: "image" as const,
      source: {
        type: "base64" as const,
        media_type: img.mediaType,
        data: img.base64,
      },
    }));

    const introText = images.length > 1
      ? `아래 ${images.length}장의 이미지는 카드뉴스 한 세트입니다. 전체 세트의 공통 색상, 스타일, 분위기를 종합 분석해서 아래 JSON 형식으로 출력해주세요.`
      : "이 이미지는 카드뉴스/인스타그램 포스트 디자인 레퍼런스입니다.\n이미지의 색상, 스타일, 분위기를 분석해서 아래 JSON 형식으로 출력해주세요.";

    const response = await client.messages.create({
      model: "claude-opus-4-6",
      max_tokens: 1200,
      messages: [
        {
          role: "user",
          content: [
            ...imageBlocks,
            {
              type: "text",
              text: `${introText}

분석 기준:
- 주요 포인트 색상 (가장 눈에 띄는 강조색)
- 배경 색상 계열 (밝은/어두운/컬러풀)
- 텍스트 색상
- 디자인 스타일 (모던, 클래식, 미니멀, 볼드 등)
- 모서리 스타일 (날카로운/둥근)

JSON만 출력하세요 (설명 없이):
{
  "name": "스타일 이름 (예: 오렌지 볼드, 네이비 미니멀)",
  "primary": "#색상코드 - 주요 포인트/강조 색상",
  "coverBg": "#색상코드 - 커버 카드 배경색 (가장 임팩트 있는 배경)",
  "darkCardBg": "#색상코드 - 어두운 배경 카드용 색상",
  "lightCardBg": "#색상코드 - 밝은 배경 카드용 색상 (흰색 또는 연한 색)",
  "accentBg": "#색상코드 - TIP박스/강조 영역 배경 (primary와 동일하거나 유사)",
  "textOnPrimary": "#색상코드 - 포인트 배경 위 텍스트 (보통 흰색)",
  "textOnDark": "#색상코드 - 어두운 배경 위 텍스트 (보통 흰색 계열)",
  "textOnLight": "#색상코드 - 밝은 배경 위 텍스트 (보통 어두운 색)",
  "mutedOnDark": "rgba(255,255,255,0.6) 형식 - 어두운 배경 위 흐린 텍스트",
  "mutedOnLight": "#색상코드 - 밝은 배경 위 흐린 텍스트 (회색 계열)",
  "cornerRadius": 숫자 - 박스/뱃지 모서리(px): 0=직각, 8=약간, 16=중간, 32=둥글게, 40=매우둥글게,
  "badgeStyle": "filled" 또는 "outlined" 또는 "pill",
  "accentType": "bar" 또는 "line" 또는 "box" 또는 "none"
}`,
            },
          ],
        },
      ],
    });

    const text =
      response.content[0].type === "text" ? response.content[0].text : "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("스타일 분석 결과를 파싱할 수 없습니다.");

    const parsed = JSON.parse(jsonMatch[0]) as Omit<CardStyleConfig, "id">;

    const config: CardStyleConfig = {
      ...parsed,
      id: `custom_${Date.now()}`,
    };

    return NextResponse.json(config);
  } catch (e) {
    return NextResponse.json({ error: friendlyError(e) }, { status: 500 });
  }
}
