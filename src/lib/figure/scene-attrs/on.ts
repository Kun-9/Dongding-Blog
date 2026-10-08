import { RANGE, covers, items, rangeFits } from "./range";
import type { SceneAttr } from "./types";

/** 단계에 입히는 상태. CSS 는 states.css 의 `.sc-html .is-<상태>`. 새 상태는 둘을 같이 늘린다. */
export const STATES = ["accent", "dim", "hide", "strike"] as const;

const ITEM = `${RANGE}:(?:${STATES.join("|")})`;
const VALID = new RegExp(`^${ITEM}(?:\\|${ITEM})*$`);

/** 그 단계에 상태를 입힌다 — `2:accent|3+:dim`. */
export const on: SceneAttr = {
  name: "data-on",
  valid: (v) => VALID.test(v),
  fits: (v, n) => items(v).every(({ key }) => rangeFits(key, n)),
  apply(el, n) {
    const now = new Set(items(el.dataset.on ?? "").flatMap(({ key, value }) => (covers(key, n, true) ? [value] : [])));
    for (const st of STATES) el.classList.toggle(`is-${st}`, now.has(st));
  },
  doc: {
    example: 'data-on="2:accent|3+:dim"',
    meaning: `그 단계에 상태를 입힌다: ${STATES.map((s) => `\`${s}\``).join("·")}(빛남·흐림·숨김·취소선). \`2\` 는 그 단계만, \`3+\` 는 3부터, \`2-3\` 은 범위`,
  },
};
