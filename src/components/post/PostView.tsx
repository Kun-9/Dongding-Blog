/**
 * 글 본문 화면 — `/posts/[slug]`(공개 글)와 `/preview/[slug]`(발행 전
 * 미리보기)가 같이 쓴다. 미리보기는 같은 모양에 조회수·좋아요·댓글·이웃 글
 * 이동만 뺀다. 둘이 따로 놀면 미리보기가 실제와 달라진다.
 */
import Link from "next/link";

import { getAdjacentPosts, getPostRefs } from "@/lib/posts";
import { extractCardTargets } from "@/lib/link-cards";
import { getLinkMeta } from "@/lib/link-meta";
import { getSeriesByIdWithPosts } from "@/lib/series";
import { resolveCategory } from "@/lib/categories";
import { getSite } from "@/lib/site-db";
import { fmtDate } from "@/lib/tokens";
import { renderMarkdown } from "@/lib/markdown";
import type { PostMeta } from "@/lib/types";

import { Avatar } from "@/components/layout/Avatar";
import { TagChip } from "@/components/post/TagChip";
import { PostViews } from "@/components/analytics/PostViews";
import { TOC } from "@/components/prose/TOC";
import { ReadingProgress } from "@/components/prose/ReadingProgress";
import { Comments } from "@/components/comments/Comments";
import { AdminBar } from "@/components/post/AdminBar";
import { LikeButton } from "@/components/post/LikeButton";
import { SeriesBanner } from "@/components/post/SeriesBanner";
import { SeriesStepNav } from "@/components/post/SeriesStepNav";

const ARTICLE_ID = "article-body";

