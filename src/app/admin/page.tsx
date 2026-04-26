/**
 * Admin Dashboard — port of project/page-extras.jsx#AdminPage.
 * UI-only (per Phase 6 scope). Numbers come from lib loaders; deltas/RSS
 * subscriber counts are static demo values.
 */
import Link from "next/link";
import { getAllPosts } from "@/lib/posts";
import { getAllDrafts } from "@/lib/drafts";
import { categories } from "@/lib/categories";
import { fmtDate } from "@/lib/tokens";
import { CTA } from "@/components/ui/CTA";

export const metadata = {
  title: "Admin · Dong-Ding",
};

const MONTHLY = [3, 1, 2, 4, 2, 3, 5, 2, 4, 6, 3, 4];
const MONTH_LABELS = ["M", "J", "J", "A", "S", "O", "N", "D", "J", "F", "M", "A"];

const RECENT_COMMENTS = [
  {
    who: "jihoon-k",
    when: "4시간 전",
    body: "BatchSize와 EntityGraph를 같이 쓰면 어떻게 될까요? 둘 다 적용된 쿼리를 본 적이 없어서…",
    post: "JPA N+1 — fetch join은 정답이 아니다",
  },
  {
    who: "soomin",
    when: "어제",
    body: "@Transactional(propagation = NESTED)를 쓰는 게 더 안전한 케이스도 있을까요?",
    post: "스프링 트랜잭션 전파, 그 진짜 동작",
  },
  {
    who: "ddanji",
    when: "3일 전",
    body: "Heap dump 도구로 MAT 말고 다른 거 추천하실 만한 게 있나요?",
    post: "디버깅 일지 — ThreadLocal 메모리 누수",
  },
];

