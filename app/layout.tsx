import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// The whole app reads the caller's Supabase session (cookies) to decide
// what to render, so nothing here is safely static.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "現場らく見積 | 設備工事の見積作成",
  description: "5人以下の空調・設備工事会社向け、見積作成に特化した業務管理アプリ",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full bg-[var(--background)] text-[var(--foreground)]">{children}</body>
    </html>
  );
}
