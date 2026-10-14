/**
 * Voopo 피드 변환 — DB 행을 Voopo 가 받는 값으로 옮긴다(`/api/feed/voopo`).
 *
 * next 에 의존하지 않는 순수 모듈이다 — `scripts/check-voopo-feed.mjs` 가
 * 그대로 import 해 점검한다. DB 는 라우트가 읽는다.
 */

/** 요약이 빈 글은 본문 첫 문단을 이 길이로 자른다. 카드 요약 상한(lint 150자)과 맞춘다. */
export const SUMMARY_MAX = 150;

/**
 * 글 요약. 비었으면 본문 첫 문단 — 제목·요약 박스(`>`)·목록·표·그림·코드는
 * 건너뛰고 처음 나오는 산문 줄을 쓴다. 링크는 글자만 남긴다.
 */
export function postSummary(summary: string, body: string): string {
  if (summary.trim()) return summary.trim();
  let fenced = false;
  for (const raw of body.split("\n")) {
    const t = raw.trim();
    if (/^(```|~~~)/.test(t)) {
      fenced = !fenced;
      continue;
    }
    if (fenced || !t || /^([#>|<!]|[-*+]\s|\d+\.\s)/.test(t)) continue;
    const plain = t.replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1").replace(/\*\*|`/g, "");
    return plain.length > SUMMARY_MAX ? `${plain.slice(0, SUMMARY_MAX).trimEnd()}…` : plain;
  }
  return "";
}

/** 날짜만 있는 글 발행일(`YYYY-MM-DD`)을 ISO 로. 시각은 저장하지 않아 UTC 자정으로 둔다. */
export function dateToISO(date: string): string {
  return new Date(date).toISOString();
}

export interface LinkedTopic {
  id: number;
  post_slug: string | null;
  proposal: unknown;
  dropped_reason: string | null;
}

/**
 * 릴리스에 묶인 주제(release_topic_candidates)에서 한 줄 요약과 다룬 글을 고른다.
 *
 * - note: 탐색기 제안의 `proposal.summary`(무엇인가 한 줄).
 * - postId: 주제의 `post_slug` 가 발행 글일 때 그 id. `publishedIds` 에는 발행 글만 들어온다.
 *
 * 접거나 버린 주제(dropped_reason 있음)는 보지 않는다. 주제가 여럿이면 먼저 만든 것부터.
 */
export function releaseLinks(
  topics: (LinkedTopic | null)[],
  publishedIds: Map<string, string>,
): { note: string | null; postId: string | null } {
  let note: string | null = null;
  let postId: string | null = null;
  const live = topics
    .filter((t): t is LinkedTopic => !!t && t.dropped_reason === null)
    .sort((a, b) => a.id - b.id);
  for (const t of live) {
    const summary = (t.proposal as { summary?: unknown } | null)?.summary;
    if (note === null && typeof summary === "string" && summary.trim()) note = summary.trim();
    if (postId === null && t.post_slug) postId = publishedIds.get(t.post_slug) ?? null;
  }
  return { note, postId };
}
