import { NextRequest, NextResponse } from "next/server";
import { getApiKey, missingKeyResponse, friendlyError } from "@/lib/getApiKey";
import { loadAccounts } from "@/lib/accountConfig";
import { postToNaverBlogPlaywright } from "@/lib/naverBlogPlaywright";
import fs from "fs";
import path from "path";
import os from "os";

export async function POST(req: NextRequest) {
  const apiKey = getApiKey(req);
  if (!apiKey) return missingKeyResponse();

  const { title, content, tags, images } = (await req.json()) as {
    title: string;
    content: string;
    tags: string[];
    images?: string[];   // base64 PNG 배열 (카드뉴스 5장)
  };

  if (!title || !content) {
    return NextResponse.json({ error: "title, content 필수" }, { status: 400 });
  }

  // 계정 확인
  const accounts = loadAccounts();
  if (accounts.length === 0) {
    return NextResponse.json(
      { error: "config/naver-accounts.json 에 계정을 설정해주세요." },
      { status: 400 }
    );
  }
  const account = accounts[0];

  // base64 이미지 → 디스크 저장
  const tmpDir = path.join(os.tmpdir(), `tianxia-post-${Date.now()}`);
  const imagePaths: string[] = [];

  if (images && images.length > 0) {
    fs.mkdirSync(tmpDir, { recursive: true });
    for (let i = 0; i < images.length; i++) {
      const base64 = images[i].replace(/^data:image\/\w+;base64,/, "");
      const filePath = path.join(tmpDir, `card_${i + 1}.png`);
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

    return NextResponse.json({ success: true, postUrl, account: account.name });
  } catch (e) {
    return NextResponse.json({ success: false, error: friendlyError(e) }, { status: 500 });
  } finally {
    // 임시 이미지 정리
    if (fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  }
}
