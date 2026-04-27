/**
 * Post loader — reads `content/posts/*.mdx`, parses frontmatter with
 * gray-matter + zod, falls back to reading-time when readTime is omitted.
 *
 * Phase 4 only exposes the metadata needed by list/card components. MDX
 * body rendering is added in Phase 5 (PostDetail page).
 */
import "server-only";

import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import readingTime from "reading-time";
import BananaSlug from "github-slugger";
import { z } from "zod";
import type { PostMeta, TocItem, Visibility } from "@/lib/types";

const POSTS_DIR = path.join(process.cwd(), "content", "posts");

const TocItemSchema = z.object({
  id: z.string(),
  label: z.string(),
  level: z.union([z.literal(2), z.literal(3)]),
});

const VisibilitySchema = z.enum(["published", "private", "draft"]);

const FrontmatterSchema = z.object({
  title: z.string(),
  summary: z.string(),
  category: z.string(),
  tags: z.array(z.string()).default([]),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  readTime: z.number().int().positive().optional(),
  featured: z.boolean().optional(),
  visibility: VisibilitySchema.optional(),
  /** @deprecated 호환을 위해 유지 — visibility로 자동 매핑 */
  draft: z.boolean().optional(),
  toc: z.array(TocItemSchema).optional(),
});

function resolveVisibility(
  fm: z.infer<typeof FrontmatterSchema>,
): Visibility {
  if (fm.visibility) return fm.visibility;
  if (fm.draft === true) return "draft";
  return "published";
}

interface CachedPost {
  meta: PostMeta;
  body: string;
}

const HEADING_RE = /^(#{2,3})\s+(.+?)\s*$/;
const FENCE_RE = /^\s*```/;

function stripInlineMarkdown(text: string): string {
  return text
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/_([^_]+)_/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .trim();
}

// Mirrors rehype-slug's id generation (both use github-slugger).
function extractTocFromMdx(body: string): TocItem[] {
  const slugger = new BananaSlug();
  const items: TocItem[] = [];
  let inFence = false;

  for (const line of body.split("\n")) {
    if (FENCE_RE.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;

    const m = line.match(HEADING_RE);
    if (!m) continue;

    const level = m[1].length as 2 | 3;
    const label = stripInlineMarkdown(m[2]);
    if (!label) continue;
    items.push({ id: slugger.slug(label), label, level });
  }
  return items;
}

let cache: CachedPost[] | null = null;

const isDev = process.env.NODE_ENV === "development";

export function invalidatePostsCache(): void {
  cache = null;
}

function loadAll(): CachedPost[] {
  if (cache && !isDev) return cache;
  if (!fs.existsSync(POSTS_DIR)) {
    cache = [];
    return cache;
  }

  const files = fs
    .readdirSync(POSTS_DIR)
    .filter((f) => f.endsWith(".mdx") || f.endsWith(".md"));

  const items: CachedPost[] = files.map((file) => {
    const slug = file.replace(/\.(mdx?|md)$/, "");
    const full = path.join(POSTS_DIR, file);
    const raw = fs.readFileSync(full, "utf8");
    const { data, content } = matter(raw);
    const fm = FrontmatterSchema.parse(data);

    const minutes =
      fm.readTime ?? Math.max(1, Math.round(readingTime(content).minutes));

    const derivedToc = extractTocFromMdx(content);
    const toc = derivedToc.length >= 2 ? derivedToc : fm.toc;

    const visibility = resolveVisibility(fm);
    const meta: PostMeta = {
      slug,
      title: fm.title,
      summary: fm.summary,
      category: fm.category,
      tags: fm.tags,
      date: fm.date,
      readTime: minutes,
      featured: fm.featured,
      visibility,
      draft: visibility === "draft",
      toc,
    };
    return { meta, body: content };
  });

  // Sort newest first
  items.sort((a, b) => b.meta.date.localeCompare(a.meta.date));
  cache = items;
  return cache;
}

/** All published posts (drafts/private excluded), newest first. */
export function getAllPosts(): PostMeta[] {
  return loadAll()
    .filter((p) => p.meta.visibility === "published")
    .map((p) => p.meta);
}

/** Includes drafts — used by admin views. */
export function getAllPostsIncludingDrafts(): PostMeta[] {
  return loadAll().map((p) => p.meta);
}

/** Includes drafts AND body — used by drafts/Studio. */
export function getAllPostsWithBody(): { meta: PostMeta; body: string }[] {
  return loadAll();
}

export function getPostBySlug(
  slug: string,
): { meta: PostMeta; body: string } | undefined {
  return loadAll().find((p) => p.meta.slug === slug);
}

export function getFeaturedPost(): PostMeta | undefined {
  return getAllPosts().find((p) => p.featured);
}

export function getPostsByCategory(categoryId: string): PostMeta[] {
  return getAllPosts().filter((p) => p.category === categoryId);
}

export function getPostsByTag(tag: string): PostMeta[] {
  return getAllPosts().filter((p) => p.tags.includes(tag));
}

export function getAllTags(): string[] {
  return [...new Set(getAllPosts().flatMap((p) => p.tags))];
}
