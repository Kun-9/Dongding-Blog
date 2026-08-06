/**
 * 시리즈 단건 API.
 * - PATCH: 메타 부분 수정 (id 는 변경 불가 — 글이 series_id 로 참조 중).
 * - DELETE: 항목 제거. 글의 series_id 는 FK 의 on delete set null 로 풀린다.
 */
import { NextResponse } from "next/server";
import { dbAdmin } from "@/lib/supabase";
import {
  SeriesPatchSchema,
  devGuard,
  revalidateContent,
  toRow,
} from "../_shared";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Ctx) {
  const blocked = devGuard();
  if (blocked) return blocked;

  const { id } = await params;
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = SeriesPatchSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { data, error } = await dbAdmin()
    .from("series")
    .update(toRow(parsed.data))
    .eq("id", id)
    .select("id, title, description, color, planned_count")
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });

  revalidateContent();
  return NextResponse.json({
    id: data.id,
    title: data.title,
    desc: data.description,
    color: data.color,
    count: data.planned_count,
  });
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const blocked = devGuard();
  if (blocked) return blocked;

  const { id } = await params;
  const { data, error } = await dbAdmin()
    .from("series")
    .delete()
    .eq("id", id)
    .select("id")
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });

  revalidateContent();
  return NextResponse.json({ id });
}
