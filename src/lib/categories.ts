/**
 * 카테고리 트리 — Supabase `categories` 를 정본으로 읽는다.
 *
 * DB 는 parent_id 로 평평하게 저장하고, 여기서 기존 UI 가 기대하는
 * 부모 → subs 2계층 구조로 조립한다. React `cache()` 로 감싸 한 요청 안에서는
 * 몇 번을 불러도 쿼리는 한 번만 나간다.
 *
 * 클라이언트 컴포넌트는 이 모듈을 import 할 수 없다 — 서버에서 props 로 받은
 * 배열과 `lib/category-utils` 의 순수 함수를 쓸 것.
 */
import "server-only";

import { cache } from "react";
import { db } from "@/lib/supabase";
import type { Category } from "@/lib/types";
import {
  categoryIdsFor,
  categoryLabelIn,
  resolveCategoryIn,
} from "@/lib/category-utils";

export const getCategories = cache(async (): Promise<Category[]> => {
  const { data, error } = await db()
    .from("categories")
    .select("id, name, description, parent_id, sort")
    .order("sort");
  if (error) throw new Error(`카테고리 조회 실패: ${error.message}`);

  const rows = data ?? [];
  return rows
    .filter((r) => !r.parent_id)
    .map((parent) => ({
      id: parent.id,
      name: parent.name,
      desc: parent.description,
      subs: rows
        .filter((r) => r.parent_id === parent.id)
        .map((sub) => ({ id: sub.id, name: sub.name })),
    }));
});

export async function getCategory(id: string): Promise<Category | undefined> {
  return resolveCategoryIn(await getCategories(), id)?.parent;
}

export async function resolveCategory(id: string) {
  return resolveCategoryIn(await getCategories(), id);
}

/** "DB" 또는 "DB / SQL·인덱스" 형태의 표시용 라벨. */
export async function categoryLabel(id: string): Promise<string> {
  return categoryLabelIn(await getCategories(), id);
}

/** 부모 id 면 서브 카테고리 id 까지 포함한 집합. */
export async function categoryIds(id: string): Promise<Set<string>> {
  return categoryIdsFor(await getCategories(), id);
}
