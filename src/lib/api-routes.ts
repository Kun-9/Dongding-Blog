/**
 * Client-side API path helpers. Centralizes the dev-only `/api/*` URLs so
 * call sites don't carry magic strings — rename a route here once when it
 * moves, instead of hunting through fetch invocations.
 */

const enc = encodeURIComponent;

export const API = {
  posts: "/api/posts/",
  post: (slug: string) => `/api/posts/${enc(slug)}/`,
  postImages: (slug: string) => `/api/posts/${enc(slug)}/images/`,
  postRevisions: (slug: string) => `/api/posts/${enc(slug)}/revisions/`,

  series: "/api/series/",
  seriesItem: (id: string) => `/api/series/${enc(id)}/`,

  categories: "/api/categories",
  categoryStats: "/api/categories/stats",

  bookmarks: "/api/bookmarks",
  bookmark: (id: number) => `/api/bookmarks/${id}`,
  bookmarkPreview: (url: string) => `/api/bookmarks/preview?url=${enc(url)}`,

  settings: "/api/settings",
  /** 저장 전 카드 미리보기 (POST) — 실제 카드 렌더러가 그린 SVG 를 돌려준다. */
  cardPreview: "/api/settings/card-preview",
  /** 앱 주소에서 파비콘을 data URI 로 (POST {url}). */
  cardIcon: "/api/settings/card-icon",

  /** 미리보기의 링크 카드 재료 (POST {urls, slugs}). */
  linkMeta: "/api/link-meta/",

  /**
   * 릴리스 글감 — 상태 변경(PATCH), 추적 레포(PUT), 지금 수집(POST).
   * `trailingSlash: true` 라 슬래시를 빼면 308 을 한 번 타고 간다.
   */
  releases: "/api/releases/",
  releaseSources: "/api/releases/sources/",
  releaseCollect: "/api/releases/collect/",
  /** 글 주제 — 만들기(POST), 단계 이동·편집·접기·버리기(PATCH). */
  releaseTopics: "/api/releases/topics/",
  /** 개념 글감 찾기 (POST {area}) — 실행기 루틴을 개념 탐색으로 깨운다. */
  releaseConcept: "/api/releases/concept/",

  stats: {
    summary: "/api/stats/summary",
    pageviews: "/api/stats/pageviews",
    metrics: "/api/stats/metrics",
  },
} as const;
