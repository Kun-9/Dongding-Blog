#!/usr/bin/env node
/**
 * 게시 전 모바일 확인 — 초안을 운영 미리보기(/preview/<slug>)로 열어 390px 화면에서
 * 라이트·다크 두 번 끝까지 내려 본다. 장면은 박자마다 넘어가게 반 화면씩 내린다.
 *
 * 잡는 것: 문서 가로 넘침, 그림 판(figure·장면 무대) 밖으로 나간 요소,
 * 터미널 줄이 공백 없는 긴 토큰 중간에서 끊긴 곳, 한 칸에 겹쳐 둔 단계 화면(fig-layer)이 둘 이상 보이는 곳,
 * 화면보다 커서 단계 설명을 화면 밖으로 밀어내는 장면 무대, 제 칸이 말줄임·line-clamp·overflow 로 자른 글자
 * (터미널 머리줄 칩, sequence 라벨 등. 장면은 박자마다 그림 순서·박자·글자 앞부분을 적는다), 칸 테두리 밖으로 삐져나온 글자.
 *
 *   node .claude/skills/release-post/mobile-check.mjs <slug> [--base https://blog.dongding.dev] [--shots <폴더>]
 *
 * --shots 를 주면 장면 설명이 바뀔 때마다(박자마다) 화면을 <폴더>/<테마>-NN.png 로 남긴다. 장면은 이 사진으로 눈으로 본다.
 * 장면이 아닌 그림은 끝까지 내린 뒤 그림마다 <폴더>/<테마>-fig-NN.png 로 한 장씩 남긴다.
 * 끝 코드: 0 문제 없음 · 1 문제 있음(목록 출력) · 3 브라우저나 로그인을 못 함(사람 몫으로 남긴다).
 * 로그인은 .env.local 의 STUDIO_EMAIL·STUDIO_PASSWORD 를 파일에서 읽어 쓰고 출력하지 않는다.
 */
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";

