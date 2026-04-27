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
  postPath,
  serializePost,
} from "./_shared";

function isCode(err: unknown, code: string): boolean {
  return (
    err instanceof Error &&
    (err as NodeJS.ErrnoException).code === code
  );
}

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
  try {
    await fs.writeFile(postPath(data.slug), serializePost(data), {
      encoding: "utf8",
      flag: "wx",
    });
  } catch (err) {
    if (isCode(err, "EEXIST")) {
      return NextResponse.json(
        { error: "이미 존재하는 slug입니다", slug: data.slug },
        { status: 409 },
      );
    }
    throw err;
  }
  invalidatePostsCache();

  return NextResponse.json({ slug: data.slug }, { status: 201 });
}
