/**
 * PostRefCard — 본문에 `/posts/slug` 만 한 줄로 두면 펼쳐지는 내부 글 카드.
 * Port of prose.jsx#PostRefCard.
 *
 * 남의 사이트와 달리 메타를 이미 다 알고 있으므로 OG 를 읽을 일이 없다.
 * 없는 slug 는 점선 박스로 남긴다 — 오타를 발행 전에 눈으로 잡으라고.
 */
import Link from "next/link";
import type { PostRefMeta } from "@/lib/link-cards";
import { fmtDate } from "@/lib/tokens";

interface Props {
  slug: string;
  post?: PostRefMeta;
}

export function PostRefCard({ slug, post }: Props) {
  if (!post) {
    return (
      <div className="my-[22px] rounded-[10px] border border-dashed border-border-token px-3.5 py-3 font-sans text-[13px] text-ink-muted">
        찾을 수 없는 글{" "}
        <span className="font-mono text-[12.5px] text-ink-subtle">
          /posts/{slug}
        </span>
      </div>
    );
  }

  return (
    <Link
      href={`/posts/${slug}`}
      className="group my-[22px] block rounded-[10px] border border-border-token bg-surface px-[17px] py-[15px] no-underline transition-colors hover:border-border-strong hover:bg-surface-alt"
    >
      <div className="flex items-center gap-[7px] font-sans text-[12px] text-ink-muted">
        <span>이 블로그의 글</span>
        {post.category && (
          <>
            <span className="text-ink-subtle">·</span>
            <span>{post.category}</span>
          </>
        )}
        <span className="text-ink-subtle">·</span>
        <span className="font-mono text-[11.5px] tabular-nums">
          {fmtDate(post.date)}
        </span>
        <span className="flex-1" />
        <span
          aria-hidden
          className="text-[13px] text-ink-muted transition-transform group-hover:translate-x-0.5 group-hover:text-ink"
        >
          →
        </span>
      </div>
      <div className="mt-[9px] line-clamp-2 font-sans text-[15.5px] font-semibold leading-[1.4] tracking-[-0.018em] text-ink">
        {post.title}
      </div>
      {post.summary && (
        <div className="mt-[5px] line-clamp-2 font-sans text-[13.5px] leading-[1.6] text-ink-muted">
          {post.summary}
        </div>
      )}
    </Link>
  );
}
