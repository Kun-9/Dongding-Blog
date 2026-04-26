import { Suspense } from "react";
import { getAllPosts } from "@/lib/posts";
import { categories } from "@/lib/categories";
import { SearchClient } from "./SearchClient";

export const metadata = {
  title: "Search · Dong-Ding",
};

export default function Page() {
  const posts = getAllPosts();
  return (
    <Suspense fallback={null}>
      <SearchClient posts={posts} categories={categories} />
    </Suspense>
  );
}
