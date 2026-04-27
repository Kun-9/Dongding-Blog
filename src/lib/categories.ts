/**
 * Category tree — sourced from `categories.json` so the dev-only Settings
 * page can persist edits via PUT /api/categories. The JSON is the single
 * source of truth; this module just types and re-exports it.
 *
 * Post counts are computed at build time from `content/posts/*.md` frontmatter
 * by `getCategoriesWithCounts()` in `category-stats.ts` (server-only).
 */
import type { Category, Subcategory } from "@/lib/types";
import data from "@/lib/categories.json";

export const categories: Category[] = data as Category[];

/**
 * Resolve any category id (parent or subcategory) to its parent Category.
 * Existing call sites that show `cat.name` keep working when a post is
 * mapped to a sub id — they fall back to the parent's name.
 */
export function getCategory(id: string): Category | undefined {
  return resolveCategory(id)?.parent;
}

/** Returns both parent and (if id refers to a subcategory) the matched sub. */
export function resolveCategory(
  id: string,
): { parent: Category; sub?: Subcategory } | undefined {
  for (const parent of categories) {
    if (parent.id === id) return { parent };
    const sub = parent.subs?.find((s) => s.id === id);
    if (sub) return { parent, sub };
  }
  return undefined;
}

/** Display label like "DB" or "DB / JPA·Hibernate". */
export function categoryLabel(id: string): string {
  const r = resolveCategory(id);
  if (!r) return id;
  return r.sub ? `${r.parent.name} / ${r.sub.name}` : r.parent.name;
}
