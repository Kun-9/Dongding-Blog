/**
 * ```figure 블록 — 디자인 키트(`fig-*` 클래스) 로 짠 HTML 그림.
 *
 * 그림 블록(lib/diagram.ts)으로 안 되는 구성만 여기로 온다. 모양을 마음대로
 * 정하게 두면 그림마다 색·간격이 달라지고 다크 모드에서 묻힌다. 그래서
 * 조합만 자유롭고, 생김새는 키트가 정한다:
 *
 * - 태그는 글 구조용만(div·span·ul·table…). 링크·이미지·스크립트·SVG 없음
 * - class 는 `fig-` 로 시작하는 것만
 * - style 은 배치 속성(grid·flex·gap·폭·정렬)만. 색·글꼴·위치는 지운다
 * - 모션은 `data-anim`·`data-loop` 의 정해진 값과 숫자 `data-from`, 자세히는 `data-detail`(200자) 만
 *
 * 받은 문자열을 거르는 대신 토큰을 읽어 허용된 것만 새로 쓴다. 지운 것은
 * `dropped` 로 돌려줘 점검기가 알린다.
 *
 * DOM 없이 도는 순수 모듈이다 — 서버 렌더와 점검기에서 같이 쓴다.
 */

const TAGS = new Set([
  "div", "span", "p", "ul", "ol", "li", "strong", "em", "b", "i", "code", "small",
  "mark", "kbd", "sub", "sup", "br", "hr",
  "table", "thead", "tbody", "tr", "th", "td", "details", "summary",
]);
const VOID = new Set(["br", "hr"]);
/** 내용까지 통째로 버리는 태그. */
const DROP_ALL = new Set([
  "script", "style", "iframe", "object", "embed", "svg", "math", "template",
  "noscript", "textarea", "select", "title", "head", "video", "audio", "canvas",
]);

const STYLE_PROPS = new Set([
  "display", "grid-template-columns", "grid-template-rows", "grid-column", "grid-row",
  "grid-auto-flow", "gap", "row-gap", "column-gap", "flex", "flex-direction",
  "flex-wrap", "flex-basis", "flex-grow", "flex-shrink", "order", "align-items",
  "align-self", "justify-content", "justify-items", "justify-self", "place-items",
  "text-align", "width", "min-width", "max-width", "height", "min-height",
  "margin-top", "margin-bottom", "margin-inline", "padding", "--v", "--i",
]);
/**
 * 그림 모션 표기(lib/figure-motion). `data-anim` 은 스크롤에 맞춘 등장,
 * `data-loop` 는 그림이 화면에 있을 때만 도는 반복이다. 그림 블록·figure·SVG 공통.
 */
export const ANIMS = ["rise", "fade", "pop", "draw", "draw-back", "grow", "count", "none"] as const;
export const LOOPS = ["orbit", "pulse"] as const;
export type Anim = (typeof ANIMS)[number];

