import { NextRequest, NextResponse } from "next/server";
import {
  loadSchedules,
  addSchedule,
  removeSchedule,
  toggleSchedule,
  markRan,
  getDueSchedules,
  type ScheduleEntry,
} from "@/lib/scheduler";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  if (searchParams.get("due") === "1") {
    const nowKST = new Date(Date.now() + 9 * 60 * 60 * 1000);
    return NextResponse.json(getDueSchedules(nowKST));
  }

  return NextResponse.json(loadSchedules());
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as Partial<ScheduleEntry> & { action?: string };

  if (body.action === "toggle" && body.id) {
    toggleSchedule(body.id);
    return NextResponse.json({ ok: true });
  }

  if (body.action === "delete" && body.id) {
    removeSchedule(body.id);
    return NextResponse.json({ ok: true });
  }

  if (body.action === "mark-ran" && body.id) {
    markRan(body.id);
    return NextResponse.json({ ok: true });
  }

  if (!body.time || !body.type) {
    return NextResponse.json({ error: "time, type 필수" }, { status: 400 });
  }

  const weekdayNames = ["일", "월", "화", "수", "목", "금", "토"];
  const label =
    body.type === "weekly" && body.weekdays?.length
      ? `매주 ${body.weekdays.map((d) => weekdayNames[d]).join("/")} ${body.time}`
      : body.type === "daily"
      ? `매일 ${body.time}`
      : `${body.date} ${body.time} 한 번`;

  const entry = addSchedule({
    label,
    type: body.type,
    time: body.time,
    weekdays: body.type === "weekly" ? body.weekdays : undefined,
    date: body.type === "once" ? body.date : undefined,
    enabled: true,
  });

  return NextResponse.json(entry);
}
