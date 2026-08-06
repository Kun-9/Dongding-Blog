/**
 * 북마크 단건 API — 수정(PUT) / 삭제(DELETE).
 */
import { NextResponse } from "next/server";
import { dbAdmin } from "@/lib/supabase";
import {
  BookmarkInputSchema,
  UNIQUE_VIOLATION,
  requireApiUser,
  parseId,
  revalidateContent,
  todayISO,
} from "../_shared";

type Ctx = { params: Promise<{ id: string }> };

const COLUMNS = "id, url, title, source, tag, note, date";

export async function PUT(req: Request, { params }: Ctx) {
  const blocked = await requireApiUser();
  if (blocked) return blocked;

  const { id: rawId } = await params;
  const id = parseId(rawId);
  if (id === null) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = BookmarkInputSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const input = parsed.data;
  const { data, error } = await dbAdmin()
    .from("bookmarks")
    .update({ ...input, date: input.date ?? todayISO() })
    .eq("id", id)
    .select(COLUMNS)
    .maybeSingle();

  if (error) {
    if (error.code === UNIQUE_VIOLATION) {
      return NextResponse.json(
        { error: "이미 등록된 URL입니다", url: input.url },
        { status: 409 },
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });

  revalidateContent();
  return NextResponse.json(data);
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const blocked = await requireApiUser();
  if (blocked) return blocked;

  const { id: rawId } = await params;
  const id = parseId(rawId);
  if (id === null) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const { data, error } = await dbAdmin()
    .from("bookmarks")
    .delete()
    .eq("id", id)
    .select("id")
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });

  revalidateContent();
  return NextResponse.json({ id });
}
