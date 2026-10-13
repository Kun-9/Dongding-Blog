#!/usr/bin/env node
/**
 * 데스크톱 훑어보기 — 글을 운영 미리보기(/preview/<slug>)로 열어 1280×900 라이트 화면을
 * 800px 씩 내리며 <폴더>/NN.png 로 남긴다. 독자가 처음 보고 훑는 화면이다.
 * 00.png 에서 제목·요약 박스·첫 문단으로 결론과 할 일이 읽히는지, 소제목만 훑어도 답이 이어지는지 사진으로 본다.
 * draft 도 된다(2026-10-13 포맷 다시 쓰기에서 draft 글은 첫 화면을 볼 길이 없었다).
 *
 *   node .claude/skills/release-post/skim-check.mjs <slug> <폴더> [--base https://blog.dongding.dev]
 *
 * 끝 코드: 0 찍음 · 3 브라우저나 로그인을 못 함. 로그인은 .env.local 의 STUDIO_EMAIL·STUDIO_PASSWORD 를 쓰고 출력하지 않는다.
 */
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";

const args = process.argv.slice(2);
const base = (args.includes("--base") ? args[args.indexOf("--base") + 1] : "https://blog.dongding.dev").replace(/\/$/, "");
const [slug, out] = args.filter((a, i) => !a.startsWith("--") && args[i - 1] !== "--base");
if (!slug || !out) {
  console.error("쓰는 법: node skim-check.mjs <slug> <폴더> [--base URL]");
  process.exit(2);
}
const give = (msg) => {
  console.log(JSON.stringify({ slug, ok: null, reason: msg }));
  process.exit(3);
};

// mobile-check.mjs 와 같은 순서로 찾는다.
let pw = null;
for (const dir of [process.cwd(), join(homedir(), ".claude/skills/dev-browser")]) {
  try {
    pw = createRequire(join(dir, "package.json"))("playwright");
    break;
  } catch {}
}
if (!pw) give("playwright 를 찾지 못했습니다");
let env = {};
for (let d = process.cwd(); ; d = dirname(d)) {
  const f = join(d, ".env.local");
  if (existsSync(f)) {
    env = Object.fromEntries(
      readFileSync(f, "utf8").split("\n").filter((l) => /^[A-Z_]+=/.test(l))
        .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).trim()]),
    );
    break;
  }
  if (d === resolve(d, "..")) break;
}
if (!env.STUDIO_EMAIL || !env.STUDIO_PASSWORD) give(".env.local 에 STUDIO_EMAIL·STUDIO_PASSWORD 가 없습니다");

mkdirSync(out, { recursive: true });
const browser = await pw.chromium.launch().catch(() => give("브라우저를 띄우지 못했습니다"));
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, colorScheme: "light" });
  await page.goto(`${base}/login/`).catch(() => give(`${base} 에 닿지 못했습니다`));
  await page.fill('input[name="email"]', env.STUDIO_EMAIL);
  await page.fill('input[name="password"]', env.STUDIO_PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 20000 }).catch(() => give("로그인에 실패했습니다"));
  const res = await page.goto(`${base}/preview/${slug}/`, { waitUntil: "networkidle" }).catch(() => null);
  if (!res || res.status() >= 400) give(`미리보기를 열지 못했습니다(${res?.status()})`);
  const total = await page.evaluate(() => document.documentElement.scrollHeight);
  let i = 0;
  for (let y = 0; y < total && i < 30; y += 800, i++) {
    await page.evaluate((yy) => window.scrollTo(0, yy), y);
    await page.waitForTimeout(900); // 화면에 들어온 그림의 등장 모션이 끝날 때까지
    await page.screenshot({ path: join(out, `${String(i).padStart(2, "0")}.png`) });
  }
  const headings = await page.$$eval("article h2", (hs) => hs.map((h) => h.textContent.trim()));
  console.log(JSON.stringify({ slug, ok: true, shots: i, headings }, null, 2));
} finally {
  await browser.close();
}
