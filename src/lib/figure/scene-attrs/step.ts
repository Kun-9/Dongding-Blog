import { RANGE, covers, rangeFits } from "./range";
import type { SceneAttr } from "./types";

const VALID = new RegExp(`^${RANGE}$`);

/** 몇 단계에 보이나 — `2` 는 2단계에 나타나 남고, `2-3` 은 그 사이만. */
export const step: SceneAttr = {
  name: "data-step",
  valid: (v) => VALID.test(v),
  fits: rangeFits,
  apply: (el, n) => void el.classList.toggle("sc-off", !covers(el.dataset.step ?? "", n, false)),
  doc: { example: 'data-step="2"', meaning: '2단계에 나타나 끝까지 남는다. `"2-3"` 은 2~3단계에만 보인다' },
};
