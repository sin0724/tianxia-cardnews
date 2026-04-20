export async function refreshNaverToken(
  clientId: string,
  clientSecret: string,
  refreshToken: string
): Promise<string> {
  const url = new URL("https://nid.naver.com/oauth2.0/token");
  url.searchParams.set("grant_type", "refresh_token");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("client_secret", clientSecret);
  url.searchParams.set("refresh_token", refreshToken);

  const res = await fetch(url.toString());
  const data = (await res.json()) as { access_token?: string; error_description?: string };

  if (!data.access_token) {
    throw new Error(`네이버 토큰 갱신 실패: ${data.error_description ?? "unknown"}`);
  }
  return data.access_token;
}

export async function postToNaverBlog(
  accessToken: string,
  title: string,
  content: string,
  tags: string[]
): Promise<string> {
  const htmlContent = content
    .split("\n\n")
    .filter(Boolean)
    .map((p) => `<p>${p.replace(/\n/g, "<br>")}</p>`)
    .join("\n");

  const body = new URLSearchParams({
    title,
    contents: htmlContent,
    tags: tags.slice(0, 10).join(","),
    publishFlag: "Y",
  });

  const res = await fetch("https://openapi.naver.com/blog/writePost.json", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
  });

  const data = (await res.json()) as { result?: { postUrl?: string }; message?: string };

  if (!res.ok) {
    throw new Error(`네이버 블로그 포스팅 실패: ${data.message ?? res.statusText}`);
  }
  return data.result?.postUrl ?? "";
}
