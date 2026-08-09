/**
 * 그림 블록 문법의 순수 규칙 — 파서(`markdown.tsx`)와 렌더러(`Figure.tsx`)가
 * 같은 판정을 쓰도록 여기 한 벌만 둔다. `scripts/check-image-blocks.mjs` 가
 * 이 파일만 돌려 본다.
 *
 * 문법: 줄에 이미지 하나만 → 그림, 연속 줄 → 묶음.
 *       `{sm}` 380px · 기본 본문 폭 · `{wide}` 880px, 열 수는 `{1}`~`{4}`.
 */

export type ImageSize = "sm" | "wide" | "";

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

/** 폭 옵션만 골라낸다. 열 수(`{2}`)나 오타는 폭이 아니므로 기본값이다. */
export function asImageSize(opt: string): ImageSize {
  return opt === "sm" || opt === "wide" ? opt : "";
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
