/**
 * 글 주제의 집필 단계 — 어드민 화면과 MCP 도구가 같은 정의를 본다.
 *
 * 순서가 곧 프로세스다. 한 칸씩만 넘긴다. 차별점은 먼저 쓰는 것이 아니라
 * 말투와 자료라서, 자료를 초안보다 앞에 두고 마지막에 문체·구성 점검을
 * 거친다.
 */

export const STAGES = [
  {
    key: "picked",
    label: "글감 묶음",
    todo: "릴리스를 글 한 편 단위로 묶는다",
  },
  {
    key: "sources",
    label: "2차 소스",
    todo: "공식 문서·PR·이슈를 읽고 직접 실행해 본다. 릴리스 노트에 없는 맥락을 모은다",
  },
  {
    key: "assets",
    label: "자료",
    todo: "비교 표, 스크린샷, 흐름 그림을 만든다. 글보다 자료를 먼저 정한다",
  },
  {
    key: "draft",
    label: "초안",
    todo: "합니다체로 초안을 쓰고 글 slug 를 남긴다",
  },
  {
    key: "review",
    label: "점검",
    todo: "문체·구성 점검을 통과시킨다. 서버가 본문을 검사해 경고가 남으면 넘어가지 않는다",
  },
  {
    key: "published",
    label: "발행",
    todo: "공개한다",
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
