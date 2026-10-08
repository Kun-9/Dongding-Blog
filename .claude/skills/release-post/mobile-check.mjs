#!/usr/bin/env node
/**
 * 게시 전 모바일 확인 — 초안을 운영 미리보기(/preview/<slug>)로 열어 390px 화면에서
 * 라이트·다크 두 번 끝까지 내려 본다. 장면은 박자마다 넘어가게 반 화면씩 내린다.
 *
 * 잡는 것: 문서 가로 넘침, 그림 판(figure·장면 무대) 밖으로 나간 요소,
 * 터미널 줄이 공백 없는 긴 토큰 중간에서 끊긴 곳.
 *
 *   node .claude/skills/release-post/mobile-check.mjs <slug> [--base https://blog.dongding.dev]
 *
 * 끝 코드: 0 문제 없음 · 1 문제 있음(목록 출력) · 3 브라우저나 로그인을 못 함(사람 몫으로 남긴다).
 * 로그인은 .env.local 의 STUDIO_EMAIL·STUDIO_PASSWORD 를 파일에서 읽어 쓰고 출력하지 않는다.
 */
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";

const args = process.argv.slice(2);
const bi = args.indexOf("--base");
const base = (bi >= 0 ? args[bi + 1] : "https://blog.dongding.dev").replace(/\/$/, "");
const slug = args.find((a, i) => !a.startsWith("--") && (bi < 0 || i !== bi + 1));
const selftest = args.includes("--selftest");
if (!slug && !selftest) {
  console.error("쓰는 법: node mobile-check.mjs <slug> [--base URL]");
  process.exit(2);
}

function give(msg) {
  console.log(JSON.stringify({ slug, ok: null, reason: msg }));
  process.exit(3);
}

// playwright 는 레포에 없다. 이 레포 → dev-browser 스킬 순으로 찾는다.
function loadPlaywright() {
  for (const dir of [process.cwd(), join(homedir(), ".claude/skills/dev-browser")]) {
    try {
      return createRequire(join(dir, "package.json"))("playwright");
    } catch {}
  }
  return null;
}

// 워크트리에서 돌려도 메인 체크아웃의 .env.local 을 찾게 위로 올라간다.
function readEnv() {
  for (let d = process.cwd(); ; d = dirname(d)) {
    const f = join(d, ".env.local");
    if (existsSync(f)) {
      return Object.fromEntries(
        readFileSync(f, "utf8")
          .split("\n")
          .filter((l) => /^[A-Z_]+=/.test(l))
          .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).trim()]),
      );
    }
    if (d === resolve(d, "..")) return {};
  }
}

const pw = loadPlaywright();
if (!pw) give("playwright 를 찾지 못했습니다");
const env = readEnv();
if (!selftest && (!env.STUDIO_EMAIL || !env.STUDIO_PASSWORD)) give(".env.local 에 STUDIO_EMAIL·STUDIO_PASSWORD 가 없습니다");

