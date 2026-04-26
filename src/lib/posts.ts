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
import { z } from "zod";
import type { PostMeta } from "@/lib/types";

const POSTS_DIR = path.join(process.cwd(), "content", "posts");

const FrontmatterSchema = z.object({
  title: z.string(),
  summary: z.string(),
  category: z.string(),
  tags: z.array(z.string()).default([]),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  readTime: z.number().int().positive().optional(),
  featured: z.boolean().optional(),
  draft: z.boolean().optional(),
});

interface CachedPost {
  meta: PostMeta;
  body: string;
}

let cache: CachedPost[] | null = null;

function loadAll(): CachedPost[] {
  if (cache) return cache;
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

    const meta: PostMeta = {
      slug,
      title: fm.title,
      summary: fm.summary,
      category: fm.category,
      tags: fm.tags,
      date: fm.date,
      readTime: minutes,
      featured: fm.featured,
      draft: fm.draft,
    };
    return { meta, body: content };
  });

  // Sort newest first
  items.sort((a, b) => b.meta.date.localeCompare(a.meta.date));
  cache = items;
  return cache;
}

/** All published posts (drafts excluded), newest first. */
export function getAllPosts(): PostMeta[] {
  return loadAll()
    .filter((p) => !p.meta.draft)
    .map((p) => p.meta);
}

/** Includes drafts — used by admin views. */
export function getAllPostsIncludingDrafts(): PostMeta[] {
  return loadAll().map((p) => p.meta);
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
