/**
 * 본문 SVG 를 인라인으로 그리기 전 처리 — 거르고, 블로그 테마 색으로 바꾼다.
 *
 * SVG 를 <img> 로 넣으면 그림이 페이지의 CSS 변수를 못 본다. 그래서 그림을
 * 그린 쪽이 고른 회색이 다크 배경에서 묻혔다. 본문에 직접 그리면
 * `var(--ink)` 같은 변수가 그대로 먹는다.
 *
 * - 변수로 그린 새 그림은 손대지 않는다.
 * - 색을 박아 넣은 옛 그림은 밝기로 판정해 무채색만 테마 변수로 바꾼다.
 *   유채색(강조색)은 그대로 둔다 — 그린 사람이 일부러 고른 색이다.
 *
 * 브라우저 DOM API 를 쓴다. 클라이언트에서만 부른다.
 */

/** 거르는 요소·속성. 저장할 때도 막지만 그리기 전에 한 번 더 거른다. */
const DROP_TAGS = ["script", "foreignObject", "iframe", "object", "embed", "audio", "video"];

interface Rgb {
  r: number;
  g: number;
  b: number;
  a: number;
}

function parseColor(v: string): Rgb | null {
  const s = v.trim().toLowerCase();
  if (s === "white") return { r: 255, g: 255, b: 255, a: 1 };
  if (s === "black") return { r: 0, g: 0, b: 0, a: 1 };
  let m = s.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/);
  if (m) {
    const h = m[1].length === 3 ? m[1].replace(/./g, (c) => c + c) : m[1];
    return {
      r: parseInt(h.slice(0, 2), 16),
      g: parseInt(h.slice(2, 4), 16),
      b: parseInt(h.slice(4, 6), 16),
      a: 1,
    };
  }
  m = s.match(/^rgba?\(([^)]+)\)$/);
  if (m) {
    const [r, g, b, a = "1"] = m[1].split(",").map((x) => x.trim());
    return { r: +r, g: +g, b: +b, a: +a };
  }
  return null;
}

/** 무채색이면 밝기(0~1), 유채색이면 null. */
function grayLevel(c: Rgb): number | null {
  const max = Math.max(c.r, c.g, c.b);
  const min = Math.min(c.r, c.g, c.b);
  if (max - min > 40) return null; // 유채색
  return (0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b) / 255;
}

/**
 * 박힌 무채색을 테마 변수로. 글자·선·채움마다 다른 변수를 고른다.
 * 캔버스 전체를 덮는 배경은 패널 색, 그 위의 밝은 상자는 한 단계 밝은
 * 표면색으로 가른다 — 둘을 같은 색으로 바꾸면 상자가 배경에 묻힌다.
 */
function themed(
  prop: "fill" | "stroke",
  value: string,
  isText: boolean,
  isBackdrop = false,
): string | null {
  if (!value || value === "none" || value.startsWith("url(") || value.includes("var(")) return null;
  if (value === "currentColor") return "var(--ink)";
  const c = parseColor(value);
  if (!c) return null;
  const level = grayLevel(c);
  if (level === null) return null;

  if (isText) return level < 0.3 ? "var(--ink)" : "var(--ink-muted)";
  if (prop === "stroke") {
    // 옅은 선도 다크에서 보이게 진한 테두리 색으로 올린다.
    return level < 0.3 ? "var(--ink-soft)" : "var(--border-strong)";
  }
  // 채움
  if (level < 0.3) return "var(--ink)";
  if (level < 0.75) return "var(--ink-muted)";
  if (c.a < 0.6) return "var(--hover)";
  return isBackdrop ? "var(--surface-alt)" : "var(--surface)";
}

