#!/usr/bin/env node
/**
 * public/posts 의 이미지를 Supabase Storage(post-images)로 올린다.
 *
 *   node --env-file=.env.local scripts/upload-images.mjs [--dry]
 *
 * 레포 안의 경로 구조({slug}/{file})를 그대로 유지하므로, 본문의
 * `/posts/{slug}/{file}` 경로는 next.config 의 fallback rewrite 가 여기로
 * 넘겨준다 — 글 본문은 한 글자도 고칠 필요가 없다.
 *
 * upsert 로 올리므로 여러 번 돌려도 결과가 같다.
 */
import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const ROOT = process.cwd();
const DIR = path.join(ROOT, "public", "posts");
const BUCKET = "post-images";
const DRY = process.argv.includes("--dry");

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY;
if (!url || !key) {
  console.error("NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SECRET_KEY 가 필요합니다.");
  process.exit(1);
}
const db = createClient(url, key, { auth: { persistSession: false } });

const MIME = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".avif": "image/avif",
};

/**
 * Storage 키에는 한글·공백을 쓸 수 없다. 그런 파일명은 안전하게 바꾸고,
 * 바뀐 것만 본문의 경로도 함께 고친다(아래 fixBodies).
 */
function safeKey(rel) {
  const [slug, ...rest] = rel.split("/");
  const name = rest.join("/");
  const ext = path.extname(name).toLowerCase();
  const base = name
    .slice(0, name.length - ext.length)
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return `${slug}/${base || "image"}${ext}`;
}

/** public/posts 아래 모든 이미지를 {slug}/{file} 상대경로로 모은다. */
function collect(dir, prefix = "") {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...collect(full, rel));
      continue;
    }
    const mime = MIME[path.extname(entry.name).toLowerCase()];
    if (mime) out.push({ rel, full, mime, bytes: fs.statSync(full).size });
  }
  return out;
}

if (!fs.existsSync(DIR)) {
  console.error(`${DIR} 가 없습니다.`);
  process.exit(1);
}

const files = collect(DIR);
const total = files.reduce((a, f) => a + f.bytes, 0);
console.log(`대상 ${files.length}개 / ${(total / 1024 / 1024).toFixed(1)}MB`);

if (DRY) {
  for (const f of files.slice(0, 5)) console.log(" ", f.rel);
  if (files.length > 5) console.log(`  … 외 ${files.length - 5}개`);
  console.log("(--dry: 실제 업로드 없음)");
  process.exit(0);
}

let done = 0;
let failed = 0;
/** 파일명이 바뀐 것 — 본문 경로도 따라 고쳐야 한다. */
const renamed = [];

for (const f of files) {
  const key = safeKey(f.rel);
  const { error } = await db.storage
    .from(BUCKET)
    .upload(key, fs.readFileSync(f.full), {
      contentType: f.mime,
      upsert: true,
    });
  if (error) {
    console.error(`실패 ${f.rel}: ${error.message}`);
    failed++;
    continue;
  }
  done++;
  if (key !== f.rel) renamed.push({ from: f.rel, to: key });
}
console.log(`업로드 ${done}개${failed ? ` / 실패 ${failed}개` : ""}`);

if (renamed.length > 0) {
  console.log(`\n파일명이 바뀐 ${renamed.length}개 — 본문 경로를 함께 고칩니다:`);
  for (const r of renamed) console.log(`  ${r.from}\n  → ${r.to}`);

  const { data: posts, error } = await db.from("posts").select("slug, body");
  if (error) {
    console.error("본문 조회 실패:", error.message);
    process.exit(1);
  }

  let patched = 0;
  for (const post of posts) {
    let body = post.body;
    for (const r of renamed) {
      const to = `/posts/${r.to}`;
      // macOS 파일명은 NFD(자모 분리), DB 본문은 보통 NFC 라 그대로는 안 맞는다.
      for (const form of ["NFC", "NFD"]) {
        body = body.split(`/posts/${r.from}`.normalize(form)).join(to);
      }
    }
    if (body === post.body) continue;
    const { error: upErr } = await db
      .from("posts")
      .update({ body })
      .eq("slug", post.slug);
    if (upErr) {
      console.error(`${post.slug} 갱신 실패:`, upErr.message);
      failed++;
    } else {
      patched++;
    }
  }
  console.log(`본문 ${patched}건 갱신`);
}

process.exit(failed === 0 ? 0 : 1);
