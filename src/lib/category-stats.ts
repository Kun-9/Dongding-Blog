/**
 * 카테고리별 글 수 집계 (서버 전용). 글의 category 는 상위 id("db") 일 수도
 * 하위 id("db-sql") 일 수도 있는데, 하위에 달린 글도 상위 합계에 포함된다.
 */
import "server-only";

import { getCategories } from "@/lib/categories";
import { getAllPosts } from "@/lib/posts";
import type { Category } from "@/lib/types";

export async function getCategoriesWithCounts(): Promise<Category[]> {
  const [categories, posts] = await Promise.all([
    getCategories(),
    getAllPosts(),
  ]);

  const tally = new Map<string, number>();
  for (const post of posts) {
    tally.set(post.category, (tally.get(post.category) ?? 0) + 1);
  }

  return categories.map((cat) => {
    const subs = cat.subs?.map((sub) => ({
      ...sub,
      count: tally.get(sub.id) ?? 0,
    }));
    const subTotal = subs?.reduce((a, s) => a + (s.count ?? 0), 0) ?? 0;
    return {
      ...cat,
      count: (tally.get(cat.id) ?? 0) + subTotal,
      subs,
    };
  });
}
