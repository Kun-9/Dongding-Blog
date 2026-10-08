/**
 * 그림 블록 문법 — 마크다운 코드 펜스의 언어가 아래 종류면 코드 대신
 * 그림으로 그린다(`components/prose/Diagram.tsx`).
 *
 * SVG 를 좌표로 찍으면 글자가 넘치고, 모바일에서 줄이 안 바뀌고, 그림마다
 * 모양이 달라진다. 내용만 텍스트로 받고 모양은 블로그가 정한다 — 테마 색,
 * 반응형, 등장 애니메이션까지. 글쓴이(사람이든 실행기든)는 줄만 쓴다.
 *
 * 공통: 머리 줄 `caption: …` 은 그림 아래 캡션. 종류별 옵션도 머리 줄에
 *       `key: value` 로 둔다(layout·actors·unit·center).
 *       줄 끝 `*` = 강조, `~` = 흐리게(점선). `|` 로 칸을 가른다.
 *       칸 줄 바로 아래 `> 내용` = 그 칸의 자세히(누르거나 마우스를 올리면 열린다. 선택).
 *
 * next 에 의존하지 않는 순수 모듈이다 — 점검기와 스크립트에서도 쓴다.
 */

export const DIAGRAM_LANGS = [
  "flow",
  "cycle",
  "compare",
  "matrix",
  "timeline",
  "sequence",
  "layers",
  "tree",
  "stats",
  "bars",
] as const;
export type DiagramKind = (typeof DIAGRAM_LANGS)[number];

export function isDiagramLang(lang: string | undefined): lang is DiagramKind {
  return !!lang && (DIAGRAM_LANGS as readonly string[]).includes(lang);
}

export interface Mark {
  /** 줄 끝 `*` */
  accent: boolean;
  /** 줄 끝 `~` */
  muted: boolean;
  /** 바로 아래 `> 내용` 줄 — 누르면 열리는 자세히. */
  detail?: string;
}

/** 제목 + 짧은 설명. flow·cycle·layers 의 칸. */
export interface Item extends Mark {
  label: string;
  sub?: string;
}

export interface CompareRow extends Mark {
  item: string;
  before: string;
  after: string;
}

export type MatrixCell =
  | { kind: "yes" }
  | { kind: "no" }
  | { kind: "part" }
  | { kind: "text"; text: string };

export interface MatrixRow extends Mark {
  item: string;
  cells: MatrixCell[];
}

export interface TimelinePoint extends Mark {
  when: string;
  what: string;
}

export interface Message extends Mark {
  from: number;
  to: number;
  label: string;
  /** `-->` — 돌려주는 응답(점선). */
  reply: boolean;
}

export interface TreeNode extends Item {
  children: TreeNode[];
}

export interface Stat extends Mark {
  value: string;
  /** `3.4초 → 1.2초` 의 앞쪽. */
  before?: string;
  label: string;
  note?: string;
}

export interface Bar extends Mark {
  label: string;
  value: number;
  display?: string;
}

export type Diagram = { caption?: string } & (
  | { kind: "flow"; nodes: Item[] }
  | { kind: "cycle"; nodes: Item[]; center?: string }
  | { kind: "compare"; columns: [string, string]; rows: CompareRow[] }
  | { kind: "matrix"; columns: string[]; rows: MatrixRow[] }
  | { kind: "timeline"; points: TimelinePoint[] }
  | { kind: "sequence"; actors: string[]; messages: Message[] }
  | { kind: "layers"; layout: "nest" | "stack"; items: Item[] }
  | { kind: "tree"; roots: TreeNode[] }
  | { kind: "stats"; items: Stat[] }
  | { kind: "bars"; unit?: string; items: Bar[] }
);

export interface ParseResult {
  diagram: Diagram | null;
  /** 문법 오류. 하나라도 있으면 그리지 않고 코드로 보인다(점검기가 잡는다). */
  errors: string[];
}

/** 줄 끝 표지를 떼어 낸다. `*` 와 `~` 는 순서 무관, 둘 다 붙일 수 있다. */
function marks(line: string): { text: string } & Mark {
  let text = line.trimEnd();
  let accent = false;
  let muted = false;
  for (;;) {
    if (text.endsWith(" *") || text === "*") {
      accent = true;
      text = text.slice(0, -1).trimEnd();
    } else if (text.endsWith(" ~") || text === "~") {
      muted = true;
      text = text.slice(0, -1).trimEnd();
    } else break;
  }
  return { text, accent, muted };
}

