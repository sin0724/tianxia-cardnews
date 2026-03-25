import { NextRequest } from "next/server";

/**
 * 요청 헤더에서 사용자 API 키를 추출합니다.
 * 우선순위: 요청 헤더 x-user-api-key → 서버 환경변수 ANTHROPIC_API_KEY
 */
export function getApiKey(req: NextRequest): string {
  return (
    req.headers.get("x-user-api-key")?.trim() ||
    process.env.ANTHROPIC_API_KEY?.trim() ||
    ""
  );
}

export function missingKeyResponse() {
  return Response.json(
    {
      error:
        "API 키가 설정되지 않았습니다. 우측 상단 ⚙️ 설정에서 Anthropic API 키를 입력해주세요.",
    },
    { status: 401 }
  );
}
