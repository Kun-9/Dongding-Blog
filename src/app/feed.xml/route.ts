import { getAllPosts } from "@/lib/posts";
import { buildRss } from "@/lib/rss";

export const dynamic = "force-static";

export function GET() {
  const xml = buildRss(getAllPosts(), {
    title: "Dong-Ding · 백엔드 노트",
    description: "자바·스프링·DB를 깊이, 천천히 따라가는 블로그.",
  });
  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
