/**
 * Domain types for the blog. Single source of truth — `posts.ts`,
 * `series.ts`, `bookmarks.ts`, etc. all consume from here.
 */

export interface Subcategory {
  id: string;
  name: string;
  count?: number;
}

export interface Category {
  id: string;
  name: string;
  desc: string;
  count?: number;
  subs?: Subcategory[];
}

/**
 * `review` 는 "다 썼고 검토만 남은" 자리다. 공개 범위는 draft 와 같다 —
 * RLS 가 published 만 내보내므로 방문자에게는 셋 다 안 보인다.
 */
export type Visibility = "published" | "private" | "draft" | "review";

export interface PostMeta {
  slug: string;
  title: string;
  summary: string;
  category: string;
  tags: string[];
  date: string;
  readTime: number;
  featured?: boolean;
  visibility: Visibility;
  /** @deprecated `visibility === 'draft'`로 대체 — 마이그레이션 후 제거 예정 */
  draft?: boolean;
  toc?: TocItem[];
  series?: string;
  seriesOrder?: number;
  /** 홈 Featured 리드 그림에 쓸 대표 이미지 (`/posts/{slug}/{file}`). */
  thumbnail?: string;
}

export interface TocItem {
  id: string;
  label: string;
  level: 2 | 3;
}

export interface Series {
  id: string;
  title: string;
  desc: string;
  count: number;
  color: string;
  /** YYYY-MM-DD. /series 의 `생성순` 정렬 기준. */
  createdAt: string;
}

export interface SeriesWithPosts extends Series {
  posts: PostMeta[];
}

export interface Bookmark {
  id: number;
  url: string;
  title: string;
  source: string;
  tag: string;
  note: string;
  date: string;
}

export interface Draft {
  slug: string;
  title: string;
  updated: string;
  words: number;
  status: Exclude<Visibility, "published">;
}

export interface SiteMeta {
  url: string;
  title: string;
  shortTitle: string;
  description: string;
  lang: string;
  locale: string;
  copyright: string;

  author: string;
  handle: string;
  bio: string;
  /** 홈 히어로 소개 문단. 백틱 조각은 인라인 코드로 렌더된다. */
  intro: string;
  /** About 페이지 소개 문단. 빈 줄이 문단 구분. */
  about: string;

  og: {
    headline: readonly string[];
    tagline: string;
    label: string;
  };

  social: {
    github: string;
    email: string;
  };
}

declare global {
  interface Window {
    umami?: {
      track: (
        eventName?: string,
        eventData?: Record<string, string | number | boolean>,
      ) => void;
    };
  }
}
