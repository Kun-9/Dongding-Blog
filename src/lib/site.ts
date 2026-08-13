/**
 * 사이트 전역 설정의 **기본값**. 정본은 Supabase `site_settings` 이고
 * (`lib/site-db.ts` 의 `getSite()`), 여기 있는 `site` 는 번들에 박히는 폴백이다.
 *
 * 서버 컴포넌트는 `getSite()` 를 쓸 것. 이 모듈은
 * - `sitemap.ts` / `robots.ts` 처럼 배포 시점에 고정되는 URL,
 * - DB 가 비었거나 응답하지 않을 때의 폴백
 * 용도로 남긴다. 값을 바꾸려면 설정 화면(`/settings`)에서 저장한다.
 */
import siteData from "@/lib/site.json";
import { APPS, APP_ICONS } from "@/lib/apps";
import type { CardSettings, SiteMeta } from "@/lib/types";

/** 배포 환경이 지정한 canonical URL. 있으면 DB 에 저장된 값보다 우선한다. */
export const SITE_URL_ENV = process.env.NEXT_PUBLIC_SITE_URL;

/**
 * README 카드의 기본값. 카드 주소는 배포 도메인이라 site.json 의 url 에서 뽑는다 —
 * 설정 화면에서 canonical 을 바꿔도 카드 표기는 따로 고치게 두는 편이 안전하다.
 */
export const DEFAULT_CARDS: CardSettings = {
  host: new URL(siteData.url).host,
  apps: APPS.map((a) => ({ ...a, icon: APP_ICONS[a.slug] ?? "" })),
};

export const site: SiteMeta = {
  ...siteData,
  url: SITE_URL_ENV ?? siteData.url,
  cards: DEFAULT_CARDS,
};
