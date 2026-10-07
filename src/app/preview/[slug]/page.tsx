/**
 * 발행 전 미리보기 — draft·private 글을 공개 글과 똑같은 화면으로 본다.
 *
 * 배포판의 `/posts/[slug]` 는 공개 글만 열린다. 여기는 로그인한 사람만
 * (proxy 리다이렉트 + requireUser), 매 요청 최신 본문으로 그린다 — AI 가 방금
 * 고친 초안도 바로 보인다. 검색엔진에는 내보내지 않는다.
 */
import Link from "next/link";
import { notFound } from "next/navigation";

import { requireUser } from "@/lib/auth";
import { getPostBySlugIncludingDrafts } from "@/lib/posts";
import { PostView } from "@/components/post/PostView";

export const metadata = { title: "미리보기", robots: { index: false, follow: false } };

const STATUS: Record<string, string> = {
  draft: "초안",
  private: "비공개",
  published: "공개됨",
};

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  await requireUser();
  const { slug } = await params;
  const post = await getPostBySlugIncludingDrafts(slug);
  if (!post) notFound();
  const published = post.meta.visibility === "published";

  return (
    <>
      <div className="border-b border-[color-mix(in_oklab,var(--callout-warning-glyph)_35%,var(--border))] bg-[color-mix(in_oklab,var(--callout-warning-bg)_92%,transparent)] backdrop-blur-md">
        <div className="mx-auto flex max-w-[1180px] flex-wrap items-center gap-x-3 gap-y-1.5 px-[var(--gut)] py-2.5 font-sans text-[12.5px]">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--callout-warning-glyph)] px-2.5 py-0.5 text-[11.5px] font-semibold text-[var(--callout-warning-bg)]">
            <span aria-hidden className="size-1.5 rounded-full bg-current" />
            미리보기 · {STATUS[post.meta.visibility] ?? post.meta.visibility}
          </span>
          <span className="text-[var(--callout-warning-ink)]">
            {published ? (
              <>이미 공개된 글입니다.</>
            ) : (
              <>
                방문자에게는 아직 보이지 않습니다. 발행하면{" "}
                <span className="font-mono text-[12px]">/posts/{slug}</span> 에 이 모습으로 올라갑니다.
              </>
            )}
          </span>
          <span className="ml-auto flex items-center gap-3">
            <Link
              href={`/studio?slug=${encodeURIComponent(slug)}`}
              className="text-[var(--callout-warning-ink)] no-underline opacity-80 hover:opacity-100"
            >
              스튜디오에서 고치기
            </Link>
            <Link
              href="/admin/releases"
              className="rounded-full border border-[color-mix(in_oklab,var(--callout-warning-glyph)_45%,transparent)] px-2.5 py-0.5 text-[var(--callout-warning-ink)] no-underline hover:bg-[color-mix(in_oklab,var(--callout-warning-glyph)_12%,transparent)]"
            >
              릴리스 데스크로
            </Link>
          </span>
        </div>
      </div>
      <PostView slug={slug} post={post} includeDrafts preview />
    </>
  );
}
