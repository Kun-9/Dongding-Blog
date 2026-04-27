import { PostList } from "@/components/post/PostList";
import { categories, categoryLabel } from "@/lib/categories";

export function generateStaticParams() {
  return categories.flatMap((c) => [
    { id: c.id },
    ...(c.subs?.map((s) => ({ id: s.id })) ?? []),
  ]);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return {
    title: categoryLabel(id),
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
