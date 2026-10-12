#!/usr/bin/env node
/**
 * 시리즈의 계획 편수(planned_count)를 바꾼다. MCP 도구가 없어 어드민과 같은 편집 API 를 부른다.
 *
 *   node .claude/skills/release-post/series-count.mjs <seriesId> <count> [--base URL]
 *
 * 계획 편수보다 뒤 회차(seriesOrder)인 글은 시리즈 페이지에서 "순서 미지정"으로 따로 보인다.
 * 로그인은 .env.local 의 STUDIO_EMAIL·STUDIO_PASSWORD 를 파일에서 읽어 쓰고 출력하지 않는다.
 */
import { createRequire } from "node:module";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { homedir } from "node:os";

const args = process.argv.slice(2);
const at = args.indexOf("--base");
const base = (at >= 0 ? args.splice(at, 2)[1] : "https://blog.dongding.dev").replace(/\/$/, "");
const [id, n] = args;
const count = Number(n);
if (!id || !Number.isInteger(count) || count < 1) {
  console.error("쓰는 법: series-count.mjs <seriesId> <count>");
  process.exit(2);
}

let pw = null;
for (const dir of [process.cwd(), join(homedir(), ".claude/skills/dev-browser")]) {
  try {
    pw = createRequire(join(dir, "package.json"))("playwright");
    break;
  } catch {}
}
if (!pw) throw new Error("playwright 를 찾지 못했습니다");

// 워크트리에서 돌려도 메인 체크아웃의 .env.local 을 찾게 위로 올라간다.
let env = {};
for (let d = process.cwd(); d !== resolve(d, ".."); d = dirname(d)) {
  const f = join(d, ".env.local");
  if (!existsSync(f)) continue;
  env = Object.fromEntries(
    readFileSync(f, "utf8")
      .split("\n")
      .filter((l) => /^[A-Z_]+=/.test(l))
      .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).trim()]),
  );
  break;
}
if (!env.STUDIO_EMAIL || !env.STUDIO_PASSWORD) throw new Error(".env.local 에 STUDIO_EMAIL·STUDIO_PASSWORD 가 없습니다");

const browser = await pw.chromium.launch();
try {
  const page = await browser.newPage();
  await page.goto(`${base}/login/`);
  await page.fill('input[name="email"]', env.STUDIO_EMAIL);
  await page.fill('input[name="password"]', env.STUDIO_PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 20000 });
  const r = await page.evaluate(
    async ([id, count]) => {
      const res = await fetch(`/api/series/${id}/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ count }),
      });
      return { status: res.status, body: await res.text() };
    },
    [id, count],
  );
  console.log(r.status, r.body);
  process.exitCode = r.status === 200 ? 0 : 1;
} finally {
  await browser.close();
}
