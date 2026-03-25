import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Tianxia 카드뉴스 생성기",
  description: "대만 마케팅 카드뉴스 자동 생성",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="h-full">
      <body className="min-h-full antialiased">{children}</body>
    </html>
  );
}
