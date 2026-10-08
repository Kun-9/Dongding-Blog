import { keysFit, latest } from "./range";
import type { SceneAttr } from "./types";

const VALID = /^\d{1,2}:-?\d+(?:\.\d+)?%?(?:\|\d{1,2}:-?\d+(?:\.\d+)?%?)*$/;

/** 단계마다 `--v`(막대 길이 등)를 바꾼다 — `1:90%|2:12%`. */
export const value: SceneAttr = {
  name: "data-v",
  valid: (v) => VALID.test(v),
  fits: keysFit,
  apply(el, n, ctx) {
    const v = latest(el.dataset.v ?? "", n) ?? ctx.original(el).v;
    if (v) el.style.setProperty("--v", v);
    else el.style.removeProperty("--v");
  },
  doc: { example: 'data-v="1:90%|2:12%"', meaning: "단계마다 `--v` 를 바꾼다(`fig-bar` 길이). 그 단계까지 마지막 값" },
};
