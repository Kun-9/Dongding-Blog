import { EASE, appear } from "./keyframes";
import type { AnimModule } from "./types";

/**
 * "86%"·"1.2s"·"2,400건"·"-12%" 처럼 숫자가 하나인 글자만 센다. "v2.1.283" 이나
 * 다시 쓰면 모양이 달라지는 "007" 은 안 센다 — 다 센 글자가 원문과 같아야 한다.
 */
const COUNTABLE = /^(\D*?)(-?\d[\d,]*(?:\.\d+)?)(\D*)$/;

export function countable(text: string) {
  const m = text.trim().match(COUNTABLE);
  if (!m) return null;
  const decimals = m[2].split(".")[1]?.length ?? 0;
  const fmt = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
    useGrouping: m[2].includes(","),
  });
  const to = Number(m[2].replace(/,/g, ""));
  const show = (v: number) => `${m[1]}${fmt.format(v)}${m[3]}`;
  return show(to) === text.trim() ? { to, show } : null;
}

/** 0(또는 data-from)에서 값까지 숫자를 센다. */
export const count: AnimModule = {
  name: "count",
  timing: { d: 0.9, delay: 0.15 },
  doc: {
    motion: "0(또는 `data-from`)에서 값까지 숫자를 셈",
    use: "큰 숫자. 안에 다른 요소 없이 `86%`·`1.2s`·`2,400건` 처럼 숫자가 하나인 글자만 센다. `v2.1.283`·`007`·`<tspan>` 이 든 글자는 나타나기만 한다",
  },
  prepare(el, rt, t) {
    // 글자를 통째로 바꾸므로 안에 다른 요소(<tspan> 등)가 있으면 세지 않는다.
    const c = el.childElementCount ? null : countable(el.textContent ?? "");
    if (!c) return appear(el, rt, t);
    const from = Number(el.getAttribute("data-from") ?? 0) || 0;
    return {
      el,
      hide: () => void (el.textContent = c.show(from)),
      play: (delay) =>
        void rt.animate(from, c.to, { duration: t.d, delay: delay + t.delay, ease: EASE, onUpdate: (v) => (el.textContent = c.show(v)) }),
    };
  },
};
