#!/usr/bin/env node
/**
 * 게시 전 모바일 확인 — 초안을 운영 미리보기(/preview/<slug>)로 열어 390px 화면에서
 * 라이트·다크 두 번 끝까지 내려 본다. 장면은 박자마다 넘어가게 반 화면씩 내린다.
 *
 * 잡는 것: 문서 가로 넘침, 그림 판(figure·장면 무대) 밖으로 나간 요소,
 * 터미널 줄이 공백 없는 긴 토큰 중간에서 끊긴 곳, 한 칸에 겹쳐 둔 단계 화면(fig-layer)이 둘 이상 보이는 곳.
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
      // 그림 안 세로 스크롤 — 휠이 페이지 대신 판 안쪽을 내려 머리줄이 잘린다(2026-10-08 matrix).
      const oy = getComputedStyle(el).overflowY;
      if ((oy === "auto" || oy === "scroll") && el.tagName !== "PRE" && (el.scrollTop > 0 || el.scrollHeight > el.clientHeight + 1))
        out.push(`그림 안에 세로 스크롤: ${name(el)} (내용 ${el.scrollHeight}px, 판 ${el.clientHeight}px)`);
      const e = el.getBoundingClientRect();
      if (e.width === 0 || e.height === 0) continue;
      // 판 안의 조상이 가로를 자르면(가로 스크롤 칸, timeline 슬라이드 띠 .sc-car) 잘린 뒤 보이는 범위로 본다.
      let left = e.left;
      let right = e.right;
      for (let a = el.parentElement; a && a !== box; a = a.parentElement) {
        if (getComputedStyle(a).overflowX === "visible") continue;
        const c = a.getBoundingClientRect();
        left = Math.max(left, c.left);
        right = Math.min(right, c.right);
      }
      if (right <= left) continue;
      if (left < r.left - 1 || right > r.right + 1) out.push(`그림 판 밖으로 나감: ${name(el)} (${Math.round(left)}~${Math.round(right)}, 판 ${Math.round(r.left)}~${Math.round(r.right)})`);
    }
  }
  // 한 칸에 겹쳐 둔 단계 화면(fig-layer)은 한 번에 하나만 보여야 한다. 둘 이상 보이면 글자가 포개진다
  // (2026-10-09 FigureScene 이 다시 그려지며 단계 상태가 지워졌을 때). 그 상태는 판이 화면에 막 들어오는
  // 짧은 구간에서만 눈에 띄어 반 화면 걸음이 건너뛰므로, 화면 밖의 판도 본다.
  for (const layer of document.querySelectorAll(".fig-layer")) {
    if (layer.getBoundingClientRect().height === 0) continue;
    const shown = [...layer.children].filter(visible);
    if (shown.length > 1) out.push(`겹친 단계 화면이 함께 보임: ${name(layer)} (${shown.length}개)`);
  }
  // 공백에서 접힌 줄은 괜찮다. 공백 없는 낱말 하나가 두 줄에 걸쳤을 때만 잡는다.
  for (const line of document.querySelectorAll(".fig-term-body div")) {
    if (line.querySelector("div") || !visible(line)) continue;
    const walker = document.createTreeWalker(line, NodeFilter.SHOW_TEXT);
    let broken = null;
    for (let n = walker.nextNode(); n && !broken; n = walker.nextNode()) {
      for (const m of n.data.matchAll(/\S{6,}/g)) {
        const r = document.createRange();
        r.setStart(n, m.index);
        r.setEnd(n, m.index + m[0].length);
        if (new Set([...r.getClientRects()].map((x) => Math.round(x.top))).size > 1) {
          broken = m[0];
          break;
        }
      }
    }
    if (broken) out.push(`터미널 줄이 토큰 중간에서 끊김: "${broken.slice(0, 40)}" (줄을 나누거나 이름을 줄이고, JSON 은 들여쓰기로)`);
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
    <div style="overflow:hidden;width:100px"><div style="margin-left:-60px;width:300px">가려진 슬라이드</div></div>
    <div style="overflow-x:auto;height:30px"><div style="height:46px">세로로 넘치는 판</div></div>
    <div class="fig-term-body" style="width:200px;font:12px/20px monospace"><div>{"sub":"user-42","role":"admin","jti":"d7853a97"}</div><div>Exception: error creating bean with name main</div></div>
    <div class="fig-layer"><div>화면 하나</div><div>화면 둘</div></div>
    <div class="fig-layer"><div>보이는 화면</div><div style="opacity:0">숨은 화면</div></div>
  </figure><div style="width:600px;height:10px"></div></article>`);
  const got = await page.evaluate(scan);
  await browser.close();
  const want = ["문서 가로 넘침", "그림 판 밖으로 나감", "터미널 줄이 토큰 중간에서 끊김", "그림 안에 세로 스크롤", "겹친 단계 화면이 함께 보임"];
  const miss = want.filter((w) => !got.some((g) => g.startsWith(w)));
  // 공백에서 접힌 줄은 잡지 않아야 한다.
  if (got.some((g) => g.includes("Exception"))) miss.push("공백에서 접힌 줄을 잘못 잡음");
  // 판 안에서 일부러 가린 요소(timeline 슬라이드)는 잡지 않아야 한다.
  if (got.some((g) => g.includes("가려진"))) miss.push("판 안에서 가린 요소를 잘못 잡음");
  // 하나만 보이는 겹친 칸은 잡지 않아야 한다.
  if (got.some((g) => g.startsWith("겹친") && g.includes("보이는"))) miss.push("하나만 보이는 겹친 칸을 잘못 잡음");
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
