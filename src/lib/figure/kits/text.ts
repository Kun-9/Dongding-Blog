import type { Kit } from "./types";

export const text: Kit = {
  name: "text",
  label: "글자",
  classes: [
    ["fig-label", "작은 대문자 머리말"],
    ["fig-title", "굵은 제목"],
    ["fig-sub", "보조 설명"],
    ["fig-big", "큰 숫자"],
    ["fig-mono", ""],
  ],
  motion: [[".fig-big", "count"]],
};
