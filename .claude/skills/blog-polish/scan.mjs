/**
 * 정규식 하나를 모든 글 본문에 돌려 걸리는 줄을 보인다 — phrases.ts 에 패턴을 더하기 전 오탐 확인용.
 * 저장소 루트에서: node .claude/skills/blog-polish/scan.mjs '<정규식>'
 * .env.local 의 NEXT_PUBLIC_SUPABASE_URL·SUPABASE_SECRET_KEY 로 posts 를 읽는다(draft 포함).
 */
import fs from "node:fs";

const env = Object.fromEntries(
  fs.readFileSync(".env.local", "utf8").split("\n")
    .filter((l) => l.includes("=") && !l.startsWith("#"))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^"|"$/g, "")]; }),
);
const key = env.SUPABASE_SECRET_KEY;
const res = await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/posts?select=slug,body`, { headers: { apikey: key, Authorization: `Bearer ${key}` } });
if (!res.ok) throw new Error(`posts ${res.status}`);
const posts = await res.json();
const re = new RegExp(process.argv[2]);
let hits = 0;
for (const p of posts) for (const line of (p.body ?? "").split("\n")) {
  const m = line.match(re);
  if (m) { hits++; console.log(`${p.slug} | ${line.slice(Math.max(0, m.index - 30), m.index + 40)}`); }
}
console.log(`글 ${posts.length}편, ${hits}줄`);
