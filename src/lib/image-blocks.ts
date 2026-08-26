/**
 * 그림 블록 문법의 순수 규칙 — 파서(`markdown.tsx`)와 렌더러(`Figure.tsx`)가
 * 같은 판정을 쓰도록 여기 한 벌만 둔다. `scripts/check-image-blocks.mjs` 가
 * 이 파일만 돌려 본다.
 *
 * 문법: 줄에 이미지 하나만 → 그림, 연속 줄 → 묶음.
 *       `{xs}` 120px · `{sm}` 380px · 기본 본문 폭 · `{wide}` 880px,
 *       `{240}` 처럼 px 을 직접 적어도 된다. 묶음의 열 수는 `{1}`~`{4}`.
 */

/** 이름 폭 셋 + 임의 px. 열 수(`{2}`)와 겹치지 않게 px 은 하한을 둔다. */
export type ImageSize = "xs" | "sm" | "wide" | "" | number;

/** 이름 폭의 실제 px. `wide` 는 본문 밖으로 나가므로 여기 없다. */
export const NAMED_WIDTH = { xs: 120, sm: 380 } as const;

/** 직접 적을 수 있는 px 범위. 하한 5는 열 수 `{1}`~`{4}` 와 겹치지 않게. */
export const MIN_PX = 5;
export const MAX_PX = 1200;

export interface ImageItem {
  src: string;
  alt: string;
}

/** 줄 하나가 통째로 이미지일 때만 승격한다 — 앞뒤에 글자가 있으면 인라인. */
export const IMG_LINE_RE =
  /^!\[([^\]]*)\]\(([^)\s]+)\)(?:\{([A-Za-z0-9]+)\})?$/;

export function isImageLine(line: string): boolean {
  return IMG_LINE_RE.test(line.trim());
}

/**
 * 폭 옵션만 골라낸다. 열 수(`{2}`)나 오타는 폭이 아니므로 기본값이다.
 * `{240}` 같은 정수는 px 폭으로 본다 — 열 수와 겹치는 `{1}`~`{4}` 는 제외.
 */
export function asImageSize(opt: string): ImageSize {
  if (opt === "xs" || opt === "sm" || opt === "wide") return opt;
  const px = Number(opt);
  return Number.isInteger(px) && px >= MIN_PX && px <= MAX_PX ? px : "";
}

/** 그림 블록의 max-width. 기본 폭과 `{wide}` 는 px 로 안 잡는다. */
export function widthOf(size: ImageSize): number | undefined {
  if (typeof size === "number") return size;
  return size === "xs" || size === "sm" ? NAMED_WIDTH[size] : undefined;
}

/**
 * 묶음 열 수. 첫 줄의 `{n}` 이 있으면 그걸 쓰고, 없으면 장수로 정한다 —
 * 2장은 2열, 3장은 3열, 그 밖은 2열.
 */
export function colsFor(count: number, opt: string): number {
  const explicit = Number(opt);
  if (Number.isInteger(explicit) && explicit >= 1 && explicit <= 4) {
    return explicit;
  }
  return count === 3 ? 3 : 2;
}

/** 묶음 칸 비율 — 열이 많아질수록 정사각형에 가까워진다. */
export function ratioFor(cols: number): string {
  return { 1: "16 / 9", 2: "4 / 3", 3: "4 / 3", 4: "1 / 1" }[cols] ?? "4 / 3";
}
