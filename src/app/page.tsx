/**
 * Home — port of project/page-home.jsx#HomePage (editorial hero variant).
 * Server component that renders the editorial hero, featured post,
 * recent grid, and category index.
 */
import Link from "next/link";
import { getAllPosts, getFeaturedPost } from "@/lib/posts";
import { categories } from "@/lib/categories";
import { site } from "@/lib/site";
import { fmtDate } from "@/lib/tokens";
import { CTA } from "@/components/ui/CTA";
import { TagChip } from "@/components/post/TagChip";
import { PostCard } from "@/components/post/PostCard";
import { InlineCode } from "@/components/prose/InlineCode";

export const metadata = {
  title: "Dong-Ding · 백엔드 노트",
};

export default function Page() {
  const featured = getFeaturedPost() ?? getAllPosts()[0];
  const recent = getAllPosts()
    .filter((p) => p.slug !== featured?.slug)
    .slice(0, 6);

  if (!featured) {
    return (
      <main className="mx-auto max-w-[760px] px-8 pt-16">
        <p className="text-ink-muted">아직 글이 없습니다.</p>
      </main>
    );
  }

  return (
    <main>
      {/* Editorial Hero */}
      <section className="relative mx-auto max-w-[1180px] px-8 pb-8 pt-16">
        <div className="relative max-w-[720px]">
          <div className="mb-3.5 inline-flex items-center gap-2 whitespace-nowrap font-sans text-xs font-semibold uppercase tracking-[0.08em] text-ink-muted">
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{ background: "#5d8a66" }}
            />
            ISSUE 12 · APRIL 2026
          </div>
          <h1 className="m-0 font-sans text-[56px] font-semibold leading-[1.05] tracking-[-0.04em] text-ink">
            안녕하세요,
            <br />
            {site.author}입니다.
          </h1>
          <p className="mb-7 mt-4 max-w-[580px] font-sans text-[18px] leading-[1.7] tracking-[-0.005em] text-ink-soft">
            실무에서 마주친 <InlineCode>Spring</InlineCode>,{" "}
            <InlineCode>JPA</InlineCode>, DB internals 문제를 끝까지 풀어 씁니다.
            글이 천천히 읽히도록 만들었어요.
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
      <section className="mx-auto mt-6 max-w-[1180px] px-8">
        <div className="mb-6 border-b border-border-token pb-3 font-sans text-[11px] font-bold uppercase tracking-[0.1em] text-ink-muted">
          Featured
        </div>
        <article className="relative grid grid-cols-[1fr_280px] items-center gap-8 px-0 pb-8 pt-2">
          <div>
            <div className="mb-3 flex items-center gap-2 whitespace-nowrap text-xs tabular-nums text-ink-muted">
              <span>{fmtDate(featured.date)}</span>
              <span className="opacity-40">·</span>
              <span>{featured.readTime}분 읽기</span>
            </div>
            <h2 className="m-0 font-sans text-[36px] font-semibold leading-[1.2] tracking-[-0.03em] text-ink">
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

          {/* Lead figure — abstract code-pattern stand-in */}
          <div
            className="relative flex aspect-[4/3] items-center justify-center overflow-hidden rounded-xl border border-border-token bg-surface font-mono text-[11px] text-ink-muted"
          >
            <div
              className="absolute inset-0 p-[18px] opacity-55"
              style={{
                background: `repeating-linear-gradient(180deg, transparent 0 18px, var(--surface-alt) 18px 19px)`,
              }}
            />
            <div className="relative text-center leading-[1.7]">
              <div className="font-sans text-5xl font-bold tracking-[-0.04em] text-ink">
                N+1
              </div>
              <div>persistence.context</div>
            </div>
          </div>
        </article>
      </section>

      {/* Recent grid */}
      <section className="mx-auto mt-10 max-w-[1180px] px-8">
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
        <div className="grid grid-cols-3 gap-[18px]">
          {recent.map((p) => (
            <PostCard key={p.slug} post={p} layout="card" />
          ))}
        </div>
      </section>

      {/* Categories */}
      <section className="mx-auto mt-16 max-w-[1180px] px-8 pb-12">
        <div className="mb-6 border-b border-border-token pb-3 font-sans text-[11px] font-bold uppercase tracking-[0.1em] text-ink-muted">
          Categories
        </div>
        <div className="grid grid-cols-5 gap-3">
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
                {cat.count} 편 →
              </div>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
