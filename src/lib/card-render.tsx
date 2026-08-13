/**
 * README 카드 두 종류를 그리는 곳. `/card`, `/card/app/{slug}` 와 설정 화면의
 * 미리보기(`/api/settings/card-preview`)가 모두 여기를 부른다 — 미리보기가
 * 실물과 다른 코드로 그려지면 언젠가 조용히 어긋난다.
 *
 * PNG(`ImageResponse`) 가 아니라 satori 로 SVG 를 직접 뽑는다. 벡터라 배율을
 * 관리할 필요가 없고(예전엔 3배로 뽑았다) 크기도 4분의 1이다. satori 가 글자를
 * path 로 바꾸므로 보는 사람에게 한글 폰트가 없어도 그대로 보인다.
 */
import "server-only";

import satori from "satori";

import { cardFontsFor } from "@/lib/card-font";
import { CARD_SIZE, CARD_THEMES, type CardTheme } from "@/lib/og-tokens";
import type { AppCard } from "@/lib/types";

/** 앱 카드는 블로그 띠보다 낮다 — README 에서 위계가 보이도록. */
const APP_SIZE = { width: 1200, height: 118 } as const;

export interface BlogCardText {
  label: string;
  headline: readonly string[];
  tagline: string;
  /** 오른쪽 끝 주소 표기 */
  host: string;
}

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

/** `/card` — 다른 곳에 붙여 쓰는 가로 띠. */
export async function renderBlogCard(
  text: BlogCardText,
  theme: CardTheme,
): Promise<string> {
  const c = CARD_THEMES[theme];
  const label = text.label.toUpperCase();

  return satori(
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
            <span style={{ letterSpacing: "0.16em" }}>{label}</span>
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
          <span style={{ letterSpacing: "0.04em" }}>{text.host}</span>
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
            {text.headline.join(" ")}
          </div>
          <div style={{ marginTop: 14, fontSize: 19, color: c.inkMuted }}>
            {text.tagline}
          </div>
        </div>
      </div>
    ),
    {
      ...CARD_SIZE,
      fonts: await cardFontsFor(
        label + text.headline.join(" ") + text.tagline + text.host + "BLOG",
      ),
    },
  );
}

/**
 * `/card/app/{slug}` — 프로필 README 에 전시하는 앱 카드.
 *
 * 오른쪽 끝의 주소는 장식이 아니다. camo 를 거친 `<img>` 는 hover 에 반응하지
 * 못하므로, 어디로 가는지를 그림 안에서 알려야 한다.
 */
export async function renderAppCard(
  app: Omit<AppCard, "slug">,
  theme: CardTheme,
): Promise<string> {
  const c = CARD_THEMES[theme];
  // 아이콘을 아직 안 넣은 앱도 카드는 나와야 한다 — 이름 첫 글자 타일로 때운다.
  const monogram = app.icon ? "" : ([...app.name][0] ?? "?");

  return satori(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          gap: 20,
          // 좌우 여백은 `/card` 와 같은 값이다. README 에서 세로로 쌓이므로
          // 아이콘 시작점과 오른쪽 끝이 블로그 띠와 어긋나면 바로 보인다.
          padding: "0 52px 0 56px",
          backgroundColor: c.bg,
          backgroundImage: `radial-gradient(ellipse 420px 180px at 92% -60%, ${c.glow1}, transparent 68%), radial-gradient(ellipse 340px 150px at -6% 40%, ${c.glow2}, transparent 68%)`,
          border: `1px solid ${c.line}`,
          borderRadius: 14,
          fontFamily: "Card",
        }}
      >
        {app.icon ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={app.icon}
            width={48}
            height={48}
            alt=""
            style={{ borderRadius: 11, border: `1px solid ${c.ring}` }}
          />
        ) : (
          <div
            style={{
              width: 48,
              height: 48,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 11,
              background: c.ink,
              color: c.inkInverse,
              fontSize: 24,
              fontWeight: 700,
            }}
          >
            {monogram}
          </div>
        )}

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            flex: 1,
            minWidth: 0,
          }}
        >
          <div
            style={{
              fontSize: 21,
              fontWeight: 700,
              color: c.ink,
              letterSpacing: "-0.02em",
            }}
          >
            {app.name}
          </div>
          <div style={{ marginTop: 5, fontSize: 15, color: c.inkMuted }}>
            {app.desc}
          </div>
        </div>

        <span
          style={{
            fontSize: 13.5,
            color: c.inkMuted,
            letterSpacing: "0.03em",
          }}
        >
          {app.host}
        </span>
      </div>
    ),
    {
      ...APP_SIZE,
      fonts: await cardFontsFor(app.name + app.desc + app.host + monogram),
    },
  );
}
