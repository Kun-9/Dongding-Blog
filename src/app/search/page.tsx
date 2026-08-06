import { Suspense } from "react";
import { getAllPosts } from "@/lib/posts";
import { getCategories } from "@/lib/categories";
import { SearchClient } from "./SearchClient";

export const metadata = {
  title: "Search",
};

export const revalidate = 3600;

export default async function Page() {
  const [posts, categories] = await Promise.all([
    getAllPosts(),
    getCategories(),
  ]);
  return (
    <Suspense fallback={null}>
      <SearchClient posts={posts} categories={categories} />
    </Suspense>
  );
}
