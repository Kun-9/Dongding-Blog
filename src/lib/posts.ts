/**
 * 글 로더 — Supabase `posts` 가 정본이다.
 *
 * 공개 경로(`db()`)는 RLS 때문에 published 만 읽는다. draft/private 이 필요한
 * Studio·Admin 은 `*IncludingDrafts` 계열을 쓰고, 그쪽만 secret 키로 붙는다.
 * 한 요청 안에서는 React `cache()` 가 쿼리를 한 번으로 접어준다.
 */
import "server-only";

import { cache } from "react";
import readingTime from "reading-time";
import { z } from "zod";
import type { PostMeta } from "@/lib/types";
import { extractTOC } from "@/lib/markdown";
import type { PostRefMeta } from "@/lib/link-cards";
import { db, dbAdmin, type BlogClient } from "@/lib/supabase";
import { categoryIds, getCategories } from "@/lib/categories";
import { categoryLabelIn } from "@/lib/category-utils";

export const TocItemSchema = z.object({
  id: z.string(),
  label: z.string(),
  level: z.union([z.literal(2), z.literal(3)]),
});

export const VisibilitySchema = z.enum(["published", "private", "draft"]);

/**
 * ponytail: 목록 조회에도 body 를 딸려 온다 — readTime 과 TOC 가 본문에서
 * 파생되기 때문. 글이 수백 건이 되면 그때 두 값을 컬럼으로 저장하고 목록
 * 쿼리에서 body 를 빼면 된다.
 */
const COLUMNS =
  "slug, title, summary, category_id, tags, date, read_time, featured, visibility, series_id, series_order, thumbnail, body";

interface Row {
  slug: string;
  title: string;
  summary: string;
  category_id: string;
  tags: string[];
  date: string;
  read_time: number | null;
  featured: boolean;
  visibility: string;
  series_id: string | null;
  series_order: number | null;
  thumbnail: string | null;
  body: string;
}

function toPost(row: Row): { meta: PostMeta; body: string } {
  const derivedToc = extractTOC(row.body);
  const visibility = VisibilitySchema.parse(row.visibility);

  return {
    meta: {
      slug: row.slug,
      title: row.title,
      summary: row.summary,
      category: row.category_id,
      tags: row.tags,
      date: row.date,
      readTime:
        row.read_time ?? Math.max(1, Math.round(readingTime(row.body).minutes)),
      featured: row.featured || undefined,
      visibility,
      draft: visibility === "draft",
      toc: derivedToc.length >= 2 ? derivedToc : undefined,
      series: row.series_id ?? undefined,
      seriesOrder: row.series_order ?? undefined,
      thumbnail: row.thumbnail ?? undefined,
    },
    body: row.body,
  };
}

async function query(client: BlogClient, onlyPublished: boolean) {
  const base = client.from("posts").select(COLUMNS);
  // 같은 날짜의 글은 slug 로 안정 정렬한다.
  const { data, error } = await (onlyPublished
    ? base.eq("visibility", "published")
    : base
  )
    .order("date", { ascending: false })
    .order("slug");
  if (error) throw new Error(`글 조회 실패: ${error.message}`);
  return ((data ?? []) as unknown as Row[]).map(toPost);
}

const loadPublished = cache(() => query(db(), true));
const loadAll = cache(() => query(dbAdmin(), false));

/** 공개된 글만, 최신순. */
export async function getAllPosts(): Promise<PostMeta[]> {
  return (await loadPublished()).map((p) => p.meta);
}

/** draft/private 포함 — Admin 전용. */
export async function getAllPostsIncludingDrafts(): Promise<PostMeta[]> {
  return (await loadAll()).map((p) => p.meta);
}

/** draft 포함 + 본문 — Studio/Drafts 전용. */
export async function getAllPostsWithBody(): Promise<
  { meta: PostMeta; body: string }[]
> {
  return loadAll();
}

/**
 * 공개된 글 한 건. draft/private 은 여기서 안 나온다 — 정적 export 시절엔
 * generateStaticParams 가 걸러줬지만 이제 URL 을 직접 찍을 수 있으므로
 * 조회 단계에서 막는다.
 */
export async function getPostBySlug(
  slug: string,
): Promise<{ meta: PostMeta; body: string } | undefined> {
  return (await loadPublished()).find((p) => p.meta.slug === slug);
}

/** draft/private 까지 포함해 한 건 — Studio 미리보기 전용. */
export async function getPostBySlugIncludingDrafts(
  slug: string,
): Promise<{ meta: PostMeta; body: string } | undefined> {
  return (await loadAll()).find((p) => p.meta.slug === slug);
}

/**
 * 본문의 `/posts/slug` 카드 줄에 붙일 메타. 파서가 동기 함수라 렌더 전에 미리
 * 채워 넣는다. 없는 slug 는 그냥 빠지고 카드가 점선 박스로 떨어진다.
 *
 * 기본은 공개된 글만 — 방문자에게 안 보이는 글을 카드로 자랑하지 않는다.
 */
export async function getPostRefs(
  slugs: string[],
  opts?: { includeDrafts?: boolean },
): Promise<Record<string, PostRefMeta>> {
  if (slugs.length === 0) return {};
  const wanted = new Set(slugs);

  const [posts, categories] = await Promise.all([
    opts?.includeDrafts ? getAllPostsIncludingDrafts() : getAllPosts(),
    getCategories(),
  ]);
  const out: Record<string, PostRefMeta> = {};
  for (const p of posts) {
    if (!wanted.has(p.slug)) continue;
    out[p.slug] = {
      title: p.title,
      summary: p.summary || undefined,
      category: categoryLabelIn(categories, p.category),
      date: p.date,
    };
  }
  return out;
}

export async function getAdjacentPosts(
  slug: string,
): Promise<{ prev?: PostMeta; next?: PostMeta }> {
  const all = await getAllPosts();
  const idx = all.findIndex((p) => p.slug === slug);
  if (idx === -1) return {};
  return { prev: all[idx + 1], next: all[idx - 1] };
}

export async function getFeaturedPost(): Promise<PostMeta | undefined> {
  return (await getAllPosts()).find((p) => p.featured);
}

export async function getPostsByCategory(
  categoryId: string,
): Promise<PostMeta[]> {
  const ids = await categoryIds(categoryId);
  return (await getAllPosts()).filter((p) => ids.has(p.category));
}

export async function getPostsByTag(tag: string): Promise<PostMeta[]> {
  return (await getAllPosts()).filter((p) => p.tags.includes(tag));
}

export async function getAllTags(): Promise<string[]> {
  return [...new Set((await getAllPosts()).flatMap((p) => p.tags))];
}
