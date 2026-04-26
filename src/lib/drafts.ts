/**
 * Draft listing — derived from posts with `draft: true` plus reading-time.
 * Studio/Admin pages use this; public lists never see drafts.
 */
import "server-only";

import { getAllPostsIncludingDrafts } from "@/lib/posts";
import type { Draft } from "@/lib/types";

export function getAllDrafts(): Draft[] {
  return getAllPostsIncludingDrafts()
    .filter((p) => p.draft)
    .map((p) => ({
      slug: p.slug,
      title: p.title,
      updated: p.date,
      words: 0,
      status: "draft" as const,
    }));
}
