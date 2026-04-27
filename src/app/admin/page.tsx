/**
 * Admin Dashboard — dev-only. Numbers come from content loaders;
 * recent comments come from the GitHub Discussions GraphQL API when
 * GITHUB_TOKEN is set, otherwise the section degrades to an empty state.
 */
import Link from "next/link";
import { getAllPosts } from "@/lib/posts";
import { getAllDrafts } from "@/lib/drafts";
import { getCategoriesWithCounts } from "@/lib/category-stats";
import {
  getMonthlyPublishCounts,
  getPublishedThisWeek,
} from "@/lib/post-stats";
import { getRecentComments } from "@/lib/comments-recent";
import { fmtDate } from "@/lib/tokens";
import { DevOnlyNotice } from "@/components/layout/DevOnlyNotice";

export const metadata = {
  title: "Admin",
};

const isDev = process.env.NODE_ENV === "development";

export default async function Page() {
  if (!isDev) return <DevOnlyNotice page="대시보드" />;

  const posts = getAllPosts();
  const drafts = getAllDrafts();
  const categories = getCategoriesWithCounts();
  const monthly = getMonthlyPublishCounts(12);
  const thisWeek = getPublishedThisWeek();
  const comments = await getRecentComments(3);

  const maxMonthly = Math.max(1, ...monthly.map((b) => b.count));
  const totalCatPosts = categories.reduce((a, x) => a + (x.count ?? 0), 0);

  const stats = [
    { label: "발행된 글", value: posts.length, sub: "누적" },
    { label: "초안", value: drafts.length, sub: "대기 중" },
    {
      label: "카테고리",
      value: categories.length,
      sub: `${totalCatPosts}편 분포`,
    },
  ];

  const now = new Date();
  const dateStr = `${now.getFullYear()}년 ${now.getMonth() + 1}월 ${now.getDate()}일`;
  const weekCopy =
    thisWeek === 0 ? "조용한 한 주." : `이번 주 ${thisWeek}편 발행.`;

  return (
    <main className="mx-auto max-w-[1180px] px-5 pt-8 md:px-8 md:pt-10">
      <header className="mb-8">
        <div className="mb-2 font-sans text-[11px] font-bold uppercase tracking-[0.1em] text-ink-muted">
          ADMIN
        </div>
        <h1 className="m-0 font-sans text-[36px] font-semibold tracking-[-0.03em] text-ink">
          대시보드
        </h1>
        <p className="mt-2 whitespace-nowrap text-sm text-ink-muted">
          {dateStr} · {weekCopy}
        </p>
        <Link
          href="/admin/stats"
          className="mt-2 inline-block font-mono text-[12px] text-ink-muted no-underline"
        >
          → 통계 보기
        </Link>
      </header>

      {/* Stats */}
      <section className="mb-8 grid grid-cols-2 gap-3.5 md:grid-cols-3">
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
            <div className="font-mono text-xs text-ink-muted">{s.sub}</div>
          </div>
        ))}
      </section>

      {/* Charts row */}
      <section className="mb-8 grid grid-cols-1 gap-[18px] md:grid-cols-[1.5fr_1fr]">
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
            {monthly.map((b) => (
              <div
                key={b.ym}
                className="flex flex-1 flex-col items-center gap-1"
              >
                <div
                  className="w-full rounded-sm"
                  style={{
                    height: `${(b.count / maxMonthly) * 60}px`,
                    background: b.isCurrent
                      ? "var(--ink)"
                      : "var(--border-strong)",
                    opacity: b.isCurrent ? 1 : 0.55,
                  }}
                />
                <div className="font-mono text-[9.5px] text-ink-muted">
                  {b.label}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-border-token bg-surface px-[22px] py-5">
          <div className="mb-3.5 whitespace-nowrap font-sans text-[13px] font-semibold tracking-[-0.015em] text-ink">
            카테고리별 분포
          </div>
          <ul className="m-0 flex list-none flex-col gap-2 p-0">
            {categories.map((cat) => {
              const count = cat.count ?? 0;
              const pct = totalCatPosts > 0 ? (count / totalCatPosts) * 100 : 0;
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
                    {count}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      {/* Drafts */}
      <section className="mb-8">
        <div className="mb-3.5 border-b border-border-token pb-2.5 font-sans text-[11px] font-bold uppercase tracking-[0.1em] text-ink-muted">
          초안 ({drafts.length})
        </div>
        {drafts.length === 0 ? (
          <div className="rounded-xl border border-border-token bg-surface p-6 text-center text-sm text-ink-muted">
            초안이 없습니다.
          </div>
        ) : (
          <div className="text-sm">
            <div className="grid grid-cols-[1fr_100px_100px_110px] px-2.5 py-2 font-mono text-[10.5px] font-semibold uppercase tracking-[0.05em] text-ink-muted">
              <span>TITLE</span>
              <span>STATUS</span>
              <span className="text-right">WORDS</span>
              <span className="text-right">UPDATED</span>
            </div>
            {drafts.map((d) => (
              <Link
                key={d.slug}
                href={`/studio?slug=${encodeURIComponent(d.slug)}`}
                className="grid grid-cols-[1fr_100px_100px_110px] items-center border-t border-border-token px-2.5 py-3 no-underline hover:bg-hover"
              >
                <span className="font-medium tracking-[-0.01em] text-ink">
                  {d.title}
                </span>
                <span className="font-mono text-[10.5px] font-bold uppercase tracking-[0.05em] text-ink-muted">
                  {d.status}
                </span>
                <span className="text-right font-mono tabular-nums text-ink-muted">
                  {d.words.toLocaleString()}
                </span>
                <span className="text-right font-mono tabular-nums text-ink-muted">
                  {fmtDate(d.updated)}
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Recent comments */}
      <section className="mb-16">
        <div className="mb-3.5 border-b border-border-token pb-2.5 font-sans text-[11px] font-bold uppercase tracking-[0.1em] text-ink-muted">
          최근 댓글
        </div>
        {comments.length === 0 ? (
          <div className="rounded-xl border border-border-token bg-surface p-6 text-center text-sm text-ink-muted">
            최근 댓글이 없습니다.
          </div>
        ) : (
          <ul className="m-0 list-none p-0">
            {comments.map((c, i) => (
              <li
                key={`${c.who}-${i}`}
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
                    ↳ <em>{c.postTitle}</em>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
