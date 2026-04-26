/**
 * Footer — copyright + social links.
 * Port of components.jsx#Footer.
 */
import { site } from "@/lib/data";

export function Footer() {
  return (
    <footer className="mx-auto mt-20 flex max-w-[1180px] flex-wrap items-center justify-between gap-4 border-t border-border-token px-8 py-8 font-sans text-[13px] text-ink-muted">
      <div>© 2026 Dong-Ding · 백엔드 노트</div>
      <div className="flex gap-[18px]">
        <a
          href={`https://${site.social.github}`}
          className="text-ink-muted no-underline hover:text-ink"
        >
          GitHub
        </a>
        <a
          href={`mailto:${site.social.email}`}
          className="text-ink-muted no-underline hover:text-ink"
        >
          Email
        </a>
        <a
          href={site.social.rss}
          className="text-ink-muted no-underline hover:text-ink"
        >
          RSS
        </a>
      </div>
    </footer>
  );
}
