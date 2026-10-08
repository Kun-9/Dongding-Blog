/**
 * figure 장면 속성 목록. 새 속성은 이 폴더에 모듈을 만들어 여기 넣는다. 허용 목록·점검
 * (lib/html-figure), 단계 적용(components/prose/diagram/Scene 의 FigureScene), 쓰기 기준과
 * 스킬 표가 이 목록을 따라간다.
 */
import { on } from "./on";
import { step } from "./step";
import { text } from "./text";
import type { SceneAttr } from "./types";
import { value } from "./value";

export type { SceneAttr, SceneCtx } from "./types";
export { STATES } from "./on";

export const SCENE_ATTRS: SceneAttr[] = [step, on, value, text];

export const sceneAttr = (name: string) => SCENE_ATTRS.find((a) => a.name === name);

/** 장면 HTML 에서 단계 번호가 1~n 을 벗어나거나 거꾸로 선 속성. */
export function badSteps(html: string, n: number): string[] {
  const bad: string[] = [];
  // 거른 HTML 에서 글자의 < 는 &lt; 로 바뀌어 있어, <로 시작하는 것은 진짜 태그뿐이다.
  for (const [tag] of html.matchAll(/<[a-z][^>]*>/g)) {
    for (const [, name, raw] of tag.matchAll(/(data-[a-z-]+)="([^"]*)"/g)) {
      const attr = sceneAttr(name);
      if (attr && !attr.fits(raw, n)) bad.push(`${name}="${raw}"`);
    }
  }
  return bad;
}
