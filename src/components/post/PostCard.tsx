/**
 * PostCard — three layout variants (card / list / magazine).
 * Port of components.jsx#PostCard.
 */
import Link from "next/link";
import type { PostMeta } from "@/lib/types";
import { categoryLabel } from "@/lib/categories";
import { fmtDate } from "@/lib/tokens";
import { TagChip } from "@/components/post/TagChip";

type Layout = "card" | "list" | "magazine";

interface Props {
  post: PostMeta;
  layout?: Layout;
}

export function PostCard({ post, layout = "card" }: Props) {
  const catLabel = categoryLabel(post.category);
  const href = `/posts/${post.slug}`;

  if (layout === "list") {
    return (
      <Link
        href={href}
        className="flex items-baseline justify-between gap-4 border-b border-border-token py-3.5 no-underline"
      >
        <div className="min-w-0 flex-1">
          <h3 className="m-0 truncate font-sans text-[18px] font-semibold leading-[1.35] tracking-[-0.025em] text-ink">
            {post.title}
          </h3>
          <p className="mt-1 line-clamp-1 text-[13.5px] leading-[1.55] text-ink-muted">
            {post.summary}
          </p>
        </div>
        <div className="shrink-0 font-mono text-xs text-ink-muted tabular-nums">
          {fmtDate(post.date)}
        </div>
      </Link>
    );
  }

  if (layout === "magazine") {
    return (
      <article className="relative border-b border-border-token py-6">
        <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.08em] text-ink-muted">
          {catLabel} · {fmtDate(post.date)} · {post.readTime}분
        </div>
        <h3 className="m-0 font-sans text-[24px] font-semibold leading-[1.25] tracking-[-0.03em] text-ink">
          <Link
            href={href}
            className="text-inherit no-underline before:absolute before:inset-0 before:content-['']"
          >
            {post.title}
          </Link>
        </h3>
        <p className="mt-2.5 mb-3.5 line-clamp-2 text-[15px] leading-[1.65] text-ink-soft">
          {post.summary}
        </p>
        <div className="relative z-10 flex flex-wrap gap-1.5">
          {post.tags.slice(0, 3).map((tag) => (
            <TagChip key={tag} tag={tag} size="sm" />
          ))}
        </div>
      </article>
    );
  }

  // default 'card'
  return (
    <article className="relative rounded-xl border border-border-token bg-surface p-[22px] transition-[border-color,transform] duration-[180ms] hover:border-border-strong">
      <div className="flex items-center gap-2 text-xs text-ink-muted tabular-nums">
        <span>{fmtDate(post.date)}</span>
        <span className="opacity-40">·</span>
        <span>{post.readTime}분</span>
        <span className="opacity-40">·</span>
        <span>{catLabel}</span>
      </div>
      <h3 className="my-2 font-sans text-[19px] font-semibold leading-[1.35] tracking-[-0.025em] text-ink">
        <Link
          href={href}
          className="text-inherit no-underline before:absolute before:inset-0 before:rounded-xl before:content-['']"
        >
          {post.title}
        </Link>
      </h3>
      <p className="mb-4 line-clamp-2 text-sm leading-[1.6] text-ink-soft">
        {post.summary}
      </p>
      <div className="relative z-10 flex flex-wrap gap-1.5">
        {post.tags.slice(0, 3).map((tag) => (
          <TagChip key={tag} tag={tag} size="sm" />
        ))}
      </div>
    </article>
  );
}
