/**
 * `/card/app/{slug}` — 프로필 README 에 전시하는 앱 카드.
 *
 * README 에서 이미지 한 장이 링크 하나라, 앱마다 이미지를 따로 뽑아야 각각
 * 자기 주소로 갈 수 있다 — 한 장에 셋을 그리면 링크도 하나뿐이다.
 *
 * 목록의 정본은 `site_settings.cards.apps` 이고 `/settings/cards` 에서 고친다.
 */
import { getSite } from "@/lib/site-db";
import { SVG_HEADERS } from "@/lib/card-font";
import { renderAppCard } from "@/lib/card-render";
import type { CardTheme } from "@/lib/og-tokens";

export async function GET(req: Request, ctx: RouteContext<"/card/app/[slug]">) {
  const { slug } = await ctx.params;
  const site = await getSite();
  const app = site.cards.apps.find((a) => a.slug === slug);
  if (!app) {
    return new Response("Not found", { status: 404 });
  }

  const theme: CardTheme =
    new URL(req.url).searchParams.get("theme") === "dark" ? "dark" : "light";

  const svg = await renderAppCard(app, theme);
  return new Response(svg, { headers: SVG_HEADERS });
}
