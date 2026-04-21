/**
 * 로컬 HTTP 서버 — Windows 시작 시 자동 실행
 * 브라우저(Railway UI)에서 localhost:3939 직접 호출 → 즉시 Playwright 포스팅
 */
import * as http from "http";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { postToNaverBlogPlaywright } from "../lib/naverBlogPlaywright";

function loadEnv(): void {
  const envPath = path.join(__dirname, "..", ".env.local");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf-8").split("\n")) {
    const m = line.match(/^([^#=\s][^=]*)=(.*)/);
    if (m) process.env[m[1].trim()] = m[2].trim().replace(/^['"]|['"]$/g, "");
  }
}

loadEnv();

const PORT        = 3939;
const NAVER_ID    = process.env.NAVER_ID ?? "";
const NAVER_PW    = process.env.NAVER_PW ?? "";
const NAVER_BLOG_ID = process.env.NAVER_BLOG_ID ?? NAVER_ID;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Content-Type": "application/json",
};

let busy = false;

function respond(res: http.ServerResponse, status: number, body: object): void {
  res.writeHead(status, CORS_HEADERS);
  res.end(JSON.stringify(body));
}

async function handlePost(body: {
  title: string;
  content: string;
  tags?: string[];
  images?: string[];
}): Promise<string> {
  const { title, content, tags = [], images = [] } = body;

  const tmpDir = path.join(os.tmpdir(), `tianxia-post-${Date.now()}`);
  const imagePaths: string[] = [];

  if (images.length > 0) {
    fs.mkdirSync(tmpDir, { recursive: true });
    for (let i = 0; i < images.length; i++) {
      const base64 = images[i].replace(/^data:image\/\w+;base64,/, "");
      const filePath = path.join(tmpDir, `card_${i + 1}.png`);
      fs.writeFileSync(filePath, Buffer.from(base64, "base64"));
      imagePaths.push(filePath);
    }
  }

  try {
    const url = await postToNaverBlogPlaywright(
      NAVER_ID, NAVER_PW, NAVER_BLOG_ID,
      title, content, tags, imagePaths
    );
    return url;
  } finally {
    if (fs.existsSync(tmpDir)) fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

const server = http.createServer((req, res) => {
  if (req.method === "OPTIONS") {
    res.writeHead(204, CORS_HEADERS);
    res.end();
    return;
  }

  if (req.method === "GET" && req.url === "/health") {
    respond(res, 200, { ok: true, busy });
    return;
  }

  if (req.method === "POST" && req.url === "/post") {
    if (busy) {
      respond(res, 429, { error: "이미 포스팅 진행 중입니다. 잠시 후 다시 시도하세요." });
      return;
    }
    if (!NAVER_ID || !NAVER_PW) {
      respond(res, 500, { error: "NAVER_ID / NAVER_PW 미설정 — .env.local 확인" });
      return;
    }

    let raw = "";
    req.on("data", (chunk) => { raw += chunk; });
    req.on("end", () => {
      let body: { title: string; content: string; tags?: string[]; images?: string[] };
      try {
        body = JSON.parse(raw);
      } catch {
        respond(res, 400, { error: "JSON 파싱 오류" });
        return;
      }

      if (!body.title || !body.content) {
        respond(res, 400, { error: "title, content 필수" });
        return;
      }

      busy = true;
      console.log(`[서버] 포스팅 시작: "${body.title}"`);

      handlePost(body)
        .then((postUrl) => {
          console.log(`[서버] 포스팅 완료: ${postUrl}`);
          respond(res, 200, { ok: true, postUrl });
        })
        .catch((e: unknown) => {
          const msg = e instanceof Error ? e.message : String(e);
          console.error(`[서버] 포스팅 오류:`, msg);
          respond(res, 500, { error: msg });
        })
        .finally(() => { busy = false; });
    });
    return;
  }

  respond(res, 404, { error: "Not found" });
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`[서버] localhost:${PORT} 시작 — ${new Date().toLocaleString("ko-KR")}`);
});
