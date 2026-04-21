import { NextRequest, NextResponse } from "next/server";
import { getApiKey, missingKeyResponse, friendlyError } from "@/lib/getApiKey";
import { loadAccounts, type NaverAccount } from "@/lib/accountConfig";
import { postToNaverBlogPlaywright } from "@/lib/naverBlogPlaywright";
import type { PendingPost } from "@/app/api/pending-post/route";
import fs from "fs";
import path from "path";
import os from "os";

function getAccount(): NaverAccount | undefined {
  const naverId = process.env.NAVER_ID;
  const naverPw = process.env.NAVER_PW;
  const blogId  = process.env.NAVER_BLOG_ID ?? naverId;
  if (naverId && naverPw) {
    return { name: "기본", naverId, naverPw, blogId: blogId ?? naverId };
  }
  return loadAccounts()[0];
}

function baseUrl(req: NextRequest): string {
  const proto = req.headers.get("x-forwarded-proto") ?? "http";
  const host  = req.headers.get("host") ?? "localhost:3000";
  return `${proto}://${host}`;
}

export async function POST(req: NextRequest) {
  const apiKey = getApiKey(req);
  if (!apiKey) return missingKeyResponse();

  const { title, content, tags, images } = (await req.json()) as {
    title: string;
    content: string;
    tags: string[];
    images?: string[];
  };

  if (!title || !content) {
    return NextResponse.json({ error: "title, content 필수" }, { status: 400 });
  }

  const account = getAccount();

  // 계정이 없거나 로컬 환경이 아니면 pending-post에 저장 (로컬 포스터가 처리)
  const isLocal = (req.headers.get("host") ?? "").includes("localhost");

  if (!isLocal || !account) {
    // Railway 등 외부 서버: 로컬 포스터 대기열에 저장
    const base = baseUrl(req);
    await fetch(`${base}/api/pending-post`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-user-api-key": apiKey },
      body: JSON.stringify({ title, content, tags, images } satisfies Omit<PendingPost, "savedAt">),
    });
    return NextResponse.json({
      success: true,
      queued: true,
      message: "로컬 포스터 대기열에 저장됐습니다. 잠시 후 자동 포스팅됩니다.",
    });
  }

  // 로컬 실행: 직접 Playwright로 포스팅
  const tmpDir = path.join(os.tmpdir(), `tianxia-post-${Date.now()}`);
  const imagePaths: string[] = [];

  if (images && images.length > 0) {
    fs.mkdirSync(tmpDir, { recursive: true });
    for (let i = 0; i < images.length; i++) {
      const base64 = images[i].replace(/^data:image\/\w+;base64,/, "");
      const filePath = path.join(tmpDir, `card_${i + 1}.jpg`);
      fs.writeFileSync(filePath, Buffer.from(base64, "base64"));
      imagePaths.push(filePath);
    }
  }

  try {
    const postUrl = await postToNaverBlogPlaywright(
      account.naverId,
      account.naverPw,
      account.blogId,
      title,
      content,
      tags,
      imagePaths
    );
    return NextResponse.json({ success: true, postUrl });
  } catch (e) {
    return NextResponse.json({ success: false, error: friendlyError(e) }, { status: 500 });
  } finally {
    if (fs.existsSync(tmpDir)) fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}
