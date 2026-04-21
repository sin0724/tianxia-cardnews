import fs from "fs";

const SCHEDULE_FILE = "/tmp/tianxia-schedules.json";

export interface ScheduleEntry {
  id: string;
  label: string;
  type: "daily" | "weekly" | "once";
  time: string;         // "HH:MM" KST
  weekdays?: number[];  // 0=일,1=월,2=화,3=수,4=목,5=금,6=토 — weekly 타입
  date?: string;        // "YYYY-MM-DD" — once 타입
  enabled: boolean;
  createdAt: string;
  lastRanAt?: string;
}

export function loadSchedules(): ScheduleEntry[] {
  try {
    return JSON.parse(fs.readFileSync(SCHEDULE_FILE, "utf-8")) as ScheduleEntry[];
  } catch {
    return [];
  }
}

export function saveSchedules(entries: ScheduleEntry[]): void {
  try {
    fs.writeFileSync(SCHEDULE_FILE, JSON.stringify(entries, null, 2));
  } catch { /* ignore */ }
}

export function addSchedule(entry: Omit<ScheduleEntry, "id" | "createdAt">): ScheduleEntry {
  const schedules = loadSchedules();
  const newEntry: ScheduleEntry = {
    ...entry,
    id: `sched_${Date.now()}`,
    createdAt: new Date().toISOString(),
  };
  saveSchedules([...schedules, newEntry]);
  return newEntry;
}

export function removeSchedule(id: string): void {
  const schedules = loadSchedules().filter((s) => s.id !== id);
  saveSchedules(schedules);
}

export function toggleSchedule(id: string): void {
  const schedules = loadSchedules().map((s) =>
    s.id === id ? { ...s, enabled: !s.enabled } : s
  );
  saveSchedules(schedules);
}

export function markRan(id: string): void {
  const schedules = loadSchedules().map((s) =>
    s.id === id ? { ...s, lastRanAt: new Date().toISOString() } : s
  );
  saveSchedules(schedules);
}

/** 현재 시각(KST)에 실행해야 할 스케줄 반환 */
export function getDueSchedules(nowKST: Date): ScheduleEntry[] {
  const HH = String(nowKST.getHours()).padStart(2, "0");
  const MM = String(nowKST.getMinutes()).padStart(2, "0");
  const currentTime = `${HH}:${MM}`;
  const currentDate = nowKST.toISOString().slice(0, 10);
  const currentDay = nowKST.getDay(); // 0=일...6=토

  return loadSchedules().filter((s) => {
    if (!s.enabled) return false;
    if (s.time !== currentTime) return false;

    if (s.type === "once") {
      if (s.date !== currentDate) return false;
    } else if (s.type === "weekly") {
      if (!s.weekdays?.includes(currentDay)) return false;
    }
    // daily: 요일 무관

    // 같은 분에 이미 실행됐으면 스킵
    if (s.lastRanAt) {
      const lastKST = new Date(new Date(s.lastRanAt).getTime() + 9 * 60 * 60 * 1000);
      if (
        lastKST.getHours() === nowKST.getHours() &&
        lastKST.getMinutes() === nowKST.getMinutes() &&
        lastKST.toISOString().slice(0, 10) === currentDate
      ) {
        return false;
      }
    }
    return true;
  });
}

export const WEEKDAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"] as const;
