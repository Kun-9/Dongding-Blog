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
import { AdminMenu } from "@/components/layout/AdminMenu";
import { Avatar } from "@/components/layout/Avatar";
import { useMounted } from "@/lib/hooks";
import type { Category, PostMeta } from "@/lib/types";

interface Props {
  categories: Category[];
  posts: PostMeta[];
  /** site.shortTitle. 정본이 DB 라 서버에서 내려받는다. */
  title: string;
}

export function Header({ categories, posts, title }: Props) {
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
  const isSeriesActive = pathname?.startsWith("/series") ?? false;
  const isBookmarksActive = pathname?.startsWith("/bookmarks") ?? false;
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
          background: "var(--header-bg)",
          backdropFilter: "saturate(160%) blur(12px)",
          WebkitBackdropFilter: "saturate(160%) blur(12px)",
        }}
      >
        <div className="mx-auto flex max-w-[1180px] items-center justify-between px-5 py-3.5 md:px-8">
          {/* 아바타는 홈 링크에서 떼어냈다 — 눌러도 이동하지 않고 표정만 바뀐다. */}
          <div className="flex shrink-0 items-center gap-2.5">
            <Avatar />
            <Link href="/" className="no-underline">
              <span className="whitespace-nowrap font-sans text-[17px] font-bold tracking-[-0.025em] text-ink">
                {title}
              </span>
            </Link>
          </div>

          <div className="flex items-center gap-1">
            <div className="hidden items-center gap-1 md:flex">
              {navLink("/posts", "Posts", isPostsActive)}
              {navLink("/series", "Series", isSeriesActive)}
              {navLink("/bookmarks", "Linkroll", isBookmarksActive)}
              {navLink("/about", "About", isAboutActive)}
            </div>

            <button
              type="button"
              onClick={() => setOpenK(true)}
              aria-label="Open command palette"
              className="ml-1.5 inline-flex h-8 w-8 items-center justify-center rounded-full border border-border-token bg-transparent text-[13px] text-ink-muted md:h-auto md:w-auto md:gap-2 md:px-2.5 md:py-[5px] md:text-[12.5px]"
            >
              <span>⌕</span>
              <span className="hidden md:inline">검색</span>
              <kbd className="hidden rounded border border-border-token bg-surface-alt px-1.5 py-px font-mono text-[10.5px] text-ink-muted md:inline-block">
                ⌘K
              </kbd>
            </button>

            <button
              type="button"
              onClick={() => setTheme(isDark ? "light" : "dark")}
              aria-label="Toggle theme"
              className="theme-toggle ml-1.5 inline-flex h-8 w-8 items-center justify-center rounded-full border border-border-token bg-transparent text-sm text-ink"
            >
              <span className="theme-toggle-light">☾</span>
              <span className="theme-toggle-dark">☼</span>
            </button>

            <AdminMenu />
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
