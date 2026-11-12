/**
 * ```svg 블록 — 글마다 직접 그리는 흐름·구조 그림.
 *
 * 그림 블록(lib/diagram.ts)은 칸 모양이 정해져 있어 칸 사이를 잇는 선을 그릴 수 없다. 그래서
 * 무엇이 어디로 가고 어디서 세어지고 막히는지를 독자가 문장으로 조립했다(2026-11-09). 여기서는
 * 모양을 글마다 그리되, 읽히는 그림이 되도록 틀을 묶는다:
 *
 * - 머리 줄 `title:` 은 그림을 보고 가져갈 결론 문장. 그림 위에 HTML 로 그려 좁은 화면에서도 접힌다
 * - `<svg>` 하나가 판 하나. 판은 휴대폰 폭(viewBox 폭 360 이하)으로 그린다. 넓은 화면에서는 둘씩
 *   나란히, 좁으면 세로로 쌓인다. 360 을 넘는 그림은 `data-only="wide"` 판과 `data-only="narrow"`
 *   판을 같이 둔다
 * - 색·글자 크기는 클래스(SVG_CLASSES)로만. 테마 변수를 쓰고 글자는 12 아래로 내려가지 않는다
 * - 화살촉은 `marker-end="url(#a)"`(a·a-bad·a-good·a-muted), 막힘·통과 표시는
 *   `<circle class="mark-x" cx cy/>`·`mark-ok` 가 글리프까지 그린다
 *
 * 받은 문자열을 거르지 않고 토큰을 읽어 허용된 것만 새로 쓴다. 지운 것은 `dropped`, 그릴 수 없는
 * 것은 `errors`, 읽기 어려운 자리(글자가 판·상자를 넘음, 선 없는 상자)는 `warnings` 로 돌려준다.
 * DOM 없이 도는 순수 모듈이다 — 서버 렌더와 점검기에서 같이 쓴다.
 */
import { ATTR, TOKEN, escAttr, escText } from "./html-figure";

/**
 * 판 하나의 viewBox 폭 상한. 그림 판 안쪽 폭은 390px 화면에서 약 320px, 360px 화면에서 약 290px 라
 * 360 판은 0.89·0.81배가 된다(글자 12 → 10.7·9.7px). 휴대폰에서 1배로 보이려면 320 으로 그린다.
 */
export const SVG_PANEL_MAX = 360;
/** `data-only="wide"` 판의 폭 상한. 그림 판 안쪽이 600px 넘을 때만 보여 0.94배 아래로 줄지 않는다(svg.css). */
export const SVG_WIDE_MAX = 640;
export const MAX_SVG_FIGURE = 40_000;

/** 글자 크기(viewBox 단위). kits/svg.css 와 같은 값이다. */
export const SVG_TEXT_SIZE = { base: 14, sm: 12.5, xs: 12, lg: 16, xl: 28 } as const;

/** 쓸 수 있는 클래스와 뜻. 블로그 테마 변수로 칠한다(kits/svg.css). */
export const SVG_CLASS_DOC: Record<string, string> = {
  sm: "글자 12.5, 보조색",
  xs: "글자 12, 보조색(가장 작은 글자)",
  lg: "글자 16, 굵게(판 이름)",
  xl: "글자 28, 굵게(핵심 숫자)",
  b: "굵게",
  mono: "고정폭(코드·설정 키)",
  mid: "가운데 맞춤",
  end: "오른쪽 맞춤",
  q: "남의 글을 그대로 옮긴 예문(말투 점검 svg-text-slop 에서 뺀다)",
  ink: "본문색",
  muted: "보조색(선이면 옅은 선)",
  box: "상자: 바탕색 + 테두리",
  soft: "상자: 옅은 바탕 + 테두리(관문·구역)",
  zone: "테두리 없는 옅은 띠(묶음·구역 바탕)",
  edge: "연결선(채움 없음)",
  thin: "가는 선",
  dash: "점선(일부·예정·같은 목록)",
  faint: "흐리게(가지 않은 길)",
  dot: "작은 점(사람·요청 하나)",
  bad: "붉은색: 막힘·요금·나쁜 결과",
  good: "초록색: 통과·좋은 결과",
  accent: "푸른색: 지금 이야기하는 것 하나",
  "mark-x": "circle 에: 붉은 X 표시(막힘)",
  "mark-ok": "circle 에: 초록 체크 표시(통과)",
};
export const SVG_CLASSES = new Set(Object.keys(SVG_CLASS_DOC));

