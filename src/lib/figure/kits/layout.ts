import type { Kit } from "./types";

export const layout: Kit = {
  name: "layout",
  label: "배치",
  classes: [
    ["fig-flow", "가로 흐름, 640px 아래는 세로 + 화살표 회전"],
    ["fig-row", "줄바꿈 되는 가로"],
    ["fig-col", "세로"],
    ["fig-stack", "세로"],
    ["fig-grid-2", ""],
    ["fig-grid-3", ""],
    ["fig-grid-4", "좁으면 2열→1열"],
    ["fig-center", ""],
    ["fig-gap-lg", ""],
  ],
};
