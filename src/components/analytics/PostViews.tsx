/**
 * PostViews — fetches read-only page view count from Umami share API.
 * Renders nothing until data arrives; null on missing env or fetch error.
 */
"use client";

import { useEffect, useState } from "react";
import { getPageViews } from "@/lib/umami-share";

export function PostViews({ slug }: { slug: string }) {
  const [views, setViews] = useState<number | null>(null);

  useEffect(() => {
    let alive = true;
    const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
    getPageViews(`${basePath}/posts/${slug}/`).then((v) => {
      if (alive) setViews(v);
    });
    return () => {
      alive = false;
    };
  }, [slug]);

  if (views == null) return null;
  return (
    <span className="font-mono tabular-nums">
      {views.toLocaleString()} views
    </span>
  );
}
