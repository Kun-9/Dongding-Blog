/**
 * `/card` — 다른 곳에 붙여 쓰는 가로 카드 이미지.
 *
 * OG 이미지와 같은 재료(로고·헤드라인·태그라인)를 1200×250 띠로 눕힌 것.
 * GitHub 프로필 README 처럼 이미지 한 장만 걸 수 있는 곳을 위한 라우트다.
 * `?theme=dark` 로 다크 팔레트를 받는다 — README 에서는 `<picture>` 의
 * `prefers-color-scheme` source 로 연결하면 뷰어 테마를 따라간다.
 */
import { ImageResponse } from "next/og";
import { site } from "@/lib/site";
import { CARD_SIZE, CARD_THEMES, type CardTheme } from "@/lib/og-tokens";

const HOST = new URL(site.url).host;

export async function GET(req: Request) {
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
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "44px 56px 36px",
          backgroundColor: c.bg,
          // .scenic-glow 와 같은 구도(오른쪽 위 따뜻하게, 왼쪽 차갑게)를
          // 카드 비율로 좁힌 것. 타원이 카드보다 커지면 배경색이 안 남는다.
          backgroundImage: `radial-gradient(ellipse 640px 300px at 88% -30%, ${c.glow1}, transparent 65%), radial-gradient(ellipse 520px 260px at -4% 20%, ${c.glow2}, transparent 65%)`,
          border: `1px solid ${c.line}`,
          borderRadius: 16,
          fontFamily: "sans-serif",
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
            <div
              style={{
                width: 44,
                height: 44,
                background: c.ink,
                color: c.inkInverse,
                borderRadius: 13,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 21,
                fontWeight: 700,
              }}
            >
              동
            </div>
            <span style={{ letterSpacing: "0.16em" }}>
              {site.og.label.toUpperCase()}
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
    {
      ...CARD_SIZE,
      // 방문자가 직접 여는 URL 이 아니라 남의 페이지에 박히는 이미지다.
      // GitHub 은 camo 로 한 번 더 캐싱하므로 짧게 잡아도 부담이 없다.
      headers: {
        "cache-control": "public, max-age=3600, s-maxage=86400",
      },
    },
  );
}
