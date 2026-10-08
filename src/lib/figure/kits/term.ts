import type { Kit } from "./types";

export const term: Kit = {
  name: "term",
  label: "터미널",
  use: "활용 예의 실제 화면을 다시 그릴 때. 두 테마 모두 어두운 판이고, 문구는 실제 화면·README·소스에서 옮긴다",
  classes: [
    ["fig-term", "어두운 판"],
    ["fig-term-bar", "머리줄, 점 셋은 자동"],
    ["fig-term-tag", "머리줄 오른쪽 칩. 장면에서 지금 움직이는 훅·명령을 data-text 로"],
    ["fig-term-body", "본문. 줄은 div 하나씩"],
    ["fig-t-dim", ""],
    ["fig-t-ok", ""],
    ["fig-t-bad", ""],
    ["fig-t-warn", "줄 색"],
    ["fig-t-box", "안쪽 상자"],
    ["fig-t-key", "버튼·배지"],
    ["fig-t-sep", "위 구분선"],
  ],
};
