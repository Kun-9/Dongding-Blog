import type { Metadata } from "next";
import { JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Plausible } from "@/components/analytics/Plausible";
import { categories } from "@/lib/categories";
import { getAllPosts } from "@/lib/posts";

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://dongding.dev";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "Dong-Ding · 백엔드 노트",
  description: "자바·스프링·DB를 깊이, 천천히 따라가는 블로그.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Fetched server-side so the client Header can hand them to CommandPalette.
  const posts = getAllPosts();

  return (
    <html lang="ko" suppressHydrationWarning className={jetbrainsMono.variable}>
      <body className="scenic-glow min-h-screen">
        <ThemeProvider>
          <Header categories={categories} posts={posts} />
          {children}
          <Footer />
        </ThemeProvider>
        <Plausible />
      </body>
    </html>
  );
}
