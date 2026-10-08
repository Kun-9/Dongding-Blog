/**
 * 등장 모션 모듈의 모양. 모듈은 Motion 을 직접 import 하지 않고 runtime 으로 받는다 —
 * 그래서 이 목록을 서버·점검기(허용 목록, 쓰기 기준 문서)에서도 그대로 읽는다.
 *
 * 새 모션은 이 폴더에 파일 하나를 만들고 index.ts 의 ANIM_MODULES 에 넣으면 끝이다.
 * 허용 목록(`data-anim` 값), 런타임 재생, 쓰기 기준·스킬 표가 그 목록을 따라간다.
 */
import type { animate } from "motion";

/** 런타임이 모듈에 넘겨주는 것. */
export interface MotionRuntime {
  animate: typeof animate;
}

/** 요소 하나를 움직일 준비가 된 상태. */
export interface Prepared {
  el: Element;
  /** 재생 전 자리로 둔다(화면 밖에 있을 때 한 번). */
  hide(): void;
  /** delay 초 뒤 재생한다. 끝 모습은 서버가 그린 그대로여야 한다. */
  play(delay: number): void;
}

export interface AnimModule {
  /** `data-anim` 값. 소문자와 - 만. */
  name: string;
  /** 길이와 덧붙는 지연(초). 1초 안에 끝나야 읽기를 막지 않는다. */
  timing: { d: number; delay: number };
  /** 쓰기 기준·스킬 표의 한 줄: 무엇이 어떻게 움직이고, 어디에 쓰나. */
  doc: { motion: string; use: string };
  /** 이 요소를 어떻게 움직일지 준비한다. 브라우저에서만 부른다. */
  prepare(el: Element, rt: MotionRuntime, timing: { d: number; delay: number }): Prepared;
}
