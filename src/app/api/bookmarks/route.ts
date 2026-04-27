import { NextResponse } from "next/server";
import { invalidateBookmarksCache } from "@/lib/bookmarks";
import {
  BookmarkInputSchema,
  devGuard,
  nextId,
  readBookmarks,
  todayISO,
  writeBookmarks,
} from "./_shared";

export async function POST(req: Request) {
  const blocked = devGuard();
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

  const items = await readBookmarks();
  const input = parsed.data;

  if (items.some((b) => b.url === input.url)) {
    return NextResponse.json(
      { error: "이미 등록된 URL입니다", url: input.url },
      { status: 409 },
    );
  }

  const created = {
    id: nextId(items),
    url: input.url,
    title: input.title,
    source: input.source,
    tag: input.tag,
    note: input.note,
    date: input.date ?? todayISO(),
  };

  await writeBookmarks([...items, created]);
  invalidateBookmarksCache();

  return NextResponse.json(created, { status: 201 });
}
