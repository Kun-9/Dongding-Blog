import { PostList } from "@/components/post/PostList";
import { getCategories, categoryLabel } from "@/lib/categories";

export const revalidate = 3600;

export async function generateStaticParams() {
  return (await getCategories()).flatMap((c) => [
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
    title: await categoryLabel(id),
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
