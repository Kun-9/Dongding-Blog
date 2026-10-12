import type { Kit } from "./types";

export const term: Kit = {
  name: "term",
  label: "터미널",
  use: "활용 예의 실제 화면, 직접 돌린 코드와 결과, 설정 파일의 바꿀 줄(diff)을 그릴 때. 두 테마 모두 어두운 판이고, 문구는 실제 화면·README·소스에서 옮긴다",
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
    ["fig-t-key", "버튼·배지. 버튼 줄은 div 하나에 모은다(윗줄과 띄우고, 접히면 줄 사이도 띄운다)"],
    ["fig-t-sep", "위 구분선"],
    ["fig-t-add", "넣는 줄(초록 바탕)"],
    ["fig-t-del", "지우는 줄(붉은 바탕·취소선). 장면에서는 옛 줄에 data-on 의 strike 를 걸면 같은 모양이 된다"],
  ],
};
