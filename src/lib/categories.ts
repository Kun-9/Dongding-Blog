/**
 * Category tree — sourced from `categories.json` so the dev-only Settings
 * page can persist edits via PUT /api/categories. The JSON is the single
 * source of truth; this module just types and re-exports it.
 *
 * Post counts are computed at build time from `content/posts/*.mdx` frontmatter
 * by `getCategoriesWithCounts()` in `category-stats.ts` (server-only).
 */
import type { Category } from "@/lib/types";
import data from "@/lib/categories.json";

export const categories: Category[] = data as Category[];

export function getCategory(id: string): Category | undefined {
  return categories.find((c) => c.id === id);
}
