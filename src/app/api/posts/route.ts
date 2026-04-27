/**
 * Dev-only posts API — POST creates a new `content/posts/{slug}.md`.
 * Slug must be unique; conflicts return 409 with the existing slug echoed back.
 * Production builds exclude API routes; the devGuard is a runtime safety net.
 */
import { promises as fs } from "node:fs";
import { NextResponse } from "next/server";
import { invalidatePostsCache } from "@/lib/posts";
import {
  PostBodySchema,
  devGuard,
  postExists,
  postPath,
  serializePost,
} from "./_shared";

export async function POST(req: Request) {
  const blocked = devGuard();
  if (blocked) return blocked;

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = PostBodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const data = parsed.data;
  if (await postExists(data.slug)) {
    return NextResponse.json(
      { error: "이미 존재하는 slug입니다", slug: data.slug },
      { status: 409 },
    );
  }

  await fs.writeFile(postPath(data.slug), serializePost(data), "utf8");
  invalidatePostsCache();

  return NextResponse.json({ slug: data.slug }, { status: 201 });
}
