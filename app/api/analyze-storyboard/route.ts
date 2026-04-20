import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import type { StoryboardTemplate } from "@/components/FlexCard";
import { getApiKey, missingKeyResponse, friendlyError } from "@/lib/getApiKey";

export async function POST(req: NextRequest) {
  const apiKey = getApiKey(req);
  if (!apiKey) return missingKeyResponse();

  try {
    const { image } = (await req.json()) as {
      image: { base64: string; mediaType: "image/jpeg" | "image/png" | "image/gif" | "image/webp" };
    };

    if (!image) {
      return NextResponse.json({ error: "이미지 데이터가 없습니다." }, { status: 400 });
    }

    const client = new Anthropic({ apiKey });

    const response = await client.messages.create({
      model: "claude-opus-4-6",
      max_tokens: 8000,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: { type: "base64", media_type: image.mediaType, data: image.base64 },
            },
            {
              type: "text",
              text: `이 이미지는 앱/서비스 디자인 스토리보드입니다. 여러 화면이 한 장에 배치되어 있으며 색상 팔레트, 타이포그래피 가이드가 포함될 수 있습니다.

이 스토리보드의 시각적 디자인 언어를 완전히 분석하고, 카드뉴스 5장의 레이아웃을 스토리보드 스타일과 최대한 유사하게 설계해주세요.

━━ 카드 규격 ━━
크기: 1080 × 1350 px (세로형)
구성: 커버 / 훅 / 인사이트 / 리스트 / CTA

━━ 레이아웃 구조 ━━
각 카드는 세로 flexbox 컬럼입니다. elements 배열이 위에서 아래로 쌓입니다.

━━ 요소 타입 ━━
"spacer"  - 남은 공간을 채움. flex 값으로 비율 조정 (예: flex:1)
"text"    - 일반 텍스트 블록
"divider" - 수평 구분선 또는 장식 바. height/color/width 지정
"button"  - CTA 버튼. background/color/borderRadius/paddingX/paddingY
"box"     - 배경색 있는 텍스트 박스 (TIP, 강조 영역 등). background/borderRadius/paddingX/paddingY + 텍스트 속성

━━ 공통 속성 ━━
fontSize: px 단위 숫자 (1080px 기준 — 대형제목 80~120, 소제목 40~60, 본문 28~36, 뱃지 22~28)
fontWeight: "300"|"400"|"500"|"600"|"700"|"800"|"900"
color: hex 또는 rgba()
textAlign: "left"|"center"|"right"
lineHeight: 배수 (예: 1.3)
letterSpacing: em 단위 문자열 (예: "-0.02em")
background: hex, rgba(), 또는 "linear-gradient(...)"
borderRadius: px 숫자
paddingX: 좌우 여백 px
paddingY: 상하 여백 px
marginTop: px 숫자
marginBottom: px 숫자
width: "100%"|"auto"|"60%" 등
alignSelf: "flex-start"|"flex-end"|"center"|"stretch"
opacity: 0~1
border: CSS border 문자열 (예: "2px solid rgba(255,255,255,0.3)")
flex: spacer에서 사용, 빈 공간 비율
height: divider 높이 px

━━ content 변수 ━━
카드1(커버):     {{badge}}, {{title_line1}}, {{title_line2}}, {{subtitle}}
카드2(훅):       {{label}}, {{title}}, {{highlight}}, {{body}}
카드3(인사이트): {{category}}, {{title}}, {{body}}, {{highlight}}, {{tip}}
카드4(리스트):   {{category}}, {{title}}, {{items.0.tag}}, {{items.0.title}}, {{items.0.desc}}, {{items.1.tag}}, {{items.1.title}}, {{items.1.desc}}, {{items.2.tag}}, {{items.2.title}}, {{items.2.desc}}
카드5(CTA):      {{main}}, {{subtitle}}, {{cta}}

━━ 중요 지침 ━━
- 스토리보드의 색상을 정확히 추출해 사용하세요
- 스토리보드의 텍스트 배치 스타일(상단집중/하단집중/중앙정렬 등)을 반영하세요
- 스토리보드의 버튼·뱃지·카드 형태를 반영하세요
- 여백(paddingX, paddingY)은 스토리보드 느낌에 맞게 설정하세요
- spacer를 적극 활용해 텍스트가 한쪽에 몰리지 않게 자연스러운 레이아웃을 만드세요
- 각 카드가 서로 다른 배경·레이아웃을 가지도록 다양하게 설계하세요

━━ 출력 형식 ━━
JSON만 출력하세요 (설명, 주석, 마크다운 없이):
{
  "name": "스타일 이름",
  "cards": [
    {
      "background": "...",
      "paddingX": 80,
      "paddingY": 100,
      "elements": [...]
    },
    { ... },
    { ... },
    { ... },
    { ... }
  ]
}`,
            },
          ],
        },
      ],
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("레이아웃 분석 결과를 파싱할 수 없습니다.");

    const parsed = JSON.parse(jsonMatch[0]) as Omit<StoryboardTemplate, "id">;

    if (!parsed.cards || parsed.cards.length !== 5) {
      throw new Error("카드 5장 레이아웃을 생성하지 못했습니다.");
    }

    const template: StoryboardTemplate = {
      ...parsed,
      id: `storyboard_${Date.now()}`,
    };

    return NextResponse.json(template);
  } catch (e) {
    return NextResponse.json({ error: friendlyError(e) }, { status: 500 });
  }
}
