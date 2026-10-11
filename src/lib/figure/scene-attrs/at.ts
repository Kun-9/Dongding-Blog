import { items, keysFit } from "./range";
import { SPOT_NAME } from "./spot";
import type { SceneAttr, SceneCtx } from "./types";

/** `2:server` 또는 `2:browser>attacker`(그 단계에 browser 에서 출발해 attacker 로). */
const ITEM = `\\d{1,2}:(?:${SPOT_NAME}>)?${SPOT_NAME}`;
const VALID = new RegExp(`^${ITEM}(?:\\|${ITEM})*$`);

/** 요소마다 마지막으로 입힌 단계 — 바로 앞 단계에서 왔을 때만 출발 자리에서 떠난다. */
const last = new WeakMap<Element, number>();

/** 단계 n 의 항목. n 보다 앞 항목이 없으면 첫 항목(아직 오지 않은 요소는 첫 자리에서 기다린다). */
function pick(spec: string, n: number) {
  const list = items(spec).map(({ key, value }) => {
    const [from, to] = value.includes(">") ? value.split(">") : [null, value];
    return { k: Number(key), from, to };
  });
  let got = list[0];
  for (const it of list) if (it.k <= n && it.k >= got.k) got = it;
  return got;
}

/** 요소를 자리 한가운데로 옮길 translate. 자리나 기준 상자가 없으면 null. */
function offset(el: HTMLElement, name: string): string | null {
  const root = el.closest(".sc-html") ?? el.parentElement;
  const spot = root?.querySelector(`[data-spot="${name}"]`);
  const op = el.offsetParent as HTMLElement | null;
  if (!spot || !op) return null;
  // translate 를 뺀 원래 자리는 offset 값으로 잰다. getBoundingClientRect 는 옮기는 중인 위치를 준다.
  const o = op.getBoundingClientRect();
  const s = spot.getBoundingClientRect();
  const x = s.left + s.width / 2 - (o.left + op.clientLeft + el.offsetLeft) - el.offsetWidth / 2;
  const y = s.top + s.height / 2 - (o.top + op.clientTop + el.offsetTop) - el.offsetHeight / 2;
  return `${x.toFixed(1)}px ${y.toFixed(1)}px`;
}

function jump(el: HTMLElement, to: string) {
  el.style.transition = "none";
  el.style.translate = to;
  void el.offsetWidth;
  el.style.transition = "";
}

function place(el: HTMLElement, n: number, ctx: SceneCtx) {
  const prev = last.get(el);
  last.set(el, n);
  const it = pick(el.dataset.at ?? "", n);
  if (!it) return;
  const to = offset(el, it.to);
  if (!to) return;
  // 앞 단계에서 막 넘어왔고 출발 자리가 있으면 거기서 떠난다 — 복사본이 원본 자리에서 나오는 모양.
  const from = it.from && it.k === n && prev === n - 1 && !ctx.instant ? offset(el, it.from) : null;
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
    const spots = new Set([...html.matchAll(/data-spot="([^"]+)"/g)].map((m) => m[1]));
    // 거른 HTML 이라 `>` 는 `&gt;` 로 들어 있다.
    const used = [...html.matchAll(/data-at="([^"]+)"/g)].flatMap((m) => items(m[1].replace(/&gt;/g, ">")).flatMap(({ value }) => value.split(">")));
    const missing = [...new Set(used.filter((s) => !spots.has(s)))];
    return missing.length ? [`data-at 이 가리키는 자리가 없습니다: ${missing.join(", ")}. 그 칸에 data-spot="이름" 을 다세요`] : [];
  },
  doc: {
    example: 'data-at="1:server>browser|3:attacker"',
    meaning: "요소가 판 위에 떠서 단계마다 그 자리(`data-spot`)로 미끄러진다. `from>to` 는 그 단계에 from 에서 출발한다(복사본이 원본 자리에서 나오는 모양)",
  },
};
