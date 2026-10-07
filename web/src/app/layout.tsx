import type { Metadata, Viewport } from "next";
import { Inter, Noto_Sans_Thai } from "next/font/google";
import { SITE_URL } from "@/lib/env";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const thai = Noto_Sans_Thai({ variable: "--font-thai", subsets: ["thai"], weight: ["400", "500", "600", "700", "800"] });

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: "Dwelly — อสังหาฯ ที่ตรวจสอบแล้ว", template: "%s · Dwelly" },
  description:
    "ซื้อ ขาย เช่า คอนโด บ้าน ที่ดิน ที่ตรวจสอบกรรมสิทธิ์แล้ว คุยตรงกับเจ้าของหรือนายหน้าที่ผ่านการยืนยัน",
  applicationName: "Dwelly",
  openGraph: { type: "website", siteName: "Dwelly", locale: "th_TH" },
  appleWebApp: { capable: true, title: "Dwelly", statusBarStyle: "black-translucent" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#0d0f12",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="th" className={`${inter.variable} ${thai.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
