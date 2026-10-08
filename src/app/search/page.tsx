import { Suspense } from "react";
import { getAllPosts } from "@/lib/posts";
import { getCategories } from "@/lib/categories";
import { SearchClient } from "./SearchClient";

export const metadata = {
  title: "Search",
  // 쿼리스트링이 붙어도 색인 대상은 /search 하나로 모은다.
  alternates: { canonical: "/search" },
  // 검색 화면은 자체 내용이 없다. 링크는 따라가되 색인하지 않는다.
  robots: { index: false, follow: true },
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
