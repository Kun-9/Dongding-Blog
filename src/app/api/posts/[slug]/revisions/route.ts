/**
 * 글 수정 이력.
 * - GET: 목록. 본문은 앞부분만 잘라 보낸다 — 이력이 길어도 응답이 무겁지 않게.
 * - POST: `{ id }` 로 그 버전의 내용을 되돌린다.
 *
 * 복원도 결국 posts UPDATE 라서 되돌리기 직전 상태가 트리거로 한 번 더 쌓인다.
 * 즉 "복원 취소"가 자연스럽게 가능하다.
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { dbAdmin } from "@/lib/supabase";
import { requireApiUser, revalidateContent } from "../../_shared";

type Ctx = { params: Promise<{ slug: string }> };

const PREVIEW_CHARS = 160;

const RestoreSchema = z.object({
  id: z.number().int().positive(),
});

async function postIdOf(slug: string): Promise<string | null> {
  const { data, error } = await dbAdmin()
    .from("posts")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw new Error(`글 조회 실패: ${error.message}`);
  return data?.id ?? null;
}

export async function GET(_req: Request, { params }: Ctx) {
  const blocked = await requireApiUser();
  if (blocked) return blocked;

  const { slug } = await params;
  const postId = await postIdOf(slug);
  if (!postId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { data, error } = await dbAdmin()
    .from("post_revisions")
    .select("id, slug, title, visibility, created_at, body")
    .eq("post_id", postId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(
    (data ?? []).map((r) => ({
      id: r.id,
      slug: r.slug,
      title: r.title,
      visibility: r.visibility,
      createdAt: r.created_at,
      chars: r.body.length,
      preview: r.body.slice(0, PREVIEW_CHARS),
    })),
  );
}

export async function POST(req: Request, { params }: Ctx) {
  const blocked = await requireApiUser();
  if (blocked) return blocked;

  const { slug } = await params;
  const postId = await postIdOf(slug);
  if (!postId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = RestoreSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "id(양의 정수)가 필요합니다" },
      { status: 400 },
    );
  }

  const db = dbAdmin();
  const { data: rev, error: readErr } = await db
    .from("post_revisions")
    .select(
      "title, summary, category_id, tags, date, series_id, series_order, body",
    )
    .eq("id", parsed.data.id)
    .eq("post_id", postId) // 다른 글의 이력 id 로 덮어쓰지 못하게 한다.
    .maybeSingle();

  if (readErr) {
    return NextResponse.json({ error: readErr.message }, { status: 500 });
  }
  if (!rev) {
    return NextResponse.json(
      { error: "해당 이력을 찾을 수 없습니다" },
      { status: 404 },
    );
  }

  // visibility 와 slug 는 되돌리지 않는다 — 예전 버전을 불러왔다고 해서
  // 공개 상태나 주소까지 바뀌면 사고가 난다.
  const { error: upErr } = await db
    .from("posts")
    .update({
      title: rev.title,
      summary: rev.summary,
      // 이력은 posts 에서 복사된 값이라 비어 있을 일이 없지만, 컬럼 정의상
      // nullable 이라 방어한다 — undefined 면 해당 필드는 그냥 건드리지 않는다.
      category_id: rev.category_id ?? undefined,
      tags: rev.tags,
      date: rev.date ?? undefined,
      series_id: rev.series_id,
      series_order: rev.series_order,
      body: rev.body,
    })
    .eq("id", postId);

  if (upErr) {
    return NextResponse.json({ error: upErr.message }, { status: 500 });
  }

  revalidateContent();
  return NextResponse.json({ slug, restoredFrom: parsed.data.id });
}
