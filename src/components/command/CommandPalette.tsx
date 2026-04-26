"use client";

/**
 * CommandPalette — Cmd/Ctrl+K spotlight.
 * Receives `categories` and `posts` from a server-side parent (RootLayout)
 * because lib/posts.ts is server-only.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Category, PostMeta } from "@/lib/types";

type ItemKind = "page" | "cat" | "post" | "tag";
interface CmdItem {
  kind: ItemKind;
  label: string;
  sub?: string;
  href: string;
}

interface Props {
  onClose: () => void;
  categories: Category[];
  posts: PostMeta[];
}

const KIND_GLYPH: Record<ItemKind, string> = {
  page: "◧",
  cat: "▦",
  post: "¶",
  tag: "#",
};

export function CommandPalette({ onClose, categories, posts }: Props) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [hi, setHi] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const items = useMemo<CmdItem[]>(() => {
    const ql = q.trim().toLowerCase();
    const out: CmdItem[] = [];

    if (!ql) {
      out.push({ kind: "page", label: "Home", href: "/" });
      out.push({ kind: "page", label: "All Posts", href: "/posts" });
      out.push({ kind: "page", label: "About", href: "/about" });
      categories.forEach((cat) =>
        out.push({
          kind: "cat",
          label: cat.name,
          sub: `${cat.count}편 · ${cat.desc}`,
          href: `/category/${cat.id}`,
        }),
      );
      posts.slice(0, 3).forEach((p) =>
        out.push({
          kind: "post",
          label: p.title,
          sub: p.summary,
          href: `/posts/${p.slug}`,
        }),
      );
      return out;
    }

    categories.forEach((cat) => {
      if (cat.name.toLowerCase().includes(ql)) {
        out.push({
          kind: "cat",
          label: cat.name,
          sub: `${cat.count}편`,
          href: `/category/${cat.id}`,
        });
      }
    });

    posts.forEach((p) => {
      if (
        p.title.toLowerCase().includes(ql) ||
        p.summary.toLowerCase().includes(ql) ||
        p.tags.some((tg) => tg.includes(ql))
      ) {
        out.push({
          kind: "post",
          label: p.title,
          sub: p.summary,
          href: `/posts/${p.slug}`,
        });
      }
    });

    const tagSet = new Set<string>();
    posts.forEach((p) =>
      p.tags.forEach((tg) => {
        if (tg.includes(ql)) tagSet.add(tg);
      }),
    );
    [...tagSet].forEach((tg) =>
      out.push({ kind: "tag", label: `#${tg}`, href: `/tags/${tg}` }),
    );

    return out;
  }, [q, categories, posts]);

  useEffect(() => {
    setHi(0);
  }, [q]);

  const navigate = (item: CmdItem) => {
    router.push(item.href);
    onClose();
  };

  const onKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHi((h) => Math.min(h + 1, items.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHi((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const it = items[hi];
      if (it) navigate(it);
    }
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[100] flex items-start justify-center pt-[12vh]"
      style={{
        background: "rgba(0,0,0,0.42)",
        backdropFilter: "blur(4px)",
        WebkitBackdropFilter: "blur(4px)",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-[min(560px,92vw)] overflow-hidden rounded-2xl border border-border-token bg-surface"
        style={{ boxShadow: "0 20px 50px rgba(0,0,0,0.25)" }}
      >
        <div className="flex items-center gap-2.5 border-b border-border-token px-[18px] py-3.5">
          <span className="text-base text-ink-muted">⌕</span>
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={onKey}
            placeholder="검색하거나 명령을 입력하세요…"
            className="flex-1 border-none bg-transparent font-sans text-[15px] tracking-[-0.01em] text-ink outline-none"
          />
          <kbd className="rounded border border-border-token bg-surface-alt px-1.5 py-0.5 font-mono text-[10.5px] text-ink-muted">
            esc
          </kbd>
        </div>

        <ul className="m-0 max-h-[50vh] list-none overflow-y-auto p-1.5">
          {items.length === 0 && (
            <li className="p-5 text-center text-[13.5px] text-ink-muted">
              일치하는 항목이 없어요.
            </li>
          )}
          {items.map((it, i) => (
            <li key={`${it.kind}-${it.href}-${i}`}>
              <button
                type="button"
                onClick={() => navigate(it)}
                onMouseEnter={() => setHi(i)}
                className={`flex w-full cursor-pointer items-center gap-2.5 rounded-lg border-none px-3 py-2.5 text-left text-ink ${
                  hi === i ? "bg-hover" : "bg-transparent"
                }`}
              >
                <span className="inline-flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-md bg-surface-alt font-mono text-[10px] font-bold text-ink-muted">
                  {KIND_GLYPH[it.kind]}
                </span>
                <span className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium tracking-[-0.015em] text-ink">
                    {it.label}
                  </div>
                  {it.sub && (
                    <div className="mt-px truncate text-xs text-ink-muted">
                      {it.sub}
                    </div>
                  )}
                </span>
              </button>
            </li>
          ))}
        </ul>

        <div className="flex gap-3.5 border-t border-border-token px-3.5 py-2 font-mono text-[11px] text-ink-muted">
          <span>↑↓ 이동</span>
          <span>↵ 선택</span>
          <span>esc 닫기</span>
        </div>
      </div>
    </div>
  );
}
