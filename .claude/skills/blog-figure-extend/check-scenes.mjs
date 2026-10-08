#!/usr/bin/env node
// 페이지의 그림을 브라우저로 잰다 — 미리보기든 운영 글이든.
//   node .claude/skills/blog-figure-extend/check-scenes.mjs <URL> [--out <스크린샷 폴더>]
//
// 기준은 JS 없이 서버가 그린 모습이다(= 모션의 끝 모습, 장면의 1단계).
//   화면 넷  — 데스크톱 다크·모바일 다크·데스크톱 라이트·모바일 움직임 줄이기에서
//     기준    같은 화면 크기로 JS 없이 떠서 적고, figure 장면이 1단계 화면만 보이는지
//     런타임  처음 열었을 때 화면 아래 그림 칸이 기준과 다르게(재생 대기로) 숨어 있는지
//     장면    박자마다 설명이 그 단계로 바뀌는지, 무대 판 높이가 단계마다 같은지
//     끝 모습 끝까지 내린 뒤 장면 밖 그림 칸이 모두 기준과 같은지(투명도·잘림·변형·막대 채움·글자)
//     공통    가로 넘침, 페이지 오류
// 키트 선택자를 따로 적지 않아서 새 키트·모션도 그대로 검사된다.
// 하나라도 어긋나면 실패(종료 코드 1). 스크린샷은 --out 에(기본 /tmp/figure-check).
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { launchChromium, loadPlaywright } from "./lib.mjs";

const url = process.argv[2];
if (!url) {
  console.error("사용법: check-scenes.mjs <URL> [--out <폴더>]");
  process.exit(2);
}
const out = process.argv.includes("--out") ? process.argv[process.argv.indexOf("--out") + 1] : "/tmp/figure-check";
mkdirSync(out, { recursive: true });

/** 장면 밖 그림마다 칸들의 겉모습. 브라우저 안에서 돈다. */
function snapshot() {
  const norm = (cs, el) => {
    const op = Math.round(Number(cs.opacity) * 100) / 100;
    const clip = /^inset\(\s*(0(px|%)?\s*)+\)$/.test(cs.clipPath) ? "none" : cs.clipPath;
    const tf = cs.transform === "matrix(1, 0, 0, 1, 0, 0)" ? "none" : cs.transform;
    const grow = cs.getPropertyValue("--fig-grow").trim() || "1";
    const text = el.childElementCount === 0 ? (el.textContent ?? "").trim() : "";
    return [op, clip, tf, grow, text].join(" ¦ ");
  };
  return [...document.querySelectorAll("figure")]
    .filter((f) => !f.closest(".sc"))
    .map((f) => ({
      cap: (f.querySelector("figcaption")?.textContent ?? "").slice(0, 24),
      cells: [...f.querySelectorAll("*")].map((el) => ({
        sig: el.closest("[data-loop]") ? "loop" : norm(getComputedStyle(el), el),
        below: el.getBoundingClientRect().top > innerHeight * 1.2,
        name: `${el.tagName.toLowerCase()}${el.classList.length ? "." + [...el.classList].slice(0, 2).join(".") : ""}`,
      })),
    }));
}

const pw = await loadPlaywright();
const browser = await launchChromium(pw);
const fails = [];

/**
 * JS 없이 같은 화면 크기로 뜬 기준. 반응형 CSS(좁으면 화살표 회전 등)가 화면마다 달라서
 * 화면마다 따로 뜬다. figure 장면이 1단계 화면만 보이는지도 여기서 본다.
 */
async function baseline(label, opts) {
  const ctx = await browser.newContext({ ...opts, javaScriptEnabled: false });
  const page = await ctx.newPage();
  await page.goto(url, { waitUntil: "load" });
  const snap = await page.evaluate(snapshot);
  const leaks = await page.evaluate(() =>
    [...document.querySelectorAll(".sc-html [data-step]")].filter((el) => !el.getAttribute("data-step").startsWith("1") && getComputedStyle(el).opacity !== "0").length,
  );
  if (leaks) fails.push(`${label} JS 없이 2단계 이후 화면 ${leaks}개가 보임`);
  console.log(`${label} JS 없음  장면 밖 그림 ${snap.length}개, 겹쳐 보이는 단계 화면 ${leaks}`);
  await ctx.close();
  return snap;
}

/** 지금 모습을 기준과 견준다. 구조가 다른 그림(받아 온 뒤 그리는 SVG 등)은 건너뛴다. */
function diff(base, now, pick) {
  const out = [];
  now.forEach((f, i) => {
    const b = base[i];
    if (!b || b.cells.length !== f.cells.length) return;
    f.cells.forEach((c, k) => {
      if (pick(b.cells[k]) && c.sig !== b.cells[k].sig) out.push(`${f.cap || `그림${i}`}: ${c.name} [${c.sig}] ≠ [${b.cells[k].sig}]`);
    });
  });
  return out;
}

