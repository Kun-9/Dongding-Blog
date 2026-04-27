/**
 * Admin Stats — dev-only. Fetches from /api/stats/* which proxies Umami.
 * The proxy routes are removed by static-build.mjs at prod build time, so
 * this page renders the dev-only notice when NODE_ENV is not "development".
 */
"use client";

import { useEffect, useState } from "react";
import { DevOnlyNotice } from "@/components/layout/DevOnlyNotice";

const isDev = process.env.NODE_ENV === "development";

type Stat = number | { value: number };

interface Summary {
  pageviews: Stat;
  visitors: Stat;
  visits: Stat;
  bounces: Stat;
  totaltime: Stat;
}

function statValue(s: Stat | undefined): number {
  if (s == null) return 0;
  return typeof s === "number" ? s : (s.value ?? 0);
}

/**
 * SVG area + line chart for the daily pageviews series.
 * Uses viewBox so it fluidly scales to its container width.
 */
function PageviewChart({
  data,
  max,
}: {
  data: { x: string; y: number }[];
  max: number;
}) {
  const W = 600;
  const H = 96;
  const padX = 4;
  const padY = 8;
  const innerW = W - padX * 2;
  const innerH = H - padY * 2;
  const n = data.length;
  const stepX = n > 1 ? innerW / (n - 1) : 0;

  const points = data.map((p, i) => {
    const x = padX + i * stepX;
    const y = padY + innerH - (p.y / max) * innerH;
    return { x, y, v: p.y, k: p.x };
  });
  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const areaPath =
    `M ${padX} ${padY + innerH} ` +
    points.map((p) => `L ${p.x} ${p.y}`).join(" ") +
    ` L ${padX + innerW} ${padY + innerH} Z`;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      className="block h-24 w-full overflow-visible"
      role="img"
      aria-label="일별 페이지뷰 추이"
    >
      <line
        x1={padX}
        x2={padX + innerW}
        y1={padY + innerH}
        y2={padY + innerH}
        stroke="var(--border-token)"
        strokeWidth="1"
      />
      <path d={areaPath} fill="var(--ink)" opacity="0.07" />
      <path d={linePath} fill="none" stroke="var(--ink)" strokeWidth="1.4" strokeLinejoin="round" strokeLinecap="round" />
      {points.map((p) =>
        p.v > 0 ? (
          <circle key={p.k} cx={p.x} cy={p.y} r="2.4" fill="var(--ink)">
            <title>{`${p.k}: ${p.v}`}</title>
          </circle>
        ) : null,
      )}
    </svg>
  );
}

/**
 * Fill in zero-count entries for any day in [now-days, now] not present in
 * the Umami response, so the chart always shows the full range.
 */
function fillDays(
  series: { x: string; y: number }[] | undefined,
  days: number,
): { x: string; y: number }[] {
  const map = new Map<string, number>();
  for (const p of series ?? []) {
    map.set(p.x.slice(0, 10), p.y);
  }
  const today = new Date();
  const out: { x: string; y: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    out.push({ x: key, y: map.get(key) ?? 0 });
  }
  return out;
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
    ? (() => {
        const visitors = statValue(summary.visitors);
        const pageviews = statValue(summary.pageviews);
        const visits = statValue(summary.visits);
        const bounces = statValue(summary.bounces);
        return [
          { label: "방문자", value: visitors },
          { label: "페이지뷰", value: pageviews },
          { label: "세션", value: visits },
          {
            label: "이탈률",
            value:
              visits > 0
                ? `${Math.round((bounces / visits) * 100)}%`
                : "—",
          },
        ];
      })()
    : [];

  const filledPageviews = fillDays(series?.pageviews, days);
  const max = Math.max(1, ...filledPageviews.map((p) => p.y));

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

      <section className="mb-8 rounded-xl border border-border-token bg-surface px-[22px] py-5">
        <div className="mb-4 flex items-baseline justify-between">
          <div className="font-sans text-[13px] font-semibold text-ink">
            일별 페이지뷰
          </div>
          <div className="font-mono text-[11px] tabular-nums text-ink-muted">
            최근 {days}일 · peak {max.toLocaleString()}
          </div>
        </div>
        <PageviewChart data={filledPageviews} max={max} />
        <div className="mt-2 flex justify-between font-mono text-[10px] tabular-nums text-ink-muted">
          <span>{filledPageviews[0]?.x.slice(5, 10)}</span>
          <span>
            {filledPageviews[Math.floor(filledPageviews.length / 2)]?.x.slice(5, 10)}
          </span>
          <span>{filledPageviews[filledPageviews.length - 1]?.x.slice(5, 10)}</span>
        </div>
      </section>

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
