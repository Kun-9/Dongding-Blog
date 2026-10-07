/**
 * 글 주제의 집필 단계 — 어드민 화면과 MCP 도구가 같은 정의를 본다.
 *
 * 순서가 곧 프로세스다. 단계를 건너뛰지 못하게 한 칸씩만 넘긴다: 수요 확인
 * 없이 초안부터 쓰면 이미 누가 쓴 주제에 시간을 쓴다.
 */

export const STAGES = [
  {
    key: "picked",
    label: "글감 묶음",
    todo: "릴리스를 글 한 편 단위로 묶는다",
  },
  {
    key: "demand",
    label: "수요 확인",
    todo: "검색해서 한국어 글이 비었는지, 누가 이미 썼는지 본다",
  },
  {
    key: "sources",
    label: "2차 소스",
    todo: "공식 문서·PR·이슈를 읽어 릴리스 노트 밖의 맥락을 모은다",
  },
  {
    key: "draft",
    label: "초안",
    todo: "초안을 쓰고 글 slug 를 남긴다",
  },
  {
    key: "published",
    label: "발행",
    todo: "검토를 마치고 공개한다",
  },
] as const;

export type StageKey = (typeof STAGES)[number]["key"];

export const STAGE_KEYS = STAGES.map((s) => s.key) as [StageKey, ...StageKey[]];

export interface StageCheck {
  at: string;
  note: string;
}

export function stageIndex(key: StageKey): number {
  return STAGES.findIndex((s) => s.key === key);
}

/** 다음에 할 단계. 이미 발행했으면 null. */
export function nextStage(key: StageKey): (typeof STAGES)[number] | null {
  return STAGES[stageIndex(key) + 1] ?? null;
}

export function stageLabel(key: StageKey): string {
  return STAGES[stageIndex(key)].label;
}
