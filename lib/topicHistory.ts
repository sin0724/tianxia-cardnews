import fs from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");
const HISTORY_FILE = path.join(DATA_DIR, "used-topics.json");
const MAX_HISTORY = 90;

export function loadUsedTopics(): string[] {
  try {
    const raw = fs.readFileSync(HISTORY_FILE, "utf-8");
    return JSON.parse(raw) as string[];
  } catch {
    return [];
  }
}

export function saveUsedTopics(topics: string[]): void {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(HISTORY_FILE, JSON.stringify(topics.slice(-MAX_HISTORY)));
  } catch {
    // ignore write failures in read-only environments
  }
}

export function pickUnusedTopic(suggestions: string[], used: string[]): string {
  const usedSet = new Set(used);
  return suggestions.find((t) => !usedSet.has(t)) ?? suggestions[0];
}
