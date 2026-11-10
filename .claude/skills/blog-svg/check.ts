/**
 * 글 본문의 ```svg 그림을 하나씩 점검한다. 본문 점검기(voice.ts)의 svg 규칙과 같다.
 *   node_modules/.bin/jiti .claude/skills/blog-svg/check.ts <글.md> [...]
 * 경고가 하나라도 있으면 끝 코드 1.
 */
import { readFileSync } from "node:fs";
import { isClaim, parseSvgFigure } from "../../../src/lib/svg-figure";
import { AVOID, FIGURE_AVOID } from "../../../src/lib/phrases";

let bad = 0;
for (const file of process.argv.slice(2)) {
  const md = readFileSync(file, "utf8");
  for (const m of md.matchAll(/^```svg\n([\s\S]*?)\n```$/gm)) {
    const line = md.slice(0, m.index).split("\n").length;
    const f = parseSvgFigure(m[1]);
    const out: string[] = [...f.errors.map((e) => `diagram-error: ${e}`), ...(f.dropped.length ? [`figure-dropped: ${f.dropped.join(", ")}`] : [])];
    if (!f.title) out.push("svg-no-title: title: 이 없습니다");
    else if (!isClaim(f.title)) out.push(`svg-title-claim: 결론 문장('~다')이 아닙니다: "${f.title}"`);
    else if (f.title.length > 48) out.push(`svg-title-claim: 제목이 깁니다(${f.title.length}자)`);
    out.push(...f.warnings.map((w) => `${w.rule}: ${w.message}`));
    for (const t of [f.title, f.caption, ...f.texts]) {
      if (!t) continue;
      const a = [...AVOID, ...FIGURE_AVOID].find((x) => x.pattern.test(t));
      if (a) out.push(`svg-text-slop: "${a.label}" — ${a.hint}: "${t}"`);
      else if (/—/.test(t)) out.push(`svg-text-slop: em 대시: "${t}"`);
    }
    const size = f.panels.map((p) => `${p.width}×${p.height}${p.only ? ` ${p.only}` : ""}`).join(", ");
    console.log(`${out.length ? "!!" : "ok"} ${file}:${line} ${f.title ?? "(제목 없음)"} [${size}]`);
    for (const o of out) console.log(`   ${o}`);
    if (out.length) bad++;
  }
}
process.exit(bad ? 1 : 0);
