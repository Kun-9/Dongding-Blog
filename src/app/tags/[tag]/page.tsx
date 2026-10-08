import { notFound } from "next/navigation";
import { PostList } from "@/components/post/PostList";
import {
  getAllTags,
  getPostsByTag,
  MIN_INDEXED_TAG_POSTS,
} from "@/lib/posts";

export const revalidate = 3600;

export async function generateStaticParams() {
  return (await getAllTags()).map((tag) => ({ tag }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ tag: string }>;
}) {
  const { tag } = await params;
  const decoded = decodeURIComponent(tag);
  const count = (await getPostsByTag(decoded)).length;
  return {
    title: `#${decoded}`,
    description: `#${decoded} 태그가 붙은 글 ${count}편`,
    // 한글 태그가 있어 인코딩된 형태로 고정한다 — 디코딩된 값이 들어와도 동일해진다.
    alternates: { canonical: `/tags/${encodeURIComponent(decoded)}` },
    ...(count < MIN_INDEXED_TAG_POSTS && {
      robots: { index: false, follow: true },
    }),
  };
}

export default async function Page({
  params,
}: {
  params: Promise<{ tag: string }>;
}) {
  const { tag } = await params;
  const decoded = decodeURIComponent(tag);
  // 없는 태그를 빈 목록 200 으로 돌려주면 구글이 soft 404 로 잡는다.
  if ((await getPostsByTag(decoded)).length === 0) notFound();
  return <PostList filter={{ type: "tag", value: decoded }} />;
}
