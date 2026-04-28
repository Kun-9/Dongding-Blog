/**
 * Shared helpers for the dev-only series API. Reads/writes
 * `content/series.json`. Production builds exclude API routes; the runtime
 * devGuard is a belt-and-suspenders safety net.
 */
import "server-only";

import { promises as fs } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { z } from "zod";

export const SERIES_FILE = path.join(
  process.cwd(),
  "content",
  "series.json",
);

export const SERIES_ID_RE = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;

export const SeriesEntrySchema = z.object({
  id: z.string().regex(SERIES_ID_RE, "id는 영소문자/숫자/하이픈만 허용"),
  title: z.string().min(1),
  desc: z.string().min(1),
  count: z.number().int().positive(),
  color: z.string().min(1),
});

export const SeriesPatchSchema = SeriesEntrySchema.omit({
  id: true,
}).partial();

export type SeriesEntry = z.infer<typeof SeriesEntrySchema>;
export type SeriesPatch = z.infer<typeof SeriesPatchSchema>;

export function devGuard(): NextResponse | null {
  if (process.env.NODE_ENV !== "development") {
    return new NextResponse("Not Found", { status: 404 });
  }
  return null;
}

export async function readSeriesFile(): Promise<SeriesEntry[]> {
  let raw: string;
  try {
    raw = await fs.readFile(SERIES_FILE, "utf8");
  } catch (err) {
    if (
      err instanceof Error &&
      (err as NodeJS.ErrnoException).code === "ENOENT"
    ) {
      return [];
    }
    throw err;
  }
  const parsed = z.array(SeriesEntrySchema.passthrough()).parse(JSON.parse(raw));
  return parsed.map(({ id, title, desc, count, color }) => ({
    id,
    title,
    desc,
    count,
    color,
  }));
}

export async function writeSeriesFile(items: SeriesEntry[]): Promise<void> {
  const json = JSON.stringify(items, null, 2);
  await fs.writeFile(SERIES_FILE, `${json}\n`, "utf8");
}
