import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  if (error || !code) {
    return new NextResponse(
      `<html><body style="font-family:sans-serif;padding:40px">
        <h2>❌ 네이버 인증 실패</h2>
        <p>${error ?? "code 없음"}</p>
      </body></html>`,
      { headers: { "Content-Type": "text/html" } }
    );
  }

  const clientId = process.env.NAVER_CLIENT_ID ?? "";
  const clientSecret = process.env.NAVER_CLIENT_SECRET ?? "";
  const proto = req.headers.get("x-forwarded-proto") ?? "https";
  const host = req.headers.get("host") ?? "localhost:3000";
  const redirectUri = `${proto}://${host}/api/naver/callback`;

  const tokenUrl = new URL("https://nid.naver.com/oauth2.0/token");
  tokenUrl.searchParams.set("grant_type", "authorization_code");
  tokenUrl.searchParams.set("client_id", clientId);
  tokenUrl.searchParams.set("client_secret", clientSecret);
  tokenUrl.searchParams.set("code", code);
  tokenUrl.searchParams.set("redirect_uri", redirectUri);

  const res = await fetch(tokenUrl.toString());
  const data = (await res.json()) as {
    access_token?: string;
    refresh_token?: string;
    error_description?: string;
  };

  if (!data.refresh_token) {
    return new NextResponse(
      `<html><body style="font-family:sans-serif;padding:40px">
        <h2>❌ 토큰 발급 실패</h2>
        <pre>${JSON.stringify(data, null, 2)}</pre>
      </body></html>`,
      { headers: { "Content-Type": "text/html" } }
    );
  }

  return new NextResponse(
    `<html><body style="font-family:sans-serif;padding:40px;max-width:700px">
      <h2>✅ 네이버 인증 완료</h2>
      <p>아래 <strong>NAVER_REFRESH_TOKEN</strong> 값을 Railway 환경변수에 저장하세요.</p>
      <hr>
      <p><strong>NAVER_REFRESH_TOKEN</strong></p>
      <textarea rows="3" style="width:100%;font-family:monospace;font-size:13px;padding:8px"
        onclick="this.select()">${data.refresh_token}</textarea>
      <hr>
      <p style="color:#666;font-size:13px">
        access_token (참고용, 저장 불필요): ${data.access_token?.slice(0, 20)}...
      </p>
      <p style="margin-top:24px">
        Railway 대시보드 → 서비스 → Variables → <code>NAVER_REFRESH_TOKEN</code> 추가 후 재배포하세요.
      </p>
    </body></html>`,
    { headers: { "Content-Type": "text/html; charset=utf-8" } }
  );
}
