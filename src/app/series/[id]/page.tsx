import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getAllSeries,
  getSeriesByIdWithPosts,
} from "@/lib/series";
import { fmtDate } from "@/lib/tokens";

export function generateStaticParams() {
  return getAllSeries().map((s) => ({ id: s.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const s = getSeriesByIdWithPosts(id);
  return { title: s ? s.title : "Series" };
}

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const s = getSeriesByIdWithPosts(id);
  if (!s) notFound();

  const total = Math.max(s.count, s.posts.length);
  const slots: ({ kind: "post"; index: number } | { kind: "empty" })[] = [];
  const usedIndices = new Set<number>();
  for (let i = 0; i < total; i++) {
    const post = s.posts.find((p) => p.seriesOrder === i + 1);
    if (post) {
      slots.push({ kind: "post", index: s.posts.indexOf(post) });
      usedIndices.add(s.posts.indexOf(post));
    } else {
      slots.push({ kind: "empty" });
    }
  }
  const trailing = s.posts
    .map((_, i) => i)
    .filter((i) => !usedIndices.has(i));

  return (
    <main className="mx-auto max-w-[760px] px-5 pt-10 md:px-8 md:pt-16">
      <header className="mb-10">
        <div className="mb-3 flex items-center gap-2.5">
          <div
            className="inline-flex h-7 items-center rounded-md px-2 font-mono text-[11px] font-bold tracking-[0.02em] text-white opacity-90"
            style={{ background: s.color }}
          >
            {s.count}편 시리즈
          </div>
          <Link
            href="/series"
            className="font-sans text-[11px] font-bold uppercase tracking-[0.1em] text-ink-muted no-underline hover:text-ink-soft"
          >
            ← SERIES
          </Link>
        </div>
        <h1 className="m-0 font-sans text-[36px] font-semibold leading-[1.15] tracking-[-0.035em] text-ink">
          {s.title}
        </h1>
        <p className="mt-3 max-w-[560px] text-[15px] leading-[1.65] text-ink-muted">
          {s.desc}
        </p>

        <div className="mt-5">
          <div className="mb-2 flex items-center justify-between font-mono text-[11px] text-ink-muted">
            <span>
              {s.posts.length}/{total} 발행됨
            </span>
            {s.posts.length > s.count && (
              <span className="text-ink-soft">목표 {s.count}편 초과</span>
            )}
          </div>
          <div className="flex gap-1">
            {Array.from({ length: total }).map((_, i) => (
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
        </div>
      </header>

      <ol className="m-0 flex list-none flex-col gap-2.5 p-0 pb-16">
        {slots.map((slot, i) => {
          const num = String(i + 1).padStart(2, "0");
          if (slot.kind === "empty") {
            return (
              <li
                key={`empty-${i}`}
                className="flex items-center gap-4 rounded-lg border border-dashed border-border-token bg-transparent px-5 py-4"
              >
                <span className="font-mono text-[12px] text-ink-muted opacity-60">
                  {num}
                </span>
                <span className="text-[14px] text-ink-muted opacity-70">
                  예정
                </span>
              </li>
            );
          }
          const post = s.posts[slot.index];
          return (
            <li key={post.slug}>
              <Link
                href={`/posts/${post.slug}`}
                className="flex items-start gap-4 rounded-lg border border-border-token bg-surface px-5 py-4 no-underline transition-[border-color,transform] duration-200 hover:border-border-strong hover:-translate-y-0.5"
              >
                <span
                  className="mt-0.5 font-mono text-[12px] font-bold"
                  style={{ color: s.color }}
                >
                  {num}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="font-sans text-[16px] font-semibold tracking-[-0.015em] text-ink">
                    {post.title}
                  </div>
                  <div className="mt-1 truncate text-[13.5px] leading-[1.6] text-ink-soft">
                    {post.summary}
                  </div>
                  <div className="mt-1.5 font-mono text-[11px] text-ink-muted">
                    {fmtDate(post.date)} · {post.readTime}분
                  </div>
                </div>
              </Link>
            </li>
          );
        })}
        {trailing.map((idx) => {
          const post = s.posts[idx];
          const num = "+";
          return (
            <li key={post.slug}>
              <Link
                href={`/posts/${post.slug}`}
                className="flex items-start gap-4 rounded-lg border border-border-token bg-surface px-5 py-4 no-underline transition-[border-color,transform] duration-200 hover:border-border-strong hover:-translate-y-0.5"
              >
                <span
                  className="mt-0.5 font-mono text-[12px] font-bold"
                  style={{ color: s.color }}
                >
                  {num}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="font-sans text-[16px] font-semibold tracking-[-0.015em] text-ink">
                    {post.title}
                  </div>
                  <div className="mt-1 truncate text-[13.5px] leading-[1.6] text-ink-soft">
                    {post.summary}
                  </div>
                  <div className="mt-1.5 font-mono text-[11px] text-ink-muted">
                    {fmtDate(post.date)} · {post.readTime}분 · 순서 미지정
                  </div>
                </div>
              </Link>
            </li>
          );
        })}
      </ol>
    </main>
  );
}
