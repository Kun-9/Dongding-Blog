/**
 * `/card/app/{slug}` — 프로필 README 에 전시하는 앱 카드.
 *
 * 블로그 띠(`/card`)와 같은 팔레트를 쓰되 높이를 절반 이하로 낮춰 위계를 준다.
 * README 에서 이미지 한 장이 링크 하나라, 앱마다 이미지를 따로 뽑아야 각각
 * 자기 주소로 갈 수 있다 — 한 장에 셋을 그리면 링크도 하나뿐이다.
 *
 * 오른쪽 끝의 주소와 화살표는 장식이 아니다. camo 를 거친 `<img>` 는 hover 에
 * 반응하지 못하므로, 누를 수 있다는 신호를 그림 안에 넣어야 한다.
 */
import { ImageResponse } from "next/og";
import { CARD_THEMES, type CardTheme } from "@/lib/og-tokens";
import { APP_ICONS, findApp } from "@/lib/apps";

/** 레티나 배율 — `/card` 와 같은 이유로 두 배로 뽑는다. */
const S = 2;

const SIZE = { width: 1200, height: 118 } as const;

export async function GET(req: Request, ctx: RouteContext<"/card/app/[slug]">) {
  const { slug } = await ctx.params;
  const app = findApp(slug);
  const icon = APP_ICONS[slug];
  if (!app || !icon) {
    return new Response("Not found", { status: 404 });
  }

  const theme: CardTheme =
    new URL(req.url).searchParams.get("theme") === "dark" ? "dark" : "light";
  const c = CARD_THEMES[theme];

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          gap: 20 * S,
          // 좌우 여백은 `/card` 와 같은 값이다. README 에서 세로로 쌓이므로
          // 아이콘 시작점과 오른쪽 끝이 블로그 띠와 어긋나면 바로 보인다.
          padding: `0 ${52 * S}px 0 ${56 * S}px`,
          backgroundColor: c.bg,
          backgroundImage: `radial-gradient(ellipse ${420 * S}px ${180 * S}px at 92% -60%, ${c.glow1}, transparent 68%), radial-gradient(ellipse ${340 * S}px ${150 * S}px at -6% 40%, ${c.glow2}, transparent 68%)`,
          border: `${S}px solid ${c.line}`,
          borderRadius: 14 * S,
          fontFamily: "sans-serif",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={icon}
          width={48 * S}
          height={48 * S}
          alt=""
          style={{ borderRadius: 11 * S, border: `${S}px solid ${c.ring}` }}
        />

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
              fontSize: 21 * S,
              fontWeight: 700,
              color: c.ink,
              letterSpacing: "-0.02em",
            }}
          >
            {app.name}
          </div>
          <div style={{ marginTop: 5 * S, fontSize: 15 * S, color: c.inkMuted }}>
            {app.desc}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10 * S,
            fontSize: 13.5 * S,
            color: c.inkMuted,
            letterSpacing: "0.03em",
          }}
        >
          <span>{app.host}</span>
          {/* 화살표. Satori 는 SVG 요소를 직접 받으므로 아이콘처럼 심지 않아도 된다. */}
          <svg
            width={15 * S}
            height={15 * S}
            viewBox="0 0 16 16"
            fill="none"
            stroke={c.inkMuted}
            strokeWidth={1.7}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M3.5 8h9M8.5 4l4 4-4 4" />
          </svg>
        </div>
      </div>
    ),
    {
      width: SIZE.width * S,
      height: SIZE.height * S,
      headers: {
        "cache-control": "public, max-age=3600, s-maxage=86400",
      },
    },
  );
}
