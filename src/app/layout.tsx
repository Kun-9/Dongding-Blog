import type { Metadata } from "next";
import { JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Umami } from "@/components/analytics/Umami";
import { getCategories } from "@/lib/categories";
import { getAllPosts } from "@/lib/posts";
import { getSite } from "@/lib/site-db";

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export async function generateMetadata(): Promise<Metadata> {
  const site = await getSite();
  return {
    metadataBase: new URL(site.url),
    title: {
      default: site.title,
      template: `%s · ${site.shortTitle}`,
    },
    description: site.description,
    // title·description·image 는 일부러 비운다 — 비워 두면 Next 가 각 페이지의
    // title/description 과 opengraph-image 에서 채운다. 여기서 못 박으면 모든
    // 페이지의 og:title 이 홈 제목으로 고정된다(하위 openGraph 는 통째 교체).
    openGraph: {
      type: "website",
      siteName: site.shortTitle,
      locale: site.locale.replace("-", "_"),
    },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Fetched server-side so the client Header can hand them to CommandPalette.
  const [posts, categories, site] = await Promise.all([
    getAllPosts(),
    getCategories(),
    getSite(),
  ]);

  return (
    <html lang={site.lang} suppressHydrationWarning data-scroll-behavior="smooth" className={jetbrainsMono.variable}>
      <body className="scenic-glow min-h-screen">
        <ThemeProvider>
          <Header categories={categories} posts={posts} title={site.shortTitle} />
          {children}
          <Footer />
        </ThemeProvider>
        <Umami />
      </body>
    </html>
  );
}
