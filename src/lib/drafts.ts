/**
 * Draft listing — derived from posts with `draft: true` plus reading-time.
 * Studio/Admin pages use this; public lists never see drafts.
 */
import "server-only";

import { getAllPostsWithBody } from "@/lib/posts";
import type { Draft } from "@/lib/types";

export function getAllDrafts(): Draft[] {
  return getAllPostsWithBody()
    .filter((p) => p.meta.visibility !== "published")
    .map((p) => ({
      slug: p.meta.slug,
      title: p.meta.title,
      updated: p.meta.date,
      words: p.body.replace(/\s+/g, "").length,
      status: p.meta.visibility === "private" ? "private" : "draft",
    }));
}
