// 그림 확장 모듈 목록 → blog-figures 스킬 표. 등록이 빠진 곳도 같이 잡는다.
//   node_modules/.bin/jiti .claude/skills/blog-figure-extend/sync-docs.ts          표를 다시 쓴다
//   node_modules/.bin/jiti .claude/skills/blog-figure-extend/sync-docs.ts --check  다르면 실패(커밋 전)
// 스킬 문서의 `<!-- figure:이름 -->` … `<!-- /figure:이름 -->` 사이만 바뀐다.
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const fig = join(root, "src/lib/figure");
if (!existsSync(join(fig, "kits/index.ts"))) {
  console.error("dongding-blog 저장소(또는 워크트리) 뿌리에서 실행하세요.");
  process.exit(2);
}
const { KITS } = await import(join(fig, "kits/index.ts"));
const { ANIM_MODULES, LOOPS, LOOP_DOCS } = await import(join(fig, "anims/index.ts"));
const { SCENE_ATTRS, STATES } = await import(join(fig, "scene-attrs/index.ts"));
const check = process.argv.includes("--check");
const problems: string[] = [];

/* ── 모듈 점검 ── */
const dup = (xs: string[]) => xs.filter((x, i) => xs.indexOf(x) !== i);
const figureCss = readFileSync(join(fig, "figure.css"), "utf8");
for (const d of dup(KITS.map((k: { name: string }) => k.name))) problems.push(`키트 이름이 겹칩니다: ${d}`);
for (const d of dup(KITS.flatMap((k: { classes: [string, string][] }) => k.classes.map(([c]) => c)))) problems.push(`키트 클래스가 겹칩니다: ${d}`);
for (const k of KITS) {
  for (const [c] of k.classes) if (!/^fig-[a-z0-9-]+$/.test(c)) problems.push(`키트 ${k.name}: 클래스 ${c} 는 fig- 로 시작해야 허용 목록을 통과합니다`);
  if (!existsSync(join(fig, "kits", `${k.name}.css`))) problems.push(`키트 ${k.name}: kits/${k.name}.css 가 없습니다`);
  const css = existsSync(join(fig, "kits", `${k.name}.css`)) ? readFileSync(join(fig, "kits", `${k.name}.css`), "utf8") : "";
  if (k.live?.length && !css.includes("[data-live]")) problems.push(`키트 ${k.name}: live 를 쓰는데 ${k.name}.css 에 [data-live] 반복 규칙이 없습니다`);
  for (const [, anim] of k.motion ?? []) if (!ANIM_MODULES.some((a: { name: string }) => a.name === anim)) problems.push(`키트 ${k.name}: 기본 모션 ${anim} 이 anims 에 없습니다`);
}
for (const d of dup(ANIM_MODULES.map((a: { name: string }) => a.name))) problems.push(`모션 이름이 겹칩니다: ${d}`);
for (const a of ANIM_MODULES) if (!/^[a-z][a-z-]*$/.test(a.name)) problems.push(`모션 이름 ${a.name} 은 소문자와 - 만 씁니다`);
for (const d of dup(SCENE_ATTRS.map((a: { name: string }) => a.name))) problems.push(`장면 속성이 겹칩니다: ${d}`);
const states = readFileSync(join(fig, "scene-attrs/states.css"), "utf8");
for (const st of STATES) if (!states.includes(`.is-${st}`)) problems.push(`장면 상태 ${st}: states.css 에 .is-${st} 가 없습니다`);
// 모듈 폴더의 .css 는 모두 figure.css 에서 불러야 한다.
for (const dir of ["kits", "anims", "scene-attrs"]) {
  for (const f of readdirSync(join(fig, dir)).filter((x) => x.endsWith(".css"))) {
    if (!figureCss.includes(`@import "./${dir}/${f}";`)) problems.push(`${dir}/${f} 를 figure.css 가 부르지 않습니다`);
  }
}
if (existsSync(join(root, "src/app/figure-preview"))) problems.push("src/app/figure-preview 가 남아 있습니다. preview.mjs stop 으로 지우세요(커밋 금지)");

/* ── 문서 표 ── */
const cell = (s: string) => s.replace(/\|/g, "\\|");
const tick = (s: string) => `\`${cell(s)}\``;
const blocks: Record<string, string> = {
  kits: [
    "| 분류 | 클래스 |",
    "| --- | --- |",
    ...KITS.map(
      (k: { label: string; use?: string; classes: [string, string][] }) =>
        `| ${k.label} | ${k.classes.map(([c, d]) => (d ? `${tick(c)}(${cell(d)})` : tick(c))).join(" ")}${k.use ? `<br>${cell(k.use)}` : ""} |`,
    ),
  ].join("\n"),
  anims: [
    "| 값 | 움직임 | 쓰는 곳 |",
    "| --- | --- | --- |",
    ...ANIM_MODULES.map((a: { name: string; doc: { motion: string; use: string } }) => `| ${tick(a.name)} | ${cell(a.doc.motion)} | ${cell(a.doc.use)} |`),
    "| `none` | 움직이지 않음 | 키트 기본 모션을 끌 때 |",
  ].join("\n"),
  loops: [
    "| 값 | 움직임 | 쓰는 곳 |",
    "| --- | --- | --- |",
    ...LOOPS.map((l: string) => `| ${tick(l)} | ${cell(LOOP_DOCS[l]?.motion ?? "")} | ${cell(LOOP_DOCS[l]?.use ?? "")} |`),
  ].join("\n"),
  "scene-attrs": [
    "| 속성 | 뜻 |",
    "| --- | --- |",
    ...SCENE_ATTRS.map((a: { doc: { example: string; meaning: string } }) => `| ${tick(a.doc.example)} | ${cell(a.doc.meaning)} |`),
  ].join("\n"),
};

const skill = join(root, ".claude/skills/blog-figures/SKILL.md");
let doc = readFileSync(skill, "utf8");
const before = doc;
for (const [name, body] of Object.entries(blocks)) {
  const re = new RegExp(`(<!-- figure:${name} -->\\n)[\\s\\S]*?(\\n<!-- /figure:${name} -->)`);
  if (!re.test(doc)) {
    problems.push(`blog-figures/SKILL.md 에 <!-- figure:${name} --> 자리가 없습니다`);
    continue;
  }
  // 함수로 바꾼다 — 표 안의 `$2.06` 같은 글자가 치환 패턴($2)으로 읽히지 않게.
  doc = doc.replace(re, (_, open: string, close: string) => open + body + close);
}
if (doc !== before) {
  if (check) problems.push("blog-figures/SKILL.md 의 표가 모듈 목록과 다릅니다. sync-docs.ts 를 --check 없이 돌리세요");
  else {
    writeFileSync(skill, doc);
    console.log("blog-figures/SKILL.md 표를 다시 썼습니다.");
  }
}

if (problems.length) {
  console.error(problems.map((p) => `- ${p}`).join("\n"));
  process.exit(1);
}
console.log(`모듈 점검 통과: 키트 ${KITS.length}·모션 ${ANIM_MODULES.length}·장면 속성 ${SCENE_ATTRS.length}`);