const STYLE_VALUE = /^[a-zA-Z0-9\s.,%()#+\-*/]{1,80}$/;
const STYLE_BANNED = /url|expression|image|attr|javascript/i;

export const MAX_FIGURE_HTML = 30_000;

export interface FigureHtml {
  caption?: string;
  html: string;
  /** 지운 태그·속성·클래스. 비어 있으면 원문 그대로 살았다. */
  dropped: string[];
}

const ENTITY = /&(?![a-zA-Z][a-zA-Z0-9]{1,31};|#\d{1,7};|#x[0-9a-fA-F]{1,6};)/g;
const escText = (s: string) => s.replace(ENTITY, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const escAttr = (s: string) => escText(s).replace(/"/g, "&quot;");

const TOKEN = /<!--[\s\S]*?-->|<\/?([a-zA-Z][a-zA-Z0-9-]*)((?:\s+[^\s"'>/=]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s"'=<>`]+))?)*)\s*\/?>/g;
const ATTR = /([^\s"'>/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;

function cleanStyle(value: string, dropped: Set<string>): string {
  const kept: string[] = [];
  for (const decl of value.split(";")) {
    const at = decl.indexOf(":");
    if (at < 0) continue;
    const prop = decl.slice(0, at).trim().toLowerCase();
    const v = decl.slice(at + 1).trim();
    if (!prop) continue;
    // 음수 여백은 위 문단을 덮는다.
    const negative = prop.startsWith("margin") && /-/.test(v);
    if (STYLE_PROPS.has(prop) && STYLE_VALUE.test(v) && !STYLE_BANNED.test(v) && !negative) kept.push(`${prop}: ${v}`);
    else dropped.add(`style ${prop}`);
  }
  return kept.join("; ");
}

function cleanAttrs(tag: string, source: string, dropped: Set<string>): string {
  const out: string[] = [];
  for (const m of source.matchAll(ATTR)) {
    const name = m[1].toLowerCase();
    const value = m[2] ?? m[3] ?? m[4] ?? "";
    if (name === "class") {
      const keep: string[] = [];
      for (const c of value.split(/\s+/).filter(Boolean)) {
        if (/^fig-[a-z0-9-]+$/.test(c)) keep.push(c);
        else dropped.add(`class ${c}`);
      }
      if (keep.length) out.push(`class="${keep.join(" ")}"`);
    } else if (name === "style") {
      const s = cleanStyle(value, dropped);
      if (s) out.push(`style="${escAttr(s)}"`);
    } else if ((name === "colspan" || name === "rowspan") && (tag === "td" || tag === "th") && /^\d{1,2}$/.test(value)) {
      out.push(`${name}="${value}"`);
    } else if (name === "scope" && tag === "th" && /^(row|col)$/.test(value)) {
      out.push(`scope="${value}"`);
    } else if ((name === "title" || name === "aria-label") && value.length <= 120) {
      out.push(`${name}="${escAttr(value)}"`);
    } else if (
      (name === "data-anim" && (ANIMS as readonly string[]).includes(value)) ||
      (name === "data-loop" && (LOOPS as readonly string[]).includes(value))
    ) {
      out.push(`${name}="${value}"`);
    } else if (name === "data-detail" && value.trim() && value.length <= 200) {
      // 누르면 열리는 자세히. 글자로만 쓰인다(lib/figure-detail).
      out.push(`data-detail="${escAttr(value.trim())}"`);
    } else if (name === "data-from" && /^-?\d+(\.\d+)?$/.test(value)) {
      out.push(`data-from="${value}"`);
    } else if (name === "aria-hidden" && value === "true") {
      out.push(`aria-hidden="true"`);
    } else if (name === "open" && tag === "details") {
      out.push("open");
    } else {
      // 모션 표기는 값이 틀린 것이라 값까지 보여 준다.
      dropped.add(name === "data-anim" || name === "data-loop" ? `${name}="${value}"` : `${name}=`);
    }
  }
  return out.length ? ` ${out.join(" ")}` : "";
}

export function sanitizeFigureHtml(input: string): { html: string; dropped: string[] } {
  const dropped = new Set<string>();
  if (input.length > MAX_FIGURE_HTML) {
    return { html: "", dropped: [`길이 ${input.length}자(${MAX_FIGURE_HTML}자까지)`] };
  }
  const out: string[] = [];
  const stack: string[] = [];
  /** DROP_ALL 태그 안을 건너는 중이면 그 태그 이름과 깊이. */
  let skip: { tag: string; depth: number } | null = null;
  let last = 0;

  for (const m of input.matchAll(TOKEN)) {
    const text = input.slice(last, m.index);
    last = m.index! + m[0].length;
    if (!skip && text) out.push(escText(text));
    if (!m[1]) continue; // 주석

    const tag = m[1].toLowerCase();
    const closing = m[0].startsWith("</");

    if (skip) {
      if (tag === skip.tag) skip.depth += closing ? -1 : 1;
      if (skip.depth === 0) skip = null;
      continue;
    }
    if (DROP_ALL.has(tag)) {
      dropped.add(`<${tag}>`);
      if (!closing && !m[0].endsWith("/>")) skip = { tag, depth: 1 };
      continue;
    }
    if (!TAGS.has(tag)) {
      // 태그만 지우고 안의 글자는 살린다.
      if (!closing) dropped.add(`<${tag}>`);
      continue;
    }
    if (closing) {
      const at = stack.lastIndexOf(tag);
      if (at < 0) continue;
      while (stack.length > at) out.push(`</${stack.pop()}>`);
      continue;
    }
    out.push(`<${tag}${cleanAttrs(tag, m[2] ?? "", dropped)}>`);
    if (!VOID.has(tag)) stack.push(tag);
  }
  if (!skip) out.push(escText(input.slice(last)));
  while (stack.length) out.push(`</${stack.pop()}>`);
  return { html: out.join(""), dropped: [...dropped] };
}

/** 펜스 원문 → 캡션 + 거른 HTML. */
export function parseFigureHtml(source: string): FigureHtml {
  let caption: string | undefined;
  const lines = source.split("\n");
  const at = lines.findIndex((l) => l.trim());
  const cap = at >= 0 ? lines[at].trim().match(/^caption\s*:\s*(.+)$/i) : null;
  if (cap) {
    caption = cap[1].trim();
    lines.splice(at, 1);
  }
  const { html, dropped } = sanitizeFigureHtml(lines.join("\n").trim());
  return { caption, html, dropped };
}
