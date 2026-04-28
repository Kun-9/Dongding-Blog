/**
 * Series loader — reads `content/series.json` (메타데이터만), 그리고
 * 글의 frontmatter(`series`, `seriesOrder`)를 진실의 원천으로 삼아
 * 시리즈에 소속된 글 목록을 도출한다.
 */
import "server-only";

import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import type { PostMeta, Series, SeriesWithPosts } from "@/lib/types";
import { getAllPosts, getAllPostsIncludingDrafts } from "@/lib/posts";

const SeriesSchema = z.object({
  id: z.string(),
  title: z.string(),
  desc: z.string(),
  count: z.number().int().positive(),
  color: z.string(),
  /** @deprecated frontmatter에서 자동 도출 — 호환을 위해 허용만 함 */
  posts: z.array(z.string()).optional(),
});

const FILE = path.join(process.cwd(), "content", "series.json");

const isDev = process.env.NODE_ENV === "development";

let cache: Series[] | null = null;

export function invalidateSeriesCache(): void {
  cache = null;
}

function loadSeriesFile(): Series[] {
  if (cache && !isDev) return cache;
  if (!fs.existsSync(FILE)) {
    cache = [];
    return cache;
  }
  const raw = JSON.parse(fs.readFileSync(FILE, "utf8"));
  const parsed = z.array(SeriesSchema).parse(raw);
  cache = parsed.map(({ id, title, desc, count, color }) => ({
    id,
    title,
    desc,
    count,
    color,
  }));
  return cache;
}

export function getAllSeries(): Series[] {
  return loadSeriesFile();
}

export function getSeriesById(id: string): Series | undefined {
  return getAllSeries().find((s) => s.id === id);
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

function postsFor(opts?: WithPostsOptions): PostMeta[] {
  return opts?.includeDrafts ? getAllPostsIncludingDrafts() : getAllPosts();
}

export function getAllSeriesWithPosts(
  opts?: WithPostsOptions,
): SeriesWithPosts[] {
  const all = postsFor(opts);
  return getAllSeries().map((s) => attachPosts(s, all));
}

export function getSeriesByIdWithPosts(
  id: string,
  opts?: WithPostsOptions,
): SeriesWithPosts | undefined {
  const meta = getSeriesById(id);
  if (!meta) return undefined;
  return attachPosts(meta, postsFor(opts));
}
