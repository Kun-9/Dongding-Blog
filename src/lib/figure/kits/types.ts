/**
 * figure 키트 모듈의 모양. 키트 하나 = 이 파일과 같은 이름의 .css(생김새) + .ts(설명·기본 모션).
 *
 * 새 키트는 kits/<이름>.ts·.css 를 만들고 kits/index.ts 의 KITS 와 figure.css 에 한 줄씩 넣는다.
 * 클래스는 `fig-` 로 시작해야 허용 목록을 통과한다(lib/html-figure). 쓰기 기준(lib/voice)과
 * 스킬 표, 런타임 기본 모션(lib/figure-motion)이 KITS 를 따라간다.
 */
export interface Kit {
  /** 파일 이름과 같다(kits/<name>.ts·.css). */
  name: string;
  /** 쓰기 기준·스킬 표의 분류 이름. */
  label: string;
  /** 언제 쓰나 — 한 줄. 없으면 분류 이름만으로 충분한 키트. */
  use?: string;
  /** [클래스, 짧은 설명]. 설명이 없으면 클래스 이름만 보인다. */
  classes: [cls: string, desc: string][];
  /** 클래스의 기본 등장 모션 — `data-anim` 이 없을 때. [figure 안 선택자, 모션 이름] */
  motion?: [selector: string, anim: string][];
  /** 화면에 있을 때 `data-live` 를 붙여 반복(숨쉬기 등)을 켤 선택자. */
  live?: string[];
}
