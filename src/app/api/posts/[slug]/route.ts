/**
 * 글 단건 API.
 * - GET: Studio 편집기가 쓰는 원문(draft/private 포함).
 * - PUT: 수정. body.slug 가 URL slug 와 다르면 slug 를 바꾸고(충돌 검사) 정규
 *        slug 를 돌려줘서 클라이언트가 URL 을 갱신하게 한다.
 * - DELETE: 삭제.
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { dbAdmin } from "@/lib/supabase";
import { syncLinkMeta } from "@/lib/link-meta";
import { VisibilitySchema } from "@/lib/posts";
import {
  PostBodySchema,
  requireApiUser,
  postExists,
  revalidateContent,
  toRow,
} from "../_shared";

type Ctx = { params: Promise<{ slug: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  const blocked = await requireApiUser();
  if (blocked) return blocked;

  const { slug } = await params;
  const { data, error } = await dbAdmin()
    .from("posts")
    .select(
      "slug, title, summary, category_id, tags, date, visibility, featured, series_id, series_order, thumbnail, body",
    )
    .eq("slug", slug)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({
    slug: data.slug,
    title: data.title,
    summary: data.summary,
    category: data.category_id,
    tags: data.tags,
    date: data.date,
    visibility: data.visibility,
    featured: data.featured,
    series: data.series_id ?? "",
    seriesOrder: data.series_order,
    thumbnail: data.thumbnail ?? "",
    body: data.body.replace(/^\n+/, ""),
  });
}

export async function PUT(req: Request, { params }: Ctx) {
  const blocked = await requireApiUser();
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

  const { error } = await dbAdmin()
    .from("posts")
    .update(toRow(data))
    .eq("slug", currentSlug);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // 링크 카드 메타 수집. 남의 사이트가 죽어 있다고 저장이 실패하면 안 된다.
  await syncLinkMeta(data.body).catch(() => {});

  revalidateContent();
  return NextResponse.json({ slug: nextSlug, renamed: renaming });
}

/**
 * 공개 상태만 바꾼다. `/manage` 가 상태 탭·벌크 처리에서 쓰는 경로 —
 * PUT 은 본문까지 전부 요구하므로 상태 하나 옮기자고 글을 통째로 왕복시킬
 * 이유가 없다.
 */
export async function PATCH(req: Request, { params }: Ctx) {
  const blocked = await requireApiUser();
  if (blocked) return blocked;

  const { slug } = await params;
  if (!(await postExists(slug))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = z.object({ visibility: VisibilitySchema }).safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { error } = await dbAdmin()
    .from("posts")
    .update({ visibility: parsed.data.visibility })
    .eq("slug", slug);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  revalidateContent();
  return NextResponse.json({ slug, visibility: parsed.data.visibility });
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const blocked = await requireApiUser();
  if (blocked) return blocked;

  const { slug } = await params;
  if (!(await postExists(slug))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { error } = await dbAdmin().from("posts").delete().eq("slug", slug);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  revalidateContent();
  return NextResponse.json({ slug });
}