/** 그리기 전 처리. 실패하면 null — 호출부는 <img> 로 떨어진다. */
export function prepareSvg(source: string): string | null {
  if (typeof DOMParser === "undefined") return null;
  const doc = new DOMParser().parseFromString(source, "image/svg+xml");
  const svg = doc.documentElement;
  if (svg.nodeName.toLowerCase() !== "svg" || doc.querySelector("parsererror")) return null;

  for (const tag of DROP_TAGS) doc.querySelectorAll(tag).forEach((n) => n.remove());

  // 캔버스를 거의 다 덮는 사각형 = 배경 패널.
  const vb = (svg.getAttribute("viewBox") ?? "").split(/[\s,]+/).map(Number);
  const cw = vb.length === 4 ? vb[2] : Number(svg.getAttribute("width")) || 0;
  const ch = vb.length === 4 ? vb[3] : Number(svg.getAttribute("height")) || 0;
  const isBackdrop = (el: Element) => {
    if (el.nodeName.toLowerCase() !== "rect" || !cw || !ch) return false;
    const w = el.getAttribute("width") ?? "";
    const h = el.getAttribute("height") ?? "";
    const full = (v: string, total: number) => v.endsWith("%") ? parseFloat(v) >= 90 : Number(v) >= total * 0.9;
    return full(w, cw) && full(h, ch);
  };

  const all = [svg, ...Array.from(svg.querySelectorAll("*"))];
  for (const el of all) {
    for (const attr of Array.from(el.attributes)) {
      const name = attr.name.toLowerCase();
      const v = attr.value.trim();
      if (name.startsWith("on")) el.removeAttribute(attr.name);
      // 문서 안 참조(#id)와 data: 이미지만 남긴다.
      else if ((name === "href" || name === "xlink:href") && !v.startsWith("#") && !v.startsWith("data:image/")) {
        el.removeAttribute(attr.name);
      }
    }

    const tag = el.nodeName.toLowerCase();
    const isText = tag === "text" || tag === "tspan" || tag === "textpath";
    for (const prop of ["fill", "stroke"] as const) {
      const attrVal = el.getAttribute(prop);
      if (attrVal) {
        const t = themed(prop, attrVal, isText, isBackdrop(el));
        if (t) el.setAttribute(prop, t);
      }
      const style = (el as SVGElement).style;
      const styleVal = style?.getPropertyValue(prop);
      if (styleVal) {
        const t = themed(prop, styleVal, isText, isBackdrop(el));
        if (t) style.setProperty(prop, t);
      }
    }
    // 색 없이 둔 글자는 SVG 기본값(검정)이 다크에서 안 보인다.
    if (isText && !el.getAttribute("fill") && !(el as SVGElement).style?.getPropertyValue("fill")) {
      const parentFill = el.parentElement?.closest("[fill]")?.getAttribute("fill");
      if (!parentFill) el.setAttribute("fill", "var(--ink)");
    }
  }

  // 본문 폭에 맞춰 늘고 줄게. 고정 크기는 viewBox 로 옮긴다.
  const w = svg.getAttribute("width");
  const h = svg.getAttribute("height");
  if (!svg.getAttribute("viewBox") && w && h && !isNaN(+w) && !isNaN(+h)) {
    svg.setAttribute("viewBox", `0 0 ${+w} ${+h}`);
  }
  svg.removeAttribute("width");
  svg.removeAttribute("height");
  svg.setAttribute("width", "100%");
  svg.setAttribute("role", "img");
  if (!svg.getAttribute("font-family")) svg.setAttribute("font-family", "inherit");
  // 그림마다 marker·gradient id 가 겹치면 서로의 화살표를 가져다 쓴다.
  // 그대로 두되, 같은 글에 그림이 여럿이면 호출부가 접두어를 붙인다.

  return new XMLSerializer().serializeToString(svg);
}

/** 같은 페이지의 여러 SVG 가 같은 id(#arrow 등)를 쓰면 엉킨다. 접두어로 가른다. */
export function scopeIds(svgText: string, prefix: string): string {
  const ids = [...svgText.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
  let out = svgText;
  for (const id of new Set(ids)) {
    const safe = id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    out = out
      .replace(new RegExp(`\\sid="${safe}"`, "g"), ` id="${prefix}-${id}"`)
      .replace(new RegExp(`url\\(#${safe}\\)`, "g"), `url(#${prefix}-${id})`)
      .replace(new RegExp(`(href)="#${safe}"`, "g"), `$1="#${prefix}-${id}"`);
  }
  return out;
}
