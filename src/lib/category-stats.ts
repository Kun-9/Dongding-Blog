/**
 * Server-only category aggregation. Walks `getAllPosts()` once and folds
 * post counts into the static category tree. A post's `category` frontmatter
 * may target either a top-level id (e.g. "db") or a subcategory id
 * (e.g. "db-jpa"); both contribute to the parent's total.
 */
import "server-only";

import { categories } from "@/lib/categories";
import { getAllPosts } from "@/lib/posts";
import type { Category } from "@/lib/types";

export function getCategoriesWithCounts(): Category[] {
  const tally = new Map<string, number>();
  for (const post of getAllPosts()) {
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
