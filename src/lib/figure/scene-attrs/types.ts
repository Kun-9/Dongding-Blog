/**
 * figure 장면 속성 모듈의 모양. 속성 하나 = 값 검사(허용 목록) + 단계 번호 점검 + 단계마다
 * 요소에 입히는 방법 + 설명. 새 속성은 이 폴더에 모듈을 만들고 index.ts 의 SCENE_ATTRS 에 넣는다.
 * 상태를 CSS 로 그리면 states.css 에 같이 둔다.
 *
 * 검사·점검은 순수 함수라 서버·점검기에서 돌고, apply 는 브라우저(FigureScene)에서만 부른다.
 */
export interface SceneCtx {
  /** 바로 바꿀 때(처음 붙을 때, 움직임 줄이기). 세는 모션 없이 끝 값으로. */
  instant: boolean;
  /** 장면이 붙기 전 요소의 처음 값 — 아직 정해진 값이 없는 단계에서 되돌릴 곳. */
  original(el: HTMLElement): { v: string; text: string };
  /** 요소마다 돌고 있는 rAF — 새로 바꾸면 끊는다. */
  timers: WeakMap<Element, number>;
}

export interface SceneAttr {
  /** 속성 이름. `data-` 로 시작한다. */
  name: `data-${string}`;
  /** 값 모양 — 맞지 않으면 거를 때 지운다(점검의 figure-dropped). 통과한 값은 늘 이스케이프해서 쓴다. */
  valid(value: string): boolean;
  /** 단계 번호가 1~n 안에 바로 섰나(점검의 diagram-error). */
  fits(value: string, n: number): boolean;
  /** 단계 n(1부터)에 요소를 맞춘다. 브라우저에서만 부른다. */
  apply(el: HTMLElement, n: number, ctx: SceneCtx): void;
  /** 쓰기 기준·스킬 표의 설명. 예시 값을 함께. */
  doc: { example: string; meaning: string };
}
