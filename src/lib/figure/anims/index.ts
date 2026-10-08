/**
 * 등장 모션(`data-anim`) 목록. 새 모션은 이 폴더에 모듈 하나를 만들어 여기 넣는다.
 * 허용 목록(lib/html-figure), 런타임(lib/figure-motion), 쓰기 기준(lib/voice)과 스킬 표가
 * 이 목록을 따라간다. Motion 을 import 하지 않는 순수 모듈이라 서버·점검기에서도 읽는다.
 */
import { count } from "./count";
import { draw, drawBack } from "./draw";
import { fade } from "./fade";
import { grow } from "./grow";
import { pop } from "./pop";
import { rise } from "./rise";
import { roll } from "./roll";
import type { AnimModule } from "./types";

export type { AnimModule, MotionRuntime, Prepared } from "./types";

export const ANIM_MODULES: AnimModule[] = [rise, fade, pop, draw, drawBack, grow, count, roll];

/** `data-anim` 에 쓸 수 있는 값. `none` 은 키트 기본 모션을 끈다. */
export const ANIMS: readonly string[] = [...ANIM_MODULES.map((a) => a.name), "none"];

/**
 * 반복(`data-loop`). 그림이 화면에 있을 때만 CSS 로 돈다(globals.css 의 [data-live] 규칙).
 * ponytail: 반복은 CSS 만으로 끝나서 모듈로 쪼개지 않았다. 셋째가 생기면 anims 처럼 모듈로.
 */
export const LOOPS: readonly string[] = ["orbit", "pulse"];
export const LOOP_DOCS: Record<string, { motion: string; use: string }> = {
  orbit: { motion: "점선 무늬가 경로 방향으로 천천히 흐름(초당 약 12px)", use: "고리·순환 경로. `stroke-dasharray` 가 있는 SVG 선에만" },
  pulse: { motion: "강조 테두리(HTML)나 불투명도(SVG)가 3.2초 주기로 숨 쉼", use: "지금 이야기하는 칸 하나" },
};

export const animByName = (name: string) => ANIM_MODULES.find((a) => a.name === name);
