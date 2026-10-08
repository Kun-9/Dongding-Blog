/**
 * 모션 모듈이 같이 쓰는 조각 — 키프레임 하나로 끝나는 모션의 준비, 나타나기만 하기.
 */
import type { DOMKeyframesDefinition } from "motion";
import type { MotionRuntime, Prepared } from "./types";

export const EASE = [0.2, 0.7, 0.2, 1] as const;

type Frame = Record<string, string | number>;

/**
 * from 에서 to 로 움직이는 준비. 끝값은 항등 변환으로 적는다 — Motion 은 "none" 을
 * 상대 값의 0 으로 바꿔서 scale(0.6) → none 이 scale(0) 으로 끝난다.
 */
export function fromTo(el: Element, rt: MotionRuntime, timing: { d: number; delay: number }, from: Frame, to: Frame): Prepared {
  return {
    el,
    hide: () => void rt.animate(el, from as DOMKeyframesDefinition, { duration: 0 }),
    play: (delay) => {
      const keyframes = Object.fromEntries(Object.keys(to).map((k) => [k, [from[k], to[k]]]));
      rt.animate(el, keyframes as DOMKeyframesDefinition, { duration: timing.d, delay: delay + timing.delay, ease: EASE });
    },
  };
}

/** 나타나기만 한다. 움직이면 모양이 깨지는 요소의 기본값. */
export const appear = (el: Element, rt: MotionRuntime, timing: { d: number; delay: number }) => fromTo(el, rt, timing, { opacity: 0 }, { opacity: 1 });

/** SVG 의 transform 속성은 CSS transform 이 덮어써서 자리가 튄다 — 이런 요소는 나타나기만. */
export const still = (el: Element) => el instanceof SVGElement && el.hasAttribute("transform");
