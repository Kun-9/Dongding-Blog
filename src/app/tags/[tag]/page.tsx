import { PostList } from "@/components/post/PostList";
import { getAllTags } from "@/lib/posts";

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
  return {
    title: `#${decoded}`,
    // 한글 태그가 있어 인코딩된 형태로 고정한다 — 디코딩된 값이 들어와도 동일해진다.
    alternates: { canonical: `/tags/${encodeURIComponent(decoded)}` },
  };
}

export default async function Page({
  params,
}: {
  params: Promise<{ tag: string }>;
}) {
  const { tag } = await params;
  const decoded = decodeURIComponent(tag);
  return <PostList filter={{ type: "tag", value: decoded }} />;
}
