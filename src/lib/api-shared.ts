/**
 * 콘텐츠 편집 API 공용 런타임 헬퍼.
 *
 * 편집 API 는 로그인한 사용자만 호출할 수 있다. 가드는 `requireApiUser` 가
 * 맡으며(`lib/auth`), 프록시의 리다이렉트와 별개로 라우트마다 다시 확인한다.
 */
import "server-only";

import { revalidatePath } from "next/cache";

export { requireApiUser } from "@/lib/auth";

export const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;
export const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * 콘텐츠가 바뀌면 ISR 캐시를 통째로 비운다.
 * ponytail: 글 한 편이 목록·카테고리·태그·시리즈·사이트맵·RSS 에 동시에
 * 걸리므로 경로를 하나씩 세는 것보다 루트 레이아웃째 무효화가 싸고 정확하다.
 */
export function revalidateContent(): void {
  revalidatePath("/", "layout");
}
