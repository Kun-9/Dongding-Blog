/**
 * 북마크 편집 API 공용 스키마·헬퍼.
 * URL 중복은 DB 의 unique 제약이 잡고, 라우트는 23505 를 409 로 옮긴다.
 */
import "server-only";

import { z } from "zod";
import { DATE_RE } from "@/lib/api-shared";

export { requireApiUser, todayISO, revalidateContent } from "@/lib/api-shared";

/** unique 위반 — 같은 URL 이 이미 담겨 있다. */
export const UNIQUE_VIOLATION = "23505";

export const BookmarkInputSchema = z.object({
  url: z.string().min(1).regex(/^[^\s]+$/, "URL에는 공백을 넣을 수 없습니다"),
  title: z.string().min(1),
  source: z.string().min(1),
  tag: z.string().min(1),
  note: z.string(),
  date: z.string().regex(DATE_RE).optional(),
});

export type BookmarkInput = z.infer<typeof BookmarkInputSchema>;

export function parseId(raw: string): number | null {
  const n = Number(raw);
  if (!Number.isInteger(n) || n <= 0) return null;
  return n;
}
