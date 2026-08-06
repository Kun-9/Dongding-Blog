/**
 * 시리즈 편집 API 공용 스키마.
 * `count` 는 저자가 잡아 둔 계획 편수로 DB 의 planned_count 에 대응한다.
 */
import "server-only";

import { z } from "zod";
import { SLUG_RE } from "@/lib/api-shared";

export { devGuard, revalidateContent } from "@/lib/api-shared";

export const SeriesEntrySchema = z.object({
  id: z.string().regex(SLUG_RE, "id는 영소문자/숫자/하이픈만 허용"),
  title: z.string().min(1),
  desc: z.string().min(1),
  count: z.number().int().positive(),
  color: z.string().min(1),
});

export const SeriesPatchSchema = SeriesEntrySchema.omit({ id: true }).partial();

export type SeriesEntry = z.infer<typeof SeriesEntrySchema>;
export type SeriesPatch = z.infer<typeof SeriesPatchSchema>;

interface SeriesRow {
  title?: string;
  description?: string;
  color?: string;
  planned_count?: number;
}

/** 편집 폼 입력 → series 행(부분 갱신에도 쓰이도록 정의된 키만 담는다). */
export function toRow(input: SeriesPatch): SeriesRow {
  const row: SeriesRow = {};
  if (input.title !== undefined) row.title = input.title;
  if (input.desc !== undefined) row.description = input.desc;
  if (input.color !== undefined) row.color = input.color;
  if (input.count !== undefined) row.planned_count = input.count;
  return row;
}