function cells(text: string): string[] {
  return text.split("|").map((c) => c.trim());
}

function item(line: string): Item {
  const m = marks(line);
  const [label, ...rest] = cells(m.text);
  const sub = rest.join(" | ").trim();
  return { label, sub: sub || undefined, accent: m.accent, muted: m.muted };
}

const short = (s: string, n = 14) => (s.length > n ? `${s.slice(0, n)}…` : s);

/** 범위 검사 — 개수와 글자 수. */
function count(errors: string[], kind: string, n: number, min: number, max: number, unit = "줄") {
  if (n < min) errors.push(`${kind} 는 ${min}${unit} 이상이어야 합니다(지금 ${n})`);
  if (n > max) errors.push(`${kind} 는 ${max}${unit}까지입니다(지금 ${n})`);
}

function lengths(errors: string[], kind: string, labels: string[], max: number, hint = "설명은 | 뒤로") {
  labels.forEach((l, i) => {
    if (!l) errors.push(`${kind} ${i + 1}번째 줄에 제목이 없습니다`);
    else if (l.length > max) errors.push(`${kind} "${short(l)}" 가 깁니다(${max}자까지). ${hint}`);
  });
}

const OPTION_RE = /^(caption|layout|actors|unit|center)\s*:\s*(.*)$/i;

const YES = new Set(["o", "O", "✓", "✔", "yes", "y", "있음", "지원"]);
const NO = new Set(["x", "X", "✕", "✗", "no", "n", "-", "—", "없음", "미지원"]);
const PART = new Set(["△", "◐", "partial", "일부", "부분"]);

function matrixCell(raw: string): MatrixCell {
  if (YES.has(raw)) return { kind: "yes" };
  if (NO.has(raw)) return { kind: "no" };
  if (PART.has(raw)) return { kind: "part" };
  return { kind: "text", text: raw };
}

const ARROW_RE = /^(.+?)\s*(-->|->|→|⇢)\s*(.+?)$/;

/** 자세히 한 줄의 글자 수 상한. 길면 본문이 할 일이다. */
export const DETAIL_MAX = 200;