/** 범례 키 — `legend: bad=요금에 세는 메시지; x=막힘`. */
export const SVG_LEGEND_KEYS = ["bad", "good", "accent", "muted", "dash", "x", "ok", "dot"] as const;
export type LegendKey = (typeof SVG_LEGEND_KEYS)[number];

const MARKERS = new Set(["a", "a-bad", "a-good", "a-muted"]);
const SHAPES = new Set(["rect", "circle", "ellipse", "line", "polyline", "polygon", "path"]);
const TAGS = new Set(["g", "text", "tspan", ...SHAPES]);
/** 내용까지 버리는 태그(소문자). 화살촉·표시는 키트가 준다. */
/** 태그만 버리는 것(내용이 없다). `/>` 없이 열어도 뒤를 삼키지 않는다. */
const DROP_TAG = new Set(["use", "image", "animate", "set", "animatemotion", "animatetransform"]);
const DROP_ALL = new Set([
  "script", "style", "foreignobject", "iframe", "object", "embed", "a",
  "title", "desc", "defs", "marker",
  "lineargradient", "radialgradient", "pattern", "mask", "clippath", "filter", "symbol",
  "switch", "metadata", "template",
]);

const NUM = /^-?\d{1,5}(\.\d{1,3})?$/;
const NUM_ATTRS = new Set(["x", "y", "x1", "y1", "x2", "y2", "cx", "cy", "r", "rx", "ry", "width", "height", "dx", "dy"]);
const POINTS = /^[\d\s.,-]{1,2000}$/;
const PATH_D = /^[MmLlHhVvCcSsQqTtAaZz\d\s.,-]{1,4000}$/;
const TRANSFORM = /^(\s*(translate|rotate|scale)\(\s*-?\d{1,5}(\.\d{1,3})?([\s,]+-?\d{1,5}(\.\d{1,3})?){0,2}\s*\))+\s*$/;
const MARKER_URL = /^url\(#([a-z-]+)\)$/;

export interface SvgPanel {
  /** 거른 `<svg>…</svg>`. 화살촉 주소는 `#@a` 꼴이라 그리는 곳이 그림마다 다른 id 로 바꾼다. */
  html: string;
  width: number;
  height: number;
  only?: "wide" | "narrow";
}

export interface SvgFigure {
  title?: string;
  caption?: string;
  legend: { key: LegendKey; label: string }[];
  panels: SvgPanel[];
  dropped: string[];
  /** 그릴 수 없는 이유. 있으면 그림 대신 코드로 보인다. */
  errors: string[];
  /** 그려지지만 읽기 어려운 자리. 점검이 경고로 알린다. */
  warnings: { rule: "svg-text-out" | "svg-text-box" | "svg-no-edge" | "svg-text-tight" | "svg-line-text"; message: string }[];
  /** 판 안에 보이는 글자 줄. 점검이 말투(stock-phrase)를 본다. */
  texts: string[];
}

/* ── 점검용 노드 ─────────────────────────────────────────────────────── */

interface Node {
  tag: string;
  attrs: Record<string, string>;
  cls: Set<string>;
  parent: number;
  text: string;
}

function num(v: string | undefined): number | null {
  return v !== undefined && NUM.test(v) ? Number(v) : null;
}

/** 글자 폭 어림(em). 한글·한자는 거의 정사각, 라틴은 그 절반 남짓. */
export function textWidth(s: string, size: number, mono = false, bold = false): number {
  let em = 0;
  for (const ch of s) {
    const c = ch.codePointAt(0)!;
    const wide = (c >= 0x1100 && c <= 0x11ff) || (c >= 0x2e80 && c <= 0xa4cf) || (c >= 0xac00 && c <= 0xd7a3) || (c >= 0xf900 && c <= 0xfaff) || (c >= 0xff00 && c <= 0xffef);
    if (wide) em += 1;
    else if (mono) em += 0.6;
    else if (ch === " ") em += 0.28;
    else if (/[il.,:;'|!()[\]`]/.test(ch)) em += 0.3;
    else if (/[MWmw@%]/.test(ch)) em += 0.84;
    else if (/[A-Z]/.test(ch)) em += 0.66;
    else em += 0.56;
  }
  return em * size * (bold ? 1.04 : 1);
}

function sizeOf(cls: Set<string>): number {
  if (cls.has("xl")) return SVG_TEXT_SIZE.xl;
  if (cls.has("lg")) return SVG_TEXT_SIZE.lg;
  if (cls.has("sm")) return SVG_TEXT_SIZE.sm;
  if (cls.has("xs")) return SVG_TEXT_SIZE.xs;
  return SVG_TEXT_SIZE.base;
}

/** 자기와 조상의 translate 를 더한 자리. rotate·scale 이 끼면 null(점검하지 않는다). */
function offsetOf(nodes: Node[], i: number): { dx: number; dy: number } | null {
  let dx = 0;
  let dy = 0;
  for (let p = i; p >= 0; p = nodes[p].parent) {
    const t = nodes[p].attrs.transform;
    if (!t) continue;
    if (/rotate|scale/.test(t)) return null;
    for (const m of t.matchAll(/translate\(\s*(-?[\d.]+)(?:[\s,]+(-?[\d.]+))?\s*\)/g)) {
      dx += Number(m[1]);
      dy += Number(m[2] ?? 0);
    }
  }
  return { dx, dy };
}

/** 줄의 기준선 y. tspan 은 같은 text 안 앞 tspan 들의 y·dy 를 차례로 따라간다. */
function lineY(nodes: Node[], i: number): number | null {
  const n = nodes[i];
  if (n.tag !== "tspan" || n.parent < 0) return num(n.attrs.y);
  let y = lineY(nodes, n.parent);
  for (let j = 0; j <= i; j++) {
    const c = nodes[j];
    if (c.parent !== n.parent || c.tag !== "tspan") continue;
    const own = num(c.attrs.y);
    if (own !== null) y = own;
    if (y !== null) y += num(c.attrs.dy) ?? 0;
  }
  return y;
}

function panelChecks(nodes: Node[], w: number, h: number, warnings: SvgFigure["warnings"], texts: string[]): { boxes: number; lines: number } {
  const spans: { left: number; right: number; top: number; bottom: number; short: string }[] = [];
  const rectNodes = nodes
    .map((n, i) => ({ n, o: offsetOf(nodes, i) }))
    .filter(({ n, o }) => n.tag === "rect" && !n.cls.has("zone") && o)
    .map(({ n, o }) => ({ x: (num(n.attrs.x) ?? 0) + o!.dx, y: (num(n.attrs.y) ?? 0) + o!.dy, w: num(n.attrs.width) ?? 0, h: num(n.attrs.height) ?? 0 }))
    .filter((r) => r.w > 0 && r.h > 0);
  // 점·사람·표시도 글자에 붙으면 안 된다. 표시(mark-x·mark-ok)는 반지름 8 로 그린다(markGlyph).
  const circles = nodes
    .map((n, i) => ({ n, o: offsetOf(nodes, i) }))
    .filter(({ n, o }) => n.tag === "circle" && o)
    .map(({ n, o }) => ({ cx: (num(n.attrs.cx) ?? 0) + o!.dx, cy: (num(n.attrs.cy) ?? 0) + o!.dy, r: n.cls.has("mark-x") || n.cls.has("mark-ok") ? 8 : (num(n.attrs.r) ?? 0) }))
    .filter((c) => c.r > 0);
  const rects = nodes
    .map((n, i) => ({ n, i }))
    .filter(({ n }) => n.tag === "rect")
    .map(({ n, i }) => {
      const o = offsetOf(nodes, i);
      const x = num(n.attrs.x) ?? 0;
      const y = num(n.attrs.y) ?? 0;
      const rw = num(n.attrs.width);
      const rh = num(n.attrs.height);
      return o && rw && rh ? { x: x + o.dx, y: y + o.dy, w: rw, h: rh } : null;
    })
    .filter((r): r is { x: number; y: number; w: number; h: number } => r !== null);

  nodes.forEach((n, i) => {
    if (n.tag !== "text" && n.tag !== "tspan") return;
    // 줄 하나 = x 를 가진 tspan, 또는 text 자신(자기 글자 + x 없는 tspan 글자).
    if (n.tag === "tspan" && n.attrs.x === undefined) return;
    const words = n.text + nodes.filter((c, j) => j > i && c.parent === i && c.tag === "tspan" && c.attrs.x === undefined).map((c) => c.text).join("");
    const shown = words.replace(/\s+/g, " ").trim();
    if (!shown) return;
    // 글자 모양은 자기와 조상 text 의 클래스를 합쳐 본다.
    const cls = new Set(n.cls);
    let anchorAttr = n.attrs["text-anchor"];
    const y = lineY(nodes, i);
    for (let p = n.parent; p >= 0; p = nodes[p].parent) {
      nodes[p].cls.forEach((c) => cls.add(c));
      anchorAttr ??= nodes[p].attrs["text-anchor"];
    }
    const o = offsetOf(nodes, i);
    const x0 = num(n.attrs.x);
    if (!o || x0 === null || y === null) return;
    const size = sizeOf(cls);
    const tw = textWidth(shown, size, cls.has("mono"), cls.has("b") || cls.has("lg") || cls.has("xl"));
    const anchor = cls.has("mid") ? "middle" : cls.has("end") ? "end" : (anchorAttr ?? "start");
    const x = x0 + o.dx;
    const base = y + o.dy;
    const left = anchor === "middle" ? x - tw / 2 : anchor === "end" ? x - tw : x;
    const right = left + tw;
    const short = shown.length > 24 ? `${shown.slice(0, 24)}…` : shown;
    if (!cls.has("q")) texts.push(shown);
    if (left < -1 || right > w + 1 || base - size * 0.8 < -1 || base > h + 1) {
      warnings.push({ rule: "svg-text-out", message: `글자가 판(${w}×${h}) 밖으로 나갑니다: "${short}". 판을 키우거나 줄을 나눕니다` });
      return;
    }
    const span = { left, right, top: base - size * 0.78, bottom: base + size * 0.22, short };
    spans.push(span);
    // 상자 바깥 글자가 남의 상자 테두리에 닿으면 상자 이름처럼 읽힌다. 글자를 품은 상자와 띠(zone)는 빼고 본다.
    const near = rectNodes.find(
      (r) => !(x >= r.x && x <= r.x + r.w && base - size / 3 >= r.y && base - size / 3 <= r.y + r.h) && span.bottom > r.y - 4 && span.top < r.y + r.h + 4 && left < r.x + r.w + 4 && right > r.x - 4,
    );
    // 원은 중심에서 글자 자리까지의 실제 거리로 잰다(네모로 재면 모서리 빈자리까지 붙었다고 본다).
    const dot = circles.find((c) => {
      if (Math.hypot(x - c.cx, base - size / 3 - c.cy) <= c.r) return false;
      const px = Math.min(Math.max(c.cx, span.left), span.right);
      const py = Math.min(Math.max(c.cy, span.top), span.bottom);
      return Math.hypot(px - c.cx, py - c.cy) - c.r < 4;
    });
    if (near || dot) warnings.push({ rule: "svg-text-tight", message: `글자가 상자·점·표시에 붙습니다: "${short}". 8 이상 띄웁니다` });
    // 글자 자리를 감싼 가장 작은 상자보다 글자가 길거나 테두리에 붙으면 읽기 답답하다(안쪽 여백 6 미만).
    const midY = base - size / 3;
    const box = rects
      .filter((r) => x >= r.x && x <= r.x + r.w && midY >= r.y && midY <= r.y + r.h)
      .sort((a, b) => a.w * a.h - b.w * b.h)[0];
    if (box && (left < box.x + 6 || right > box.x + box.w - 6)) {
      warnings.push({ rule: "svg-text-box", message: `글자가 상자(폭 ${box.w}) 테두리에 붙거나 넘칩니다: "${short}"(약 ${Math.round(tw)}). 상자 폭은 가장 긴 줄 + 24 이상으로` });
    }
  });

  // 글자끼리 붙으면 한 덩어리로 읽힌다. 같은 줄은 가로 6, 위아래 줄은 세로 2 를 띄운다(글자 폭은 어림이라 넉넉히 본다).
  for (let a = 0; a < spans.length; a++) {
    for (let b = a + 1; b < spans.length; b++) {
      const s = spans[a];
      const t = spans[b];
      const xGap = Math.max(s.left, t.left) - Math.min(s.right, t.right);
      const yGap = Math.max(s.top, t.top) - Math.min(s.bottom, t.bottom);
      if ((yGap < 0 && xGap < 6) || (xGap < -2 && yGap < 2)) {
        warnings.push({ rule: "svg-text-tight", message: `글자가 서로 붙습니다: "${s.short}" / "${t.short}". 줄 사이·글자 사이를 띄웁니다` });
      }
    }
  }
  // 선이 글자 한가운데를 지나거나 글자 끝에 붙으면 글자도 선도 안 읽힌다. 선 이름은 글자 끝이 선에서 10 떨어진 빈자리에 두고,
  // 6 안쪽이면 알린다(옛 기준 6~8 은 baseline 기준이라 글자 끝이 선에서 5 남짓이었다. 2026-11-12 사용자 지적).
  nodes.forEach((n, i) => {
    if (n.tag !== "line") return;
    const o = offsetOf(nodes, i);
    const [x1, y1, x2, y2] = [n.attrs.x1, n.attrs.y1, n.attrs.x2, n.attrs.y2].map(num);
    if (!o || x1 === null || y1 === null || x2 === null || y2 === null) return;
    const hit = spans.find((s) => {
      for (let k = 0; k <= 24; k++) {
        const px = x1 + o.dx + ((x2 - x1) * k) / 24;
        const py = y1 + o.dy + ((y2 - y1) * k) / 24;
        if (px > s.left - 6 && px < s.right + 6 && py > s.top - 6 && py < s.bottom + 6) return true;
      }
      return false;
    });
    if (hit) warnings.push({ rule: "svg-line-text", message: `선이 글자를 지나거나 6 안쪽으로 붙습니다: "${hit.short}". 선 이름은 글자 끝이 선에서 10 떨어지게 둡니다(xs·sm 가로선 위 baseline = 선 y − 12, 아래 = 선 y + 20)` });
  });

  // 선 없는 상자는 그림 전체로 본다(parseSvgFigure) — 두 판 비교에서 한쪽 판에만 선이 없는 것은 뜻이 있다.
  const boxes = nodes.filter((n) => (n.tag === "rect" && !n.cls.has("zone")) || ((n.tag === "circle" || n.tag === "ellipse") && !n.cls.has("dot") && !n.cls.has("mark-x") && !n.cls.has("mark-ok"))).length;
  const lines = nodes.filter((n) => n.tag === "line" || n.tag === "path" || n.tag === "polyline" || n.tag === "polygon").length;
  return { boxes, lines };
}

/* ── 거르기 ─────────────────────────────────────────────────────────── */

function cleanAttrs(tag: string, source: string, dropped: Set<string>): { out: string; attrs: Record<string, string>; cls: Set<string> } {
  const out: string[] = [];
  const attrs: Record<string, string> = {};
  const cls = new Set<string>();
  for (const m of source.matchAll(ATTR)) {
    const name = m[1].toLowerCase();
    const value = (m[2] ?? m[3] ?? m[4] ?? "").trim();
    if (name === "class") {
      for (const c of value.split(/\s+/).filter(Boolean)) {
        if (SVG_CLASSES.has(c)) cls.add(c);
        else dropped.add(`class ${c}`);
      }
      continue;
    }
    let ok = false;
    if (NUM_ATTRS.has(name)) ok = NUM.test(value);
    else if (name === "points") ok = (tag === "polyline" || tag === "polygon") && POINTS.test(value);
    else if (name === "d") ok = tag === "path" && PATH_D.test(value);
    else if (name === "transform") ok = TRANSFORM.test(value);
    else if (name === "text-anchor") ok = /^(start|middle|end)$/.test(value);
    else if (name === "marker-start" || name === "marker-end" || name === "marker-mid") {
      const mk = value.match(MARKER_URL);
      if (mk && MARKERS.has(mk[1])) {
        out.push(`${name}="url(#@${mk[1]})"`);
        attrs[name] = value;
        continue;
      }
    }
    if (ok) {
      out.push(`${name}="${escAttr(value)}"`);
      attrs[name] = value;
    } else dropped.add(`${name}=${name === "fill" || name === "stroke" || name === "style" || name === "font-size" ? " (색·크기는 클래스로)" : ""}`);
  }
  if (cls.size) out.push(`class="${[...cls].join(" ")}"`);
  return { out: out.length ? ` ${out.join(" ")}` : "", attrs, cls };
}

/** 막힘·통과 표시 — 원과 글리프를 함께 그린다. */
function markGlyph(kind: "mark-x" | "mark-ok", cx: number, cy: number): string {
  const d =
    kind === "mark-x"
      ? `M${cx - 3.2} ${cy - 3.2}L${cx + 3.2} ${cy + 3.2}M${cx + 3.2} ${cy - 3.2}L${cx - 3.2} ${cy + 3.2}`
      : `M${cx - 3.8} ${cy + 0.2}L${cx - 1.2} ${cy + 2.8}L${cx + 3.8} ${cy - 2.6}`;
  return `<g class="${kind}"><circle cx="${cx}" cy="${cy}" r="8"></circle><path d="${d}"></path></g>`;
}

function parseHeader(lines: string[]) {
  let title: string | undefined;
  let caption: string | undefined;
  const legend: SvgFigure["legend"] = [];
  const errors: string[] = [];
  let i = 0;
  for (; i < lines.length; i++) {
    const t = lines[i].trim();
    if (!t) continue;
    if (t.startsWith("<")) break;
    const m = t.match(/^(title|caption|legend)\s*:\s*(.*)$/i);
    if (!m) {
      errors.push(`머리 줄은 title:·caption:·legend: 만 씁니다: "${t.slice(0, 30)}"`);
      continue;
    }
    const key = m[1].toLowerCase();
    const v = m[2].trim();
    if (key === "title") title = v;
    else if (key === "caption") caption = v;
    else {
      for (const part of v.split(";").map((p) => p.trim()).filter(Boolean)) {
        const kv = part.match(/^([a-z]+)\s*=\s*(.+)$/);
        if (kv && (SVG_LEGEND_KEYS as readonly string[]).includes(kv[1])) legend.push({ key: kv[1] as LegendKey, label: kv[2].trim().slice(0, 40) });
        else errors.push(`legend 항목은 ${SVG_LEGEND_KEYS.join("·")}=설명 꼴입니다: "${part.slice(0, 20)}"`);
      }
    }
  }
  return { title, caption, legend, errors, rest: lines.slice(i).join("\n") };
}

export function parseSvgFigure(source: string): SvgFigure {
  const head = parseHeader(source.split("\n"));
  const dropped = new Set<string>();
  const errors = [...head.errors];
  const warnings: SvgFigure["warnings"] = [];
  const texts: string[] = [];
  const panels: SvgPanel[] = [];
  const input = head.rest;
  if (input.length > MAX_SVG_FIGURE) {
    return { ...head, panels: [], dropped: [], errors: [`길이 ${input.length}자(${MAX_SVG_FIGURE}자까지)`], warnings: [], texts: [] };
  }

  let panel: { out: string[]; stack: string[]; nodes: Node[]; open: number[]; w: number; h: number; only?: "wide" | "narrow" } | null = null;
  let skip: { tag: string; depth: number } | null = null;
  let last = 0;

  let boxes = 0;
  let lines = 0;
  const closePanel = () => {
    if (!panel) return;
    while (panel.stack.length) panel.out.push(`</${panel.stack.pop()}>`);
    panel.out.push("</svg>");
    const c = panelChecks(panel.nodes, panel.w, panel.h, warnings, texts);
    boxes = Math.max(boxes, c.boxes);
    lines += c.lines;
    panels.push({ html: panel.out.join(""), width: panel.w, height: panel.h, only: panel.only });
    panel = null;
  };

  for (const m of input.matchAll(TOKEN)) {
    const text = input.slice(last, m.index);
    last = m.index! + m[0].length;
    if (!skip && text) {
      const cur = panel?.open.at(-1);
      const owner = panel && cur !== undefined ? panel.nodes[cur] : undefined;
      if (panel && owner && (owner.tag === "text" || owner.tag === "tspan")) {
        panel.out.push(escText(text));
        owner.text += text;
      } else if (text.trim()) dropped.add("글자(text 밖)");
    }
    if (!m[1]) continue; // 주석

    const tag = m[1].toLowerCase();
    const closing = m[0].startsWith("</");
    const selfClose = m[0].endsWith("/>");

    if (skip) {
      // 닫히지 않은 버림 태그가 판 끝(</svg>)까지 삼키지 않게 판 끝에서 멈춘다.
      if (tag === "svg" && closing && skip.tag !== "svg") skip = null;
      else {
        if (tag === skip.tag && !selfClose) skip.depth += closing ? -1 : 1;
        if (skip.depth === 0) skip = null;
        continue;
      }
    }
    if (DROP_TAG.has(tag)) {
      if (!closing) dropped.add(`<${tag}>`);
      continue;
    }
    if (tag === "svg") {
      if (closing) {
        closePanel();
        continue;
      }
      if (panel) {
        dropped.add("<svg> 안의 <svg>");
        continue;
      }
      let vb: string | undefined;
      let label: string | undefined;
      let only: "wide" | "narrow" | undefined;
      for (const a of (m[2] ?? "").matchAll(ATTR)) {
        const name = a[1].toLowerCase();
        const value = (a[2] ?? a[3] ?? a[4] ?? "").trim();
        if (name === "viewbox") vb = value;
        else if (name === "aria-label") label = value.slice(0, 200);
        else if (name === "data-only" && (value === "wide" || value === "narrow")) only = value;
        else if (name !== "xmlns" && name !== "role") dropped.add(`svg ${name}=`);
      }
      const vm = vb?.match(/^0[\s,]+0[\s,]+(\d{2,4}(?:\.\d+)?)[\s,]+(\d{2,4}(?:\.\d+)?)$/);
      if (!vm) {
        errors.push('<svg> 에 viewBox="0 0 폭 높이" 가 있어야 합니다');
        skip = { tag: "svg", depth: 1 };
        continue;
      }
      const w = Number(vm[1]);
      const h = Number(vm[2]);
      if (only === "wide" ? w > SVG_WIDE_MAX : w > SVG_PANEL_MAX) {
        errors.push(
          only === "wide"
            ? `data-only="wide" 판은 폭 ${SVG_WIDE_MAX} 까지입니다(지금 ${w})`
            : `판 폭은 ${SVG_PANEL_MAX} 까지입니다(지금 ${w}). 휴대폰 폭으로 그리고, 더 넓은 그림은 data-only="wide" 판과 data-only="narrow" 판을 같이 둡니다`,
        );
      }
      const aria = label ?? head.title ?? "";
      panel = {
        out: [`<svg viewBox="0 0 ${w} ${h}" role="img"${aria ? ` aria-label="${escAttr(aria)}"` : ""}>`],
        stack: [],
        nodes: [],
        open: [],
        w,
        h,
        only,
      };
      if (selfClose) closePanel();
      continue;
    }
    if (!panel) {
      if (!closing) dropped.add(`<${tag}>(svg 밖)`);
      if (DROP_ALL.has(tag) && !closing && !selfClose) skip = { tag, depth: 1 };
      continue;
    }
    if (DROP_ALL.has(tag)) {
      if (!closing) dropped.add(`<${tag}>`);
      if (!closing && !selfClose) skip = { tag, depth: 1 };
      continue;
    }
    if (!TAGS.has(tag)) {
      if (!closing) dropped.add(`<${tag}>`);
      continue;
    }
    if (closing) {
      const at = panel.stack.lastIndexOf(tag);
      if (at < 0) continue;
      while (panel.stack.length > at) {
        panel.out.push(`</${panel.stack.pop()}>`);
        panel.open.pop();
      }
      continue;
    }
    const { out, attrs, cls } = cleanAttrs(tag, m[2] ?? "", dropped);
    const parent = panel.open.at(-1) ?? -1;
    // tspan 은 text 안에서만, text 안에는 tspan 만.
    if (tag === "tspan" && (parent < 0 || (panel.nodes[parent].tag !== "text" && panel.nodes[parent].tag !== "tspan"))) {
      dropped.add("<tspan>(text 밖)");
      continue;
    }
    if (parent >= 0 && (panel.nodes[parent].tag === "text" || panel.nodes[parent].tag === "tspan") && tag !== "tspan") {
      dropped.add(`<${tag}>(text 안)`);
      if (!selfClose) skip = { tag, depth: 1 };
      continue;
    }
    const mark = tag === "circle" ? (cls.has("mark-x") ? "mark-x" : cls.has("mark-ok") ? "mark-ok" : null) : null;
    if (mark) {
      const cx = num(attrs.cx);
      const cy = num(attrs.cy);
      if (cx === null || cy === null) dropped.add(`${mark}(cx·cy 없음)`);
      else panel.out.push(markGlyph(mark, cx, cy));
      panel.nodes.push({ tag, attrs, cls, parent, text: "" });
      if (!selfClose) skip = { tag, depth: 1 };
      continue;
    }
    panel.nodes.push({ tag, attrs, cls, parent, text: "" });
    if (selfClose) {
      panel.out.push(`<${tag}${out}></${tag}>`);
      continue;
    }
    panel.out.push(`<${tag}${out}>`);
    panel.stack.push(tag);
    panel.open.push(panel.nodes.length - 1);
  }
  if (panel) {
    errors.push("<svg> 가 닫히지 않았습니다");
    closePanel();
  }

  if (!panels.length && !errors.length) errors.push("<svg> 판이 하나도 없습니다");
  if (boxes >= 2 && lines === 0) {
    warnings.push({ rule: "svg-no-edge", message: "상자만 있고 잇는 선이 없습니다. 무엇이 어디로 가는지 선(edge)과 선 이름으로 그립니다. 나란한 목록이면 표나 문장으로" });
  }
  const wide = panels.filter((p) => p.only === "wide").length;
  const narrow = panels.filter((p) => p.only === "narrow").length;
  if (wide && !narrow) errors.push('data-only="wide" 판에는 휴대폰에서 대신 보일 data-only="narrow" 판이 있어야 합니다');
  if (narrow && !wide) errors.push('data-only="narrow" 판은 data-only="wide" 판과 짝으로 씁니다');

  return { title: head.title, caption: head.caption, legend: head.legend, panels, dropped: [...dropped], errors, warnings, texts };
}

/** 결론 문장인가 — 평서문 끝(…다)으로 끝나야 한다. "~하는 순서" 같은 주제 명사구를 잡는다. */
export const isClaim = (title: string): boolean =>
  /[다요][.!]?$/.test(title.trim().replace(/\s*\([^()]*\)$/, "").replace(/["'”’」』)\]]+$/, ""));
