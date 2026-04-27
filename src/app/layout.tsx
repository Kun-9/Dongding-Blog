import type { Metadata } from "next";
import { JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Plausible } from "@/components/analytics/Plausible";
import { categories } from "@/lib/categories";
import { getAllPosts } from "@/lib/posts";
import { site } from "@/lib/site";

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: site.title,
    template: `%s · ${site.shortTitle}`,
  },
  description: site.description,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Fetched server-side so the client Header can hand them to CommandPalette.
  const posts = getAllPosts();

  return (
    <html lang={site.lang} suppressHydrationWarning className={jetbrainsMono.variable}>
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