const VIEWS = [
  ["desk", { viewport: { width: 1280, height: 860 }, colorScheme: "dark" }],
  ["mobile", { viewport: { width: 390, height: 844 }, colorScheme: "dark", isMobile: true, hasTouch: true }],
  ["light", { viewport: { width: 1280, height: 860 }, colorScheme: "light" }],
  ["reduced", { viewport: { width: 390, height: 844 }, colorScheme: "dark", isMobile: true, hasTouch: true, reducedMotion: "reduce" }],
];

for (const [label, opts] of VIEWS) {
  const base = await baseline(label, opts);
  const page = await browser.newPage(opts);
  const errs = [];
  page.on("pageerror", (e) => errs.push(e.message));
  await page.goto(url, { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);

  // 2) 런타임 — 화면 아래 칸은 재생을 기다리며 기준과 달라야 한다(움직임 줄이기면 그대로).
  const first = await page.evaluate(snapshot);
  const below = first.flatMap((f) => f.cells.filter((c) => c.below)).length;
  const waiting = diff(base, first, (c) => c.below).length;
  if (label !== "reduced" && below && !waiting) fails.push(`${label} 모션 런타임이 붙지 않았습니다(화면 아래 그림 칸 ${below}개가 처음부터 끝 모습)`);
  if (label === "reduced" && waiting) fails.push(`${label} 움직임 줄이기인데 화면 아래 칸 ${waiting}개가 숨어 있습니다`);
  console.log(`${label} 런타임  화면 아래 칸 ${below}개 중 재생 대기 ${waiting}${below ? "" : "(화면 아래 그림 없음 — 검사 생략)"}`);

  // 3) 장면
  const kinds = await page.evaluate(() =>
    [...document.querySelectorAll(".sc")].map((s) => (s.querySelector(".sc-html") ? "figure" : s.querySelector(".sc-spot") ? "spot" : s.querySelector(".sc-car") ? "timeline" : "bars")),
  );
  for (let i = 0; i < kinds.length; i++) {
    const n = await page.evaluate((i) => document.querySelectorAll(".sc")[i].querySelectorAll(".sc-note").length, i);
    const heights = new Set();
    const steps = [];
    for (let k = 0; k < n; k++) {
      await page.evaluate(([i, k]) => {
        const s = document.querySelectorAll(".sc")[i];
        scrollTo({ top: s.getBoundingClientRect().top + scrollY + k * s.querySelector(".sc-beat").offsetHeight, behavior: "instant" });
      }, [i, k]);
      await page.waitForTimeout(900);
      const r = await page.evaluate((i) => {
        const s = document.querySelectorAll(".sc")[i];
        return { note: [...s.querySelectorAll(".sc-note")].findIndex((x) => x.classList.contains("on")), h: s.querySelector(".sc-board").offsetHeight };
      }, i);
      heights.add(r.h);
      steps.push(r.note);
      if (r.note !== k) fails.push(`${label} 장면${i}(${kinds[i]}) ${k}단계에서 설명이 ${r.note}단계`);
      await page.screenshot({ path: join(out, `${label}-scene${i}-${kinds[i]}-${k}.png`) });
    }
    if (heights.size > 1) fails.push(`${label} 장면${i}(${kinds[i]}) 판 높이가 단계마다 다름: ${[...heights].join("/")}`);
    console.log(`${label} 장면${i} ${kinds[i]}  단계 ${steps.join(" ")}  판 ${[...heights].join("/")}`);
  }

  // 4) 끝 모습 — 끝까지 천천히 내려 모두 재생시킨 뒤 기준과 같아야 한다.
  const total = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y < total; y += 400) {
    await page.evaluate((y) => scrollTo({ top: y, behavior: "instant" }), y);
    await page.waitForTimeout(120);
  }
  await page.waitForTimeout(2500);
  const left = diff(base, await page.evaluate(snapshot), () => true);
  if (left.length) fails.push(`${label} 끝까지 내린 뒤에도 끝 모습이 아닌 칸 ${left.length}개:\n    ${left.slice(0, 5).join("\n    ")}`);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
  if (overflow) fails.push(`${label} 가로 넘침`);
  if (errs.length) fails.push(`${label} 페이지 오류: ${errs.slice(0, 2).join(" | ")}`);
  console.log(`${label} 끝 모습  어긋남 ${left.length}  넘침 ${overflow}  오류 ${errs.length}`);
  await page.close();
}
await browser.close();

if (fails.length) {
  console.error(`\n실패 ${fails.length}건\n${fails.map((f) => `- ${f}`).join("\n")}`);
  process.exit(1);
}
console.log(`\n통과. 스크린샷: ${out}`);
