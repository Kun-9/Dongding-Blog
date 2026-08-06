#!/usr/bin/env node
/**
 * 파일 콘텐츠 → Supabase 일회성 이관 (1단계).
 *
 *   node --env-file=.env.local scripts/migrate-to-supabase.mjs [--dry]
 *
 * categories.json / series.json / bookmarks.json / content/posts/*.md 를
 * 그대로 DB 로 옮긴다. upsert 라 몇 번을 돌려도 결과가 같다.
 * FK 위반이 될 category·series 참조는 삽입 전에 걸러 리포트하고 중단한다.
 */
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { createClient } from "@supabase/supabase-js";

const ROOT = process.cwd();
const DRY = process.argv.includes("--dry");

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY;
if (!url || !key) {
  console.error("NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SECRET_KEY 가 필요합니다.");
  process.exit(1);
}
const db = createClient(url, key, { auth: { persistSession: false } });

const readJSON = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, p), "utf8"));

// ── 변환 ────────────────────────────────────────────────────────────────
const catTree = readJSON("src/lib/categories.json");
const categories = catTree.flatMap((parent, i) => [
  { id: parent.id, name: parent.name, description: parent.desc ?? "", parent_id: null, sort: i },
  ...(parent.subs ?? []).map((sub, j) => ({
    id: sub.id,
    name: sub.name,
    description: "",
    parent_id: parent.id,
    sort: j,
  })),
]);

const series = readJSON("content/series.json").map((s, i) => ({
  id: s.id,
  title: s.title,
  description: s.desc ?? "",
  color: s.color ?? "#5a7480",
  // 발행 편수가 아니라 저자가 잡아 둔 계획 편수다.
  planned_count: s.count ?? 0,
  sort: i,
}));

const bookmarks = readJSON("content/bookmarks.json").map((b) => ({
  url: b.url,
  title: b.title,
  source: b.source ?? "",
  tag: b.tag ?? "",
  note: b.note ?? "",
  date: b.date,
}));

const POSTS_DIR = path.join(ROOT, "content", "posts");
const posts = fs
  .readdirSync(POSTS_DIR)
  .filter((f) => f.endsWith(".md"))
  .map((file) => {
    const { data: fm, content } = matter(
      fs.readFileSync(path.join(POSTS_DIR, file), "utf8"),
    );
    // loader 와 동일한 규칙: visibility 우선, 없으면 legacy draft, 둘 다 없으면 published
    const visibility = ["published", "private", "draft"].includes(fm.visibility)
      ? fm.visibility
      : fm.draft === true
        ? "draft"
        : "published";
    return {
      slug: file.replace(/\.md$/, ""),
      title: fm.title,
      summary: fm.summary ?? "",
      category_id: fm.category,
      tags: fm.tags ?? [],
      date: fm.date,
      // 파생 가능한 값이라, frontmatter 로 명시 오버라이드한 것만 보존한다.
      read_time: typeof fm.readTime === "number" ? fm.readTime : null,
      featured: fm.featured === true,
      visibility,
      series_id: fm.series ?? null,
      series_order: typeof fm.seriesOrder === "number" ? fm.seriesOrder : null,
      body: content.replace(/^\n+/, ""),
    };
  });

// ── 사전 검증 (FK 위반 방지) ────────────────────────────────────────────
const catIds = new Set(categories.map((c) => c.id));
const seriesIds = new Set(series.map((s) => s.id));
const problems = [
  ...posts.filter((p) => !catIds.has(p.category_id)).map((p) => `${p.slug}: 없는 category "${p.category_id}"`),
  ...posts.filter((p) => p.series_id && !seriesIds.has(p.series_id)).map((p) => `${p.slug}: 없는 series "${p.series_id}"`),
  ...posts.filter((p) => !/^\d{4}-\d{2}-\d{2}$/.test(String(p.date))).map((p) => `${p.slug}: 잘못된 date "${p.date}"`),
];
if (problems.length) {
  console.error("이관 중단 — 참조가 깨진 글이 있습니다:");
  for (const p of problems) console.error("  -", p);
  process.exit(1);
}

console.log(
  `대상: categories ${categories.length} / series ${series.length} / posts ${posts.length} / bookmarks ${bookmarks.length}`,
);
if (DRY) {
  const byVis = posts.reduce((a, p) => ({ ...a, [p.visibility]: (a[p.visibility] ?? 0) + 1 }), {});
  console.log("visibility 분포:", byVis);
  console.log("(--dry: 실제 삽입 없음)");
  process.exit(0);
}

// ── 적재 ────────────────────────────────────────────────────────────────
async function upsert(table, rows, onConflict) {
  const { error } = await db.from(table).upsert(rows, { onConflict });
  if (error) {
    console.error(`${table} 실패:`, error.message);
    process.exit(1);
  }
  console.log(`${table}: ${rows.length}건 적재`);
}

// 부모 → 자식 순서로 넣어야 self-reference FK 를 만족한다.
await upsert("categories", categories.filter((c) => !c.parent_id), "id");
await upsert("categories", categories.filter((c) => c.parent_id), "id");
await upsert("series", series, "id");
await upsert("posts", posts, "slug");

// bookmarks 는 id 가 identity 라 upsert 기준이 없다 — 비우고 다시 넣는다.
const { error: delErr } = await db.from("bookmarks").delete().gte("id", 0);
if (delErr) {
  console.error("bookmarks 비우기 실패:", delErr.message);
  process.exit(1);
}
await upsert("bookmarks", bookmarks);

console.log("이관 완료");
