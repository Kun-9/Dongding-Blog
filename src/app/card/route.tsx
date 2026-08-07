/**
 * `/card` — 다른 곳에 붙여 쓰는 가로 카드 이미지.
 *
 * OG 이미지와 같은 재료(아바타·헤드라인·태그라인)를 1200×250 띠로 눕힌 것.
 * GitHub 프로필 README 처럼 이미지 한 장만 걸 수 있는 곳을 위한 라우트다.
 * `?theme=dark` 로 다크 팔레트를 받는다 — README 에서는 `<picture>` 의
 * `prefers-color-scheme` source 로 연결하면 뷰어 테마를 따라간다.
 *
 * PNG(`ImageResponse`) 가 아니라 satori 로 SVG 를 직접 뽑는다. 벡터라 배율을
 * 관리할 필요가 없고(예전엔 3배로 뽑았다) 크기도 4분의 1이다. satori 가 글자를
 * path 로 바꾸므로 보는 사람에게 한글 폰트가 없어도 그대로 보인다.
 */
import satori from "satori";

import { site as siteDefaults } from "@/lib/site";
import { getSite } from "@/lib/site-db";
import { cardFonts, SVG_HEADERS } from "@/lib/card-font";
import { CARD_SIZE, CARD_THEMES, type CardTheme } from "@/lib/og-tokens";

// 배포 도메인이라 env/빌드 시점에 고정된다 — 설정 화면 값과 무관하게 둔다.
const HOST = new URL(siteDefaults.url).host;

/**
 * 헤더 아바타(`components/layout/Avatar.tsx`)의 웃는 표정만 정지 이미지로 옮긴 것.
 * 저쪽은 표정 전환과 눈동자 추적을 `globals.css` 의 `.av-*` 규칙에 맡기는데,
 * 이미지 렌더러에는 그 CSS 가 없어서 smile 상태를 좌표에 박아 두었다.
 * 아바타 생김새를 고치면 여기도 같이 고쳐야 한다.
 */
const AVATAR = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256">
<defs>
<clipPath id="c"><circle cx="128" cy="128" r="128"/></clipPath>
<linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7d8ea8"/><stop offset="1" stop-color="#5d6b8a"/></linearGradient>
<linearGradient id="sk" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fbf8f0"/><stop offset="1" stop-color="#f1e8d6"/></linearGradient>
</defs>
<g clip-path="url(#c)">
<rect width="256" height="256" fill="url(#bg)"/>
<ellipse cx="128" cy="298" rx="106" ry="86" fill="#3f3b34"/>
<ellipse cx="128" cy="110" rx="102" ry="88" fill="#4a3a2a"/>
<circle cx="38" cy="158" r="15" fill="#f2e9d7"/>
<circle cx="218" cy="158" r="15" fill="#f2e9d7"/>
<rect x="34" y="30" width="188" height="196" rx="88" fill="url(#sk)"/>
<path d="M26 146C26 54 74 24 128 24C182 24 230 54 230 146C218 122 206 92 188 104C172 115 164 94 148 104C132 114 124 92 108 102C92 111 82 92 66 104C48 116 38 122 26 146Z" fill="#4a3a2a"/>
<ellipse cx="70" cy="188" rx="15" ry="9" fill="#d9927a" opacity=".42"/>
<ellipse cx="186" cy="188" rx="15" ry="9" fill="#d9927a" opacity=".42"/>
<circle cx="94" cy="163" r="13" fill="#38352c"/>
<circle cx="98.8" cy="157.6" r="4.3" fill="#fbf8f0" opacity=".92"/>
<circle cx="162" cy="163" r="13" fill="#38352c"/>
<circle cx="166.8" cy="157.6" r="4.3" fill="#fbf8f0" opacity=".92"/>
<path d="M115 191q13 13 26 0" fill="none" stroke="#38352c" stroke-width="6" stroke-linecap="round"/>
</g>
</svg>`;

const AVATAR_SRC = `data:image/svg+xml;utf8,${encodeURIComponent(AVATAR)}`;

export async function GET(req: Request) {
  const theme: CardTheme =
    new URL(req.url).searchParams.get("theme") === "dark" ? "dark" : "light";
  const c = CARD_THEMES[theme];
  const site = await getSite();

  const svg = await satori(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          // 네 값이 다른 건 렌더된 픽셀을 재서 맞춘 결과다. 위는 아바타가
          // 원형이라 잉크가 늦게 시작하고, 아래는 글자라 line box 가 잉크보다
          // 크며, 오른쪽은 마지막 글자의 사이드베어링이 남는다.
          padding: "42px 52px 43px 56px",
          backgroundColor: c.bg,
          // .scenic-glow 와 같은 구도(오른쪽 위 따뜻하게, 왼쪽 차갑게)를
          // 카드 비율로 좁힌 것. 타원이 카드보다 커지면 배경색이 안 남는다.
          backgroundImage: `radial-gradient(ellipse 640px 300px at 88% -30%, ${c.glow1}, transparent 65%), radial-gradient(ellipse 520px 260px at -4% 20%, ${c.glow2}, transparent 65%)`,
          border: `1px solid ${c.line}`,
          borderRadius: 16,
          fontFamily: "Card",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            color: c.inkMuted,
            fontSize: 15,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={AVATAR_SRC}
              width={44}
              height={44}
              alt=""
              style={{ borderRadius: 22 }}
            />
            <span style={{ letterSpacing: "0.16em" }}>
              {site.og.label.toUpperCase()}
            </span>
            {/* 앱 카드들과 나란히 놓이므로 이것도 앱으로 읽힌다. 종류를 박아 둔다. */}
            <span
              style={{
                background: c.chip,
                borderRadius: 999,
                padding: "3px 10px",
                fontSize: 12,
                letterSpacing: "0.14em",
              }}
            >
              BLOG
            </span>
          </div>
          <span style={{ letterSpacing: "0.04em" }}>{HOST}</span>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              fontSize: 50,
              fontWeight: 700,
              color: c.ink,
              letterSpacing: "-0.035em",
              lineHeight: 1.1,
            }}
          >
            {site.og.headline.join(" ")}
          </div>
          <div style={{ marginTop: 14, fontSize: 19, color: c.inkMuted }}>
            {site.og.tagline}
          </div>
        </div>
      </div>
    ),
    { ...CARD_SIZE, fonts: await cardFonts() },
  );

  return new Response(svg, { headers: SVG_HEADERS });
}
