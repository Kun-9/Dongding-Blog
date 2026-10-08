// 글 원문(마크다운)의 그림이 지금 코드로 오류 없이 읽히는지 본다 — 배포 전에, 글을 고치기 전에.
//   node_modules/.bin/jiti .claude/skills/blog-figure-extend/check-figures.ts <글.md>
// figure 는 지워진 것(dropped)·장면 오류, 그림 블록은 문법 오류가 하나라도 있으면 실패한다.
import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

const root = process.cwd();
const file = process.argv[2];
if (!file || !existsSync(file)) {
  console.error("사용법: check-figures.ts <글.md>");
  process.exit(2);
}
const { findFences, isDiagramLang, parseDiagram } = await import(join(root, "src/lib/diagram.ts"));
const { parseFigureHtml } = await import(join(root, "src/lib/html-figure.ts"));

let bad = 0;
for (const f of findFences(readFileSync(resolve(file), "utf8"))) {
  if (f.file) continue;
  if (f.lang === "figure") {
    const r = parseFigureHtml(f.source);
    const issues = [...r.errors, ...(r.dropped.length ? [`지워진 것: ${r.dropped.join(", ")}`] : [])];
    if (!r.html.trim()) issues.push("비었습니다");
    console.log(`${String(f.line).padStart(4)}  figure${r.scene ? ` 장면 ${r.scene.steps.length}단계` : ""}  ${issues.length ? issues.join(" / ") : "ok"}`);
    bad += issues.length ? 1 : 0;
  } else if (isDiagramLang(f.lang)) {
    const r = parseDiagram(f.lang, f.source);
    console.log(`${String(f.line).padStart(4)}  ${f.lang}${r.diagram?.scene ? " 장면" : ""}  ${r.errors.length ? r.errors.join(" / ") : "ok"}`);
    bad += r.errors.length ? 1 : 0;
  }
}
if (bad) {
  console.error(`그림 ${bad}개를 그릴 수 없습니다.`);
  process.exit(1);
}
