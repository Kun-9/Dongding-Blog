/**
 * 초안 목록 — visibility 가 published 가 아닌 글에서 파생한다.
 * Studio/Admin 만 쓰며 공개 목록에는 노출되지 않는다.
 */
import "server-only";

import { getAllPostsWithBody } from "@/lib/posts";
import type { Draft } from "@/lib/types";

export async function getAllDrafts(): Promise<Draft[]> {
  return (await getAllPostsWithBody())
    .filter((p) => p.meta.visibility !== "published")
    .map((p) => ({
      slug: p.meta.slug,
      title: p.meta.title,
      updated: p.meta.date,
      words: p.body.replace(/\s+/g, "").length,
      status: p.meta.visibility === "published" ? "draft" : p.meta.visibility,
    }));
}
