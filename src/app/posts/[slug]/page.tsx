/**
 * Post Detail — renders post body through the shared markdown parser used
 * by Studio's preview. Server component; mounts a client ReadingProgress +
 * sticky TOC alongside.
 */
import { notFound } from "next/navigation";
import Link from "next/link";

import { getAllPosts, getPostBySlug } from "@/lib/posts";
import { getCategory } from "@/lib/categories";
import { site } from "@/lib/site";
import { fmtDate } from "@/lib/tokens";
import { renderMarkdown } from "@/lib/markdown";

import { TagChip } from "@/components/post/TagChip";
import { TOC } from "@/components/prose/TOC";
import { ReadingProgress } from "@/components/prose/ReadingProgress";
import { Comments } from "@/components/comments/Comments";
import { AdminBar } from "@/components/post/AdminBar";

const ARTICLE_ID = "article-body";
const isDev = process.env.NODE_ENV === "development";

export function generateStaticParams() {
  return getAllPosts().map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) return { title: "404" };
  return {
    title: post.meta.title,
    description: post.meta.summary,
  };
}

export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  // dev: draft·private도 조회 허용 (admin/local). prod 빌드는 published만.
  if (!post || (!isDev && post.meta.visibility !== "published")) notFound();

  const content = renderMarkdown(post.body);

  const cat = getCategory(post.meta.category);
  const all = getAllPosts();
  const idx = all.findIndex((p) => p.slug === slug);
  const prev = all[idx + 1];
  const next = all[idx - 1];
  const toc = post.meta.toc ?? [];

  return (
    <main>
      <ReadingProgress articleId={ARTICLE_ID} />

      <div className="mx-auto grid max-w-[1180px] grid-cols-1 justify-center gap-10 px-5 md:grid-cols-[minmax(0,700px)_220px] md:gap-16 md:px-8">
        <article id={ARTICLE_ID} className="pb-8 pt-10 md:pt-14">
          <div className="mb-5 flex items-center gap-2 font-sans text-xs text-ink-muted">
            <Link href="/" className="text-ink-muted no-underline">
              Home
            </Link>
            <span className="opacity-40">/</span>
            {cat && (
              <Link
                href={`/category/${cat.id}`}
                className="text-ink-muted no-underline"
              >
                {cat.name}
              </Link>
            )}
          </div>

          <AdminBar
            slug={slug}
            title={post.meta.title}
            status={post.meta.visibility}
          />

          <header className="mb-9">
            <h1 className="m-0 font-sans text-[40px] font-semibold leading-[1.15] tracking-[-0.035em] text-ink">
              {post.meta.title}
            </h1>
            <p className="mb-5 mt-3.5 text-[17px] leading-[1.6] tracking-[-0.005em] text-ink-muted">
              {post.meta.summary}
            </p>
            <div className="flex flex-wrap items-center gap-3.5 border-t border-border-token pt-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-full border border-border-token bg-surface-alt font-sans text-[13px] font-bold text-ink">
                동
              </div>
              <div className="flex-1 text-[13.5px]">
                <div className="font-medium text-ink">{site.author}</div>
                <div className="mt-px font-mono tabular-nums text-ink-muted">
                  {fmtDate(post.meta.date)} · {post.meta.readTime}분 읽기
                </div>
              </div>
              <div className="flex gap-1.5">
                {post.meta.tags.map((tag) => (
                  <TagChip key={tag} tag={tag} size="sm" />
                ))}
              </div>
            </div>
          </header>

          <div>{content}</div>

          <Comments />
        </article>

        <aside className="hidden md:block md:pt-14">
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

      {/* Prev/Next */}
      <section className="mx-auto mt-8 max-w-[1180px] px-5 pb-12 md:px-8 md:pb-16">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {prev ? (
            <Link
              href={`/posts/${prev.slug}`}
              className="block rounded-xl border border-border-token bg-surface p-[18px] text-inherit no-underline"
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
              className="block rounded-xl border border-border-token bg-surface p-[18px] text-right text-inherit no-underline"
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
