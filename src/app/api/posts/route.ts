/**
 * 글 생성 API — Supabase `posts` 에 새 행을 넣는다.
 * slug 는 unique 라 충돌하면 409 로 기존 slug 를 돌려준다.
 */
import { NextResponse } from "next/server";
import { dbAdmin } from "@/lib/supabase";
import { PostBodySchema, requireApiUser, revalidateContent, toRow } from "./_shared";

/** unique 위반 — 같은 slug 가 이미 있다. */
const UNIQUE_VIOLATION = "23505";

export async function POST(req: Request) {
  const blocked = await requireApiUser();
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
  const { error } = await dbAdmin().from("posts").insert(toRow(data));

  if (error) {
    if (error.code === UNIQUE_VIOLATION) {
      return NextResponse.json(
        { error: "이미 존재하는 slug입니다", slug: data.slug },
        { status: 409 },
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  revalidateContent();
  return NextResponse.json({ slug: data.slug }, { status: 201 });
}
