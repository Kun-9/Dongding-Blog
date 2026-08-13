/**
 * `/card` — 다른 곳에 붙여 쓰는 가로 카드 이미지.
 *
 * OG 이미지와 같은 재료(아바타·헤드라인·태그라인)를 1200×250 띠로 눕힌 것.
 * GitHub 프로필 README 처럼 이미지 한 장만 걸 수 있는 곳을 위한 라우트다.
 * `?theme=dark` 로 다크 팔레트를 받는다 — README 에서는 `<picture>` 의
 * `prefers-color-scheme` source 로 연결하면 뷰어 테마를 따라간다.
 *
 * 그림은 `lib/card-render` 가 그린다. 문구는 설정 화면(`/settings/cards`)에서
 * 고친다.
 */
import { getSite } from "@/lib/site-db";
import { SVG_HEADERS } from "@/lib/card-font";
import { renderBlogCard } from "@/lib/card-render";
import type { CardTheme } from "@/lib/og-tokens";

export async function GET(req: Request) {
  const theme: CardTheme =
    new URL(req.url).searchParams.get("theme") === "dark" ? "dark" : "light";
  const site = await getSite();

  const svg = await renderBlogCard({ ...site.og, host: site.cards.host }, theme);
  return new Response(svg, { headers: SVG_HEADERS });
}
