import type { Metadata } from "next";
import { IBM_Plex_Sans_Thai } from "next/font/google";

import { Providers } from "@/app/providers";

import "./globals.css";

const ibmPlexSansThai = IBM_Plex_Sans_Thai({
  /** ตัดน้ำหนัก 300 ที่แทบไม่ใช้ — ลดไฟล์ฟอนต์ที่โหลด */
  weight: ["400", "500", "600", "700"],
  subsets: ["latin", "thai"],
  variable: "--font-ibm-plex-sans-thai",
  display: "swap",
  preload: true,
  adjustFontFallback: true,
});

export const metadata: Metadata = {
  title: "โพสเฟสจ้าาาาาาา",
  description: "ลงทะเบียน เข้าสู่ระบบ และจัดการการเชื่อมต่อ Facebook",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th" className={ibmPlexSansThai.variable} suppressHydrationWarning>
      <body className="min-h-screen font-sans">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
