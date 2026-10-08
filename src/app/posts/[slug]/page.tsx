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
import { getSite } from "@/lib/site-db";

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
  const [post, site] = await Promise.all([getPostBySlug(slug), getSite()]);
  if (!post) return { title: "404" };
  return {
    title: post.meta.title,
    description: post.meta.summary,
    alternates: { canonical: `/posts/${slug}` },
    // 여기서 openGraph 를 주면 레이아웃 것이 통째로 바뀌므로 siteName·locale 을
    // 다시 넣는다. title·description·image 는 비워 두면 Next 가 채운다.
    openGraph: {
      type: "article",
      siteName: site.shortTitle,
      locale: site.locale.replace("-", "_"),
      publishedTime: post.meta.date,
      modifiedTime: post.meta.updated,
      authors: [site.author],
      tags: post.meta.tags,
    },
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

  const site = await getSite();
  const url = `${site.url}/posts/${slug}/`;
  // 검색 결과에 날짜·작성자를 붙여 주는 구조화 데이터. `<` 를 이스케이프해
  // 본문 문자열이 script 를 닫지 못하게 한다(Next JSON-LD 가이드).
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.meta.title,
    description: post.meta.summary,
    datePublished: post.meta.date,
    dateModified: post.meta.updated ?? post.meta.date,
    author: { "@type": "Person", name: site.author, url: site.url },
    image: `${url}opengraph-image/`,
    mainEntityOfPage: url,
    inLanguage: site.lang,
    keywords: post.meta.tags.join(", "),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
        }}
      />
      <PostView slug={slug} post={post} includeDrafts={isDev} />
    </>
  );
}
