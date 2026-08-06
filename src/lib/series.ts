/**
 * 시리즈 로더 — 메타데이터는 Supabase `series`, 소속 글은 `posts.series_id` 에서
 * 파생한다. `count` 는 발행된 글 수가 아니라 저자가 잡아 둔 계획 편수
 * (`planned_count`)다 — 아직 안 쓴 회차를 대시로 그리는 데 쓰인다.
 */
import "server-only";

import { cache } from "react";
import type { PostMeta, Series, SeriesWithPosts } from "@/lib/types";
import { db } from "@/lib/supabase";
import { getAllPosts, getAllPostsIncludingDrafts } from "@/lib/posts";

const loadSeries = cache(async (): Promise<Series[]> => {
  const { data, error } = await db()
    .from("series")
    .select("id, title, description, color, planned_count, sort")
    .order("sort");
  if (error) throw new Error(`시리즈 조회 실패: ${error.message}`);

  return (data ?? []).map((s) => ({
    id: s.id,
    title: s.title,
    desc: s.description,
    color: s.color,
    count: s.planned_count,
  }));
});

export async function getAllSeries(): Promise<Series[]> {
  return loadSeries();
}

export async function getSeriesById(id: string): Promise<Series | undefined> {
  return (await getAllSeries()).find((s) => s.id === id);
}

function attachPosts(series: Series, allPosts: PostMeta[]): SeriesWithPosts {
  const posts = allPosts
    .filter((p) => p.series === series.id)
    .sort((a, b) => {
      const ao = a.seriesOrder ?? Number.POSITIVE_INFINITY;
      const bo = b.seriesOrder ?? Number.POSITIVE_INFINITY;
      if (ao !== bo) return ao - bo;
      return a.date.localeCompare(b.date);
    });
  return { ...series, posts };
}

interface WithPostsOptions {
  includeDrafts?: boolean;
}

function postsFor(opts?: WithPostsOptions): Promise<PostMeta[]> {
  return opts?.includeDrafts ? getAllPostsIncludingDrafts() : getAllPosts();
}

export async function getAllSeriesWithPosts(
  opts?: WithPostsOptions,
): Promise<SeriesWithPosts[]> {
  const [all, list] = await Promise.all([postsFor(opts), loadSeries()]);
  return list.map((s) => attachPosts(s, all));
}

export async function getSeriesByIdWithPosts(
  id: string,
  opts?: WithPostsOptions,
): Promise<SeriesWithPosts | undefined> {
  const meta = await getSeriesById(id);
  if (!meta) return undefined;
  return attachPosts(meta, await postsFor(opts));
}
