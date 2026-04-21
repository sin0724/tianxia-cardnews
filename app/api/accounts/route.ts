import { NextRequest, NextResponse } from "next/server";
import { loadAccounts, saveAccounts, type NaverAccount } from "@/lib/accountConfig";

export async function GET() {
  const accounts = loadAccounts();
  // 비밀번호는 마스킹해서 반환
  return NextResponse.json(
    accounts.map((a) => ({ ...a, naverPw: "••••••••" }))
  );
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as NaverAccount;
  if (!body.naverId || !body.naverPw || !body.blogId) {
    return NextResponse.json({ error: "naverId, naverPw, blogId 필수" }, { status: 400 });
  }
  const accounts = loadAccounts();
  const newAccount: NaverAccount = {
    name: body.name || body.naverId,
    naverId: body.naverId,
    naverPw: body.naverPw,
    blogId: body.blogId,
    enabled: body.enabled ?? true,
  };
  accounts.push(newAccount);
  saveAccounts(accounts);
  return NextResponse.json({ success: true, name: newAccount.name });
}

export async function DELETE(req: NextRequest) {
  const { naverId } = (await req.json()) as { naverId: string };
  const accounts = loadAccounts().filter((a) => a.naverId !== naverId);
  saveAccounts(accounts);
  return NextResponse.json({ success: true });
}
