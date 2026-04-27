/**
 * Admin Stats — dev-only. Fetches from /api/stats/* which proxies Umami.
 * The proxy routes are removed by static-build.mjs at prod build time, so
 * this page renders the dev-only notice when NODE_ENV is not "development".
 */
"use client";

import { useEffect, useState } from "react";
import { DevOnlyNotice } from "@/components/layout/DevOnlyNotice";

const isDev = process.env.NODE_ENV === "development";

interface Summary {
  pageviews: { value: number };
  visitors: { value: number };
  visits: { value: number };
  bounces: { value: number };
  totaltime: { value: number };
}

interface Series {
  pageviews: { x: string; y: number }[];
  sessions: { x: string; y: number }[];
}

interface Metric {
  x: string;
  y: number;
}

export default function StatsPage() {
  const [days, setDays] = useState(7);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [series, setSeries] = useState<Series | null>(null);
  const [topPages, setTopPages] = useState<Metric[] | null>(null);
  const [topRefs, setTopRefs] = useState<Metric[] | null>(null);
  const [topEvents, setTopEvents] = useState<Metric[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isDev) return;
    setError(null);
    Promise.all([
      fetch(`/api/stats/summary?days=${days}`).then((r) => r.json()),
      fetch(`/api/stats/pageviews?days=${days}&unit=day`).then((r) => r.json()),
      fetch(`/api/stats/metrics?days=${days}&type=url&limit=10`).then((r) =>
        r.json(),
      ),
      fetch(`/api/stats/metrics?days=${days}&type=referrer&limit=10`).then(
        (r) => r.json(),
      ),
      fetch(`/api/stats/metrics?days=${days}&type=event&limit=10`).then((r) =>
        r.json(),
      ),
    ])
      .then(([s, ts, tp, tr, te]) => {
        if (s.error) {
          setError(s.error);
          return;
        }
        setSummary(s);
        setSeries(ts);
        setTopPages(tp);
        setTopRefs(tr);
        setTopEvents(te);
      })
      .catch((err) => setError(String(err)));
  }, [days]);

  if (!isDev) return <DevOnlyNotice page="통계" />;

  if (error) {
    return (
      <main className="mx-auto max-w-[1180px] px-5 pt-8 md:px-8 md:pt-10">
        <h1 className="m-0 font-sans text-[28px] font-semibold text-ink">
          통계
        </h1>
        <p className="mt-3 rounded-lg border border-border-token bg-surface p-4 text-sm text-ink-muted">
          Umami API 연결 실패 — <code>{error}</code>
          <br />
          <code>UMAMI_API_KEY</code> 환경변수가 설정되어 있는지 확인.
        </p>
      </main>
    );
  }

  const cards = summary
    ? [
        { label: "방문자", value: summary.visitors.value },
        { label: "페이지뷰", value: summary.pageviews.value },
        { label: "세션", value: summary.visits.value },
        {
          label: "이탈률",
          value:
            summary.visits.value > 0
              ? `${Math.round((summary.bounces.value / summary.visits.value) * 100)}%`
              : "—",
        },
      ]
    : [];

  const max = series ? Math.max(1, ...series.pageviews.map((p) => p.y)) : 1;

  return (
    <main className="mx-auto max-w-[1180px] px-5 pt-8 md:px-8 md:pt-10">
      <header className="mb-8 flex items-baseline justify-between">
        <div>
          <div className="mb-2 font-sans text-[11px] font-bold uppercase tracking-[0.1em] text-ink-muted">
            ADMIN · STATS
          </div>
          <h1 className="m-0 font-sans text-[36px] font-semibold tracking-[-0.03em] text-ink">
            통계
          </h1>
        </div>
        <div className="flex gap-2 font-mono text-[12px]">
          {[7, 30].map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDays(d)}
              className={`rounded-full border px-3 py-1 ${days === d ? "border-ink-strong text-ink" : "border-border-token text-ink-muted"}`}
            >
              {d}일
            </button>
          ))}
        </div>
      </header>

      <section className="mb-8 grid grid-cols-2 gap-3.5 md:grid-cols-4">
        {cards.map((c) => (
          <div
            key={c.label}
            className="rounded-xl border border-border-token bg-surface px-5 py-[18px]"
          >
            <div className="font-sans text-xs font-medium text-ink-muted">
              {c.label}
            </div>
            <div className="my-1 font-sans text-[28px] font-bold leading-none tabular-nums tracking-[-0.03em] text-ink">
              {typeof c.value === "number" ? c.value.toLocaleString() : c.value}
            </div>
          </div>
        ))}
      </section>

      {series && (
        <section className="mb-8 rounded-xl border border-border-token bg-surface px-[22px] py-5">
          <div className="mb-3.5 font-sans text-[13px] font-semibold text-ink">
            일별 페이지뷰
          </div>
          <div className="flex h-24 items-end gap-1.5">
            {series.pageviews.map((p) => (
              <div
                key={p.x}
                className="flex flex-1 flex-col items-center gap-1"
              >
                <div
                  className="w-full rounded-sm"
                  style={{
                    height: `${(p.y / max) * 80}px`,
                    background: "var(--ink)",
                    opacity: 0.7,
                  }}
                  title={`${p.x}: ${p.y}`}
                />
                <div className="font-mono text-[9.5px] text-ink-muted">
                  {p.x.slice(5, 10)}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {[
          { title: "Top Pages", data: topPages },
          { title: "Top Referrers", data: topRefs },
          { title: "Top Events", data: topEvents },
        ].map((tbl) => (
          <div
            key={tbl.title}
            className="rounded-xl border border-border-token bg-surface px-[18px] py-4"
          >
            <div className="mb-2.5 font-sans text-[13px] font-semibold text-ink">
              {tbl.title}
            </div>
            {!tbl.data?.length ? (
              <div className="text-xs text-ink-muted">데이터 없음</div>
            ) : (
              <ul className="m-0 list-none p-0">
                {tbl.data.slice(0, 8).map((row) => (
                  <li
                    key={row.x}
                    className="grid grid-cols-[1fr_auto] gap-3 border-t border-border-token py-1.5 text-[12.5px] first:border-t-0"
                  >
                    <span className="truncate font-sans text-ink-soft">
                      {row.x || "(direct)"}
                    </span>
                    <span className="font-mono tabular-nums text-ink-muted">
                      {row.y.toLocaleString()}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </section>
    </main>
  );
}
