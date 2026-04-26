/**
 * Bookmarks (Linkroll) — port of project/page-extras.jsx#BookmarksPage.
 */
import { getAllBookmarks } from "@/lib/bookmarks";
import { fmtDate } from "@/lib/tokens";

export const metadata = {
  title: "Linkroll · Dong-Ding",
};

export default function Page() {
  const items = getAllBookmarks();

  return (
    <main className="mx-auto max-w-[760px] px-8 pt-16">
      <header className="mb-8">
        <div className="mb-3 font-sans text-[11px] font-bold uppercase tracking-[0.1em] text-ink-muted">
          LINKROLL
        </div>
        <h1 className="m-0 font-sans text-[40px] font-semibold leading-[1.1] tracking-[-0.035em] text-ink">
          읽고 좋았던 글
        </h1>
        <p className="mt-3 max-w-[540px] text-[15px] leading-[1.6] text-ink-muted">
          남이 잘 정리해 둔 글을 다시 쓰는 건 시간 낭비예요. 대신 추천만 합니다.
        </p>
      </header>

      <ul className="m-0 list-none p-0">
        {items.map((b, i) => (
          <li
            key={b.url}
            className="grid grid-cols-[90px_1fr] gap-[18px] py-5"
            style={{
              borderTop: i === 0 ? "none" : "1px solid var(--border)",
            }}
          >
            <div className="pt-0.5">
              <div className="font-mono text-[11px] tabular-nums text-ink-muted">
                {fmtDate(b.date)}
              </div>
              <div className="mt-1">
                <span className="rounded border border-border-token bg-surface-alt px-1.5 py-0.5 font-mono text-[10.5px] font-bold uppercase tracking-[0.05em] text-ink-muted">
                  {b.tag}
                </span>
              </div>
            </div>
            <div>
              <a
                href={`https://${b.url}`}
                target="_blank"
                rel="noopener"
                className="font-sans text-[17px] font-semibold leading-[1.35] tracking-[-0.02em] text-ink no-underline"
              >
                {b.title}
                <span className="ml-1 text-[13px] text-ink-muted">↗</span>
              </a>
              <div className="mt-0.5 font-mono text-xs text-ink-muted">
                {b.source} · {b.url}
              </div>
              <p
                className="mt-2.5 pl-3 text-sm leading-[1.7] text-ink-soft"
                style={{ borderLeft: "2px solid var(--border)" }}
              >
                {b.note}
              </p>
            </div>
          </li>
        ))}
      </ul>
      <div className="h-16" />
    </main>
  );
}
