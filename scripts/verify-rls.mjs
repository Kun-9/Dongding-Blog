#!/usr/bin/env node
/**
 * RLS 검증 — publishable 키로 볼 수 있는 것과 할 수 있는 것을 확인한다.
 *
 *   node --env-file=.env.local scripts/verify-rls.mjs
 *
 * 이 키는 브라우저까지 나가므로, draft/private 이 새지 않고 쓰기가 막히는지가
 * 곧 공개 경계다. 정책을 손댈 때마다 돌려 볼 것.
 */
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const secret = process.env.SUPABASE_SECRET_KEY;
if (!url || !anonKey || !secret) {
  console.error("NEXT_PUBLIC_SUPABASE_URL / *_PUBLISHABLE_KEY / SUPABASE_SECRET_KEY 가 필요합니다.");
  process.exit(1);
}

const opts = { auth: { persistSession: false } };
const anon = createClient(url, anonKey, opts);
const admin = createClient(url, secret, opts);

let failed = 0;
function check(label, ok, detail = "") {
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failed++;
}

const { data: all } = await admin.from("posts").select("slug, visibility");
const hidden = all.filter((p) => p.visibility !== "published");
const { data: visible } = await anon.from("posts").select("slug, visibility");

check(
  "anon 은 published 만 본다",
  visible.every((p) => p.visibility === "published"),
  `${visible.length}/${all.length}건 노출`,
);
check(
  "draft/private 은 한 건도 안 샌다",
  !visible.some((p) => hidden.some((h) => h.slug === p.slug)),
  `숨김 대상 ${hidden.length}건`,
);

const { error: insErr } = await anon
  .from("posts")
  .insert({ slug: "rls-probe", title: "x", category_id: "java", date: "2026-01-01" });
check("anon 쓰기는 막힌다", Boolean(insErr), insErr?.code ?? "삽입이 통과함");

// RLS 로 걸러져 0행이 지워지면 에러가 아니라 "성공"으로 돌아온다.
// 따라서 에러 유무가 아니라 실제로 지워진 행 수로 판정해야 한다.
const { data: deleted, error: delErr } = await anon
  .from("posts")
  .delete()
  .eq("slug", all[0]?.slug ?? "")
  .select("slug");
check(
  "anon 삭제는 아무것도 지우지 못한다",
  Boolean(delErr) || (deleted ?? []).length === 0,
  delErr?.code ?? `${(deleted ?? []).length}건 삭제됨`,
);

process.exit(failed === 0 ? 0 : 1);
