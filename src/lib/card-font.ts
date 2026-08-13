/**
 * 카드 SVG 를 그릴 폰트.
 *
 * satori 는 글자를 path 로 바꾸느라 폰트 파일을 직접 요구한다. Noto Sans KR
 * 전체는 6MB 라 저장소에 둘 수 없어서 필요한 글자만 받아 쓴다.
 *
 * 카드 문구가 설정 화면에서 바뀌게 되면서 **어떤 글자가 올지 빌드 때 알 수
 * 없어졌다.** 그래서 `cardFontsFor()` 가 그릴 문자열을 그대로 넘겨 Google Fonts
 * 에서 그만큼만 받아 온다. 못 받으면 `assets/` 의 빌드 시점 서브셋으로 떨어진다 —
 * 거기 없는 글자는 자리가 비지만, 카드가 통째로 죽는 것보다 낫다.
 *
 * 번들에 딸려 가도록 `next.config.ts` 의 outputFileTracingIncludes 가 카드
 * 라우트들에 `assets/**` 를 물려 둔다. 빠지면 배포에서만 ENOENT 로 죽는다.
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

/**
 * 문자열에 실제로 쓰인 글자만 담은 폰트. 같은 글자 집합은 인스턴스가 사는 동안
 * 다시 받지 않는다.
 * ponytail: Map 하나. 문구가 자주 바뀌지 않으니 LRU 는 과하고, 20개를 넘으면
 * 통째로 비운다 — 미리보기가 한 글자씩 칠 때마다 항목이 쌓이기 때문이다.
 */
const subsets = new Map<string, Fonts>();

export async function cardFontsFor(text: string): Promise<Fonts> {
  const chars = [...new Set(text)].sort().join("");
  const hit = subsets.get(chars);
  if (hit) return hit;

  try {
    const css = await fetch(
      "https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;700&text=" +
        encodeURIComponent(chars),
      // 구형 UA 로 물어야 woff2 대신 ttf 를 준다. satori 는 ttf/otf/woff 만 읽는다.
      { headers: { "User-Agent": "Mozilla/4.0" } },
    );
    if (!css.ok) throw new Error(`Google Fonts ${css.status}`);
    const urls = [...(await css.text()).matchAll(/url\((https:\/\/[^)]+)\)/g)].map(
      (m) => m[1],
    );
    if (urls.length !== 2) throw new Error(`폰트 2개를 기대했는데 ${urls.length}개`);

    const [regular, bold] = await Promise.all(
      urls.map((u) =>
        fetch(u).then((r) => {
          if (!r.ok) throw new Error(`폰트 파일 ${r.status}`);
          return r.arrayBuffer();
        }),
      ),
    );
    const fonts: Fonts = [
      { name: "Card", data: regular, weight: 400, style: "normal" },
      { name: "Card", data: bold, weight: 700, style: "normal" },
    ];
    if (subsets.size > 20) subsets.clear();
    subsets.set(chars, fonts);
    return fonts;
  } catch (e) {
    console.warn(
      `카드 폰트 서브셋 요청 실패, 빌드 시점 서브셋으로 그린다: ${
        e instanceof Error ? e.message : String(e)
      }`,
    );
    return cardFonts();
  }
}

/** SVG 응답 공통 헤더 — 남의 페이지에 박히는 이미지라 캐시를 길게 잡는다. */
export const SVG_HEADERS = {
  "content-type": "image/svg+xml; charset=utf-8",
  "cache-control": "public, max-age=3600, s-maxage=86400",
} as const;
