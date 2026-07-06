import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Campus Market",
    template: "%s | Campus Market",
  },
  description:
    "Campus Market 是面向学生的二手商品、求好物、短租房源和求租信息平台。",
  applicationName: "Campus Market",
  keywords: [
    "Campus Market",
    "student marketplace",
    "second hand",
    "sublease",
    "housing",
    "留学生二手平台",
    "校园二手",
    "短租",
    "求租",
  ],
  authors: [{ name: "Campus Market" }],
  creator: "Campus Market",
  publisher: "Campus Market",
  metadataBase: new URL("https://campus-market.app"),
  openGraph: {
    title: "Campus Market",
    description:
      "面向学生的二手商品、求好物、短租房源和求租信息平台。",
    url: "https://campus-market.app",
    siteName: "Campus Market",
    type: "website",
    locale: "zh_CN",
  },
  twitter: {
    card: "summary",
    title: "Campus Market",
    description:
      "面向学生的二手商品、求好物、短租房源和求租信息平台。",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}