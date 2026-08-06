/**
 * 카테고리 API — Supabase `categories` 를 읽고 쓴다.
 * - GET: 설정 화면이 편집하는 부모 → subs 트리.
 * - PUT: 트리 통째로 교체. 사라진 항목은 삭제하는데, 글이 물고 있으면
 *        FK 가 막으므로 409 로 되돌려 준다.
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { getCategories } from "@/lib/categories";
import { dbAdmin } from "@/lib/supabase";
import { SLUG_RE, requireApiUser, revalidateContent } from "@/lib/api-shared";

/** FK 위반 — 아직 이 카테고리를 쓰는 글이 있다. */
const FK_VIOLATION = "23503";

const SubSchema = z.object({
  id: z.string().regex(SLUG_RE, "id는 영소문자/숫자/하이픈만 허용"),
  name: z.string().min(1),
});

const CategorySchema = z.object({
  id: z.string().regex(SLUG_RE, "id는 영소문자/숫자/하이픈만 허용"),
  name: z.string().min(1),
  desc: z.string(),
  subs: z.array(SubSchema).default([]),
});

const CategoriesSchema = z.array(CategorySchema);

export async function GET() {
  const blocked = await requireApiUser();
  if (blocked) return blocked;
  return NextResponse.json(await getCategories());
}

export async function PUT(req: Request) {
  const blocked = await requireApiUser();
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

  const tree = parsed.data;

  // id 중복은 upsert 가 조용히 덮어써 버리므로 먼저 걸러 낸다.
  const seen = new Set<string>();
  for (const cat of tree) {
    if (seen.has(cat.id)) {
      return NextResponse.json(
        { error: `중복된 카테고리 id: ${cat.id}` },
        { status: 400 },
      );
    }
    seen.add(cat.id);
    for (const sub of cat.subs) {
      if (seen.has(sub.id)) {
        return NextResponse.json(
          { error: `중복된 서브 id: ${cat.id}/${sub.id}` },
          { status: 400 },
        );
      }
      seen.add(sub.id);
    }
  }

  interface CategoryRow {
    id: string;
    name: string;
    description: string;
    parent_id: string | null;
    sort: number;
  }

  const parents: CategoryRow[] = tree.map((c, i) => ({
    id: c.id,
    name: c.name,
    description: c.desc,
    parent_id: null,
    sort: i,
  }));
  const subs: CategoryRow[] = tree.flatMap((c) =>
    c.subs.map((s, j) => ({
      id: s.id,
      name: s.name,
      description: "",
      parent_id: c.id,
      sort: j,
    })),
  );

  const db = dbAdmin();
  // 부모를 먼저 넣어야 서브의 parent_id FK 가 성립한다.
  for (const rows of [parents, subs]) {
    if (rows.length === 0) continue;
    const { error } = await db.from("categories").upsert(rows, {
      onConflict: "id",
    });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  const { data: existing, error: readErr } = await db
    .from("categories")
    .select("id");
  if (readErr) {
    return NextResponse.json({ error: readErr.message }, { status: 500 });
  }

  const removed = (existing ?? [])
    .map((r) => r.id)
    .filter((id) => !seen.has(id));
  if (removed.length > 0) {
    const { error } = await db.from("categories").delete().in("id", removed);
    if (error) {
      if (error.code === FK_VIOLATION) {
        return NextResponse.json(
          {
            error: "글이 남아 있는 카테고리는 지울 수 없습니다",
            ids: removed,
          },
          { status: 409 },
        );
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  revalidateContent();
  return NextResponse.json(tree);
}
