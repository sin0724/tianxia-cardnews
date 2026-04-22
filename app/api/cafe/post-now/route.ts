import { NextRequest, NextResponse } from "next/server";
import { getApiKey, missingKeyResponse, friendlyError } from "@/lib/getApiKey";
import { loadAccounts, type NaverAccount } from "@/lib/accountConfig";
import { postToNaverCafe, type CafeBoardKey, CAFE_BOARDS } from "@/lib/naverCafePlaywright";
import fs from "fs";
import path from "path";
import os from "os";

function getAccount(): NaverAccount | undefined {
  const naverId = process.env.NAVER_ID;
  const naverPw = process.env.NAVER_PW;
  if (naverId && naverPw) {
    return { name: "기본", naverId, naverPw, blogId: process.env.NAVER_BLOG_ID ?? naverId };
  }
  return loadAccounts()[0];
}

export async function POST(req: NextRequest) {
  const apiKey = getApiKey(req);
  if (!apiKey) return missingKeyResponse();

  const { title, content, board, images } = (await req.json()) as {
    title: string;
    content: string;
    board: CafeBoardKey;
    images?: string[];
  };

  if (!title || !content) {
    return NextResponse.json({ error: "title, content 필수" }, { status: 400 });
  }

  const validBoards = Object.keys(CAFE_BOARDS) as CafeBoardKey[];
  if (!board || !validBoards.includes(board)) {
    return NextResponse.json(
      { error: `board 필수. 사용 가능: ${validBoards.join(", ")}` },
      { status: 400 }
    );
  }

  const account = getAccount();
  if (!account) {
    return NextResponse.json(
      { error: "네이버 계정 정보가 없습니다. NAVER_ID, NAVER_PW 환경변수를 설정하세요." },
      { status: 500 }
    );
  }

  const tmpDir = path.join(os.tmpdir(), `tianxia-cafe-${Date.now()}`);
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
    const postUrl = await postToNaverCafe(
      account.naverId,
      account.naverPw,
      board,
      title,
      content,
      imagePaths
    );
    return NextResponse.json({ success: true, postUrl });
  } catch (e) {
    return NextResponse.json({ success: false, error: friendlyError(e) }, { status: 500 });
  } finally {
    if (fs.existsSync(tmpDir)) fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}
