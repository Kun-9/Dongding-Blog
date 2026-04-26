"use client";

/**
 * Header — sticky brand + minimal nav + ⌘K trigger + theme toggle.
 * Categories and posts come down as props so CommandPalette (client) can
 * search them without importing the server-only loader.
 */
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { CommandPalette } from "@/components/command/CommandPalette";
import { useMounted } from "@/lib/hooks";
import type { Category, PostMeta } from "@/lib/types";

interface Props {
  categories: Category[];
  posts: PostMeta[];
}

export function Header({ categories, posts }: Props) {
  const pathname = usePathname();
  const { resolvedTheme, setTheme } = useTheme();
  const [openK, setOpenK] = useState(false);
  const mounted = useMounted();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpenK((o) => !o);
      } else if (e.key === "Escape") {
        setOpenK(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const isPostsActive = pathname?.startsWith("/posts") ?? false;
  const isAboutActive = pathname === "/about";

  const navLink = (href: string, label: string, isActive: boolean) => (
    <Link
      href={href}
      className={`rounded-md px-3 py-1.5 font-sans text-sm font-medium tracking-[-0.005em] no-underline transition-colors duration-[120ms] ${
        isActive ? "bg-hover text-ink" : "text-ink-muted hover:text-ink"
      }`}
    >
      {label}
    </Link>
  );

  const isDark = mounted ? resolvedTheme === "dark" : false;

  return (
    <>
      <header
        className="sticky top-0 z-50 border-b border-border-token"
        style={{
          background: isDark
            ? "rgba(22,21,19,0.85)"
            : "rgba(247,244,237,0.82)",
          backdropFilter: "saturate(160%) blur(12px)",
          WebkitBackdropFilter: "saturate(160%) blur(12px)",
        }}
      >
        <div className="mx-auto flex max-w-[1180px] items-center justify-between px-8 py-3.5">
          <Link
            href="/"
            className="flex shrink-0 items-center gap-2.5 no-underline"
          >
            <div
              className="flex h-[30px] w-[30px] items-center justify-center rounded-lg font-sans text-sm font-bold tracking-[-0.02em] text-accent-ink"
              style={{
                background: "var(--accent)",
                boxShadow:
                  "inset 0 0.5px 0 rgba(255,255,255,0.18), inset 0 0 0 0.5px rgba(0,0,0,0.2)",
              }}
            >
              동
            </div>
            <span className="whitespace-nowrap font-sans text-[17px] font-bold tracking-[-0.025em] text-ink">
              Dong-Ding
            </span>
          </Link>

          <div className="flex items-center gap-0.5">
            {navLink("/posts", "Posts", isPostsActive)}
            {navLink("/about", "About", isAboutActive)}

            <button
              type="button"
              onClick={() => setOpenK(true)}
              aria-label="Open command palette"
              className="ml-1.5 inline-flex items-center gap-2 rounded-full border border-border-token bg-transparent px-2.5 py-1 font-sans text-[12.5px] text-ink-muted"
            >
              <span className="text-[13px]">⌕</span>
              <span>검색</span>
              <kbd className="rounded border border-border-token bg-surface-alt px-1.5 py-px font-mono text-[10.5px] text-ink-muted">
                ⌘K
              </kbd>
            </button>

            <button
              type="button"
              onClick={() => setTheme(isDark ? "light" : "dark")}
              aria-label="Toggle theme"
              className="ml-1.5 inline-flex h-8 w-8 items-center justify-center rounded-full border border-border-token bg-transparent text-sm text-ink"
              suppressHydrationWarning
            >
              {mounted ? (isDark ? "☼" : "☾") : "☾"}
            </button>
          </div>
        </div>
      </header>

      {openK && (
        <CommandPalette
          onClose={() => setOpenK(false)}
          categories={categories}
          posts={posts}
        />
      )}
    </>
  );
}
