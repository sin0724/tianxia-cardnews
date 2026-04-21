import { NextRequest, NextResponse } from "next/server";
import fs from "fs";

const FILE = "/tmp/tianxia-pending-post.json";

export interface PendingPost {
  title: string;
  content: string;
  tags: string[];
  topic: string;
  savedAt: string;
}

export async function GET() {
  try {
    const data = JSON.parse(fs.readFileSync(FILE, "utf-8")) as PendingPost;
    return NextResponse.json(data);
  } catch {
    return NextResponse.json(null);
  }
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as PendingPost;
  fs.writeFileSync(FILE, JSON.stringify({ ...body, savedAt: new Date().toISOString() }));
  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  try { fs.unlinkSync(FILE); } catch { /* 없으면 무시 */ }
  return NextResponse.json({ ok: true });
}
