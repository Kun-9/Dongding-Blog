/**
 * 카드용 폰트 서브셋을 다시 만든다.
 *
 *   node scripts/build-card-font.mjs
 *
 * `/card` 와 `/card/app/{slug}` 는 satori 로 SVG 를 그리는데, satori 는 글자를
 * path 로 바꾸느라 폰트 파일을 요구한다. Noto Sans KR 전체는 6MB 라 저장소에
 * 둘 수 없어서, 카드에 실제로 쓰이는 글자만 골라 25KB 짜리로 줄여 둔다.
 *
 * 문구는 이제 설정 화면(`/settings/cards`)에서 바뀌므로 어떤 글자가 올지 빌드
 * 때 알 수 없다. 그래서 카드는 그릴 때마다 필요한 글자를 Google Fonts 에서
 * 직접 받는다(`lib/card-font.ts` 의 `cardFontsFor`). **여기서 만드는 파일은 그
 * 요청이 실패했을 때의 폴백**이라, 기본값(site.json·apps.ts)이 바뀐 게 아니면
 * 다시 돌릴 일이 없다.
 */
import { writeFile } from "node:fs/promises";
import { join } from "node:path";

import site from "../src/lib/site.json" with { type: "json" };
import { APPS } from "../src/lib/apps.ts";

/** 자동 수집에 안 잡히지만 카드가 그리는 문자열. */
const EXTRA = ["BLOG"];

/** 라틴·숫자·문장부호는 넉넉히 깔아 둔다 — 어차피 몇 KB 안 된다. */
const ASCII =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789" +
  " .,·-—–/?!&:;()[]{}@#%'\"+=~*<>|\\`^_$";

const FACES = [
  { weight: 400, out: "assets/card-font-regular.ttf" },
  { weight: 700, out: "assets/card-font-bold.ttf" },
];

function collect() {
  const parts = [
    site.og.label,
    site.og.label.toUpperCase(),
    site.og.tagline,
    ...site.og.headline,
    new URL(site.url).host,
    ...APPS.flatMap((a) => [a.name, a.desc, a.host]),
    ...EXTRA,
    ASCII,
  ];
  return [...new Set(parts.join(""))].sort().join("");
}

async function main() {
  const chars = collect();
  const url =
    "https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;700&text=" +
    encodeURIComponent(chars);

  // 구형 UA 로 물어야 woff2 대신 ttf 를 준다. satori 는 ttf/otf/woff 만 읽는다.
  const css = await fetch(url, {
    headers: { "User-Agent": "Mozilla/4.0" },
  }).then((r) => {
    if (!r.ok) throw new Error(`Google Fonts ${r.status}`);
    return r.text();
  });

  const urls = [...css.matchAll(/url\((https:\/\/[^)]+)\)/g)].map((m) => m[1]);
  if (urls.length !== FACES.length) {
    throw new Error(`폰트 ${FACES.length}개를 기대했는데 ${urls.length}개를 받았다`);
  }

  for (const [i, face] of FACES.entries()) {
    const buf = Buffer.from(await fetch(urls[i]).then((r) => r.arrayBuffer()));
    await writeFile(join(process.cwd(), face.out), buf);
    console.log(`${face.out}  ${buf.length.toLocaleString()}B  (weight ${face.weight})`);
  }
  console.log(`고유 문자 ${chars.length}자`);
}

await main();
