/**
 * Site-wide configuration. Mutable values live in `site.json` so the
 * dev-only `/api/settings` route can rewrite them; this module just imports
 * them, layers env overrides, and exposes a typed `site` object.
 *
 * To change site title / SEO / social, edit `site.json` directly or use the
 * Settings page on a local `npm run dev` server.
 */
import siteData from "@/lib/site.json";
import type { SiteMeta } from "@/lib/types";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? siteData.url;

export const site: SiteMeta = {
  ...siteData,
  url: SITE_URL,
};
