/**
 * 로컬 HTTP 서버 — Windows 시작 시 자동 실행
 * - POST /post       : 즉시 Playwright 포스팅
 * - GET  /schedules  : 로컬 스케줄 목록
 * - POST /schedules  : 스케줄 추가/토글/삭제
 * - GET  /health     : 서버 상태
 */
import * as http from "http";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { postToNaverBlogPlaywright } from "../lib/naverBlogPlaywright";
import { postToNaverCafe, type CafeBoardKey } from "../lib/naverCafePlaywright";

function loadEnv(): void {
  const envPath = path.join(__dirname, "..", ".env.local");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf-8").split("\n")) {
    const m = line.match(/^([^#=\s][^=]*)=(.*)/);
    if (m) process.env[m[1].trim()] = m[2].trim().replace(/^['"]|['"]$/g, "");
  }
}

loadEnv();

const PORT          = 3939;
const NAVER_ID      = process.env.NAVER_ID ?? "";
const NAVER_PW      = process.env.NAVER_PW ?? "";
const NAVER_BLOG_ID = process.env.NAVER_BLOG_ID ?? NAVER_ID;
const SCHEDULE_FILE = path.join(__dirname, "..", "tianxia-schedules.json");

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Content-Type": "application/json",
};

// ── 스케줄 CRUD ──────────────────────────────────────────────────────────────

interface ScheduleEntry {
  id: string;
  label: string;
  type: "daily" | "weekly" | "once";
  time: string;
  weekdays?: number[];
  date?: string;
  enabled: boolean;
  createdAt: string;
  lastRanAt?: string;
}

function loadSchedules(): ScheduleEntry[] {
  try {
    return JSON.parse(fs.readFileSync(SCHEDULE_FILE, "utf-8")) as ScheduleEntry[];
  } catch {
    return [];
  }
}

function saveSchedules(entries: ScheduleEntry[]): void {
  fs.writeFileSync(SCHEDULE_FILE, JSON.stringify(entries, null, 2));
}

// ── 포스팅 ───────────────────────────────────────────────────────────────────

let busy = false;

function respond(res: http.ServerResponse, status: number, body: object): void {
  res.writeHead(status, CORS_HEADERS);
  res.end(JSON.stringify(body));
}

function readBody(req: http.IncomingMessage): Promise<string> {
  return new Promise((resolve) => {
    let raw = "";
    req.on("data", (chunk) => { raw += chunk; });
    req.on("end", () => resolve(raw));
  });
}

async function saveImages(images: string[], prefix: string): Promise<{ tmpDir: string; paths: string[] }> {
  const tmpDir = path.join(os.tmpdir(), `${prefix}-${Date.now()}`);
  const paths: string[] = [];
  if (images.length > 0) {
    fs.mkdirSync(tmpDir, { recursive: true });
    for (let i = 0; i < images.length; i++) {
      const base64 = images[i].replace(/^data:image\/\w+;base64,/, "");
      const filePath = path.join(tmpDir, `card_${i + 1}.png`);
      fs.writeFileSync(filePath, Buffer.from(base64, "base64"));
      paths.push(filePath);
    }
  }
  return { tmpDir, paths };
}

async function handlePost(body: {
  title: string; content: string; tags?: string[]; images?: string[];
}): Promise<string> {
  const { title, content, tags = [], images = [] } = body;
  const { tmpDir, paths: imagePaths } = await saveImages(images, "tianxia-post");
  try {
    return await postToNaverBlogPlaywright(
      NAVER_ID, NAVER_PW, NAVER_BLOG_ID, title, content, tags, imagePaths
    );
  } finally {
    if (fs.existsSync(tmpDir)) fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

async function handleCafePost(body: {
  title: string; content: string; board: CafeBoardKey; images?: string[];
}): Promise<string> {
  const { title, content, board, images = [] } = body;
  const { tmpDir, paths: imagePaths } = await saveImages(images, "tianxia-cafe");
  try {
    return await postToNaverCafe(NAVER_ID, NAVER_PW, board, title, content, imagePaths);
  } finally {
    if (fs.existsSync(tmpDir)) fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

// ── 라우터 ───────────────────────────────────────────────────────────────────

const server = http.createServer(async (req, res) => {
  if (req.method === "OPTIONS") {
    res.writeHead(204, CORS_HEADERS);
    res.end();
    return;
  }

  const url = req.url ?? "/";

  // GET /health
  if (req.method === "GET" && url === "/health") {
    respond(res, 200, { ok: true, busy });
    return;
  }

  // GET /schedules
  if (req.method === "GET" && url === "/schedules") {
    respond(res, 200, loadSchedules());
    return;
  }

  // POST /schedules  — body: { action?, ...fields }
  if (req.method === "POST" && url === "/schedules") {
    const raw = await readBody(req);
    let body: Record<string, unknown>;
    try { body = JSON.parse(raw); } catch {
      respond(res, 400, { error: "invalid JSON" });
      return;
    }

    const action = body.action as string | undefined;
    const schedules = loadSchedules();

    if (action === "delete") {
      saveSchedules(schedules.filter((s) => s.id !== body.id));
      respond(res, 200, { ok: true });
      return;
    }

    if (action === "toggle") {
      saveSchedules(schedules.map((s) =>
        s.id === body.id ? { ...s, enabled: !s.enabled } : s
      ));
      respond(res, 200, { ok: true });
      return;
    }

    // Add new schedule
    const weekdayNames = ["일", "월", "화", "수", "목", "금", "토"];
    const type = body.type as ScheduleEntry["type"];
    const weekdays = body.weekdays as number[] | undefined;
    const date = body.date as string | undefined;
    const time = body.time as string;

    const label =
      type === "weekly" && weekdays?.length
        ? `매주 ${weekdays.map((d) => weekdayNames[d]).join("/")} ${time}`
        : type === "daily"
        ? `매일 ${time}`
        : `${date} ${time} 한 번`;

    const newEntry: ScheduleEntry = {
      id: `sched_${Date.now()}`,
      label,
      type,
      time,
      weekdays: type === "weekly" ? weekdays : undefined,
      date: type === "once" ? date : undefined,
      enabled: true,
      createdAt: new Date().toISOString(),
    };
    saveSchedules([...schedules, newEntry]);
    respond(res, 200, newEntry);
    return;
  }

  // POST /post
  if (req.method === "POST" && url === "/post") {
    if (busy) {
      respond(res, 429, { error: "posting in progress, please wait" });
      return;
    }
    if (!NAVER_ID || !NAVER_PW) {
      respond(res, 500, { error: "NAVER_ID / NAVER_PW not set in .env.local" });
      return;
    }

    const raw = await readBody(req);
    let body: { title: string; content: string; tags?: string[]; images?: string[] };
    try { body = JSON.parse(raw); } catch {
      respond(res, 400, { error: "invalid JSON" });
      return;
    }
    if (!body.title || !body.content) {
      respond(res, 400, { error: "title and content required" });
      return;
    }

    busy = true;
    console.log(`[server] posting: "${body.title}"`);
    handlePost(body)
      .then((postUrl) => {
        console.log(`[server] done: ${postUrl}`);
        respond(res, 200, { ok: true, postUrl });
      })
      .catch((e: unknown) => {
        const msg = e instanceof Error ? e.message : String(e);
        console.error(`[server] error:`, msg);
        respond(res, 500, { error: msg });
      })
      .finally(() => { busy = false; });
    return;
  }

  // POST /cafe-post
  if (req.method === "POST" && url === "/cafe-post") {
    if (busy) {
      respond(res, 429, { error: "posting in progress, please wait" });
      return;
    }
    if (!NAVER_ID || !NAVER_PW) {
      respond(res, 500, { error: "NAVER_ID / NAVER_PW not set in .env.local" });
      return;
    }

    const raw = await readBody(req);
    let body: { title: string; content: string; board: CafeBoardKey; images?: string[] };
    try { body = JSON.parse(raw); } catch {
      respond(res, 400, { error: "invalid JSON" });
      return;
    }
    if (!body.title || !body.content || !body.board) {
      respond(res, 400, { error: "title, content, board required" });
      return;
    }

    busy = true;
    console.log(`[server] cafe posting: "${body.title}" → ${body.board}`);
    handleCafePost(body)
      .then((postUrl) => {
        console.log(`[server] cafe done: ${postUrl}`);
        respond(res, 200, { ok: true, postUrl });
      })
      .catch((e: unknown) => {
        const msg = e instanceof Error ? e.message : String(e);
        console.error(`[server] cafe error:`, msg);
        respond(res, 500, { error: msg });
      })
      .finally(() => { busy = false; });
    return;
  }

  respond(res, 404, { error: "not found" });
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`[server] localhost:${PORT} started — ${new Date().toLocaleString("ko-KR")}`);
});
