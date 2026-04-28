/**
 * Dev-only single-series API.
 * - PATCH: 시리즈 메타 부분 수정 (id는 변경 불가 — 글 frontmatter 연결을 보존).
 * - DELETE: series.json에서 항목 제거. 글 frontmatter의 series 필드는 의도적으로 유지.
 */
import { NextResponse } from "next/server";
import { invalidateSeriesCache } from "@/lib/series";
import {
  SeriesPatchSchema,
  devGuard,
  readSeriesFile,
  writeSeriesFile,
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

  const items = await readSeriesFile();
  const idx = items.findIndex((s) => s.id === id);
  if (idx === -1) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  items[idx] = { ...items[idx], ...parsed.data };
  await writeSeriesFile(items);
  invalidateSeriesCache();
  return NextResponse.json(items[idx]);
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const blocked = devGuard();
  if (blocked) return blocked;

  const { id } = await params;
  const items = await readSeriesFile();
  const next = items.filter((s) => s.id !== id);
  if (next.length === items.length) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  await writeSeriesFile(next);
  invalidateSeriesCache();
  return NextResponse.json({ id });
}
