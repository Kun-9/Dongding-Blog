import { PostList } from "@/components/post/PostList";
import { categories, getCategory } from "@/lib/categories";

export function generateStaticParams() {
  return categories.map((c) => ({ id: c.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const cat = getCategory(id);
  return {
    title: `${cat?.name ?? id} · Dong-Ding`,
  };
}

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <PostList filter={{ type: "category", value: id }} />;
}
