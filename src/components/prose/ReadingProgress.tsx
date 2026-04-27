"use client";

/**
 * ReadingProgress — fixed thin bar under the sticky header that fills as
 * the article (resolved via id) scrolls. articleId-based so server-rendered
 * pages can mount it without a client ref.
 */
import { useEffect, useState } from "react";

interface Props {
  articleId: string;
}

export function ReadingProgress({ articleId }: Props) {
  const [pct, setPct] = useState(0);

  useEffect(() => {
    const el = document.getElementById(articleId);
    if (!el) return;
    const onScroll = () => {
      const total = el.scrollHeight - window.innerHeight;
      const scrolled = window.scrollY - el.offsetTop;
      const p = Math.max(0, Math.min(1, scrolled / Math.max(1, total)));
      setPct((prev) => (Math.abs(prev - p) > 0.005 ? p : prev));
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, [articleId]);

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed left-0 right-0 top-[60px] z-[49] h-0.5"
    >
      <div
        className="h-full transition-[width] duration-75"
        style={{
          width: `${pct * 100}%`,
          background: "var(--border-strong)",
        }}
      />
    </div>
  );
}
