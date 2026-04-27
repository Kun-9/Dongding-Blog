import "server-only";

import { promises as fs } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { z } from "zod";
import type { Bookmark } from "@/lib/types";

export const BOOKMARKS_FILE = path.join(
  process.cwd(),
  "content",
  "bookmarks.json",
);

export const BookmarkInputSchema = z.object({
  url: z.string().min(1).regex(/^[^\s]+$/, "URL에는 공백을 넣을 수 없습니다"),
  title: z.string().min(1),
  source: z.string().min(1),
  tag: z.string().min(1),
  note: z.string(),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
});

export type BookmarkInput = z.infer<typeof BookmarkInputSchema>;

const BookmarkSchema = z.object({
  id: z.number().int().positive(),
  url: z.string(),
  title: z.string(),
  source: z.string(),
  tag: z.string(),
  note: z.string(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export function devGuard(): NextResponse | null {
  if (process.env.NODE_ENV !== "development") {
    return new NextResponse("Not Found", { status: 404 });
  }
  return null;
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function readBookmarks(): Promise<Bookmark[]> {
  try {
    const raw = await fs.readFile(BOOKMARKS_FILE, "utf8");
    const json = JSON.parse(raw);
    return z.array(BookmarkSchema).parse(json);
  } catch (err) {
    if (
      err instanceof Error &&
      (err as NodeJS.ErrnoException).code === "ENOENT"
    ) {
      return [];
    }
    throw err;
  }
}

// Atomic write — tmp + rename so partial writes never corrupt the file.
export async function writeBookmarks(items: Bookmark[]): Promise<void> {
  const tmp = `${BOOKMARKS_FILE}.${process.pid}.${Date.now()}.tmp`;
  const body = `${JSON.stringify(items, null, 2)}\n`;
  await fs.writeFile(tmp, body, "utf8");
  await fs.rename(tmp, BOOKMARKS_FILE);
}

export function nextId(items: Bookmark[]): number {
  return items.reduce((m, b) => Math.max(m, b.id), 0) + 1;
}
