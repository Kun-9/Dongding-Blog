import { Suspense } from "react";
import { getAllPosts } from "@/lib/posts";
import { SearchClient } from "./SearchClient";

export const metadata = {
  title: "Search",
};

export default function Page() {
  const posts = getAllPosts();
  return (
    <Suspense fallback={null}>
      <SearchClient posts={posts} />
    </Suspense>
  );
}
