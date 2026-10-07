/**
 * Post Detail — renders post body through the shared markdown parser used
 * by Studio's preview. Server component; mounts a client ReadingProgress +
 * sticky TOC alongside. 화면은 PostView 가 그린다(미리보기와 공유).
 */
import { notFound } from "next/navigation";

import {
  getAllPosts,
  getPostBySlug,
  getPostBySlugIncludingDrafts,
} from "@/lib/posts";
import { PostView } from "@/components/post/PostView";

const isDev = process.env.NODE_ENV === "development";

// 공개된 글은 빌드 시 미리 만들고, 이후 발행분은 요청 시 생성된다.
export const revalidate = 3600;

export async function generateStaticParams() {
  return (await getAllPosts()).map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) return { title: "404" };
  return {
    title: post.meta.title,
    description: post.meta.summary,
    alternates: { canonical: `/posts/${slug}` },
  };
}

export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  // dev 에서만 draft·private 도 열어 본다. 배포판은 published 만 조회된다.
  const post = isDev
    ? await getPostBySlugIncludingDrafts(slug)
    : await getPostBySlug(slug);
  if (!post) notFound();

  return <PostView slug={slug} post={post} includeDrafts={isDev} />;
}
