/**
 * 링크 프리뷰 카드가 쓰는 OG 메타 — 수집(쓰기)과 조회(읽기).
 *
 * 수집은 글을 저장하는 시점에 한 번만 일어난다. 렌더는 `link_meta` 표만 보므로
 * 상세 페이지가 남의 사이트 응답속도에 묶이지 않는다. 못 읽은 주소도 행을 남겨
 * (title=null) 저장할 때마다 같은 벽에 다시 부딪히지 않게 한다.
 */
import "server-only";

import {
  extractCardTargets,
  linkKey,
  type LinkCardMeta,
} from "@/lib/link-cards";
import { fetchOg } from "@/lib/og";
import { db, dbAdmin } from "@/lib/supabase";

/** 이 기간이 지난 캐시는 다음 저장 때 다시 읽는다. */
const STALE_MS = 30 * 24 * 60 * 60 * 1000;

const MAX_TITLE = 200;
const MAX_DESC = 300;
/** 저장 한 번에 나가는 외부 요청 상한. */
const MAX_FETCH_PER_SAVE = 20;

/** 이 표를 읽는 쪽. 키는 `linkKey` 정규화 결과다. */
export async function getLinkMeta(
  urls: string[],
): Promise<Record<string, LinkCardMeta>> {
  if (urls.length === 0) return {};
  const keys = [...new Set(urls.map(linkKey))];

  const { data, error } = await db()
    .from("link_meta")
    .select("url, title, description, image")
    .in("url", keys);
  // 카드는 메타가 없어도 도메인 한 줄로 성립한다 — 조회 실패로 글을 못 열게 하지 않는다.
  if (error) return {};

  const out: Record<string, LinkCardMeta> = {};
  for (const row of data ?? []) {
    if (!row.title) continue;
    out[row.url] = {
      title: row.title,
      description: row.description ?? undefined,
      image: row.image ?? undefined,
    };
  }
  return out;
}

/**
 * 본문의 외부 링크 카드 주소를 읽어 캐시에 채운다.
 * 저장 경로에서 부르되 실패가 저장을 막지 않게 호출자가 catch 한다.
 */
export async function syncLinkMeta(body: string): Promise<void> {
  return syncLinkMetaUrls(extractCardTargets(body).urls);
}

/** 주소 목록을 이미 알고 있을 때(미리보기 API). */
export async function syncLinkMetaUrls(urls: string[]): Promise<void> {
  if (urls.length === 0) return;

  const byKey = new Map<string, string>();
  for (const url of urls) byKey.set(linkKey(url), url);

  const { data } = await dbAdmin()
    .from("link_meta")
    .select("url, fetched_at")
    .in("url", [...byKey.keys()]);

  const cutoff = Date.now() - STALE_MS;
  for (const row of data ?? []) {
    if (Date.parse(row.fetched_at) > cutoff) byKey.delete(row.url);
  }
  if (byKey.size === 0) return;

  const now = new Date().toISOString();
  // ponytail: 한 번에 나가는 외부 요청은 여기까지. 넘치면 다음 저장이 이어 받는다.
  // 배치 큐가 필요할 만큼 카드가 많은 글은 아직 없다.
  const rows = await Promise.all(
    [...byKey].slice(0, MAX_FETCH_PER_SAVE).map(async ([key, url]) => {
      const og = await fetchOg(url);
      return {
        url: key,
        title: clip(og.title, MAX_TITLE),
        description: clip(og.description, MAX_DESC),
        image: og.image || null,
        fetched_at: now,
      };
    }),
  );

  await dbAdmin().from("link_meta").upsert(rows, { onConflict: "url" });
}

function clip(s: string, max: number): string | null {
  const t = s.replace(/\s+/g, " ").trim();
  return t ? t.slice(0, max) : null;
}
