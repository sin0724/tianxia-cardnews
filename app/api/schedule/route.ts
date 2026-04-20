import { NextRequest, NextResponse } from "next/server";
import {
  loadSchedules,
  addSchedule,
  removeSchedule,
  toggleSchedule,
  type ScheduleEntry,
} from "@/lib/scheduler";

export async function GET() {
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

  if (!body.time || !body.type) {
    return NextResponse.json({ error: "time, type 필수" }, { status: 400 });
  }

  const entry = addSchedule({
    label: body.label || `${body.type === "daily" ? "매일" : body.date ?? "한번만"} ${body.time}`,
    type: body.type,
    time: body.time,
    date: body.date,
    enabled: true,
  });

  return NextResponse.json(entry);
}
