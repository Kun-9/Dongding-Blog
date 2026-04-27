/**
 * Umami analytics — privacy-friendly, cookie-free.
 *
 * Auto-tracking is disabled (`data-auto-track="false"`) so admin/operational
 * routes (/admin, /settings, /studio) can be excluded from collection. We
 * fire `umami.track()` manually on every route change unless the pathname
 * matches an excluded prefix.
 */
"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";
import { useEffect } from "react";

const EXCLUDED_PREFIXES = ["/admin", "/settings", "/studio"];

function isExcluded(pathname: string): boolean {
  return EXCLUDED_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
}

export function Umami() {
  const pathname = usePathname();
  const websiteId = process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID;
  const src = process.env.NEXT_PUBLIC_UMAMI_SCRIPT_URL;

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!pathname || isExcluded(pathname)) return;
    let attempts = 0;
    const send = () => {
      if (window.umami) {
        window.umami.track();
        return;
      }
      if (attempts++ < 20) setTimeout(send, 100);
    };
    send();
  }, [pathname]);

  if (!websiteId || !src) return null;
  return (
    <Script
      defer
      data-website-id={websiteId}
      data-auto-track="false"
      src={src}
      strategy="afterInteractive"
    />
  );
}