/** 브라우저 안에서 돈다. 지금 화면에서 보이는 문제를 글로 돌려준다. */
function scan() {
  const out = [];
  const vw = window.innerWidth;
  const sw = document.documentElement.scrollWidth;
  if (sw > vw + 1) out.push(`문서 가로 넘침: 폭 ${sw}px (화면 ${vw}px)`);
  const name = (el) =>
    `${el.tagName.toLowerCase()}${[...el.classList].slice(0, 2).map((c) => "." + c).join("")} "${(el.textContent ?? "").trim().slice(0, 30)}"`;
  const visible = (el) => el.checkVisibility?.({ opacityProperty: true, visibilityProperty: true }) ?? true;
  for (const box of document.querySelectorAll("article figure, .sc-in")) {
    const r = box.getBoundingClientRect();
    if (r.height === 0 || r.bottom < 0 || r.top > innerHeight) continue;
    for (const el of box.querySelectorAll("*")) {
      if (!visible(el)) continue;
      const e = el.getBoundingClientRect();
      if (e.width === 0 || e.height === 0) continue;
      // 가로로 스크롤되는 칸(코드 블록·표) 안은 넘쳐도 된다.
      if (el.closest("pre, table, [class*='overflow-x']") && el.closest("pre, table, [class*='overflow-x']") !== el) continue;
      if (e.left < r.left - 1 || e.right > r.right + 1) out.push(`그림 판 밖으로 나감: ${name(el)} (${Math.round(e.left)}~${Math.round(e.right)}, 판 ${Math.round(r.left)}~${Math.round(r.right)})`);
    }
  }
  for (const line of document.querySelectorAll(".fig-term-body div")) {
    if (line.querySelector("div") || !visible(line)) continue;
    const lh = parseFloat(getComputedStyle(line).lineHeight) || 20;
    const longest = Math.max(0, ...(line.textContent ?? "").split(/\s+/).map((w) => w.length));
    if (line.getBoundingClientRect().height > lh * 1.5 && longest > 24) out.push(`터미널 줄이 토큰 중간에서 끊김: "${(line.textContent ?? "").trim().slice(0, 40)}" (줄을 나누거나 JSON 은 들여쓰기로)`);
  }
  return out;
}

const browser = await pw.chromium.launch({ headless: true }).catch(() => null);
if (!browser) give("chromium 을 띄우지 못했습니다");

// --selftest: 문제를 일부러 심은 화면에서 셋 다 잡는지 본다.
if (selftest) {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.setContent(`<article><figure style="width:300px;margin:0">
    <div style="margin-left:-40px;width:120px;height:20px">밖으로 나간 상자</div>
    <div class="fig-term-body" style="width:200px;font:12px/20px monospace"><div>{"sub":"user-42","role":"admin","jti":"d7853a97"}</div></div>
  </figure><div style="width:600px;height:10px"></div></article>`);
  const got = await page.evaluate(scan);
  await browser.close();
  const want = ["문서 가로 넘침", "그림 판 밖으로 나감", "터미널 줄이 토큰 중간에서 끊김"];
  const miss = want.filter((w) => !got.some((g) => g.startsWith(w)));
  console.log(miss.length ? `selftest 실패: ${miss.join(", ")}` : "selftest ok");
  process.exit(miss.length ? 1 : 0);
}

const found = new Map();
let figures = 0;
try {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  await page.goto(`${base}/login/`);
  await page.fill('input[name="email"]', env.STUDIO_EMAIL);
  await page.fill('input[name="password"]', env.STUDIO_PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 20000 }).catch(() => give("로그인에 실패했습니다"));

  for (const theme of ["light", "dark"]) {
    const res = await page.goto(`${base}/preview/${slug}/`);
    // 로그인이 풀리면 로그인 화면으로 돌아가 그림이 0개인 채로 통과한다. 도착한 주소를 본다.
    if (!res || res.status() >= 400 || !new URL(page.url()).pathname.startsWith("/preview/")) give(`미리보기를 열지 못했습니다(${res?.status()} ${page.url()})`);
    figures = await page.locator("article figure").count();
    await page.evaluate((t) => {
      document.documentElement.dataset.theme = t;
      document.documentElement.style.scrollBehavior = "auto";
    }, theme);
    await page.waitForTimeout(800);
    // 반 화면씩 내려 장면을 한 박자씩 넘긴다. 바닥에 닿으면 멈춘다.
    for (let i = 0, last = -1; i < 400; i++) {
      for (const m of await page.evaluate(scan)) if (!found.has(m)) found.set(m, theme);
      const y = await page.evaluate(() => scrollY);
      if (y === last) break;
      last = y;
      await page.mouse.wheel(0, 422);
      await page.waitForTimeout(900);
    }
  }
} finally {
  await browser.close();
}

const problems = [...found].map(([m, theme]) => `[${theme}] ${m}`);
console.log(JSON.stringify({ slug, ok: problems.length === 0, figures, problems }, null, 2));
process.exit(problems.length ? 1 : 0);
