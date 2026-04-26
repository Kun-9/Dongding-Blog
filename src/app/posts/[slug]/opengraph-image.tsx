import { ImageResponse } from "next/og";
import { getPostBySlug, getAllPosts } from "@/lib/posts";
import { getCategory } from "@/lib/categories";

export const runtime = "nodejs"; // need fs access via lib/posts
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export function generateStaticParams() {
  return getAllPosts().map((p) => ({ slug: p.slug }));
}

export default function OpengraphImage({
  params,
}: {
  params: { slug: string };
}) {
  const post = getPostBySlug(params.slug);
  if (!post) {
    return new ImageResponse(
      <div style={{ background: "#f7f4ed", width: "100%", height: "100%" }} />,
      size,
    );
  }
  const cat = getCategory(post.meta.category);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#f7f4ed",
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
            color: "#5f5f5d",
            fontSize: 22,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}
        >
          <div
            style={{
              width: 44,
              height: 44,
              background: "#1c1c1c",
              color: "#fcfbf8",
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
          <span>{cat?.name ?? "Dong-Ding"}</span>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              fontSize: 60,
              fontWeight: 700,
              color: "#1c1c1c",
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
              color: "#5f5f5d",
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
            color: "#5f5f5d",
            fontSize: 20,
          }}
        >
          <span>{post.meta.date.replace(/-/g, ".")} · {post.meta.readTime}분 읽기</span>
          <span>dongding.dev</span>
        </div>
      </div>
    ),
    size,
  );
}
