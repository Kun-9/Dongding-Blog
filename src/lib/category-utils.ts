/**
 * 카테고리 순수 함수 — 클라이언트/서버 공용.
 *
 * 카테고리 트리는 이제 DB 에서 오므로(서버 전용 `lib/categories`), 클라이언트
 * 컴포넌트는 서버에서 props 로 받은 배열을 여기 함수에 넘겨서 쓴다.
 * 서버 컴포넌트는 `lib/categories` 의 async 래퍼를 쓰면 된다.
 */
import type { Category, Subcategory } from "@/lib/types";

/** 부모 id 든 서브 id 든 받아 소속 부모(와 매칭된 서브)를 돌려준다. */
export function resolveCategoryIn(
  list: Category[],
  id: string,
): { parent: Category; sub?: Subcategory } | undefined {
  for (const parent of list) {
    if (parent.id === id) return { parent };
    const sub = parent.subs?.find((s) => s.id === id);
    if (sub) return { parent, sub };
  }
  return undefined;
}

/** "DB" 또는 "DB / SQL·인덱스" 형태의 표시용 라벨. */
export function categoryLabelIn(list: Category[], id: string): string {
  const r = resolveCategoryIn(list, id);
  if (!r) return id;
  return r.sub ? `${r.parent.name} / ${r.sub.name}` : r.parent.name;
}

/**
 * 해당 카테고리가 포함하는 id 집합.
 * 부모 id 는 자기 글 + 모든 서브의 글을, 서브 id 는 자기 글만 포함한다.
 */
export function categoryIdsFor(list: Category[], id: string): Set<string> {
  const r = resolveCategoryIn(list, id);
  if (!r || r.sub) return new Set([id]);
  return new Set([r.parent.id, ...(r.parent.subs?.map((s) => s.id) ?? [])]);
}