export function parseDiagram(kind: DiagramKind, source: string): ParseResult {
  const errors: string[] = [];
  const opts: Record<string, string> = {};
  /** 들여쓰기를 살린 줄 — tree 가 쓴다. */
  const raw: string[] = [];

  /** raw 의 몇 번째 줄에 붙은 자세히인가. */
  const details = new Map<number, string>();
  let head = true;
  for (const line of source.split("\n")) {
    if (!line.trim()) continue;
    const more = line.trim().match(/^>\s?(.*)$/);
    if (more && !head) {
      const at = raw.length - 1;
      const text = more[1].trim();
      if (details.has(at)) details.set(at, `${details.get(at)} ${text}`);
      else details.set(at, text);
      continue;
    }
    if (more) {
      errors.push("자세히(`> 내용`) 줄은 칸 줄 바로 아래에 둡니다");
      continue;
    }
    const opt = head ? line.trim().match(OPTION_RE) : null;
    if (opt) {
      opts[opt[1].toLowerCase()] = opt[2].trim();
      continue;
    }
    // caption 은 어디에 있어도 받는다. 나머지 옵션은 머리에만.
    const cap = line.trim().match(/^caption\s*:\s*(.+)$/i);
    if (cap) {
      opts.caption = cap[1].trim();
      continue;
    }
    head = false;
    raw.push(line.replace(/\t/g, "  ").trimEnd());
  }
  const body = raw.map((l) => l.trim());
  const caption = opts.caption || undefined;
  for (const [, d] of details) {
    if (d.length > DETAIL_MAX) errors.push(`자세히 "${short(d, 20)}" 가 깁니다(${DETAIL_MAX}자까지). 긴 설명은 본문으로`);
  }
  /** i 번째 줄에서 만든 칸에 자세히를 붙인다. */
  const at = <T extends Mark>(x: T, i: number): T => (details.has(i) ? { ...x, detail: details.get(i) } : x);
  const done = (d: Diagram): ParseResult => ({ diagram: errors.length ? null : d, errors });

  switch (kind) {
    case "flow": {
      const nodes = body.map((l, i) => at(item(l), i));
      count(errors, "flow", nodes.length, 2, 8, "단계");
      lengths(errors, "flow", nodes.map((n) => n.label), 24);
      return done({ kind, caption, nodes });
    }

    case "cycle": {
      const nodes = body.map((l, i) => at(item(l), i));
      count(errors, "cycle", nodes.length, 3, 6, "단계");
      lengths(errors, "cycle", nodes.map((n) => n.label), 14);
      return done({ kind, caption, nodes, center: opts.center || undefined });
    }

    case "compare": {
      let columns: [string, string] = ["이전", "이후"];
      const rows: CompareRow[] = [];
      for (const [i, line] of body.entries()) {
        if (line.startsWith("|")) {
          const [a, b] = cells(line.replace(/^\|/, "").replace(/\|$/, ""));
          if (a && b) columns = [a, b];
          else errors.push("compare 머리 줄은 `| 이전 | 이후` 꼴입니다");
          continue;
        }
        const m = marks(line);
        const c = cells(m.text);
        if (c.length !== 3) {
          errors.push(`compare 줄은 \`항목 | 이전 | 이후\` 세 칸입니다: "${short(line, 30)}"`);
          continue;
        }
        rows.push(at({ item: c[0], before: c[1], after: c[2], accent: m.accent, muted: m.muted }, i));
      }
      count(errors, "compare", rows.length, 1, 10);
      return done({ kind, caption, columns, rows });
    }

    case "matrix": {
      let columns: string[] = [];
      const rows: MatrixRow[] = [];
      for (const [i, line] of body.entries()) {
        if (line.startsWith("|")) {
          columns = cells(line.replace(/^\|/, "").replace(/\|$/, "")).filter(Boolean);
          continue;
        }
        const m = marks(line);
        const [name, ...rest] = cells(m.text);
        if (!columns.length) {
          errors.push("matrix 는 첫 줄에 `| 열1 | 열2` 머리 줄이 있어야 합니다");
          break;
        }
        if (rest.length !== columns.length) {
          errors.push(`matrix "${short(name)}" 줄은 칸이 ${columns.length}개여야 합니다(지금 ${rest.length})`);
          continue;
        }
        rows.push(at({ item: name, cells: rest.map(matrixCell), accent: m.accent, muted: m.muted }, i));
      }
      count(errors, "matrix", columns.length, 1, 5, "열");
      count(errors, "matrix", rows.length, 1, 12);
      return done({ kind, caption, columns, rows });
    }

    case "timeline": {
      const points = body.map((line, i) => {
        const m = marks(line);
        const [when, ...rest] = cells(m.text);
        return at({ when, what: rest.join(" | "), accent: m.accent, muted: m.muted }, i);
      });
      count(errors, "timeline", points.length, 2, 10);
      points.forEach((p, i) => {
        if (!p.when || !p.what) errors.push(`timeline ${i + 1}번째 줄은 \`시점 | 내용\` 꼴입니다`);
      });
      return done({ kind, caption, points });
    }

    case "sequence": {
      const declared = opts.actors ? opts.actors.split(/[,，]/).map((a) => a.trim()).filter(Boolean) : null;
      const actors: string[] = declared ? [...declared] : [];
      const indexOf = (name: string): number => {
        const i = actors.indexOf(name);
        if (i >= 0) return i;
        if (declared) {
          errors.push(`sequence: "${short(name)}" 는 actors 에 없습니다`);
          return 0;
        }
        actors.push(name);
        return actors.length - 1;
      };
      const messages: Message[] = [];
      for (const [i, line] of body.entries()) {
        const m = marks(line);
        const [route, ...rest] = cells(m.text);
        const a = route.match(ARROW_RE);
        if (!a) {
          errors.push(`sequence 줄은 \`보내는 쪽 -> 받는 쪽 | 내용\` 꼴입니다: "${short(line, 30)}"`);
          continue;
        }
        messages.push(at({
          from: indexOf(a[1].trim()),
          to: indexOf(a[3].trim()),
          label: rest.join(" | "),
          reply: a[2] === "-->" || a[2] === "⇢",
          accent: m.accent,
          muted: m.muted,
        }, i));
      }
      count(errors, "sequence", actors.length, 2, 5, "명(참여자)");
      count(errors, "sequence", messages.length, 1, 12);
      lengths(errors, "sequence 참여자", actors, 16, "짧게");
      messages.forEach((msg, i) => {
        if (msg.label.length > 40) errors.push(`sequence ${i + 1}번째 내용이 깁니다(40자까지)`);
      });
      return done({ kind, caption, actors, messages });
    }

    case "layers": {
      const items = body.map((l, i) => at(item(l), i));
      const layout = opts.layout === "stack" ? "stack" : "nest";
      count(errors, "layers", items.length, 2, layout === "nest" ? 5 : 8, "겹");
      lengths(errors, "layers", items.map((n) => n.label), 28);
      return done({ kind, caption, layout, items });
    }

    case "tree": {
      const roots: TreeNode[] = [];
      const stack: { indent: number; node: TreeNode }[] = [];
      let total = 0;
      for (const [i, line] of raw.entries()) {
        // ascii 트리(├── └── │)와 불릿(- )도 받는다. 깊이는 글자가 시작하는 칸.
        const cleaned = line.replace(/[│├└┃┣┗]|─+|-{2,}(?=\s)/g, (s) => " ".repeat(s.length));
        const m = cleaned.match(/^(\s*)(?:[-*+]\s+)?(.*)$/)!;
        const indent = m[1].length;
        if (!m[2].trim()) continue;
        const node: TreeNode = at({ ...item(m[2]), children: [] }, i);
        while (stack.length && stack[stack.length - 1].indent >= indent) stack.pop();
        if (stack.length) stack[stack.length - 1].node.children.push(node);
        else roots.push(node);
        stack.push({ indent, node });
        total++;
        if (stack.length > 6) errors.push(`tree 는 6단계 깊이까지입니다: "${short(node.label)}"`);
      }
      count(errors, "tree", total, 2, 40, "칸");
      return done({ kind, caption, roots });
    }

    case "stats": {
      const items: Stat[] = body.map((line, i) => {
        const m = marks(line);
        const [value, label = "", ...rest] = cells(m.text);
        const change = value.split(/\s*(?:→|->)\s*/);
        return at({
          value: change.length === 2 ? change[1] : value,
          before: change.length === 2 ? change[0] : undefined,
          label,
          note: rest.join(" | ") || undefined,
          accent: m.accent,
          muted: m.muted,
        }, i);
      });
      count(errors, "stats", items.length, 1, 6, "개");
      items.forEach((s, i) => {
        if (!s.value || !s.label) errors.push(`stats ${i + 1}번째 줄은 \`값 | 설명\` 꼴입니다`);
        else if (s.value.length > 14) errors.push(`stats 값 "${short(s.value)}" 이 깁니다(14자까지)`);
      });
      return done({ kind, caption, items });
    }

    case "bars": {
      const items: Bar[] = [];
      for (const [i, line] of body.entries()) {
        const m = marks(line);
        const [label, num, display] = cells(m.text);
        const value = Number((num ?? "").replace(/[,\s]/g, ""));
        if (!label || !Number.isFinite(value) || value < 0) {
          errors.push(`bars 줄은 \`이름 | 숫자 | 표시(선택)\` 꼴입니다: "${short(line, 30)}"`);
          continue;
        }
        items.push(at({ label, value, display: display || undefined, accent: m.accent, muted: m.muted }, i));
      }
      count(errors, "bars", items.length, 2, 10);
      if (items.length && items.every((b) => b.value === 0)) errors.push("bars 값이 모두 0 입니다");
      lengths(errors, "bars", items.map((b) => b.label), 20, "짧게");
      return done({ kind, caption, unit: opts.unit || undefined, items });
    }
  }
}

/** 본문에서 그림 블록(```figure 포함)을 찾아 낸다. 점검기가 개수·오류를 센다. */
export function findFences(body: string): { lang: string; file: string; line: number; source: string }[] {
  const out: { lang: string; file: string; line: number; source: string }[] = [];
  const lines = body.split("\n");
  for (let i = 0; i < lines.length; i++) {
    if (!lines[i].startsWith("```")) continue;
    const [lang = "", file = ""] = lines[i].slice(3).trim().split(":").map((p) => p.trim());
    const start = i;
    const src: string[] = [];
    i++;
    while (i < lines.length && !lines[i].startsWith("```")) src.push(lines[i++]);
    out.push({ lang, file, line: start + 1, source: src.join("\n") });
  }
  return out;
}

export function findDiagrams(body: string): { kind: DiagramKind; line: number; result: ParseResult }[] {
  return findFences(body)
    // `lang:파일명` 은 코드 블록으로 남는다(markdown.tsx 와 같은 규칙).
    .filter((f): f is typeof f & { lang: DiagramKind } => isDiagramLang(f.lang) && !f.file)
    .map((f) => ({ kind: f.lang, line: f.line, result: parseDiagram(f.lang, f.source) }));
}
