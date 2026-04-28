/**
 * Dev-only series API.
 * - GET: 메타 목록(클라이언트 스튜디오·어드민에서 사용)
 * - POST: 신규 시리즈 메타 추가. id 중복은 409.
 */
import { NextResponse } from "next/server";
import {
  getAllSeriesWithPosts,
  invalidateSeriesCache,
} from "@/lib/series";
import {
  SeriesEntrySchema,
  devGuard,
  readSeriesFile,
  writeSeriesFile,
} from "./_shared";

export async function GET() {
  const blocked = devGuard();
  if (blocked) return blocked;
  const items = getAllSeriesWithPosts({ includeDrafts: true }).map((s) => ({
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
  }));
  return NextResponse.json(items);
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

  const parsed = SeriesEntrySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const items = await readSeriesFile();
  if (items.some((s) => s.id === parsed.data.id)) {
    return NextResponse.json(
      { error: "이미 존재하는 시리즈 id입니다", id: parsed.data.id },
      { status: 409 },
    );
  }

  items.push(parsed.data);
  await writeSeriesFile(items);
  invalidateSeriesCache();
  return NextResponse.json(parsed.data, { status: 201 });
}
