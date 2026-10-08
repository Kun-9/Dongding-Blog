/**
 * 발행 전 미리보기 — draft·private 글을 공개 글과 똑같은 화면으로 본다.
 *
 * 배포판의 `/posts/[slug]` 는 공개 글만 열린다. 여기는 로그인한 사람만
 * (proxy 리다이렉트 + requireUser), 매 요청 최신 본문으로 그린다 — AI 가 방금
 * 고친 초안도 바로 보인다. 검색엔진에는 내보내지 않는다.
 *
 * 릴리스 주제에 묶인 발행 대기 초안이면 위 띠에서 바로 발행한다.
 */
import Link from "next/link";
import { notFound } from "next/navigation";

import { requireUser } from "@/lib/auth";
import { getPostBySlugIncludingDrafts } from "@/lib/posts";
import { getTopics } from "@/lib/release-topics";
import { PostView } from "@/components/post/PostView";
import { PreviewPublish } from "@/components/releases/PreviewPublish";

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
  // 발행 대기 = 점검까지 끝나 발행만 남은 주제. AI 가 맡은 일이 있으면 발행을 막는다.
  const topic = published
    ? undefined
    : (await getTopics().catch(() => [])).find(
        (t) => t.postSlug === slug && t.stage === "review" && t.droppedReason === null,
      );
  const aiBusy = topic?.ai.status === "queued" || topic?.ai.status === "running";

  const tone = published
    ? {
        bar: "border-[color-mix(in_oklab,var(--callout-tip-glyph)_35%,var(--border))] bg-[color-mix(in_oklab,var(--callout-tip-bg)_92%,transparent)] text-[var(--callout-tip-ink)]",
        badge: "bg-[var(--callout-tip-glyph)] text-[var(--callout-tip-bg)]",
        out: "border-[color-mix(in_oklab,var(--callout-tip-glyph)_45%,transparent)] hover:bg-[color-mix(in_oklab,var(--callout-tip-glyph)_12%,transparent)]",
      }
    : {
        bar: "border-[color-mix(in_oklab,var(--callout-warning-glyph)_35%,var(--border))] bg-[color-mix(in_oklab,var(--callout-warning-bg)_92%,transparent)] text-[var(--callout-warning-ink)]",
        badge: "bg-[var(--callout-warning-glyph)] text-[var(--callout-warning-bg)]",
        out: "border-[color-mix(in_oklab,var(--callout-warning-glyph)_45%,transparent)] hover:bg-[color-mix(in_oklab,var(--callout-warning-glyph)_12%,transparent)]",
      };

  return (
    <>
      <div className={`border-b backdrop-blur-md ${tone.bar}`}>
        <div className="mx-auto flex max-w-[1180px] items-center gap-3 px-[var(--gut)] py-2 font-sans text-[12.5px]">
          <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-[11.5px] font-semibold ${tone.badge}`}>
            <span aria-hidden className="size-1.5 rounded-full bg-current" />
            미리보기 · {STATUS[post.meta.visibility] ?? post.meta.visibility}
          </span>
          <span className="ml-auto flex items-center gap-3.5">
            {published && (
              <Link href={`/posts/${slug}`} className="whitespace-nowrap text-inherit no-underline opacity-80 hover:opacity-100">
                공개 글 보기 →
              </Link>
            )}
            <Link
              href="/admin/releases"
              className={`whitespace-nowrap rounded-full border px-2.5 py-0.5 text-inherit no-underline ${tone.out}`}
            >
              릴리스 데스크로
            </Link>
            {topic &&
              (aiBusy ? (
                <span className="whitespace-nowrap opacity-80">AI 에게 맡긴 일이 있어 발행을 잠시 막았습니다</span>
              ) : (
                <PreviewPublish id={topic.id} slug={slug} title={post.meta.title} todo={topic.ai.todo} />
              ))}
          </span>
        </div>
      </div>
      <PostView slug={slug} post={post} includeDrafts preview />
    </>
  );
}
