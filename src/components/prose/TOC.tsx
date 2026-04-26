"use client";

/**
 * TOC — sticky table of contents with scroll-spy.
 * Port of prose.jsx#TOC. Uses IntersectionObserver to highlight the
 * topmost intersecting heading.
 */
import { useEffect, useState } from "react";
import type { TocItem } from "@/lib/types";

interface Props {
  items: TocItem[];
}

export function TOC({ items }: Props) {
  const [active, setActive] = useState<string | undefined>(items[0]?.id);

  useEffect(() => {
    const headings = items
      .map((i) => document.getElementById(i.id))
      .filter((h): h is HTMLElement => Boolean(h));
    if (!headings.length) return;

    const obs = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "-80px 0px -60% 0px", threshold: [0, 1] },
    );

    headings.forEach((h) => obs.observe(h));
    return () => obs.disconnect();
  }, [items]);

  return (
    <nav className="sticky top-[90px] self-start">
      <div className="mb-3 font-sans text-[11px] font-bold uppercase tracking-[0.08em] text-ink-muted">
        On this page
      </div>
      <ul className="m-0 flex list-none flex-col gap-1 p-0">
        {items.map((item) => {
          const isActive = active === item.id;
          return (
            <li key={item.id}>
              <a
                href={`#${item.id}`}
                onClick={(e) => {
                  e.preventDefault();
                  document
                    .getElementById(item.id)
                    ?.scrollIntoView({ behavior: "smooth", block: "start" });
                }}
                className={`block rounded-md py-1 font-sans text-[13px] no-underline transition-all duration-[120ms] ${
                  isActive ? "bg-hover font-semibold text-ink" : "text-ink-muted"
                }`}
                style={{
                  paddingLeft: item.level === 3 ? 22 : 10,
                  paddingRight: 10,
                  fontWeight: isActive ? 600 : 400,
                }}
              >
                {item.label}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
