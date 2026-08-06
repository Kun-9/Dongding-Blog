"use client";

/**
 * AdminMenu — 로그인했을 때만 헤더에 뜨는 계정 드롭다운.
 * 로그인 여부는 클라이언트에서 확인하므로(`useAuthEmail`) ISR 캐시를 오염시키지
 * 않는다. 여기 링크가 보인다고 권한이 생기는 건 아니고, 실제 차단은 서버가 한다.
 */
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "@/app/login/actions";
import { useAuthEmail } from "@/lib/hooks";

const ITEMS = [
  { href: "/studio", label: "새 글" },
  { href: "/admin", label: "대시보드" },
  { href: "/admin/stats", label: "통계" },
  { href: "/settings", label: "설정" },
];

export function AdminMenu() {
  const email = useAuthEmail();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (email === null) return null;

  const handle = email.split("@")[0] || "계정";
  // trailingSlash: true 라서 pathname 은 "/admin/stats/" 로 들어온다.
  const here = pathname?.replace(/\/$/, "") || "/";

  return (
    <div ref={ref} className="relative ml-1.5">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        className={`inline-flex items-center gap-1.5 rounded-full border border-border-token py-[5px] pl-2 pr-2.5 font-sans text-[12.5px] font-medium tracking-[-0.005em] transition-colors ${
          open ? "bg-hover text-ink" : "bg-transparent text-ink-muted"
        }`}
      >
        <span
          aria-hidden
          className="h-[7px] w-[7px] rounded-full"
          style={{ background: "var(--accent)" }}
        />
        <span className="max-w-[110px] truncate">{handle}</span>
        <span className="text-[9px] leading-none">▾</span>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-[calc(100%+8px)] z-50 w-[190px] overflow-hidden rounded-xl border border-border-token bg-surface py-1.5"
          style={{ boxShadow: "0 12px 32px rgba(0,0,0,0.12)" }}
        >
          <div className="truncate px-3.5 pb-2 pt-1 font-mono text-[11px] text-ink-muted">
            {email}
          </div>
          {ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              role="menuitem"
              onClick={() => setOpen(false)}
              className={`block px-3.5 py-2 font-sans text-[13px] no-underline hover:bg-hover ${
                here === item.href ? "text-ink" : "text-ink-soft"
              }`}
            >
              {item.label}
            </Link>
          ))}
          <form action={signOut} className="mt-1.5 border-t border-border-token pt-1.5">
            <button
              type="submit"
              role="menuitem"
              className="w-full cursor-pointer border-none bg-transparent px-3.5 py-2 text-left font-sans text-[13px] text-ink-muted hover:bg-hover hover:text-ink"
            >
              로그아웃
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
