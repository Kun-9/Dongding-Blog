/**
 * 글 본문의 ```svg 그림을 블로그와 같은 클래스·판 여백으로 그려 캡처한다(390 라이트·390 다크·760 라이트).
 *   node_modules/.bin/jiti .claude/skills/blog-svg/shot.ts <글.md> <출력 폴더>
 * 출력: <출력>/<n>-<폭>-<테마>.png. 휴대폰에서 0.85배 아래로 줄어든 판이 있으면 알린다.
 */
import { mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parseSvgFigure, type SvgFigure } from "../../../src/lib/svg-figure";
// @ts-expect-error — mjs 도우미(Playwright 찾기·띄우기)
import { launchChromium, loadPlaywright } from "../blog-figure-extend/lib.mjs";

const [file, out] = process.argv.slice(2);
if (!file || !out) {
  console.error("사용법: shot.ts <글.md> <출력 폴더>");
  process.exit(2);
}
mkdirSync(out, { recursive: true });
const root = new URL("../../../", import.meta.url).pathname;
const css = readFileSync(join(root, "src/lib/figure/svg.css"), "utf8");
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const glyph = (k: string) => {
  if (k === "x" || k === "ok")
    return `<svg viewBox="-12 -7 24 14"><g class="${k === "x" ? "mark-x" : "mark-ok"}"><circle r="6.5"></circle><path d="${k === "x" ? "M-2.6 -2.6L2.6 2.6M2.6 -2.6L-2.6 2.6" : "M-3 0.2L-1 2.2L3 -2"}"></path></g></svg>`;
  if (k === "dot") return `<svg viewBox="0 0 24 14"><circle class="dot" cx="12" cy="7" r="4"></circle></svg>`;
  if (k === "dash") return `<svg viewBox="0 0 24 14"><line class="edge muted dash" x1="1" y1="7" x2="23" y2="7"></line></svg>`;
  return `<svg viewBox="0 0 24 14"><line class="edge ${k}" x1="1" y1="7" x2="23" y2="7"></line></svg>`;
};
// Diagram.tsx 의 SvgFigure 와 같은 구조(판 최대 폭 = W × 1.15, --pw = 가장 넓은 좁은 판 × 0.92).
function figureHtml(f: SvgFigure, id: string): string {
  const wide = f.panels.some((p) => p.only === "wide");
  const pw = Math.round(Math.max(...f.panels.filter((p) => p.only !== "wide").map((p) => p.width)) * 0.92);
  const panels = f.panels
    .map((p) => `<div class="svgf-panel"${p.only ? ` data-only="${p.only}"` : ""} style="max-width:${Math.round(p.width * 1.15)}px">${p.html.replace(/(marker-(?:start|mid|end)="url\(#)@/g, `$1${id}-`)}</div>`)
    .join("");
  const legend = f.legend.length ? `<div class="svgf-legend">${f.legend.map((l) => `<span>${glyph(l.key)}${esc(l.label)}</span>`).join("")}</div>` : "";
  const defs = `<svg class="svgf-defs"><defs>${["a", "a-bad", "a-good", "a-muted"].map((m) => `<marker id="${id}-${m}" class="${m}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z"></path></marker>`).join("")}</defs></svg>`;
  return `<figure><div class="dg-panel"><div class="svgf">${f.title ? `<p class="svgf-title">${esc(f.title)}</p>` : ""}<div class="svgf-panels"${wide ? " data-wide" : ""} style="--pw:${pw}px">${panels}</div>${legend}${defs}</div></div>${f.caption ? `<figcaption>${esc(f.caption)}</figcaption>` : ""}</figure>`;
}

// 블로그 테마 값(globals.css 의 :root·다크)을 옮겼다. 바뀌면 같이 고친다.
const page = (body: string) => `<!doctype html><meta charset="utf-8">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;700&family=JetBrains+Mono:wght@400;600&display=swap">
<style>
:root { --bg:#f7f4ed; --surface:#fcfbf8; --surface-alt:#f1ede2; --ink:#1c1c1c; --ink-muted:#5f5f5d; --border:#eceae4; --border-strong:rgba(28,28,28,.4); --danger:#a04a3a; --callout-tip-glyph:#5d7a46; --callout-info-glyph:#5a8590; --font-sans:"Pretendard","Noto Sans KR",system-ui,sans-serif; --font-jetbrains-mono:"JetBrains Mono"; }
@media (prefers-color-scheme: dark) { :root { --bg:#161513; --surface:#1f1d1a; --surface-alt:#26231f; --ink:#ece9e0; --ink-muted:#9a948a; --border:#2c2925; --border-strong:rgba(236,233,224,.18); --danger:#d99a8c; --callout-tip-glyph:#9cc287; --callout-info-glyph:#8fb7c2; } }
body { margin:0; padding:24px 16px; background:var(--bg); color:var(--ink); font-family:var(--font-sans); }
figure { margin:0 auto; max-width:720px; }
.dg-panel { border:1px solid var(--border); border-radius:16px; padding:20px 18px; background:var(--surface); }
@media (min-width:640px) { .dg-panel { padding:28px; } }
figcaption { margin-top:10px; font-size:13.5px; color:var(--ink-muted); }
${css}
</style>${body}`;

const md = readFileSync(file, "utf8");
const figs = [...md.matchAll(/^```svg\n([\s\S]*?)\n```$/gm)].map((m) => parseSvgFigure(m[1]));
const browser = await launchChromium(await loadPlaywright());
for (const [w, scheme] of [[390, "light"], [390, "dark"], [760, "light"]] as const) {
  const ctx = await browser.newContext({ viewport: { width: w, height: 900 }, colorScheme: scheme, deviceScaleFactor: 2 });
  const p = await ctx.newPage();
  for (const [i, f] of figs.entries()) {
    await p.setContent(page(figureHtml(f, `f${i}`)), { waitUntil: "networkidle" });
    await p.locator("figure").screenshot({ path: join(out, `${i + 1}-${w}-${scheme}.png`) });
    if (w === 390 && scheme === "light") {
      const small = await p.evaluate(() => [...document.querySelectorAll(".svgf-panel > svg")].map((s) => (s as SVGSVGElement).getBoundingClientRect().width / (s as SVGSVGElement).viewBox.baseVal.width).filter((r) => r > 0 && r < 0.85).length);
      console.log(`${i + 1}. ${f.title ?? "(제목 없음)"}${small ? ` — 휴대폰에서 0.85배 아래로 준 판 ${small}개` : ""}`);
    }
  }
  await ctx.close();
}
await browser.close();
console.log(`캡처: ${out}`);
