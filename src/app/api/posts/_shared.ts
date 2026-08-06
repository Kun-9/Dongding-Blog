/**
 * 글 편집 API 공용 헬퍼. 입력 스키마와 DB 행 변환을 담당한다.
 * 정본이 Supabase 이므로 쓰기는 전부 secret 키(`dbAdmin`)로 나간다.
 */
import "server-only";

import { z } from "zod";
import { DATE_RE, SLUG_RE, todayISO } from "@/lib/api-shared";
import { VisibilitySchema } from "@/lib/posts";
import { dbAdmin } from "@/lib/supabase";

export {
  requireApiUser,
  todayISO,
  revalidateContent,
  SLUG_RE,
} from "@/lib/api-shared";

export const PostBodySchema = z.object({
  slug: z.string().regex(SLUG_RE, "slug은 영소문자/숫자/하이픈만 허용"),
  title: z.string().min(1),
  summary: z.string().min(1),
  category: z.string().min(1),
  tags: z.array(z.string()).default([]),
  date: z.string().regex(DATE_RE).optional(),
  body: z.string(),
  visibility: VisibilitySchema.default("draft"),
  featured: z.boolean().optional(),
  series: z
    .string()
    .min(1)
    .optional()
    .or(z.literal("").transform(() => undefined)),
  seriesOrder: z.number().int().positive().optional(),
  /**
   * 대표 이미지 경로. 필드를 아예 안 보내면(undefined) 기존 값을 그대로 두고,
   * 빈 문자열이나 null 을 보내면 지운다 — MCP 의 부분 수정이 Studio 에서 붙인
   * 썸네일을 조용히 날리지 않게 하기 위한 구분이다.
   */
  thumbnail: z
    .union([z.string().min(1), z.literal("").transform(() => null), z.null()])
    .optional(),
});

export type PostBody = z.infer<typeof PostBodySchema>;

/** 편집 폼 입력 → posts 행. */
export function toRow(input: PostBody) {
  return {
    slug: input.slug,
    title: input.title,
    summary: input.summary,
    category_id: input.category,
    tags: input.tags,
    date: input.date ?? todayISO(),
    featured: input.featured === true,
    visibility: input.visibility,
    series_id: input.series ?? null,
    series_order: input.series ? (input.seriesOrder ?? null) : null,
    ...(input.thumbnail !== undefined ? { thumbnail: input.thumbnail } : {}),
    body: input.body.endsWith("\n") ? input.body : `${input.body}\n`,
  };
}

export async function postExists(slug: string): Promise<boolean> {
  const { data, error } = await dbAdmin()
    .from("posts")
    .select("slug")
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw new Error(`글 조회 실패: ${error.message}`);
  return data !== null;
}
