/**
 * Series loader — reads `content/series.json` and validates with zod.
 */
import "server-only";

import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import type { Series } from "@/lib/types";

const SeriesSchema = z.object({
  id: z.string(),
  title: z.string(),
  desc: z.string(),
  count: z.number().int().positive(),
  color: z.string(),
  posts: z.array(z.string()),
});

const FILE = path.join(process.cwd(), "content", "series.json");

let cache: Series[] | null = null;

export function getAllSeries(): Series[] {
  if (cache) return cache;
  if (!fs.existsSync(FILE)) {
    cache = [];
    return cache;
  }
  const raw = JSON.parse(fs.readFileSync(FILE, "utf8"));
  cache = z.array(SeriesSchema).parse(raw);
  return cache;
}

export function getSeriesById(id: string): Series | undefined {
  return getAllSeries().find((s) => s.id === id);
}
