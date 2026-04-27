import { getAllPosts } from "@/lib/posts";
import { buildRss } from "@/lib/rss";
import { site } from "@/lib/site";

export const dynamic = "force-static";

export function GET() {
  const xml = buildRss(getAllPosts(), {
    title: site.title,
    description: site.description,
  });
  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
