"use client";

/**
 * SearchClient — port of project/page-extras.jsx#SearchPage.
 * Receives the post list + categories from a server parent because
 * lib/posts is server-only.
 */
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useTheme } from "next-themes";
import type { Category, PostMeta } from "@/lib/types";
import { TagChip } from "@/components/post/TagChip";
import { fmtDate } from "@/lib/tokens";

interface Props {
  posts: PostMeta[];
  categories: Category[];
}

type Scope = "all" | "title" | "tag" | "body";

export function SearchClient({ posts, categories }: Props) {
  const params = useSearchParams();
  const initial = params?.get("q") ?? "";
  const [q, setQ] = useState(initial);
  const [scope, setScope] = useState<Scope>("all");
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const isDark = mounted ? resolvedTheme === "dark" : false;

  const ql = q.trim().toLowerCase();
  const lookupCategory = (id: string) =>
    categories.find((c) => c.id === id)?.name;

  const matches = useMemo(() => {
    if (!ql) return [];
    return posts.filter(
      (p) =>
        p.title.toLowerCase().includes(ql) ||
        p.summary.toLowerCase().includes(ql) ||
        p.tags.some((tg) => tg.includes(ql)) ||
        p.category.includes(ql),
    );
  }, [ql, posts]);

  const tagMatches = useMemo(() => {
    if (!ql) return [];
    const set = new Set<string>();
    posts.forEach((p) =>
      p.tags.forEach((tg) => {
        if (tg.includes(ql)) set.add(tg);
      }),
    );
    return [...set];
  }, [ql, posts]);

  const highlight = (text: string) => {
    if (!ql) return text;
    const idx = text.toLowerCase().indexOf(ql);
    if (idx === -1) return text;
    return (
      <>
        {text.slice(0, idx)}
        <mark
          className="px-px text-ink"
          style={{
            background: isDark
              ? "rgba(212,158,106,0.25)"
              : "rgba(255,224,168,0.7)",
          }}
        >
          {text.slice(idx, idx + ql.length)}
        </mark>
        {text.slice(idx + ql.length)}
      </>
    );
  };

  return (
    <main className="mx-auto max-w-[880px] px-8 pt-10">
      <header className="mb-6">
        <div className="mb-2.5 font-sans text-[11px] font-bold uppercase tracking-[0.1em] text-ink-muted">
          SEARCH
        </div>
        <div className="flex items-center gap-2.5 rounded-[10px] border border-border-token bg-surface px-4 py-3">
          <span className="text-lg text-ink-muted">⌕</span>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="검색어를 입력하세요…"
            className="flex-1 border-none bg-transparent font-sans text-[18px] font-medium tracking-[-0.02em] text-ink outline-none"
          />
        </div>
        <div className="mt-3.5 flex gap-1.5">
          {(
            [
              ["all", "전체"],
              ["title", "제목"],
              ["tag", "태그"],
              ["body", "본문"],
            ] as const
          ).map(([k, lbl]) => (
            <button
              key={k}
              type="button"
              onClick={() => setScope(k)}
              className={`rounded-full px-2.5 py-[5px] font-sans text-[12.5px] font-semibold tracking-[-0.01em] transition-colors ${
                scope === k
                  ? "text-accent-ink"
                  : "border border-border-token text-ink-muted"
              }`}
              style={
                scope === k
                  ? { background: "var(--accent)", border: "none" }
                  : { background: "transparent" }
              }
            >
              {lbl}
            </button>
          ))}
        </div>
      </header>

      <div className="mb-4 font-mono text-xs text-ink-muted">
        {q
          ? `"${q}"에 대한 결과 ${matches.length}건`
          : "검색어를 입력하면 결과가 나타납니다."}
      </div>

      {tagMatches.length > 0 && (
        <section className="mb-6">
          <div className="mb-2 font-sans text-[11px] font-bold uppercase tracking-[0.08em] text-ink-muted">
            관련 태그
          </div>
          <div className="flex flex-wrap gap-1.5">
            {tagMatches.map((tg) => (
              <TagChip key={tg} tag={tg} />
            ))}
          </div>
        </section>
      )}

      <section className="pb-16">
        <ul className="m-0 list-none p-0">
          {matches.map((p) => (
            <li key={p.slug} className="border-t border-border-token py-[18px]">
              <Link
                href={`/posts/${p.slug}`}
                className="block text-inherit no-underline"
              >
                <div className="mb-1 font-mono text-[11px] font-semibold tabular-nums text-ink-muted">
                  {lookupCategory(p.category) ?? p.category} · {fmtDate(p.date)}
                </div>
                <div className="font-sans text-[18px] font-semibold leading-[1.35] tracking-[-0.025em] text-ink">
                  {highlight(p.title)}
                </div>
                <div className="mt-1 text-sm leading-[1.65] text-ink-soft">
                  {highlight(p.summary)}
                </div>
              </Link>
            </li>
          ))}
          {q && matches.length === 0 && (
            <li className="py-10 text-center text-sm text-ink-muted">
              일치하는 글이 없어요. 다른 검색어를 시도해 보세요.
            </li>
          )}
        </ul>
      </section>
    </main>
  );
}
