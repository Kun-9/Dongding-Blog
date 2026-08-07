/**
 * 카드용 폰트 서브셋을 다시 만든다.
 *
 *   node scripts/build-card-font.mjs
 *
 * `/card` 와 `/card/app/{slug}` 는 satori 로 SVG 를 그리는데, satori 는 글자를
 * path 로 바꾸느라 폰트 파일을 요구한다. Noto Sans KR 전체는 6MB 라 저장소에
 * 둘 수 없어서, 카드에 실제로 쓰이는 글자만 골라 25KB 짜리로 줄여 둔다.
 *
 * 그래서 **카드 문구에 새 글자가 들어오면 이 스크립트를 다시 돌려야 한다.**
 * 서브셋에 없는 글자는 카드에서 그 자리가 빈다. 문구를 바꾸는 곳은 두 군데다 —
 * 설정 화면(site_settings)과 `src/lib/apps.ts`.
 *
 * site_settings 는 DB 에 있어 여기서 읽지 않는다. 대신 번들 기본값인
 * `site.json` 을 쓰므로, 설정 화면에서 문구를 바꿨다면 그 값을 `EXTRA` 에
 * 넣고 돌리거나 site.json 도 같이 맞춰 두는 편이 안전하다.
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