export default function Page() {
  const posts = getAllPosts();
  const drafts = getAllDrafts();
  const max = Math.max(...MONTHLY);
  const totalCatPosts = categories.reduce((a, x) => a + x.count, 0);

  const stats = [
    { label: "발행된 글", value: posts.length, sub: "누적", isDelta: false },
    { label: "초안", value: drafts.length, sub: "대기 중", isDelta: false },
    { label: "카테고리", value: categories.length, sub: "5개 분류", isDelta: false },
    { label: "RSS 구독자", value: 1248, sub: "+34 이번 주", isDelta: true },
  ];

  return (
    <main className="mx-auto max-w-[1180px] px-8 pt-10">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="mb-2 font-sans text-[11px] font-bold uppercase tracking-[0.1em] text-ink-muted">
            ADMIN
          </div>
          <h1 className="m-0 font-sans text-[36px] font-semibold tracking-[-0.03em] text-ink">
            대시보드
          </h1>
          <p className="mt-2 whitespace-nowrap text-sm text-ink-muted">
            2026년 4월 27일 · 조용한 한 주.
          </p>
        </div>
        <div className="flex gap-2">
          <CTA dark={false} size="sm" href="/settings">
            설정
          </CTA>
          <CTA dark={false} size="sm" href="/studio">
            새 글 →
          </CTA>
          <CTA size="sm">바로 발행</CTA>
        </div>
      </header>

      {/* Stats */}
      <section className="mb-8 grid grid-cols-4 gap-3.5">
        {stats.map((s) => (
          <div
            key={s.label}
            className="rounded-xl border border-border-token bg-surface px-5 py-[18px]"
          >
            <div className="font-sans text-xs font-medium tracking-[-0.005em] text-ink-muted">
              {s.label}
            </div>
            <div className="my-1 font-sans text-[32px] font-bold leading-none tabular-nums tracking-[-0.03em] text-ink">
              {s.value.toLocaleString()}
            </div>
            <div
              className="font-mono text-xs"
              style={{ color: s.isDelta ? "#7da75e" : "var(--ink-muted)" }}
            >
              {s.sub}
            </div>
          </div>
        ))}
      </section>

      {/* Charts row */}
      <section className="mb-8 grid grid-cols-[1.5fr_1fr] gap-[18px]">
        <div className="rounded-xl border border-border-token bg-surface px-[22px] py-5">
          <div className="mb-3.5 flex items-baseline justify-between gap-3">
            <div className="whitespace-nowrap font-sans text-[13px] font-semibold tracking-[-0.015em] text-ink">
              월별 발행 추이
            </div>
            <div className="whitespace-nowrap font-mono text-[11px] text-ink-muted">
              최근 12개월
            </div>
          </div>
          <div className="flex h-20 items-end gap-1.5">
            {MONTHLY.map((v, i) => {
              const isLast = i === MONTHLY.length - 1;
              return (
                <div
                  key={i}
                  className="flex flex-1 flex-col items-center gap-1"
                >
                  <div
                    className="w-full rounded-sm"
                    style={{
                      height: `${(v / max) * 60}px`,
                      background: isLast ? "var(--ink)" : "var(--border-strong)",
                      opacity: isLast ? 1 : 0.55,
                    }}
                  />
                  <div className="font-mono text-[9.5px] text-ink-muted">
                    {MONTH_LABELS[i]}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-xl border border-border-token bg-surface px-[22px] py-5">
          <div className="mb-3.5 whitespace-nowrap font-sans text-[13px] font-semibold tracking-[-0.015em] text-ink">
            카테고리별 분포
          </div>
          <ul className="m-0 flex list-none flex-col gap-2 p-0">
            {categories.map((cat) => {
              const pct = (cat.count / totalCatPosts) * 100;
              return (
                <li
                  key={cat.id}
                  className="grid grid-cols-[60px_1fr_28px] items-center gap-2 text-xs"
                >
                  <span className="font-sans font-medium text-ink-soft">
                    {cat.name}
                  </span>
                  <div className="h-1.5 overflow-hidden rounded-sm bg-surface-alt">
                    <div
                      className="h-full"
                      style={{
                        width: `${pct}%`,
                        background: "var(--border-strong)",
                      }}
                    />
                  </div>
                  <span className="text-right font-mono tabular-nums text-ink-muted">
                    {cat.count}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      {/* Drafts */}
      <section className="mb-8">
        <div className="mb-3.5 flex items-baseline justify-between gap-3 border-b border-border-token pb-2.5">
          <div className="whitespace-nowrap font-sans text-[11px] font-bold uppercase tracking-[0.1em] text-ink-muted">
            초안 ({drafts.length})
          </div>
          <Link
            href="/studio"
            className="whitespace-nowrap text-[12.5px] text-ink-muted no-underline"
          >
            새 초안 +
          </Link>
        </div>
        {drafts.length === 0 ? (
          <div className="rounded-xl border border-border-token bg-surface p-6 text-center text-sm text-ink-muted">
            초안이 없습니다.
          </div>
        ) : (
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="font-mono text-[10.5px] uppercase tracking-[0.05em] text-ink-muted">
                <th className="px-2.5 py-2 text-left font-semibold">TITLE</th>
                <th className="w-[100px] px-2.5 py-2 text-left font-semibold">
                  STATUS
                </th>
                <th className="w-[100px] px-2.5 py-2 text-right font-semibold">
                  WORDS
                </th>
                <th className="w-[110px] px-2.5 py-2 text-right font-semibold">
                  UPDATED
                </th>
              </tr>
            </thead>
            <tbody>
              {drafts.map((d) => (
                <tr
                  key={d.slug}
                  className="cursor-pointer border-t border-border-token hover:bg-hover"
                >
                  <td className="px-2.5 py-3 font-medium tracking-[-0.01em] text-ink">
                    {d.title}
                  </td>
                  <td className="px-2.5 py-3">
                    <span className="rounded font-mono text-[10.5px] font-bold uppercase tracking-[0.05em] text-ink-muted">
                      {d.status}
                    </span>
                  </td>
                  <td className="px-2.5 py-3 text-right font-mono tabular-nums text-ink-muted">
                    {d.words.toLocaleString()}
                  </td>
                  <td className="px-2.5 py-3 text-right font-mono tabular-nums text-ink-muted">
                    {fmtDate(d.updated)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {/* Recent comments */}
      <section className="mb-16">
        <div className="mb-3.5 border-b border-border-token pb-2.5 font-sans text-[11px] font-bold uppercase tracking-[0.1em] text-ink-muted">
          최근 댓글
        </div>
        <ul className="m-0 list-none p-0">
          {RECENT_COMMENTS.map((c, i) => (
            <li
              key={c.who}
              className="grid grid-cols-[120px_1fr] gap-4 py-3.5"
              style={{ borderTop: i ? "1px solid var(--border)" : "none" }}
            >
              <div>
                <div className="font-sans text-[13px] font-semibold text-ink">
                  @{c.who}
                </div>
                <div className="mt-px font-mono text-[11px] text-ink-muted">
                  {c.when}
                </div>
              </div>
              <div>
                <p className="m-0 text-sm leading-[1.65] text-ink-soft">
                  {c.body}
                </p>
                <div className="mt-1.5 text-[11.5px] text-ink-muted">
                  ↳ <em>{c.post}</em>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
