import { ImageResponse } from "next/og";
import { getPostBySlug, getAllPosts } from "@/lib/posts";
import { getCategory } from "@/lib/categories";
import { site } from "@/lib/site";
import { OG_COLORS, OG_SIZE } from "@/lib/og-tokens";

export const runtime = "nodejs"; // Supabase 조회를 위해 node 런타임
export const size = OG_SIZE;
export const contentType = "image/png";

const SITE_HOST = new URL(site.url).host;

export async function generateStaticParams() {
  return (await getAllPosts()).map((p) => ({ slug: p.slug }));
}

export default async function OpengraphImage({
  params,
}: {
  params: { slug: string };
}) {
  const post = await getPostBySlug(params.slug);
  if (!post) {
    return new ImageResponse(
      <div style={{ background: OG_COLORS.bg, width: "100%", height: "100%" }} />,
      size,
    );
  }
  const cat = await getCategory(post.meta.category);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: OG_COLORS.bg,
          display: "flex",
          flexDirection: "column",
          padding: "72px 80px",
          justifyContent: "space-between",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            color: OG_COLORS.inkMuted,
            fontSize: 22,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}
        >
          <div
            style={{
              width: 44,
              height: 44,
              background: OG_COLORS.ink,
              color: OG_COLORS.inkInverse,
              borderRadius: 10,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 22,
              fontWeight: 700,
            }}
          >
            동
          </div>
          <span>{cat?.name ?? site.shortTitle}</span>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              fontSize: 60,
              fontWeight: 700,
              color: OG_COLORS.ink,
              letterSpacing: "-0.035em",
              lineHeight: 1.15,
              maxWidth: 1040,
            }}
          >
            {post.meta.title}
          </div>
          <div
            style={{
              marginTop: 24,
              fontSize: 24,
              color: OG_COLORS.inkMuted,
              lineHeight: 1.5,
              maxWidth: 1040,
            }}
          >
            {post.meta.summary}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            color: OG_COLORS.inkMuted,
            fontSize: 20,
          }}
        >
          <span>{post.meta.date.replace(/-/g, ".")} · {post.meta.readTime}분 읽기</span>
          <span>{SITE_HOST}</span>
        </div>
      </div>
    ),
    size,
  );
}
