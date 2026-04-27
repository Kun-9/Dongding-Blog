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

export interface PostMeta {
  slug: string;
  title: string;
  summary: string;
  category: string;
  tags: string[];
  date: string;
  readTime: number;
  featured?: boolean;
  draft?: boolean;
  toc?: TocItem[];
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
  posts: string[];
}

export interface Bookmark {
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
  status: "draft" | "review";
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
  intro: string;

  og: {
    headline: readonly string[];
    tagline: string;
    label: string;
  };

  social: {
    github: string;
    email: string;
    rss: string;
  };

  publish: {
    rssLimit: number;
  };
}
