import type { MetadataRoute } from "next";
import { getSite } from "@/lib/site-db";

// 설정 화면에서 URL 을 바꾸면 따라오도록 정본(DB)을 읽는다. force-static 이면
// 빌드 시점 값에 굳는다.
export const revalidate = 3600;

export default async function robots(): Promise<MetadataRoute.Robots> {
  const SITE_URL = (await getSite()).url;
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/studio", "/settings"],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
