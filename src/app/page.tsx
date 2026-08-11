/**
 * Home — port of project/page-home.jsx#HomePage (editorial hero variant).
 * Server component that renders the editorial hero, featured post,
 * recent grid, and category index.
 */
import Link from "next/link";
import { getAllPosts, getFeaturedPost } from "@/lib/posts";
import { getCategoriesWithCounts } from "@/lib/category-stats";
import { getAllSeries } from "@/lib/series";
import { resolveCategoryIn } from "@/lib/category-utils";
import { getSite } from "@/lib/site-db";
import { fmtDate } from "@/lib/tokens";
import { CTA } from "@/components/ui/CTA";
import { TagChip } from "@/components/post/TagChip";
import { PostCard } from "@/components/post/PostCard";
import { LeadFigure } from "@/components/post/LeadFigure";
import { InlineCode } from "@/components/prose/InlineCode";
import { TopPosts } from "@/components/analytics/TopPosts";

export const metadata = {
  alternates: { canonical: "/" },
};

/** 소개 문단의 백틱 조각만 인라인 코드로. 문단 하나라 파서까지는 필요 없다. */
function withInlineCode(text: string) {
  return text
    .split(/`([^`]+)`/)
    .map((part, i) =>
      i % 2 ? <InlineCode key={i}>{part}</InlineCode> : part,
    );
}

export default async function Page() {
  const [all, featuredPost, categories, site, seriesList] = await Promise.all([
    getAllPosts(),
    getFeaturedPost(),
    getCategoriesWithCounts(),
    getSite(),
    getAllSeries(),
  ]);
  const featured = featuredPost ?? all[0];
  const recent = all.filter((p) => p.slug !== featured?.slug).slice(0, 6);
  const featuredSeries = seriesList.find((s) => s.id === featured?.series);
  const featuredCategory = featured
    ? resolveCategoryIn(categories, featured.category)
    : undefined;

  if (!featured) {
    return (
      <main className="mx-auto max-w-[760px] px-[var(--gut)] pt-16">
        <p className="text-ink-muted">아직 글이 없습니다.</p>
      </main>
    );
  }

  return (
    <main>
      {/* Editorial Hero */}
      <section className="relative mx-auto max-w-[1180px] px-[var(--gut)] pb-8 pt-12 md:pt-16">
        <div className="relative max-w-[720px]">
          <div className="mb-3.5 inline-flex items-center gap-2 whitespace-nowrap font-sans text-xs font-semibold uppercase tracking-[0.08em] text-ink-muted">
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{ background: "#5d8a66" }}
            />
            ISSUE 12 · APRIL 2026
          </div>
          <h1 className="m-0 font-sans text-[clamp(42px,9vw,56px)] font-semibold leading-[1.05] tracking-[-0.04em] text-ink">
            안녕하세요,
            <br />
            {site.author}입니다.
          </h1>
          <p className="mb-7 mt-4 max-w-[580px] font-sans text-[18px] leading-[1.7] tracking-[-0.005em] text-ink-soft">
            {withInlineCode(site.intro)}
          </p>
          <div className="flex gap-2.5">
            <CTA href="/posts">최근 글 →</CTA>
            <CTA dark={false} href="/about">
              About
            </CTA>
          </div>
        </div>
      </section>

      {/* Featured */}
      <section className="mx-auto mt-6 max-w-[1180px] px-[var(--gut)]">
        <div className="mb-6 border-b border-border-token pb-3 font-sans text-[11px] font-bold uppercase tracking-[0.1em] text-ink-muted">
          Featured
        </div>
        <article className="relative grid grid-cols-1 items-center gap-6 px-0 pb-8 pt-2 md:grid-cols-[1fr_280px] md:gap-8">
          <div>
            <div className="mb-3 flex items-center gap-2 whitespace-nowrap text-xs tabular-nums text-ink-muted">
              <span>{fmtDate(featured.date)}</span>
              <span className="opacity-40">·</span>
              <span>{featured.readTime}분 읽기</span>
            </div>
            <h2 className="m-0 font-sans text-[clamp(27px,6vw,36px)] font-semibold leading-[1.2] tracking-[-0.03em] text-ink">
              <Link
                href={`/posts/${featured.slug}`}
                className="text-inherit no-underline before:absolute before:inset-0 before:content-['']"
              >
                {featured.title}
              </Link>
            </h2>
            <p className="mb-4 mt-3.5 text-base leading-[1.7] text-ink-soft">
              {featured.summary}
            </p>
            <div className="relative z-10 flex flex-wrap gap-1.5">
              {featured.tags.map((tag) => (
                <TagChip key={tag} tag={tag} />
              ))}
            </div>
          </div>

          <LeadFigure
            post={featured}
            series={featuredSeries}
            categoryLabel={featuredCategory?.parent.name}
          />
        </article>
      </section>

      {/* Recent grid */}
      <section className="mx-auto mt-10 max-w-[1180px] px-[var(--gut)]">
        <div className="mb-6 flex items-baseline justify-between border-b border-border-token pb-3">
          <div className="font-sans text-[11px] font-bold uppercase tracking-[0.1em] text-ink-muted">
            Recent
          </div>
          <Link
            href="/posts"
            className="text-[13px] font-medium text-ink-muted no-underline"
          >
            전체 보기 →
          </Link>
        </div>
        <div className="grid grid-cols-1 gap-[18px] sm:grid-cols-2 lg:grid-cols-3">
          {recent.map((p) => (
            <PostCard key={p.slug} post={p} layout="card" />
          ))}
        </div>
      </section>

      <TopPosts posts={all.map((p) => ({ slug: p.slug, title: p.title }))} />

      {/* Categories */}
      <section className="mx-auto mt-16 max-w-[1180px] px-[var(--gut)] pb-12">
        <div className="mb-6 border-b border-border-token pb-3 font-sans text-[11px] font-bold uppercase tracking-[0.1em] text-ink-muted">
          Categories
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {categories.map((cat) => (
            <Link
              key={cat.id}
              href={`/category/${cat.id}`}
              className="flex min-h-[110px] flex-col justify-between rounded-xl border border-border-token bg-surface p-[18px] text-inherit no-underline transition-[border-color,transform] duration-[180ms] hover:-translate-y-0.5 hover:border-border-strong"
            >
              <div>
                <div className="font-sans text-base font-semibold tracking-[-0.02em] text-ink">
                  {cat.name}
                </div>
                <div className="mt-1 text-xs leading-[1.5] text-ink-muted">
                  {cat.desc}
                </div>
              </div>
              <div className="mt-3 text-xs tabular-nums text-ink-muted">
                {cat.count ?? 0} 편 →
              </div>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
