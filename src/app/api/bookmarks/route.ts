/**
 * 북마크 생성 API. URL 중복은 DB unique 제약이 잡아 409 로 돌려준다.
 */
import { NextResponse } from "next/server";
import { dbAdmin } from "@/lib/supabase";
import {
  BookmarkInputSchema,
  UNIQUE_VIOLATION,
  requireApiUser,
  revalidateContent,
  todayISO,
} from "./_shared";

export async function POST(req: Request) {
  const blocked = await requireApiUser();
  if (blocked) return blocked;

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
    .insert({ ...input, date: input.date ?? todayISO() })
    .select("id, url, title, source, tag, note, date")
    .single();

  if (error) {
    if (error.code === UNIQUE_VIOLATION) {
      return NextResponse.json(
        { error: "이미 등록된 URL입니다", url: input.url },
        { status: 409 },
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  revalidateContent();
  return NextResponse.json(data, { status: 201 });
}
