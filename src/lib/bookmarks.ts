/**
 * Bookmark (linkroll) loader — reads `content/bookmarks.json`.
 */
import "server-only";

import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import type { Bookmark } from "@/lib/types";

const BookmarkSchema = z.object({
  url: z.string(),
  title: z.string(),
  source: z.string(),
  tag: z.string(),
  note: z.string(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

const FILE = path.join(process.cwd(), "content", "bookmarks.json");

let cache: Bookmark[] | null = null;

export function getAllBookmarks(): Bookmark[] {
  if (cache) return cache;
  if (!fs.existsSync(FILE)) {
    cache = [];
    return cache;
  }
  const raw = JSON.parse(fs.readFileSync(FILE, "utf8"));
  const items = z.array(BookmarkSchema).parse(raw);
  // Sort newest first
  cache = items.sort((a, b) => b.date.localeCompare(a.date));
  return cache;
}
