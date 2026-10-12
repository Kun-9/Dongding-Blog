/**
 * 제안을 올리는 탐색기. 어드민의 제안 카드와 탐색기 API 의 입력 검증이 같이 쓴다.
 * 탐색기가 올린 주제는 사람이 채택하기 전까지 제안(proposed)으로 남는다.
 */
export const SCOUTS = [
  { key: "release", label: "릴리스" },
  { key: "trend", label: "트렌드" },
  { key: "tool", label: "도구" },
  { key: "skill", label: "인기 스킬" },
  { key: "concept", label: "개념" },
] as const;

export type ScoutKey = (typeof SCOUTS)[number]["key"];
export const SCOUT_KEYS = SCOUTS.map((s) => s.key) as [ScoutKey, ...ScoutKey[]];

/** 제안 카드가 그리는 것. 채택한 뒤에도 주제에 남는다. */
export interface Proposal {
  scout: ScoutKey;
  /** 무엇인가 한 줄. 왜 지금인가는 주제의 angle 이다. */
  summary: string;
  /** 근거 칩. 수치·버전처럼 짧게. */
  signals: string[];
  /** 확인 못 한 것 한 줄. null 이면 1차 출처를 다 확인했다. */
  unverified: string | null;
  /** 인기 스킬의 8주 주별 설치, 오래된 주부터. */
  trend: number[] | null;
}
