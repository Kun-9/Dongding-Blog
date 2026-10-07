/**
 * 그림 블록 문법 — 마크다운 코드 펜스의 언어가 flow·compare·timeline 이면
 * 코드 대신 그림으로 그린다(`components/prose/Diagram.tsx`).
 *
 * SVG 를 좌표로 찍으면 글자가 넘치고, 모바일에서 줄이 안 바뀌고, 그림마다
 * 모양이 달라진다. 내용만 텍스트로 받고 모양은 블로그가 정한다 — 테마 색,
 * 반응형, 등장 애니메이션까지. 글쓴이(사람이든 실행기든)는 줄만 쓴다.
 *
 * 공통: 첫 줄들에 `caption: …` 을 두면 그림 아래 캡션이 된다.
 *       줄 끝 `*` = 강조, `~` = 흐리게(점선). `|` 로 칸을 가른다.
 *
 * next 에 의존하지 않는 순수 모듈이다 — 점검기와 스크립트에서도 쓴다.
 */

export const DIAGRAM_LANGS = ["flow", "compare", "timeline"] as const;
export type DiagramKind = (typeof DIAGRAM_LANGS)[number];

export function isDiagramLang(lang: string | undefined): lang is DiagramKind {
  return !!lang && (DIAGRAM_LANGS as readonly string[]).includes(lang);
}

export interface Mark {
  /** 줄 끝 `*` */
  accent: boolean;
  /** 줄 끝 `~` */
  muted: boolean;
}

export interface FlowNode extends Mark {
  label: string;
  sub?: string;
}

export interface CompareRow extends Mark {
  item: string;
  before: string;
  after: string;
}

export interface TimelinePoint extends Mark {
  when: string;
  what: string;
}

export type Diagram =
  | { kind: "flow"; caption?: string; nodes: FlowNode[] }
  | { kind: "compare"; caption?: string; columns: [string, string]; rows: CompareRow[] }
  | { kind: "timeline"; caption?: string; points: TimelinePoint[] };

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

const MAX = { flow: 8, compare: 10, timeline: 10 } as const;

export function parseDiagram(kind: DiagramKind, source: string): ParseResult {
  const errors: string[] = [];
  let caption: string | undefined;
  const body: string[] = [];

  for (const raw of source.split("\n")) {
    const line = raw.trim();
    if (!line) continue;
    const cap = line.match(/^caption\s*:\s*(.+)$/i);
    if (cap) caption = cap[1].trim();
    else body.push(line);
  }

  if (kind === "flow") {
    const nodes = body.map((line) => {
      const m = marks(line);
      const [label, sub] = cells(m.text);
      return { label, sub: sub || undefined, accent: m.accent, muted: m.muted };
    });
    if (nodes.length < 2) errors.push("flow 는 단계가 두 줄 이상이어야 합니다");
    if (nodes.length > MAX.flow) errors.push(`flow 는 ${MAX.flow}단계까지입니다(지금 ${nodes.length})`);
    nodes.forEach((n, i) => {
      if (!n.label) errors.push(`flow ${i + 1}번째 줄에 제목이 없습니다`);
      if (n.label.length > 24) errors.push(`flow "${n.label.slice(0, 12)}…" 제목이 깁니다(24자까지). 설명은 | 뒤로`);
    });
    return { diagram: errors.length ? null : { kind, caption, nodes }, errors };
  }

  if (kind === "compare") {
    let columns: [string, string] = ["이전", "이후"];
    const rows: CompareRow[] = [];
    for (const line of body) {
      if (line.startsWith("|")) {
        const [a, b] = cells(line.replace(/^\|/, ""));
        if (a && b) columns = [a, b];
        else errors.push("compare 머리 줄은 `| 이전 | 이후` 꼴입니다");
        continue;
      }
      const m = marks(line);
      const c = cells(m.text);
      if (c.length !== 3) {
        errors.push(`compare 줄은 \`항목 | 이전 | 이후\` 세 칸입니다: "${line.slice(0, 30)}"`);
        continue;
      }
      rows.push({ item: c[0], before: c[1], after: c[2], accent: m.accent, muted: m.muted });
    }
    if (rows.length < 1) errors.push("compare 는 비교할 줄이 하나 이상이어야 합니다");
    if (rows.length > MAX.compare) errors.push(`compare 는 ${MAX.compare}줄까지입니다(지금 ${rows.length})`);
    return { diagram: errors.length ? null : { kind, caption, columns, rows }, errors };
  }

  // timeline
  const points = body.map((line) => {
    const m = marks(line);
    const [when, what] = cells(m.text);
    return { when, what: what ?? "", accent: m.accent, muted: m.muted };
  });
  if (points.length < 2) errors.push("timeline 은 두 줄 이상이어야 합니다");
  if (points.length > MAX.timeline) errors.push(`timeline 은 ${MAX.timeline}줄까지입니다(지금 ${points.length})`);
  points.forEach((p, i) => {
    if (!p.when || !p.what) errors.push(`timeline ${i + 1}번째 줄은 \`시점 | 내용\` 꼴입니다`);
  });
  return { diagram: errors.length ? null : { kind, caption, points }, errors };
}

/** 본문에서 그림 블록을 찾아 낸다. 점검기가 개수·오류를 센다. */
export function findDiagrams(body: string): { kind: DiagramKind; line: number; result: ParseResult }[] {
  const out: { kind: DiagramKind; line: number; result: ParseResult }[] = [];
  const lines = body.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^```\s*([a-z]+)\s*$/);
    if (!m) {
      // 다른 코드 펜스는 통째로 건너뛴다.
      if (lines[i].startsWith("```")) {
        i++;
        while (i < lines.length && !lines[i].startsWith("```")) i++;
      }
      continue;
    }
    const lang = m[1];
    const start = i;
    const src: string[] = [];
    i++;
    while (i < lines.length && !lines[i].startsWith("```")) src.push(lines[i++]);
    if (isDiagramLang(lang)) out.push({ kind: lang, line: start + 1, result: parseDiagram(lang, src.join("\n")) });
  }
  return out;
}
