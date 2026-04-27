/**
 * Shared helpers for the dev-only posts API. Owns frontmatter shape,
 * slug normalization, and on-disk path resolution. Production builds
 * (`BUILD_TARGET=static`) exclude API routes entirely; the runtime guard
 * here is belt-and-suspenders.
 */
import "server-only";

import { promises as fs } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import matter from "gray-matter";
import { z } from "zod";

export const POSTS_DIR = path.join(process.cwd(), "content", "posts");

export const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;

const VisibilitySchema = z.enum(["published", "private", "draft"]);

export const PostBodySchema = z.object({
  slug: z.string().regex(SLUG_RE, "slug은 영소문자/숫자/하이픈만 허용"),
  title: z.string().min(1),
  summary: z.string().min(1),
  category: z.string().min(1),
  tags: z.array(z.string()).default([]),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  body: z.string(),
  visibility: VisibilitySchema.default("draft"),
  featured: z.boolean().optional(),
});

export type PostBody = z.infer<typeof PostBodySchema>;

export function devGuard(): NextResponse | null {
  if (process.env.NODE_ENV !== "development") {
    return new NextResponse("Not Found", { status: 404 });
  }
  return null;
}

export function postPath(slug: string): string {
  return path.join(POSTS_DIR, `${slug}.md`);
}

export async function postExists(slug: string): Promise<boolean> {
  try {
    await fs.access(postPath(slug));
    return true;
  } catch {
    return false;
  }
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function serializePost(input: PostBody): string {
  const { body, ...meta } = input;

  const data: Record<string, unknown> = {
    title: meta.title,
    summary: meta.summary,
    category: meta.category,
    tags: meta.tags,
    date: meta.date ?? todayISO(),
  };
  if (meta.featured) data.featured = true;
  // 항상 명시적으로 기록 — published 도 포함. 기존 `draft` 키는 더 이상 쓰지 않음.
  data.visibility = meta.visibility;

  return matter.stringify(body.endsWith("\n") ? body : `${body}\n`, data);
}
