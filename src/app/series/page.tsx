/**
 * Series — port of project/page-extras.jsx#SeriesPage.
 */
import Link from "next/link";
import { getAllSeries } from "@/lib/series";

export const metadata = {
  title: "Series · Dong-Ding",
};

// Map a series id to a category route — used for card click-through.
function seriesCategoryHref(id: string): string {
  if (id.startsWith("jpa") || id.startsWith("mysql")) return "/category/db";
  if (id.startsWith("tx")) return "/category/spring";
  return "/category/system";
}

export default function Page() {
  const series = getAllSeries();

  return (
    <main className="mx-auto max-w-[880px] px-5 pt-10 md:px-8 md:pt-16">
      <header className="mb-8">
        <div className="mb-3 font-sans text-[11px] font-bold uppercase tracking-[0.1em] text-ink-muted">
          SERIES
        </div>
        <h1 className="m-0 font-sans text-[40px] font-semibold leading-[1.1] tracking-[-0.035em] text-ink">
          연재 모음
        </h1>
        <p className="mt-3 max-w-[540px] text-[15px] leading-[1.6] text-ink-muted">
          한 주제를 여러 글로 나누어 천천히 따라가는 글 묶음. 처음부터 읽으면
          가장 잘 이해됩니다.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-3.5 pb-16 sm:grid-cols-2">
        {series.map((s) => (
          <Link
            key={s.id}
            href={seriesCategoryHref(s.id)}
            className="flex min-h-[200px] flex-col gap-3.5 rounded-xl border border-border-token bg-surface p-5 no-underline transition-[border-color,transform] duration-200 hover:border-border-strong hover:-translate-y-0.5"
          >
            <div className="flex items-center justify-between">
              <div
                className="inline-flex h-9 w-9 items-center justify-center rounded-[10px] font-mono text-[11px] font-bold tracking-[0.02em] text-white opacity-85"
                style={{ background: s.color }}
              >
                {s.count}편
              </div>
              <div className="whitespace-nowrap font-mono text-[11px] text-ink-muted">
                {s.posts.length}/{s.count} 발행됨
              </div>
            </div>
            <div>
              <div className="mb-1.5 font-sans text-[22px] font-semibold tracking-[-0.025em] text-ink">
                {s.title}
              </div>
              <div className="text-sm leading-[1.6] text-ink-soft">{s.desc}</div>
            </div>
            <div className="mt-auto flex gap-1">
              {Array.from({ length: s.count }).map((_, i) => (
                <div
                  key={i}
                  className="h-1 flex-1 rounded-sm"
                  style={{
                    background:
                      i < s.posts.length ? s.color : "var(--surface-alt)",
                  }}
                />
              ))}
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}
