/**
 * `/manage` 목록 재료 — 발행글과 초안을 한 줄 모양으로 합친다.
 *
 * 초안은 자수와 묵힘 일수를, 발행글은 읽는 시간·조회·좋아요를 같은 자리에 쓴다.
 * 상태는 `visibility` 그대로다 — 목록에서 하는 일이 곧 상태를 옮기는 일이라
 * 별도 상태 축을 만들지 않는다.
 */
import "server-only";

import { getAllPostsWithBody } from "@/lib/posts";
import { dbAdmin } from "@/lib/supabase";
import type { Visibility } from "@/lib/types";

export interface ManageRow {
  slug: string;
  title: string;
  summary: string;
  category: string;
  status: Visibility;
  /** 발행글은 발행일, 초안·검토는 마지막 수정일. 둘 다 posts.date 다. */
  date: string;
  readTime: number;
  words: number;
  views: number;
  likes: number;
}

/** 집계가 없는 글은 0 으로 떨어진다 — post_stats 행은 첫 조회 때 생긴다. */
async function loadStats(): Promise<Record<string, { v: number; l: number }>> {
  const { data, error } = await dbAdmin()
    .from("post_stats")
    .select("views, likes, posts!inner(slug)");
  if (error) return {};
  const out: Record<string, { v: number; l: number }> = {};
  for (const row of (data ?? []) as unknown as {
    views: number;
    likes: number;
    posts: { slug: string };
  }[]) {
    out[row.posts.slug] = { v: row.views, l: row.likes };
  }
  return out;
}

export async function getManageRows(): Promise<ManageRow[]> {
  const [posts, stats] = await Promise.all([getAllPostsWithBody(), loadStats()]);

  return posts.map(({ meta, body }) => ({
    slug: meta.slug,
    title: meta.title,
    summary: meta.summary,
    category: meta.category,
    status: meta.visibility,
    date: meta.date,
    readTime: meta.readTime,
    words: body.replace(/\s+/g, "").length,
    views: stats[meta.slug]?.v ?? 0,
    likes: stats[meta.slug]?.l ?? 0,
  }));
}
