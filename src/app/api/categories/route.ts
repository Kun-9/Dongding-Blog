/**
 * Dev-only categories API. Reads/writes `src/lib/categories.json` so the
 * Settings page can persist category-tree edits from a local `npm run dev`
 * session. Production builds exclude API routes entirely; the runtime
 * devGuard is a safety net.
 */
import { NextResponse } from "next/server";
import { promises as fs } from "node:fs";
import path from "node:path";
import { z } from "zod";

const CATEGORIES_PATH = path.join(
  process.cwd(),
  "src",
  "lib",
  "categories.json",
);

const ID_RE = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;

const SubSchema = z.object({
  id: z.string().regex(ID_RE, "id는 영소문자/숫자/하이픈만 허용"),
  name: z.string().min(1),
});

const CategorySchema = z.object({
  id: z.string().regex(ID_RE, "id는 영소문자/숫자/하이픈만 허용"),
  name: z.string().min(1),
  desc: z.string(),
  subs: z.array(SubSchema).default([]),
});

const CategoriesSchema = z.array(CategorySchema);

function devGuard(): NextResponse | null {
  if (process.env.NODE_ENV !== "development") {
    return new NextResponse("Not Found", { status: 404 });
  }
  return null;
}

export async function GET() {
  const blocked = devGuard();
  if (blocked) return blocked;

  const raw = await fs.readFile(CATEGORIES_PATH, "utf8");
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

  const parsed = CategoriesSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const ids = new Set<string>();
  for (const c of parsed.data) {
    if (ids.has(c.id)) {
      return NextResponse.json(
        { error: `중복된 카테고리 id: ${c.id}` },
        { status: 400 },
      );
    }
    ids.add(c.id);
    const subIds = new Set<string>();
    for (const s of c.subs) {
      if (subIds.has(s.id)) {
        return NextResponse.json(
          { error: `중복된 서브 id: ${c.id}/${s.id}` },
          { status: 400 },
        );
      }
      subIds.add(s.id);
    }
  }

  const json = `${JSON.stringify(parsed.data, null, 2)}\n`;
  await fs.writeFile(CATEGORIES_PATH, json, "utf8");

  return NextResponse.json(parsed.data);
}
