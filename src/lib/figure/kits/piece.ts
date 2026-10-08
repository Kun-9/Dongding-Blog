import type { Kit } from "./types";

export const piece: Kit = {
  name: "piece",
  label: "조각",
  classes: [
    ["fig-arrow", "→, `fig-down` 을 더하면 ↓"],
    ["fig-num", "번호 배지"],
    ["fig-chip", "알약"],
    ["fig-dot", ""],
    ["fig-ok", "✓"],
    ["fig-no", "–"],
    ["fig-part", "반쯤"],
    ["fig-bar", "막대, `style=\"--v: 70%\"`, `fig-accent` 면 강조색"],
  ],
  motion: [
    [".fig-arrow", "draw"],
    [".fig-bar", "grow"],
    [".fig-num, .fig-ok, .fig-no, .fig-part, .fig-dot, .fig-chip", "pop"],
  ],
};
