/**
 * Comments wrapper — Giscus iframe with site chrome.
 * Header (eyebrow + heading + powered-by link) and the top divider come
 * from comments.jsx mock so the section reads in the cream palette even
 * before the iframe paints. Real giscus integration is preserved.
 */
import { Giscus } from "@/components/comments/Giscus";

const repo = process.env.NEXT_PUBLIC_GISCUS_REPO;
const repoId = process.env.NEXT_PUBLIC_GISCUS_REPO_ID;
const category = process.env.NEXT_PUBLIC_GISCUS_CATEGORY;
const categoryId = process.env.NEXT_PUBLIC_GISCUS_CATEGORY_ID;

export function Comments() {
  const configured = repo && repoId && category && categoryId;

  return (
    <section className="mt-16 border-t border-border-token pt-8">
      <div className="mb-[22px] flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <div className="whitespace-nowrap font-sans text-[11px] font-bold uppercase tracking-[0.1em] text-ink-muted">
            Comments
          </div>
          <h3 className="m-0 mt-1 font-sans text-[22px] font-bold tracking-[-0.025em] text-ink">
            댓글
          </h3>
        </div>
        <a
          href="https://giscus.app"
          target="_blank"
          rel="noopener noreferrer"
          className="whitespace-nowrap font-mono text-xs text-ink-muted no-underline transition-colors hover:text-ink-soft"
        >
          powered by giscus ↗
        </a>
      </div>

      {configured ? (
        <Giscus
          repo={repo as `${string}/${string}`}
          repoId={repoId!}
          category={category!}
          categoryId={categoryId!}
        />
      ) : (
        <div className="rounded-xl border border-dashed border-border-token bg-surface-alt p-8 text-center text-sm text-ink-muted">
          <div className="mb-1.5 font-mono text-xs">{"<Giscus />"}</div>
          GitHub Discussions 기반 댓글이 이 자리에 들어갑니다.
        </div>
      )}
    </section>
  );
}
