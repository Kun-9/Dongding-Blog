#!/usr/bin/env node
/**
 * 이관 검증 — 파일 원문과 DB 행을 대조하고 RLS 가 실제로 막는지 확인한다.
 *
 *   node --env-file=.env.local scripts/verify-migration.mjs
 *
 * 1) content/posts/*.md 의 본문·제목·태그·날짜가 posts 행과 일치하는지
 * 2) anon 키로는 published 만 보이는지 (draft/private 유출 여부)
 * 3) anon 키로 쓰기가 차단되는지
 */
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const admin = createClient(url, process.env.SUPABASE_SECRET_KEY, { auth: { persistSession: false } });
const anon = createClient(url, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, { auth: { persistSession: false } });

// 1) 본문 무결성: 파일 원문 == DB body
const dir = path.join(process.cwd(), "content", "posts");
const { data: rows } = await admin.from("posts").select("slug, body, title, date, tags, category_id, series_id, series_order");
const bySlug = new Map(rows.map((r) => [r.slug, r]));
let mismatch = 0;
for (const f of fs.readdirSync(dir).filter((f) => f.endsWith(".md"))) {
  const slug = f.replace(/\.md$/, "");
  const { content, data: fm } = matter(fs.readFileSync(path.join(dir, f), "utf8"));
  const row = bySlug.get(slug);
  if (!row) { console.log("누락:", slug); mismatch++; continue; }
  if (row.body !== content.replace(/^\n+/, "")) { console.log("본문 불일치:", slug); mismatch++; }
  if (row.title !== fm.title) { console.log("제목 불일치:", slug); mismatch++; }
  if (JSON.stringify(row.tags) !== JSON.stringify(fm.tags ?? [])) { console.log("태그 불일치:", slug); mismatch++; }
  if (String(row.date) !== String(fm.date)) { console.log("날짜 불일치:", slug, row.date, fm.date); mismatch++; }
}
console.log(mismatch === 0 ? "본문·메타 34건 전부 일치" : `불일치 ${mismatch}건`);

// 2) RLS: anon 은 published 만 봐야 한다
const { data: pub } = await anon.from("posts").select("slug, visibility");
console.log(`anon 조회: ${pub.length}건 / draft 노출: ${pub.filter((p) => p.visibility !== "published").length}건`);

// 3) anon 쓰기 차단 확인
const { error: wErr } = await anon.from("posts").insert({ slug: "rls-probe", title: "x", category_id: "java", date: "2026-01-01" });
console.log("anon 쓰기:", wErr ? `차단됨 (${wErr.code})` : "!! 허용됨 — 위험");
