import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const FILE = path.join("/tmp", "tianxia-pending-post.json");

export interface PendingPost {
  title: string;
  content: string;
  tags: string[];
  images?: string[];   // base64 JPEG
  savedAt: string;
}

export async function GET() {
  try {
    const raw = fs.readFileSync(FILE, "utf-8");
    return NextResponse.json(JSON.parse(raw) as PendingPost);
  } catch {
    return NextResponse.json(null);
  }
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as PendingPost;
  fs.writeFileSync(FILE, JSON.stringify({ ...body, savedAt: new Date().toISOString() }));
  return NextResponse.json({ success: true });
}

export async function DELETE() {
  try { fs.unlinkSync(FILE); } catch { /* 없으면 무시 */ }
  return NextResponse.json({ success: true });
}
