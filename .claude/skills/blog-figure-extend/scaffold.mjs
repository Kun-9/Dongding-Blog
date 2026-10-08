#!/usr/bin/env node
// 그림 확장 모듈 뼈대를 만들고 목록에 등록한다.
//   node .claude/skills/blog-figure-extend/scaffold.mjs kit <이름>         → kits/<이름>.ts·.css, KITS, figure.css
//   node .claude/skills/blog-figure-extend/scaffold.mjs anim <이름>        → anims/<이름>.ts, ANIM_MODULES
//   node .claude/skills/blog-figure-extend/scaffold.mjs scene-attr <이름>  → scene-attrs/<이름>.ts(data-<이름>), SCENE_ATTRS
// 만든 뒤 TODO 를 채우고 sync-docs.ts 로 문서 표를 다시 만든다.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { repoRoot } from "./lib.mjs";

const [kind, name] = process.argv.slice(2);
if (!["kit", "anim", "scene-attr"].includes(kind) || !/^[a-z][a-z0-9-]*$/.test(name ?? "")) {
  console.error("사용법: scaffold.mjs kit|anim|scene-attr <이름(소문자·숫자·-)>");
  process.exit(2);
}
const root = repoRoot();
const fig = join(root, "src/lib/figure");
const id = name.replace(/-([a-z0-9])/g, (_, c) => c.toUpperCase());
const RESERVED = new Set(["break", "case", "class", "const", "default", "delete", "do", "else", "export", "for", "function", "if", "import", "in", "new", "return", "switch", "this", "typeof", "var", "void", "while", "with", "yield", "let", "static", "enum", "await"]);
if (RESERVED.has(id)) {
  console.error(`"${name}" 는 자바스크립트 예약어라 쓸 수 없습니다.`);
  process.exit(2);
}
/** 만들 파일과 등록할 목록이 비어 있는지 먼저 다 본다 — 반쯤 만든 상태를 남기지 않는다. */
function precheck(files, indexFile) {
  for (const f of files) {
    if (existsSync(f)) {
      console.error(`이미 있습니다: ${f.slice(root.length + 1)}`);
      process.exit(1);
    }
  }
  const s = readFileSync(join(fig, indexFile), "utf8");
  if (new RegExp(`\\b${id}\\b`).test(s)) {
    console.error(`${indexFile} 에 ${id} 가 이미 있습니다. 다른 이름을 쓰세요.`);
    process.exit(1);
  }
}

/** 목록 파일에 import 한 줄과 배열 항목 하나를 더한다. */
function register(indexFile, arrayDecl, file) {
  const p = join(fig, indexFile);
  let s = readFileSync(p, "utf8");
  const imp = `import { ${id} } from "./${file}";\n`;
  if (s.includes(imp)) return;
  const lastImport = [...s.matchAll(/^import .*;\n/gm)].pop();
  s = s.slice(0, lastImport.index + lastImport[0].length) + imp + s.slice(lastImport.index + lastImport[0].length);
  const at = s.indexOf(arrayDecl);
  if (at < 0) throw new Error(`${indexFile} 에서 "${arrayDecl}" 를 찾지 못했습니다`);
  const open = s.indexOf("[", at);
  const close = s.indexOf("];", at);
  const inner = s.slice(open + 1, close).trimEnd();
  const sep = !inner.trim() ? "" : inner.endsWith(",") ? " " : ", ";
  s = s.slice(0, open + 1) + inner + sep + id + s.slice(close);
  writeFileSync(p, s);
}

function create(path, body) {
  writeFileSync(path, body);
  console.log(`만듦 ${path.slice(root.length + 1)}`);
}

if (kind === "kit") {
  precheck([join(fig, "kits", `${name}.ts`), join(fig, "kits", `${name}.css`)], "kits/index.ts");
  create(
    join(fig, "kits", `${name}.ts`),
    `import type { Kit } from "./types";

export const ${id}: Kit = {
  name: "${name}",
  label: "TODO 분류 이름(쓰기 기준·스킬 표 첫 칸)",
  use: "TODO 언제 쓰나 한 줄",
  classes: [["fig-${name}", "TODO 짧은 설명"]],
  // 기본 등장 모션이 필요하면: motion: [[".fig-${name}", "rise"]],
  // 화면에 있을 때 반복(숨쉬기)을 켤 선택자: live: [".fig-${name}.fig-accent"],
  //   live 를 쓰면 ${name}.css 에 [data-live] 규칙도 둔다(box.css 참고).
};
`,
  );
  create(
    join(fig, "kits", `${name}.css`),
    `/* 키트 ${name} — kits/${name}.ts. 색은 테마 변수만(라이트·다크 둘 다), 늘 어두운 판이면 --code-* 토큰. */
.fig-${name} {
}
`,
  );
  register("kits/index.ts", "export const KITS: Kit[] = [", name);
  const css = join(fig, "figure.css");
  const line = `@import "./kits/${name}.css";\n`;
  let s = readFileSync(css, "utf8");
  if (!s.includes(line)) {
    const last = [...s.matchAll(/^@import "\.\/kits\/.*;\n/gm)].pop();
    s = s.slice(0, last.index + last[0].length) + line + s.slice(last.index + last[0].length);
    writeFileSync(css, s);
  }
}

if (kind === "anim") {
  precheck([join(fig, "anims", `${name}.ts`)], "anims/index.ts");
  create(
    join(fig, "anims", `${name}.ts`),
    `import { appear, fromTo, still } from "./keyframes";
import type { AnimModule } from "./types";

/** TODO 한 줄 설명. 끝 모습은 서버가 그린 그대로여야 한다(opacity 1, 항등 변환). */
export const ${id}: AnimModule = {
  name: "${name}",
  timing: { d: 0.6, delay: 0 },
  doc: { motion: "TODO 무엇이 어떻게 움직이나", use: "TODO 어디에 쓰나" },
  prepare: (el, rt, t) => (still(el) ? appear(el, rt, t) : fromTo(el, rt, t, { opacity: 0 }, { opacity: 1 })),
};
`,
  );
  register("anims/index.ts", "export const ANIM_MODULES: AnimModule[] = [", name);
}

if (kind === "scene-attr") {
  precheck([join(fig, "scene-attrs", `${name}.ts`)], "scene-attrs/index.ts");
  create(
    join(fig, "scene-attrs", `${name}.ts`),
    `import { keysFit, latest } from "./range";
import type { SceneAttr } from "./types";

/** 값 모양 — 단계 번호:값 목록. 글자가 들어가면 write 에서 escAttr 로 이스케이프한다. */
const VALID = /^\\d{1,2}:[a-z0-9-]{1,20}(?:\\|\\d{1,2}:[a-z0-9-]{1,20})*$/;

export const ${id}: SceneAttr = {
  name: "data-${name}",
  valid: (v) => VALID.test(v),
  fits: keysFit,
  apply(el, n) {
    const v = latest(el.getAttribute("data-${name}") ?? "", n);
    // TODO 단계 n(1부터)에 요소를 맞춘다. 상태는 클래스로 입히고 CSS 는 states.css 에.
    void v;
  },
  doc: { example: 'data-${name}="1:…|2:…"', meaning: "TODO 뜻" },
};
`,
  );
  register("scene-attrs/index.ts", "export const SCENE_ATTRS: SceneAttr[] = [", name);
}

console.log("등록함. TODO 를 채우고: node_modules/.bin/jiti .claude/skills/blog-figure-extend/sync-docs.ts");
