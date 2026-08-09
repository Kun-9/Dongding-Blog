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
  const [navOpen, setNavOpen] = useState(false);
  const mounted = useMounted();

  // 좁은 화면 시트는 이동하면 닫힌다. effect 가 아니라 렌더 중 보정 —
  // 경로가 바뀐 그 렌더에서 이미 닫힌 상태로 그려진다.
  const [navPath, setNavPath] = useState(pathname);
  if (navPath !== pathname) {
    setNavPath(pathname);
    setNavOpen(false);
  }

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

  const NAV: [string, string, boolean][] = [
    ["/posts", "Posts", isPostsActive],
    ["/series", "Series", isSeriesActive],
    ["/bookmarks", "Linkroll", isBookmarksActive],
    ["/about", "About", isAboutActive],
  ];

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
        <div className="mx-auto flex max-w-[1180px] items-center justify-between px-[var(--gut)] py-3.5">
          {/* 아바타는 홈 링크에서 떼어냈다 — 눌러도 이동하지 않고 표정만 바뀐다. */}
          <div className="flex shrink-0 items-center gap-2.5">
            <Avatar />
            <Link href="/" className="no-underline">
              <span className="whitespace-nowrap font-sans text-[17px] font-bold tracking-[-0.025em] text-ink">
                {title}
              </span>
            </Link>
          </div>

          <div className="flex min-w-0 items-center gap-0.5">
            <div className="flex items-center gap-0.5 max-[760px]:hidden">
              {NAV.map(([href, label, active]) => navLink(href, label, active))}
            </div>

            <button
              type="button"
              onClick={() => setOpenK(true)}
              aria-label="Open command palette"
              className="ml-1.5 inline-flex shrink-0 items-center gap-2 rounded-full border border-border-token bg-transparent px-2.5 py-[5px] text-[12.5px] text-ink-muted max-[760px]:h-8 max-[760px]:w-8 max-[760px]:justify-center max-[760px]:gap-0 max-[760px]:px-0"
            >
              <span className="text-[13px]">⌕</span>
              <span className="max-[760px]:hidden">검색</span>
              <kbd className="rounded border border-border-token bg-surface-alt px-1.5 py-px font-mono text-[10.5px] text-ink-muted max-[760px]:hidden">
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

            {/* 좁은 화면 — 텍스트 네비가 접히면 이 버튼이 시트를 연다 */}
            <button
              type="button"
              onClick={() => setNavOpen((o) => !o)}
              aria-label="메뉴"
              aria-expanded={navOpen}
              className={`ml-1.5 hidden h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full border border-border-token p-0 leading-none text-ink max-[760px]:inline-flex ${
                navOpen ? "bg-hover text-[17px]" : "bg-transparent text-[13px]"
              }`}
            >
              {navOpen ? "×" : "☰"}
            </button>
          </div>
        </div>

        {navOpen && (
          <nav className="hidden border-t border-border-token px-[var(--gut)] pb-2.5 pt-1 max-[760px]:block">
            {NAV.map(([href, label, active], i) => (
              <Link
                key={href}
                href={href}
                onClick={() => setNavOpen(false)}
                className={`block px-0.5 py-[13px] font-sans text-[15.5px] font-medium tracking-[-0.015em] no-underline ${
                  i === 0 ? "" : "border-t border-border-token"
                } ${active ? "text-ink" : "text-ink-muted"}`}
              >
                {label}
              </Link>
            ))}
          </nav>
        )}
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
