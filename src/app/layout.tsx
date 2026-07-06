import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "像素100&奇点同行 · 学习站",
  description: "课程、作业、阅读分享和学生心声的一站式学习中枢。"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
