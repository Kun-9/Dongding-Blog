/**
 * Dev-only settings API. Reads/writes `src/lib/site.json` so the Settings
 * page can persist site-wide config changes from a local `npm run dev`
 * session. Production builds (`BUILD_TARGET=static`) exclude API routes
 * entirely; this 404 guard is belt-and-suspenders for non-static dev runs.
 */
import { NextResponse } from "next/server";
import { promises as fs } from "node:fs";
import path from "node:path";
import { z } from "zod";

const SETTINGS_PATH = path.join(process.cwd(), "src", "lib", "site.json");

const SiteSchema = z.object({
  url: z.string().url(),
  title: z.string().min(1),
  shortTitle: z.string().min(1),
  description: z.string().min(1),
  lang: z.string().min(1),
  locale: z.string().min(1),
  copyright: z.string().min(1),
  author: z.string().min(1),
  handle: z.string().min(1),
  bio: z.string(),
  intro: z.string(),
  og: z.object({
    headline: z.array(z.string().min(1)).min(1).max(3),
    tagline: z.string(),
    label: z.string().min(1),
  }),
  social: z.object({
    github: z.string(),
    email: z.string(),
    rss: z.string(),
  }),
  publish: z.object({
    rssLimit: z.number().int().min(1).max(100),
  }),
});

function devGuard(): NextResponse | null {
  if (process.env.NODE_ENV !== "development") {
    return new NextResponse("Not Found", { status: 404 });
  }
  return null;
}

export async function GET() {
  const blocked = devGuard();
  if (blocked) return blocked;

  const raw = await fs.readFile(SETTINGS_PATH, "utf8");
  return new NextResponse(raw, {
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

export async function PUT(req: Request) {
  const blocked = devGuard();
  if (blocked) return blocked;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = SiteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const json = `${JSON.stringify(parsed.data, null, 2)}\n`;
  await fs.writeFile(SETTINGS_PATH, json, "utf8");

  return NextResponse.json(parsed.data);
}
