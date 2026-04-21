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
  try {
    const raw = fs.readFileSync(CONFIG_PATH, "utf-8");
    const accounts = JSON.parse(raw) as NaverAccount[];
    return accounts.filter((a) => a.enabled !== false && a.naverId && a.naverPw);
  } catch {
    return [];
  }
}

export function saveAccounts(accounts: NaverAccount[]): void {
  const dir = path.dirname(CONFIG_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(accounts, null, 2), "utf-8");
}
