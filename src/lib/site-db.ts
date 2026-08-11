/**
 * 사이트 전역 설정 — Supabase `site_settings` 를 정본으로 읽는다.
 *
 * `lib/site.ts` 의 `site` 는 이제 번들에 박힌 기본값이다. DB 행이 없거나
 * 스키마가 어긋나면 그쪽으로 떨어진다 — 설정 한 줄 때문에 사이트 전체가
 * 500 으로 죽는 편보다 낫다.
 *
 * 클라이언트 컴포넌트는 이 모듈을 import 할 수 없다 — 서버에서 props 로 넘길 것.
 */
import "server-only";

import { cache } from "react";
import { z } from "zod";
import { db } from "@/lib/supabase";
import defaults from "@/lib/site.json";
import { SITE_URL_ENV } from "@/lib/site";
import type { SiteMeta } from "@/lib/types";

export const SiteSchema = z.object({
  url: z.string().url(),
  title: z.string().min(1),
  shortTitle: z.string().min(1),
  description: z.string().min(1),
  lang: z.string().min(1),
  locale: z.string().min(1),
  copyright: z.string().min(1),
  author: z.string().min(1),
  handle: z.string().min(1),
  bio: z.string(),
  intro: z.string(),
  // 나중에 붙은 필드라 기존 행에는 없다. required 로 두면 파싱이 통째로 실패해
  // 저장해둔 설정이 전부 기본값으로 떨어진다.
  about: z.string().default(defaults.about),
  og: z.object({
    headline: z.array(z.string().min(1)).min(1).max(3),
    tagline: z.string(),
    label: z.string().min(1),
  }),
  social: z.object({
    github: z.string(),
    email: z.string(),
  }),
});

/**
 * DB 에 저장된 값 그대로 — env 오버라이드 전. 설정 폼이 편집하는 대상이라
 * 여기에 env 를 섞으면 저장할 때 배포 URL 이 DB 에 그대로 박힌다.
 */
export const getStoredSite = cache(async (): Promise<SiteMeta> => {
  const { data, error } = await db()
    .from("site_settings")
    .select("data")
    .eq("id", 1)
    .maybeSingle();

  if (error) {
    console.warn(`사이트 설정 조회 실패, 기본값으로 렌더: ${error.message}`);
    return defaults;
  }

  const parsed = SiteSchema.safeParse(data?.data);
  return parsed.success ? parsed.data : defaults;
});

/** 렌더링용. url 은 배포 환경변수가 있으면 그쪽이 우선한다 (site.ts 와 같은 규칙). */
export async function getSite(): Promise<SiteMeta> {
  const stored = await getStoredSite();
  return SITE_URL_ENV ? { ...stored, url: SITE_URL_ENV } : stored;
}
