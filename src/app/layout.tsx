import type { Metadata } from "next";
import { Cormorant_Garamond, Gowun_Batang } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

/** 환영 편지지 — 옛 고문헌·필사본 느낌의 한글 바탕 */
const letterClassical = Gowun_Batang({
  weight: ["400", "700"],
  subsets: ["latin"],
  variable: "--font-letter-serif",
  display: "swap",
});

/** 영문·서명 — 유려한 고전 가로체 */
const letterScript = Cormorant_Garamond({
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  subsets: ["latin"],
  variable: "--font-letter-script",
  display: "swap",
});

export const metadata: Metadata = {
  title: "멋진신세계",
  description:
    "Aldous Huxley 《Brave New World》를 모티브로—전쟁과 이익이 같은 지도를 공유하는 3D 지구본 관측대",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" suppressHydrationWarning style={{ background: "#02040a" }}>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${letterClassical.variable} ${letterScript.variable} antialiased`}
        style={{
          background: "#02040a",
          minHeight: "100vh",
        }}
      >
        {children}
      </body>
    </html>
  );
}
