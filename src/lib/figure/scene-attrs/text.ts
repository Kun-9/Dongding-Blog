import { keysFit, latest } from "./range";
import type { SceneAttr, SceneCtx } from "./types";

/** 한 항목 40자, `|`·`&` 는 쓸 수 없다(엔티티로 구분자를 숨기지 못하게). */
const VALID = /^\d{1,2}:[^|&]{0,40}(?:\|\d{1,2}:[^|&]{0,40})*$/;
const NUM = /^(\D*?)(-?\d[\d,]*(?:\.\d+)?)(\D*)$/;
const MS = 800;

/** 글자를 바꾼다. 앞뒤 글자가 같은 숫자끼리면 0.8초 동안 세고, 아니면 바로 바꾼다. */
function swap(el: HTMLElement, next: string, ctx: SceneCtx) {
  cancelAnimationFrame(ctx.timers.get(el) ?? 0);
  const a = (el.textContent ?? "").trim().match(NUM);
  const b = next.trim().match(NUM);
  if (ctx.instant || !a || !b || a[1] !== b[1] || a[3] !== b[3]) {
    el.textContent = next;
    return;
  }
  const from = Number(a[2].replace(/,/g, ""));
  const to = Number(b[2].replace(/,/g, ""));
  const dec = b[2].split(".")[1]?.length ?? 0;
  const t0 = performance.now();
  const frame = (now: number) => {
    const t = Math.min(1, Math.max(0, (now - t0) / MS));
    const e = 1 - (1 - t) ** 3;
    el.textContent = `${b[1]}${(from + (to - from) * e).toFixed(dec)}${b[3]}`;
    if (t < 1) ctx.timers.set(el, requestAnimationFrame(frame));
    else el.textContent = next;
  };
  ctx.timers.set(el, requestAnimationFrame(frame));
}

/** 단계마다 글자를 바꾼다 — `1:$2.06|2:$0.16`. 화면에는 textContent 로만 들어간다. */
export const text: SceneAttr = {
  name: "data-text",
  valid: (v) => v.length <= 200 && VALID.test(v),
  fits: keysFit,
  apply: (el, n, ctx) => swap(el, latest(el.dataset.text ?? "", n) ?? ctx.original(el).text, ctx),
  doc: { example: 'data-text="1:$2.06|2:$0.16"', meaning: "단계마다 글자를 바꾼다. 앞뒤 글자가 같은 숫자끼리면 센다" },
};
