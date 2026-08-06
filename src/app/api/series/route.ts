/**
 * 시리즈 API.
 * - GET: 메타 목록 + 소속 글(스튜디오·어드민에서 사용).
 * - POST: 신규 시리즈 추가. id 중복은 409.
 */
import { NextResponse } from "next/server";
import { getAllSeriesWithPosts } from "@/lib/series";
import { dbAdmin } from "@/lib/supabase";
import { SeriesEntrySchema, requireApiUser, revalidateContent } from "./_shared";

const UNIQUE_VIOLATION = "23505";

export async function GET() {
  const blocked = await requireApiUser();
  if (blocked) return blocked;

  const items = (await getAllSeriesWithPosts({ includeDrafts: true })).map(
    (s) => ({
      id: s.id,
      title: s.title,
      desc: s.desc,
      count: s.count,
      color: s.color,
      posts: s.posts.map((p) => ({
        slug: p.slug,
        title: p.title,
        seriesOrder: p.seriesOrder,
        visibility: p.visibility,
      })),
    }),
  );
  return NextResponse.json(items);
}

export async function POST(req: Request) {
  const blocked = await requireApiUser();
  if (blocked) return blocked;

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = SeriesEntrySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const entry = parsed.data;
  const { error } = await dbAdmin().from("series").insert({
    id: entry.id,
    title: entry.title,
    description: entry.desc,
    color: entry.color,
    planned_count: entry.count,
  });

  if (error) {
    if (error.code === UNIQUE_VIOLATION) {
      return NextResponse.json(
        { error: "이미 존재하는 시리즈 id입니다", id: entry.id },
        { status: 409 },
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  revalidateContent();
  return NextResponse.json(entry, { status: 201 });
}