const args = process.argv.slice(2);
const opt = (name) => (args.includes(name) ? args[args.indexOf(name) + 1] : undefined);
const base = (opt("--base") ?? "https://blog.dongding.dev").replace(/\/$/, "");
const shots = opt("--shots");
const slug = args.find((a, i) => !a.startsWith("--") && !args[i - 1]?.startsWith("--"));
const selftest = args.includes("--selftest");
if (!slug && !selftest) {
  console.error("쓰는 법: node mobile-check.mjs <slug> [--base URL] [--shots 폴더]");
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
  // 어느 그림(article figure 순서)의 몇 번째 박자인지. 장면 설명(.sc-notes)은 판 figure 밖에 있어 무대에서 판을 찾는다.
  const figs = [...document.querySelectorAll("article figure")];
  const where = (el) => {
    const st = el.closest(".sc-in");
    const on = st?.querySelector(".sc-note.on");
    const beat = !st ? "" : on ? ` 박자 ${[...on.parentElement.children].indexOf(on) + 1}(${on.querySelector(".sc-k")?.textContent ?? ""})` : " 박자 0";
    return `그림 ${figs.indexOf(el.closest("figure") ?? st?.querySelector("figure")) + 1}${beat}`;
  };
  const clipped = (o) => o === "hidden" || o === "clip";
  // 테두리 안쪽(padding box).
  const pad = (a, cs) => {
    const q = a.getBoundingClientRect();
    return { left: q.left + parseFloat(cs.borderLeftWidth), right: q.right - parseFloat(cs.borderRightWidth), top: q.top + parseFloat(cs.borderTopWidth), bottom: q.bottom - parseFloat(cs.borderBottomWidth) };
  };
  // 칸 — 좌우에 테두리를 그린 상자(키트 fig-box·fig-t-box·fig-chip, 그림 블록의 rounded-xl border 칸, 격자 dg-gc).
  // 판(.dg-panel)은 칸이 아니다. 판 경계는 판 밖 검사가 본다.
  const isCell = (a, cs) =>
    !a.matches(".dg-panel, figure") &&
    ["Left", "Right"].every((s) => cs[`border${s}Style`] !== "none" && parseFloat(cs[`border${s}Width`]) > 0 && cs[`border${s}Color`] !== "rgba(0, 0, 0, 0)");
  // 요소 바로 아래 글자 노드들의 실제 글자 상자(앞뒤 공백 뺌)를 합친다.
  const textBox = (el) => {
    let b = null;
    for (const n of el.childNodes) {
      const m = n.nodeType === 3 && /\S(?:[\s\S]*\S)?/.exec(n.data);
      if (!m) continue;
      const rg = document.createRange();
      rg.setStart(n, m.index);
      rg.setEnd(n, m.index + m[0].length);
      for (const q of rg.getClientRects()) {
        if (!q.width || !q.height) continue;
        b = b
          ? { left: Math.min(b.left, q.left), right: Math.max(b.right, q.right), top: Math.min(b.top, q.top), bottom: Math.max(b.bottom, q.bottom) }
          : { left: q.left, right: q.right, top: q.top, bottom: q.bottom };
      }
    }
    return b;
  };
  // 글자가 가장 가까운 칸의 테두리 밖으로 나간 방향과 거리. 칸까지 가는 길에 글자를 자르는 조상이 있으면 잘린 뒤 보이는
  // 범위로 보고, 떠 있는 요소(data-at 칩, absolute 배지·말풍선)를 지나면 일부러 칸 밖에 둔 것이라 뺀다.
  const spillOf = (el, box) => {
    const t = textBox(el);
    for (let a = el; t && a && a !== box; a = a.parentElement) {
      const cs = getComputedStyle(a);
      const p = pad(a, cs);
      if (clipped(cs.overflowX)) [t.left, t.right] = [Math.max(t.left, p.left), Math.min(t.right, p.right)];
      if (clipped(cs.overflowY)) [t.top, t.bottom] = [Math.max(t.top, p.top), Math.min(t.bottom, p.bottom)];
      if (t.right - t.left < 1 || t.bottom - t.top < 1) return null;
      if (isCell(a, cs)) {
        const d = [["오른쪽으로", t.right - p.right], ["왼쪽으로", p.left - t.left], ["아래로", t.bottom - p.bottom], ["위로", p.top - t.top]].sort((x, y) => y[1] - x[1])[0];
        return d[1] > 2 ? d : null;
      }
      if (a.hasAttribute("data-at") || cs.position === "absolute" || cs.position === "fixed") return null;
    }
    return null;
  };
  for (const box of document.querySelectorAll("article figure, .sc-in")) {
    const r = box.getBoundingClientRect();
    if (r.height === 0 || r.bottom < 0 || r.top > innerHeight) continue;
    for (const el of box.querySelectorAll("*")) {
      if (!visible(el)) continue;
      // 제 칸이 글자를 자른다 — 말줄임 칩(.fig-term-tag), line-clamp 인 sequence 라벨, 격자 칸(2026-10-12 머리줄 칩이
      // "refresh(rt, no…" 로, sequence 라벨 "websearch(query," 가 세로선에 잘렸는데 끝 코드 0 이었다). 장면은 data-text 로
      // 글자가 바뀌니 박자마다 본다. 크롬은 넘친 글자 뒤에 끝 여백을 더해 재므로 여백 안까지는 잘림이 아니다.
      // 빼는 것: 흐린 단계(.is-dim), 이미지 묶음 설명(figcaption, 일부러 두 줄로 줄이고 확대 화면에서 다 보인다), 1px 낭독기 글자.
      if (el.tagName !== "FIGCAPTION" && !el.closest(".is-dim") && el.clientWidth > 2 && el.clientHeight > 2 && [...el.childNodes].some((n) => n.nodeType === 3 && n.data.trim())) {
        const cs = getComputedStyle(el);
        const dx = clipped(cs.overflowX) ? Math.round(el.scrollWidth - parseFloat(cs.paddingRight) - el.clientWidth) : 0;
        const dy = clipped(cs.overflowY) ? Math.round(el.scrollHeight - parseFloat(cs.paddingBottom) - el.clientHeight) : 0;
        // 같은 요소의 같은 글자는 처음 잘린 박자에서 한 번만 적는다(박자마다 같은 줄이 쌓이지 않게).
        const said = (window.__clipSaid ??= new WeakMap());
        if ((dx > 1 || dy > 1) && said.get(el) !== el.textContent && said.set(el, el.textContent))
          out.push(`글자 잘림: ${where(el)} ${name(el)} (${dx > 1 ? `가로 ${dx}px` : `세로 ${dy}px`} 넘쳐 잘림. 글자를 줄인다)`);
      }
      // 글자가 제 칸 테두리 밖으로 삐져나온다(overflow visible). 잘림 검사는 자르는 칸만, 판 밖 검사는 판 경계만 봐서
      // 놓쳤다(2026-10-12 diagram-design 글: 390px 에 세 칸을 그대로 둔 fig-grid-3 의 셋째 칸 제목이 칸 밖으로 나왔는데 끝 코드 0).
      // 빼는 것은 잘림 검사와 같다(흐린 단계, 아직 안 온·숨긴 단계는 visible 이 거른다, 1px 낭독기 글자는 자르는 조상이 거른다).
      if (!el.closest(".is-dim")) {
        const d = spillOf(el, box);
        const said = (window.__spillSaid ??= new WeakMap());
        if (d && said.get(el) !== el.textContent && said.set(el, el.textContent))
          out.push(`칸 넘침: ${where(el)} ${name(el)} (칸 ${d[0]} ${Math.round(d[1])}px 넘침)`);
      }
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
  // 화면에 붙은 장면 무대(.sc-stage)의 내용(.sc-in)이 화면보다 크면 단계 설명이 화면 아래로 밀려 안 읽힌다
  // (2026-10-12 Supabase 1편: 자리 넷을 fig-grid-4 로 두자 420px 아래에서 한 열로 쌓였다).
  for (const st of document.querySelectorAll(".sc-stage")) {
    if (Math.abs(st.getBoundingClientRect().top) > 2) continue;
    const inner = st.querySelector(".sc-in")?.getBoundingClientRect();
    if (inner && inner.bottom > innerHeight + 1)
      out.push(`장면 무대가 화면보다 큼: ${name(st)} (무대 끝 ${Math.round(inner.bottom)}px, 화면 ${innerHeight}px). 단계 설명이 화면 밖으로 밀린다. 칸을 줄이거나 격자를 auto-fit 으로`);
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

// --selftest: 문제를 일부러 심은 화면에서 다 잡는지, 일부러 둔 것은 안 잡는지 본다.
if (selftest) {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.setContent(`<article><figure style="width:300px;margin:0">
    <div style="margin-left:-40px;width:120px;height:20px">밖으로 나간 상자</div>
    <div style="overflow:hidden;width:100px"><div style="margin-left:-60px;width:300px">가려진 슬라이드</div></div>
    <div style="overflow-x:auto;height:30px"><div style="height:46px">세로로 넘치는 판</div></div>
    <div class="fig-term-body" style="width:200px;font:12px/20px monospace"><div>{"sub":"user-42","role":"admin","jti":"d7853a97"}</div><div>Exception: error creating bean with name main</div></div>
    <div class="fig-layer"><div>화면 하나</div><div>화면 둘</div></div>
    <div class="fig-layer"><div>보이는 화면</div><div style="opacity:0">숨은 화면</div></div>
    <div style="position:relative;height:60px"><span style="position:absolute;bottom:20px;left:10%;width:30%;box-sizing:border-box;padding:0 8px;display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;overflow:hidden;text-align:center;word-break:keep-all;font:12.5px/1.35 sans-serif"><span>2</span>websearch(query, 결과)</span></div>
    <div style="width:100px;box-sizing:border-box;padding:0 8px;overflow:hidden;white-space:nowrap;font:12px monospace">padonlyfits</div>
    <div style="position:absolute;width:1px;height:1px;overflow:hidden;white-space:nowrap">화면 낭독기만 읽는 긴 글자</div>
    <figcaption style="width:80px;display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;overflow:hidden">이미지 묶음 설명은 두 줄로 줄이고 확대 화면에서 다 보인다</figcaption>
    <div class="is-dim"><span style="display:block;width:60px;overflow:hidden;white-space:nowrap">흐린단계의긴칩글자흐린단계</span></div>
    <div class="fig-box" style="width:80px;border:1px solid;font:12px monospace"><span class="fig-title" style="display:block;white-space:nowrap">overflowingtitle</span></div>
    <div style="width:80px;box-sizing:border-box;padding:0 10px;border:1px solid;font:12px monospace;white-space:nowrap">padinside</div>
    <div style="position:relative;width:100px;height:40px;border:1px solid"><span style="position:absolute;top:-8px;right:-30px;white-space:nowrap">모서리배지</span><span data-at="1:b" style="display:inline-block;translate:120px 0;white-space:nowrap">떠다니는칩</span></div>
    <div class="is-dim"><div style="width:40px;border:1px solid;white-space:nowrap">흐린칸넘침글자</div></div>
    <div style="width:60px;border:1px solid;overflow:hidden;white-space:nowrap">자르는칸은잘림검사몫</div>
  </figure>
  <div class="sc-in"><figure style="margin:0;width:300px"><div style="display:flex;white-space:nowrap;font:11.5px monospace"><span class="fig-term-tag" style="min-width:0;max-width:62%;margin-left:auto;overflow:hidden;text-overflow:ellipsis;padding:2px 9px">refresh(rt, now) 새 access 발급</span></div>
    <div style="width:60px;height:20px;border:1px solid;font:12px/20px sans-serif">장면 칸 아래로 넘친 글자</div></figure>
    <div class="sc-notes"><div class="sc-note"><span class="sc-k">발급</span></div><div class="sc-note on"><span class="sc-k">갱신</span></div></div></div>
  <div style="width:600px;height:10px"></div></article>
  <div class="sc-stage" style="position:fixed;top:0;height:844px;overflow:visible"><div class="sc-in" style="height:900px"></div></div>`);
  const got = await page.evaluate(scan);
  await browser.close();
  const want = ["문서 가로 넘침", "그림 판 밖으로 나감", "터미널 줄이 토큰 중간에서 끊김", "그림 안에 세로 스크롤", "겹친 단계 화면이 함께 보임", "장면 무대가 화면보다 큼", "글자 잘림: 그림 1 span", "글자 잘림: 그림 2 박자 2(갱신) span.fig-term-tag", "칸 넘침: 그림 1 span.fig-title \"overflowingtitle\" (칸 오른쪽으로", "칸 넘침: 그림 2 박자 2(갱신) div \"장면 칸 아래로"];
  const miss = want.filter((w) => !got.some((g) => g.startsWith(w)));
  // 끝 여백 안까지만 들어간 글자, 낭독기 글자, 이미지 묶음 설명, 흐린 단계는 잘림으로 잡지 않아야 한다.
  for (const w of ["padonlyfits", "낭독기", "이미지 묶음", "흐린단계"]) if (got.some((g) => g.startsWith("글자 잘림") && g.includes(w))) miss.push(`${w} 를 잘림으로 잘못 잡음`);
  // 칸 안쪽 여백까지만 들어간 글자, 떠 있는 배지·data-at 칩, 흐린 단계, 자르는 칸(잘림 검사 몫)은 칸 넘침으로 잡지 않아야 한다.
  for (const w of ["padinside", "모서리배지", "떠다니는칩", "흐린칸", "자르는칸", "낭독기"]) if (got.some((g) => g.startsWith("칸 넘침") && g.includes(w))) miss.push(`${w} 를 칸 넘침으로 잘못 잡음`);
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
    if (shots) mkdirSync(shots, { recursive: true });
    // 반 화면씩 내려 장면을 한 박자씩 넘긴다. 바닥에 닿으면 멈춘다.
    for (let i = 0, last = -1, note = "", n = 0; i < 400; i++) {
      for (const m of await page.evaluate(scan)) if (!found.has(m)) found.set(m, theme);
      if (shots) {
        const now = await page.evaluate(() => [...document.querySelectorAll(".sc-note.on")].map((e) => e.textContent).join("|"));
        // 설명이 막 바뀐 박자는 전환(칩 0.8초, 설명 형광펜 1.15초)이 끝난 뒤에 찍는다. 스냅이 늦게 끝나면
        // 박자가 위 900ms 대기 끝에서야 넘어가 칩이 날아가는 중간에 찍혔다(2026-10-12 POST·PUT 글).
        if (now && now !== note) {
          await page.waitForTimeout(1200);
          await page.screenshot({ path: join(shots, `${theme}-${String(++n).padStart(2, "0")}.png`) });
        }
        note = now;
      }
      const y = await page.evaluate(() => scrollY);
      if (y === last) break;
      last = y;
      await page.mouse.wheel(0, 422);
      await page.waitForTimeout(900);
    }
    // 장면이 아닌 그림(표·이미지 묶음·터미널 캡처 등)은 박자가 없어 위에서 한 장도 남지 않는다. 끝까지 내려
    // 등장 모션이 다 끝난 뒤에 그림마다 한 장씩 <테마>-fig-NN.png 로 남긴다(2026-10-13 anatomy·bigarrow 글은
    // 장면이 없어 --shots 폴더가 비었고, 그림을 따로 찍어 봐야 했다).
    if (shots) {
      const still = page.locator("article figure:not(.sc-board)");
      for (let k = 0, count = await still.count(); k < count; k++) {
        await still.nth(k).screenshot({ path: join(shots, `${theme}-fig-${String(k + 1).padStart(2, "0")}.png`) }).catch(() => {});
      }
    }
  }
} finally {
  await browser.close();
}

const problems = [...found].map(([m, theme]) => `[${theme}] ${m}`);
console.log(JSON.stringify({ slug, ok: problems.length === 0, figures, problems }, null, 2));
process.exit(problems.length ? 1 : 0);
