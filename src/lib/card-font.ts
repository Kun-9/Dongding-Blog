/**
 * 카드 SVG 를 그릴 폰트.
 *
 * satori 는 글자를 path 로 바꾸느라 폰트 파일을 직접 요구한다. Noto Sans KR
 * 전체는 6MB 라 저장소에 둘 수 없어서 카드에 쓰이는 글자만 남긴 서브셋을
 * `assets/` 에 두고 읽는다 — 다시 만들려면 `scripts/build-card-font.mjs`.
 *
 * 번들에 딸려 가도록 `next.config.ts` 의 outputFileTracingIncludes 가 두 카드
 * 라우트에 `assets/**` 를 물려 둔다. 빠지면 배포에서만 ENOENT 로 죽는다.
 */
import "server-only";

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { SatoriOptions } from "satori";

type Fonts = SatoriOptions["fonts"];

/** 함수 인스턴스가 살아 있는 동안은 다시 읽지 않는다. */
let cached: Fonts | null = null;

export async function cardFonts(): Promise<Fonts> {
  if (cached) return cached;

  const [regular, bold] = await Promise.all([
    readFile(join(process.cwd(), "assets/card-font-regular.ttf")),
    readFile(join(process.cwd(), "assets/card-font-bold.ttf")),
  ]);

  cached = [
    { name: "Card", data: regular, weight: 400, style: "normal" },
    { name: "Card", data: bold, weight: 700, style: "normal" },
  ];
  return cached;
}

/** SVG 응답 공통 헤더 — 남의 페이지에 박히는 이미지라 캐시를 길게 잡는다. */
export const SVG_HEADERS = {
  "content-type": "image/svg+xml; charset=utf-8",
  "cache-control": "public, max-age=3600, s-maxage=86400",
} as const;
