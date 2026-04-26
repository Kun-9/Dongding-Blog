"use client";

/**
 * ReadingProgress — fixed thin bar under the sticky header that fills as
 * the article scrolls. Port of prose.jsx#ReadingProgress.
 */
import { useEffect, useState, type RefObject } from "react";

interface Props {
  target: RefObject<HTMLElement | null>;
}

export function ReadingProgress({ target }: Props) {
  const [pct, setPct] = useState(0);

  useEffect(() => {
    const onScroll = () => {
      const el = target.current;
      if (!el) return;
      const total = el.scrollHeight - window.innerHeight;
      const scrolled = window.scrollY - el.offsetTop;
      const p = Math.max(0, Math.min(1, scrolled / Math.max(1, total)));
      setPct(p);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, [target]);

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
