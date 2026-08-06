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
