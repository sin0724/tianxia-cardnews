import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

export async function GET(req: NextRequest) {
  const clientId = process.env.NAVER_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json({ error: "NAVER_CLIENT_ID 환경변수가 설정되지 않았습니다." }, { status: 500 });
  }

  const proto = req.headers.get("x-forwarded-proto") ?? "https";
  const host = req.headers.get("host") ?? "localhost:3000";
  const redirectUri = `${proto}://${host}/api/naver/callback`;

  const state = crypto.randomBytes(16).toString("hex");

  const authUrl = new URL("https://nid.naver.com/oauth2.0/authorize");
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("state", state);

  return NextResponse.redirect(authUrl.toString());
}
