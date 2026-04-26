/**
 * Phase 2 — component sanity page.
 * Shows every UI primitive built so far (Header/Footer come from layout).
 * Real Home lands in Phase 5.
 */
import { posts } from "@/lib/data";
import { PostCard } from "@/components/post/PostCard";
import { CategorySidebar } from "@/components/post/CategorySidebar";
import { TagChip } from "@/components/post/TagChip";
import { CTA } from "@/components/ui/CTA";
import { HeroGlow } from "@/components/layout/HeroGlow";

export default function Page() {
  const featured = posts[0];

  return (
    <main>
      {/* Hero with HeroGlow */}
      <section className="relative mx-auto max-w-[1180px] px-8 pb-8 pt-16">
        <HeroGlow />
        <div className="relative max-w-[720px]">
          <div className="mb-3.5 inline-flex items-center gap-2 font-sans text-xs font-semibold uppercase tracking-[0.08em] text-ink-muted">
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{ background: "#5d8a66" }}
            />
            Phase 2 · Component Demo
          </div>
          <h1 className="m-0 font-sans text-[56px] font-semibold leading-[1.05] tracking-[-0.04em] text-ink">
            컴포넌트 검증
          </h1>
          <p className="mb-7 mt-4 max-w-[580px] font-sans text-[18px] leading-[1.7] tracking-[-0.005em] text-ink-soft">
            Header · CommandPalette(⌘K) · CTA · TagChip · PostCard · CategorySidebar · HeroGlow
            가 모두 정상 동작하는지 확인합니다.
          </p>
          <div className="flex gap-2.5">
            <CTA href="/posts">최근 글 →</CTA>
            <CTA dark={false} href="/about">About</CTA>
            <CTA dark={false} size="sm">Small ghost</CTA>
          </div>
        </div>
      </section>

      {/* Tag chips demo */}
      <section className="mx-auto mt-10 max-w-[1180px] px-8">
        <div className="mb-3 font-mono text-[11px] font-bold uppercase tracking-[0.1em] text-ink-muted">
          TagChip
        </div>
        <div className="flex flex-wrap gap-2">
          {["jpa", "spring", "mysql", "performance", "innodb", "interview"].map(
            (t) => (
              <TagChip key={t} tag={t} />
            ),
          )}
          <TagChip tag="filled-active" filled />
        </div>
      </section>

      {/* PostCard variants */}
      <section className="mx-auto mt-10 max-w-[1180px] px-8">
        <div className="mb-3 font-mono text-[11px] font-bold uppercase tracking-[0.1em] text-ink-muted">
          PostCard · card layout
        </div>
        <div className="grid grid-cols-3 gap-[18px]">
          {posts.slice(0, 3).map((p) => (
            <PostCard key={p.slug} post={p} layout="card" />
          ))}
        </div>

        <div className="mb-3 mt-10 font-mono text-[11px] font-bold uppercase tracking-[0.1em] text-ink-muted">
          PostCard · list layout
        </div>
        <div>
          {posts.slice(0, 3).map((p) => (
            <PostCard key={p.slug} post={p} layout="list" />
          ))}
        </div>

        <div className="mb-3 mt-10 font-mono text-[11px] font-bold uppercase tracking-[0.1em] text-ink-muted">
          PostCard · magazine layout
        </div>
        <div>
          {posts.slice(0, 2).map((p) => (
            <PostCard key={p.slug} post={p} layout="magazine" />
          ))}
        </div>
      </section>

      {/* CategorySidebar demo */}
      <section className="mx-auto mt-10 max-w-[1180px] px-8 pb-8">
        <div className="mb-3 font-mono text-[11px] font-bold uppercase tracking-[0.1em] text-ink-muted">
          CategorySidebar (with active filter)
        </div>
        <div className="grid grid-cols-[240px_minmax(0,1fr)] gap-12">
          <CategorySidebar filter={{ type: "category", value: "db" }} />
          <div className="rounded-xl border border-border-token bg-surface p-6 text-sm text-ink-muted">
            글 목록 영역 (실제 구현은 Phase 5).
            <br />
            현재는 사이드바의 active 상태만 시각 확인.
          </div>
        </div>
      </section>

      {/* Featured post (verifying read of full post object) */}
      <section className="mx-auto mt-6 max-w-[1180px] px-8 pb-12">
        <div className="mb-3 font-mono text-[11px] font-bold uppercase tracking-[0.1em] text-ink-muted">
          Featured
        </div>
        <div className="rounded-xl border border-border-token bg-surface p-6">
          <div className="text-xs text-ink-muted tabular-nums">
            {featured.date} · {featured.readTime}분
          </div>
          <h2 className="mt-2 font-sans text-[28px] font-semibold leading-[1.2] tracking-[-0.03em] text-ink">
            {featured.title}
          </h2>
          <p className="mt-2 text-[15px] leading-[1.7] text-ink-soft">
            {featured.summary}
          </p>
        </div>
      </section>
    </main>
  );
}
