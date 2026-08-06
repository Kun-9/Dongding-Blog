/**
 * 북마크(링크롤) 로더 — Supabase `bookmarks`, 최신순.
 */
import "server-only";

import { cache } from "react";
import type { Bookmark } from "@/lib/types";
import { db } from "@/lib/supabase";

export const getAllBookmarks = cache(async (): Promise<Bookmark[]> => {
  const { data, error } = await db()
    .from("bookmarks")
    .select("id, url, title, source, tag, note, date")
    .order("date", { ascending: false });
  if (error) throw new Error(`북마크 조회 실패: ${error.message}`);
  return data ?? [];
});
