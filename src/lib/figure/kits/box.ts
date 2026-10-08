import type { Kit } from "./types";

export const box: Kit = {
  name: "box",
  label: "상자",
  classes: [
    ["fig-box", ""],
    ["fig-accent", "강조"],
    ["fig-muted", "점선"],
    ["fig-info", "파랑"],
    ["fig-warn", "노랑"],
  ],
  // tr 은 키트 클래스가 아니지만 figure 표의 행도 상자처럼 올라온다.
  motion: [
    [".fig-box", "rise"],
    ["tr", "rise"],
  ],
  live: [".fig-box.fig-accent"],
};
