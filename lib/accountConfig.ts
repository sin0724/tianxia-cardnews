import fs from "fs";
import path from "path";

export interface NaverAccount {
  name: string;
  naverId: string;
  naverPw: string;
  blogId: string;
  enabled?: boolean;
}

const CONFIG_PATH = path.join(process.cwd(), "config", "naver-accounts.json");

export function loadAccounts(): NaverAccount[] {
  // 파일 경로 후보: process.cwd() 기반 + __dirname 기반 (Next.js 빌드 경로 대응)
  const candidates = [
    CONFIG_PATH,
    path.join(__dirname, "..", "..", "config", "naver-accounts.json"),
    path.join(__dirname, "..", "config", "naver-accounts.json"),
  ];

  for (const p of candidates) {
    try {
      if (!fs.existsSync(p)) continue;
      const raw = fs.readFileSync(p, "utf-8");
      const accounts = JSON.parse(raw) as NaverAccount[];
      const filtered = accounts.filter((a) => a.enabled !== false && a.naverId && a.naverPw);
      if (filtered.length > 0) return filtered;
    } catch { /* 다음 경로 시도 */ }
  }

  // 환경변수 폴백
  const naverId = process.env.NAVER_ID;
  const naverPw = process.env.NAVER_PW;
  const blogId  = process.env.NAVER_BLOG_ID ?? naverId;
  if (naverId && naverPw) {
    return [{ name: "기본", naverId, naverPw, blogId: blogId ?? naverId }];
  }

  return [];
}

export function saveAccounts(accounts: NaverAccount[]): void {
  const dir = path.dirname(CONFIG_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(accounts, null, 2), "utf-8");
}
