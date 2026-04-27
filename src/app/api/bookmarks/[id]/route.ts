import { NextResponse } from "next/server";
import { invalidateBookmarksCache } from "@/lib/bookmarks";
import {
  BookmarkInputSchema,
  devGuard,
  readBookmarks,
  todayISO,
  writeBookmarks,
} from "../_shared";

type Ctx = { params: Promise<{ id: string }> };

function parseId(raw: string): number | null {
  const n = Number(raw);
  if (!Number.isInteger(n) || n <= 0) return null;
  return n;
}

export async function PUT(req: Request, { params }: Ctx) {
  const blocked = devGuard();
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

  const items = await readBookmarks();
  const idx = items.findIndex((b) => b.id === id);
  if (idx < 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const input = parsed.data;
  const current = items[idx];

  if (
    input.url !== current.url &&
    items.some((b) => b.id !== id && b.url === input.url)
  ) {
    return NextResponse.json(
      { error: "이미 등록된 URL입니다", url: input.url },
      { status: 409 },
    );
  }

  const updated = {
    id,
    url: input.url,
    title: input.title,
    source: input.source,
    tag: input.tag,
    note: input.note,
    date: input.date ?? current.date ?? todayISO(),
  };

  const next = [...items];
  next[idx] = updated;
  await writeBookmarks(next);
  invalidateBookmarksCache();

  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const blocked = devGuard();
  if (blocked) return blocked;

  const { id: rawId } = await params;
  const id = parseId(rawId);
  if (id === null) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const items = await readBookmarks();
  const idx = items.findIndex((b) => b.id === id);
  if (idx < 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const next = items.filter((b) => b.id !== id);
  await writeBookmarks(next);
  invalidateBookmarksCache();

  return NextResponse.json({ id });
}
