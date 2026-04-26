/**
 * Tiny RSS 2.0 builder. Hand-written to keep the dependency graph small.
 */
import type { PostMeta } from "@/lib/types";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://dongding.dev";

const escape = (s: string) =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

export function buildRss(posts: PostMeta[], opts: {
  title: string;
  description: string;
}): string {
  const items = posts
    .slice(0, 20)
    .map((p) => {
      const url = `${SITE_URL}/posts/${p.slug}`;
      const pubDate = new Date(`${p.date}T00:00:00Z`).toUTCString();
      return `    <item>
      <title>${escape(p.title)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <pubDate>${pubDate}</pubDate>
      <description>${escape(p.summary)}</description>
      ${p.tags.map((t) => `<category>${escape(t)}</category>`).join("\n      ")}
    </item>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escape(opts.title)}</title>
    <link>${SITE_URL}</link>
    <description>${escape(opts.description)}</description>
    <language>ko-KR</language>
    <atom:link href="${SITE_URL}/feed.xml" rel="self" type="application/rss+xml" />
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
${items}
  </channel>
</rss>`;
}