export async function PostView({
  slug,
  post,
  includeDrafts,
  preview = false,
}: {
  slug: string;
  post: { meta: PostMeta; body: string };
  /** 카드·시리즈에 draft 도 넣을지. */
  includeDrafts: boolean;
  /** 발행 전 미리보기 — 방문자 기능(조회수·좋아요·댓글·이웃 글)을 뺀다. */
  preview?: boolean;
}) {

  // 링크 카드 재료 — 파서가 동기 함수라 렌더 전에 미리 채운다.
  const targets = extractCardTargets(post.body);
  const [links, postRefs] = await Promise.all([
    getLinkMeta(targets.urls),
    getPostRefs(targets.slugs, { includeDrafts }),
  ]);
  const content = renderMarkdown(post.body, { links, posts: postRefs });

  const [cat, { prev, next }, site] = await Promise.all([
    resolveCategory(post.meta.category),
    preview ? Promise.resolve({ prev: undefined, next: undefined }) : getAdjacentPosts(slug),
    getSite(),
  ]);
  const toc = post.meta.toc ?? [];

  const seriesCtx = await (async () => {
    if (!post.meta.series) return null;
    const series = await getSeriesByIdWithPosts(post.meta.series, {
      includeDrafts,
    });
    if (!series) return null;
    const idx = series.posts.findIndex((p) => p.slug === slug);
    if (idx < 0) return null;
    const total = Math.max(series.count, series.posts.length);
    const currentOrder = post.meta.seriesOrder ?? idx + 1;

    type Slot =
      | { kind: "post"; order: number; post: (typeof series.posts)[number] }
      | { kind: "empty"; order: number };
    const slots: Slot[] = [];
    const usedSlugs = new Set<string>();
    for (let i = 0; i < total; i++) {
      const order = i + 1;
      const found = series.posts.find((p) => p.seriesOrder === order);
      if (found) {
        slots.push({ kind: "post", order, post: found });
        usedSlugs.add(found.slug);
      } else {
        slots.push({ kind: "empty", order });
      }
    }
    series.posts
      .filter((p) => !usedSlugs.has(p.slug))
      .forEach((p, i) =>
        slots.push({ kind: "post", order: total + i + 1, post: p }),
      );

    return {
      id: series.id,
      title: series.title,
      color: series.color,
      currentOrder,
      total,
      publishedCount: series.posts.length,
      seriesPrev: idx > 0 ? series.posts[idx - 1] : undefined,
      seriesNext:
        idx < series.posts.length - 1 ? series.posts[idx + 1] : undefined,
      slots,
      currentSlug: slug,
    };
  })();

  return (
    <main>
      <ReadingProgress articleId={ARTICLE_ID} />

      <div className="mx-auto grid max-w-[1180px] grid-cols-[minmax(0,700px)_220px] justify-center gap-16 px-[var(--gut)] max-[1100px]:grid-cols-1 max-[1100px]:gap-10">
        <article id={ARTICLE_ID} className="pb-8 pt-10 md:pt-14">
          <div className="mb-5 flex items-center gap-2 font-sans text-xs text-ink-muted">
            <Link href="/" className="text-ink-muted no-underline">
              Home
            </Link>
            <span className="opacity-40">/</span>
            {cat && (
              <>
                <Link
                  href={`/category/${cat.parent.id}`}
                  className="text-ink-muted no-underline"
                >
                  {cat.parent.name}
                </Link>
                {cat.sub && (
                  <>
                    <span className="opacity-40">/</span>
                    <Link
                      href={`/category/${cat.sub.id}`}
                      className="text-ink-muted no-underline"
                    >
                      {cat.sub.name}
                    </Link>
                  </>
                )}
              </>
            )}
          </div>

          <AdminBar
            slug={slug}
            title={post.meta.title}
            status={post.meta.visibility}
          />

          {seriesCtx && (
            <SeriesBanner
              seriesId={seriesCtx.id}
              seriesTitle={seriesCtx.title}
              color={seriesCtx.color}
              currentOrder={seriesCtx.currentOrder}
              total={seriesCtx.total}
              publishedCount={seriesCtx.publishedCount}
            />
          )}

          <header className="mb-9">
            <h1 className="m-0 font-sans text-[clamp(29px,7vw,40px)] font-semibold leading-[1.15] tracking-[-0.035em] text-ink">
              {post.meta.title}
            </h1>
            <p className="mb-5 mt-3.5 text-[17px] leading-[1.6] tracking-[-0.005em] text-ink-muted">
              {post.meta.summary}
            </p>
            <div className="flex flex-wrap items-center gap-3.5 border-t border-border-token pt-4">
              <Avatar size={36} />
              <div className="flex-1 text-[13.5px]">
                <div className="font-medium text-ink">{site.author}</div>
                <div className="mt-px flex flex-wrap items-center gap-1.5 font-mono tabular-nums text-ink-muted">
                  <span>{fmtDate(post.meta.date)}</span>
                  <span className="opacity-40">·</span>
                  <span>{post.meta.readTime}분 읽기</span>
                  {!preview && (
                    <>
                      <span className="opacity-40">·</span>
                      <PostViews slug={slug} />
                    </>
                  )}
                </div>
              </div>
              <div className="flex gap-1.5">
                {post.meta.tags.map((tag) => (
                  <TagChip key={tag} tag={tag} size="sm" />
                ))}
              </div>
            </div>
          </header>

          {content}

          {seriesCtx && (
            <div className="mt-10">
              <SeriesStepNav
                seriesId={seriesCtx.id}
                seriesTitle={seriesCtx.title}
                color={seriesCtx.color}
                publishedCount={seriesCtx.publishedCount}
                prev={seriesCtx.seriesPrev}
                next={seriesCtx.seriesNext}
                slots={seriesCtx.slots}
                currentSlug={seriesCtx.currentSlug}
              />
            </div>
          )}

          {!preview && (
            <>
              <div className="mt-10 flex justify-center border-t border-border-token pt-8">
                <LikeButton slug={slug} />
              </div>

              <Comments />
            </>
          )}
        </article>

        <aside className="pt-14 max-[1100px]:hidden">
          <div className="sticky top-[90px] self-start">
            {toc.length > 0 && <TOC items={toc} sticky={false} />}
            <div className="mt-7 border-t border-border-token pt-5">
              <div className="mb-2.5 font-sans text-[11px] font-bold uppercase tracking-[0.08em] text-ink-muted">
                Tags
              </div>
              <div className="flex flex-wrap gap-1.5">
                {post.meta.tags.map((tag) => (
                  <TagChip key={tag} tag={tag} size="sm" />
                ))}
              </div>
            </div>
          </div>
        </aside>
      </div>

      {/* Prev/Next (chronological) */}
      <section className="mx-auto mt-8 max-w-[1180px] px-[var(--gut)] pb-12 md:pb-16">
        {seriesCtx && (
          <div className="mb-3 font-sans text-[10.5px] font-bold uppercase tracking-[0.14em] text-ink-muted">
            시간순 글 탐색
          </div>
        )}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {prev ? (
            <Link
              href={`/posts/${prev.slug}`}
              className="block rounded-xl border border-border-token bg-surface p-[18px] text-inherit no-underline transition-colors duration-200 hover:border-border-strong"
            >
              <div className="mb-1.5 font-sans text-[11px] font-bold uppercase tracking-[0.08em] text-ink-muted">
                ← Previous
              </div>
              <div className="font-sans text-[15px] font-semibold tracking-[-0.02em] text-ink">
                {prev.title}
              </div>
            </Link>
          ) : (
            <div />
          )}
          {next ? (
            <Link
              href={`/posts/${next.slug}`}
              className="block rounded-xl border border-border-token bg-surface p-[18px] text-right text-inherit no-underline transition-colors duration-200 hover:border-border-strong"
            >
              <div className="mb-1.5 font-sans text-[11px] font-bold uppercase tracking-[0.08em] text-ink-muted">
                Next →
              </div>
              <div className="font-sans text-[15px] font-semibold tracking-[-0.02em] text-ink">
                {next.title}
              </div>
            </Link>
          ) : (
            <div />
          )}
        </div>
      </section>
    </main>
  );
}
