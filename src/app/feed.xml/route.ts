import { getAllPosts } from "@/lib/posts";
import { buildRss } from "@/lib/rss";
import { site } from "@/lib/site";

export const revalidate = 3600;

export async function GET() {
  const xml = buildRss(await getAllPosts(), {
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
