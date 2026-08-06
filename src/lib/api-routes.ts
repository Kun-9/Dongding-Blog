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

  stats: {
    summary: "/api/stats/summary",
    pageviews: "/api/stats/pageviews",
    metrics: "/api/stats/metrics",
  },
} as const;
