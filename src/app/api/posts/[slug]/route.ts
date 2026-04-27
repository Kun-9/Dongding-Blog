/**
 * Dev-only single-post API.
 * - GET reads frontmatter + body for the Studio editor.
 * - PUT updates the file; if `body.slug` differs from the URL slug, the file
 *   is renamed (with collision check). Returns the canonical slug back so
 *   the client can update its URL.
 */
import { promises as fs } from "node:fs";
import { NextResponse } from "next/server";
import matter from "gray-matter";
import { invalidatePostsCache } from "@/lib/posts";
import {
  PostBodySchema,
  devGuard,
  postExists,
  postPath,
  serializePost,
} from "../_shared";

type Ctx = { params: Promise<{ slug: string }> };

function isENOENT(err: unknown): boolean {
  return (
    err instanceof Error &&
    (err as NodeJS.ErrnoException).code === "ENOENT"
  );
}

export async function GET(_req: Request, { params }: Ctx) {
  const blocked = devGuard();
  if (blocked) return blocked;

  const { slug } = await params;

  let raw: string;
  try {
    raw = await fs.readFile(postPath(slug), "utf8");
  } catch (err) {
    if (isENOENT(err)) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    throw err;
  }
  const { data, content } = matter(raw);

  // Resolve visibility: explicit field wins; legacy `draft: true` → 'draft';
  // missing both → 'published' (matches loader logic).
  const visibility =
    data.visibility === "published" ||
    data.visibility === "private" ||
    data.visibility === "draft"
      ? data.visibility
      : data.draft === true
        ? "draft"
        : "published";

  return NextResponse.json({
    slug,
    title: typeof data.title === "string" ? data.title : "",
    summary: typeof data.summary === "string" ? data.summary : "",
    category: typeof data.category === "string" ? data.category : "",
    tags: Array.isArray(data.tags) ? data.tags.map(String) : [],
    date: typeof data.date === "string" ? data.date : "",
    visibility,
    featured: data.featured === true,
    body: content.replace(/^\n+/, ""),
  });
}

export async function PUT(req: Request, { params }: Ctx) {
  const blocked = devGuard();
  if (blocked) return blocked;

  const { slug: currentSlug } = await params;
  if (!(await postExists(currentSlug))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

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
  const nextSlug = data.slug;
  const renaming = nextSlug !== currentSlug;

  if (renaming && (await postExists(nextSlug))) {
    return NextResponse.json(
      { error: "이미 존재하는 slug입니다", slug: nextSlug },
      { status: 409 },
    );
  }

  if (renaming) {
    await fs.rename(postPath(currentSlug), postPath(nextSlug));
  }
  await fs.writeFile(postPath(nextSlug), serializePost(data), "utf8");
  invalidatePostsCache();

  return NextResponse.json({ slug: nextSlug, renamed: renaming });
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const blocked = devGuard();
  if (blocked) return blocked;

  const { slug } = await params;
  try {
    await fs.unlink(postPath(slug));
  } catch (err) {
    if (isENOENT(err)) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    throw err;
  }
  invalidatePostsCache();

  return NextResponse.json({ slug });
}
