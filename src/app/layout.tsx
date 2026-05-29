import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "公众号自动化运营台",
  description: "7 Agent AI 内容运营自动化控制台"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
