import { NextRequest } from "next/server";

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

/**
 * Anthropic API 에러를 한국어 메시지로 변환합니다.
 */
export function friendlyError(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e);

  if (msg.includes("credit balance is too low") || msg.includes("Your credit balance")) {
    return "API 크레딧이 부족합니다. Anthropic 콘솔(console.anthropic.com)에서 크레딧을 충전해주세요.";
  }
  if (msg.includes("invalid x-api-key") || msg.includes("authentication_error")) {
    return "API 키가 올바르지 않습니다. ⚙️ 설정에서 키를 다시 확인해주세요.";
  }
  if (msg.includes("rate_limit_error") || msg.includes("rate limit")) {
    return "요청이 너무 많습니다. 잠시 후 다시 시도해주세요.";
  }
  if (msg.includes("overloaded_error") || msg.includes("overloaded")) {
    return "Anthropic 서버가 일시적으로 혼잡합니다. 잠시 후 다시 시도해주세요.";
  }

  return msg || "알 수 없는 오류가 발생했습니다.";
}
