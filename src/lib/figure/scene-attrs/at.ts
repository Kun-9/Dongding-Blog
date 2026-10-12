import { items, keysFit } from "./range";
import { SPOT_NAME } from "./spot";
import type { SceneAttr, SceneCtx } from "./types";

/** `2:server` 또는 `2:browser>attacker`(그 단계에 browser 에서 출발해 attacker 로). */
const ITEM = `\\d{1,2}:(?:${SPOT_NAME}>)?${SPOT_NAME}`;
const VALID = new RegExp(`^${ITEM}(?:\\|${ITEM})*$`);

/** 요소마다 마지막으로 입힌 단계 — 앞 단계에서 넘어왔을 때만 출발 자리에서 떠난다. */
const last = new WeakMap<Element, number>();

type Item = { k: number; from: string | null; to: string };

/** 단계 n 의 항목 — n 까지 가장 늦게 정해진 것. 아직 없으면 가장 이른 항목(그 출발 자리에서 기다린다). */
function pick(spec: string, n: number): { it: Item; waiting: boolean } | null {
  const list: Item[] = items(spec).map(({ key, value }) => {
    const [from, to] = value.includes(">") ? value.split(">") : [null, value];
    return { k: Number(key), from, to };
  });
  let got: Item | null = null;
  for (const it of list) if (it.k <= n && (!got || it.k > got.k)) got = it;
  if (got) return { it: got, waiting: false };
  const first = list.reduce<Item | null>((a, b) => (!a || b.k < a.k ? b : a), null);
  return first ? { it: first, waiting: true } : null;
}

/**
 * 판(.sc-html) 기준 원래 자리 — offset 값을 판까지 더한다. getBoundingClientRect 는 옮기는 중인 칩이나
 * 막 나타나는 칸(sc-off 의 translate)의 움직이는 위치를 줘서, 다 선 뒤의 자리와 어긋난다.
 */
function origin(el: HTMLElement, root: Element): { x: number; y: number } | null {
  let x = 0;
  let y = 0;
  let e: HTMLElement | null = el;
  while (e && e !== root) {
    x += e.offsetLeft;
    y += e.offsetTop;
    const op = e.offsetParent as HTMLElement | null;
    if (!op) return null;
    if (op !== root) {
      x += op.clientLeft;
      y += op.clientTop;
    }
    e = op;
  }
  return e === root ? { x, y } : null;
}

/** 요소를 자리 한가운데로 옮길 translate. 판 밖으로 나가지 않게 가로를 묶는다. 자리가 없으면 null. */
function offset(el: HTMLElement, name: string): string | null {
  const root = el.closest(".sc-html");
  const spot = root?.querySelector<HTMLElement>(`[data-spot="${name}"]`);
  if (!root || !spot) return null;
  const a = origin(el, root);
  const b = origin(spot, root);
  if (!a || !b) return null;
  const left = Math.min(Math.max(0, b.x + spot.offsetWidth / 2 - el.offsetWidth / 2), Math.max(0, root.clientWidth - el.offsetWidth));
  const x = left - a.x;
  const y = b.y + spot.offsetHeight / 2 - el.offsetHeight / 2 - a.y;
  return `${x.toFixed(1)}px ${y.toFixed(1)}px`;
}

/**
 * 미끄러지지 않고 바로 그 자리로. translate 전환만 끄고(나머지 전환은 그대로 — 막 나타나는 칩의
 * 페이드가 끊기지 않게) 자리를 정한 뒤 되돌린다. 목록 자리를 지키려고 translate 를 빈 이름으로 바꾼다.
 */
function jump(el: HTMLElement, to: string) {
  el.style.transitionProperty = getComputedStyle(el).transitionProperty.replace(/\btranslate\b/, "--at-jump");
  el.style.translate = to;
  void el.offsetWidth;
  el.style.transitionProperty = "";
}

function place(el: HTMLElement, n: number, ctx: SceneCtx) {
  const prev = last.get(el);
  last.set(el, n);
  const got = pick(el.dataset.at ?? "", n);
  if (!got) return;
  const { it, waiting } = got;
  // 아직 오지 않은 요소는 출발 자리에서 기다린다.
  const to = offset(el, waiting ? (it.from ?? it.to) : it.to);
  if (!to) return;
  // 앞 단계에서 넘어왔고(건너뛰어 왔어도) 출발 자리가 있으면 거기서 떠난다 — 복사본이 원본 자리에서 나오는 모양.
  const from = !waiting && it.from && it.k === n && prev !== undefined && prev < n && !ctx.instant ? offset(el, it.from) : null;
  if (from) jump(el, from);
  if (ctx.instant) jump(el, to);
  else el.style.translate = to;
}

/** 단계마다 요소를 이름 붙인 자리(`data-spot`)로 옮긴다 — `1:server>browser|2:attacker`. */
export const at: SceneAttr = {
  name: "data-at",
  valid: (v) => VALID.test(v),
  fits: keysFit,
  apply: place,
  layout: true,
  check(html) {
    // 태그 안만 본다 — 거른 HTML 에서 글자의 < 는 &lt; 라 <로 시작하는 것은 진짜 태그뿐이다. 값의 `>` 는 `&gt;`.
    const tags = [...html.matchAll(/<[a-z][^>]*>/g)].map((m) => m[0]);
    const attr = (name: string) => tags.flatMap((t) => [...t.matchAll(new RegExp(`${name}="([^"]+)"`, "g"))].map((m) => m[1]));
    const spots = new Set(attr("data-spot"));
    const used = attr("data-at").flatMap((v) => items(v.replace(/&gt;/g, ">")).flatMap(({ value }) => value.split(">")));
    const missing = [...new Set(used.filter((s) => !spots.has(s)))];
    return missing.length ? [`data-at 이 가리키는 자리가 없습니다: ${missing.join(", ")}. 그 칸에 data-spot="이름" 을 다세요`] : [];
  },
  doc: {
    example: 'data-at="1:server>browser|3:attacker"',
    meaning: "요소가 판 위에 떠서 단계마다 그 자리(`data-spot`)로 미끄러진다. `from>to` 는 그 단계에 from 에서 출발한다(복사본이 원본 자리에서 나오는 모양)",
  },
};
