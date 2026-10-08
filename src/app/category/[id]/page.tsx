import { notFound } from "next/navigation";
import { PostList } from "@/components/post/PostList";
import {
  getCategories,
  categoryLabel,
  resolveCategory,
} from "@/lib/categories";
import { getPostsByCategory } from "@/lib/posts";

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
  const [label, r, posts] = await Promise.all([
    categoryLabel(id),
    resolveCategory(id),
    getPostsByCategory(id),
  ]);
  return {
    title: label,
    description: r?.parent.desc || undefined,
    alternates: { canonical: `/category/${id}` },
    // 아직 글이 없는 카테고리는 빈 목록이라 색인하지 않는다.
    ...(posts.length === 0 && { robots: { index: false, follow: true } }),
  };
}

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  // 없는 카테고리를 빈 목록 200 으로 돌려주면 구글이 soft 404 로 잡는다.
  if (!(await resolveCategory(id))) notFound();
  return <PostList filter={{ type: "category", value: id }} />;
}
