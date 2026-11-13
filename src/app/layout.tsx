import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Top 25 Music Players Survey & Player Design Demo",
  description:
    "Survey of the world's top 25 music players across streaming, regional, audiophile and local categories, paired with a complete music player design that works in both PC and Android modes.",
  keywords: [
    "music player",
    "music streaming",
    "Spotify",
    "Apple Music",
    "YouTube Music",
    "music player design",
    "PC music player",
    "Android music player",
    "top music apps",
  ],
  authors: [{ name: "Z.ai" }],
  icons: {
    icon: "https://z-cdn.chatglm.cn/z-ai/static/logo.svg",
  },
  openGraph: {
    title: "Top 25 Music Players Survey & Player Design Demo",
    description:
      "Survey of the world's top 25 music players paired with a complete music player design for PC and Android.",
    url: "https://chat.z.ai",
    siteName: "Z.ai",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Top 25 Music Players Survey & Player Design Demo",
    description:
      "Survey of the world's top 25 music players paired with a complete music player design for PC and Android.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-zinc-950 text-zinc-100`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
