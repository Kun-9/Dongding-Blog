/**
 * 콘텐츠 편집 API 공용 런타임 헬퍼.
 *
 * 콘텐츠 정본이 Supabase 로 옮겨간 뒤에도 편집 화면은 아직 로컬 전용이라
 * devGuard 를 유지한다 — 배포판에서 편집을 열려면 3단계에서 인증을 붙인 뒤
 * 이 가드를 세션 검사로 바꾼다.
 */
import "server-only";

import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

export const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;
export const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function devGuard(): NextResponse | null {
  if (process.env.NODE_ENV !== "development") {
    return new NextResponse("Not Found", { status: 404 });
  }
  return null;
}

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
