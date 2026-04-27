/**
 * TopPosts — Trending widget. Joins Umami top URLs with post metadata.
 * Renders nothing on missing env, fetch failure, or zero matches.
 */
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getTopPages } from "@/lib/umami-share";

interface PostMeta {
  slug: string;
  title: string;
}

interface Ranked {
  slug: string;
  title: string;
  count: number;
}

export function TopPosts({ posts }: { posts: PostMeta[] }) {
  const [items, setItems] = useState<Ranked[] | null>(null);

  useEffect(() => {
    let alive = true;
    const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
    getTopPages({ days: 7, limit: 20 }).then((top) => {
      if (!alive || !top) return;
      const ranked = top
        .map((row) => {
          const slug = row.url
            .replace(basePath, "")
            .replace(/^\/posts\//, "")
            .replace(/\/$/, "");
          const post = posts.find((p) => p.slug === slug);
          if (!post) return null;
          return { slug: post.slug, title: post.title, count: row.count };
        })
        .filter((p): p is Ranked => p !== null)
        .slice(0, 5);
      setItems(ranked);
    });
    return () => {
      alive = false;
    };
  }, [posts]);

  if (!items?.length) return null;

  return (
    <section className="mx-auto mt-16 max-w-[1180px] px-5 pb-12 md:px-8">
      <div className="mb-6 flex items-baseline justify-between border-b border-border-token pb-3">
        <div className="font-sans text-[11px] font-bold uppercase tracking-[0.1em] text-ink-muted">
          Trending
        </div>
        <div className="font-mono text-[11px] text-ink-muted">최근 7일</div>
      </div>
      <ol className="m-0 grid list-none grid-cols-1 gap-2 p-0 sm:grid-cols-2">
        {items.map((p, i) => (
          <li
            key={p.slug}
            className="grid grid-cols-[28px_1fr_auto] items-baseline gap-3 border-b border-border-token py-3"
          >
            <span className="font-mono text-[12px] tabular-nums text-ink-muted">
              {String(i + 1).padStart(2, "0")}
            </span>
            <Link
              href={`/posts/${p.slug}`}
              className="truncate font-sans text-[14.5px] font-medium tracking-[-0.01em] text-ink no-underline"
            >
              {p.title}
            </Link>
            <span className="font-mono text-[11px] tabular-nums text-ink-muted">
              {p.count.toLocaleString()}
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}
