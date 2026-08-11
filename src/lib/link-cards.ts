/**
 * 링크 카드 문법 — 줄 하나에 URL 또는 `/posts/slug` 만 있으면 카드로 펼쳐진다.
 *
 * 파서(`lib/markdown`)·점검(`lib/lint`)·OG 수집(`lib/link-meta`)이 같은 판정을
 * 써야 하므로 여기 한 벌만 둔다. next·supabase 의존이 없는 순수 모듈이다.
 */

/**
 * 카드로 펼쳐질 줄. 앞뒤 공백은 호출자가 trim 한 상태로 넘긴다.
 *
 * 끝 슬래시를 받아주는 건 `trailingSlash: true` 때문이다 — 사이트가 내보내는
 * 주소가 `/posts/slug/` 라, 주소창에서 복사해 붙이면 그 꼴로 들어온다.
 */
export const CARD_LINE_RE =
  /^(https?:\/\/[^\s<>]+|\/posts\/[A-Za-z0-9_-]+\/?)$/;

const POST_REF_RE = /^\/posts\/([A-Za-z0-9_-]+)\/?$/;

export interface LinkCardMeta {
  title?: string;
  description?: string;
  image?: string;
  icon?: string;
}

export interface PostRefMeta {
  title: string;
  summary?: string;
  category?: string;
  date: string;
}

/**
 * 캐시 키 — 프로토콜과 끝 슬래시를 뺀 주소. `http://a.com/x/` 와
 * `https://a.com/x` 가 같은 글에서 따로 저장되지 않게 한다.
 */
export function linkKey(url: string): string {
  return String(url)
    .trim()
    .replace(/^https?:\/\//, "")
    .replace(/\/+$/, "");
}

export function cardSlug(line: string): string | null {
  return line.match(POST_REF_RE)?.[1] ?? null;
}

/**
 * 본문에서 카드 줄을 걷어낸다. 코드 펜스 안은 건너뛴다 — 예시로 적어 둔 URL 을
 * 남의 사이트에 요청하러 나가면 안 된다.
 */
export function extractCardTargets(body: string): {
  urls: string[];
  slugs: string[];
} {
  const urls = new Set<string>();
  const slugs = new Set<string>();
  let inFence = false;

  for (const raw of String(body ?? "").split("\n")) {
    if (raw.startsWith("```")) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;

    const line = raw.trim();
    if (!CARD_LINE_RE.test(line)) continue;

    const slug = cardSlug(line);
    if (slug) slugs.add(slug);
    else urls.add(line);
  }

  return { urls: [...urls], slugs: [...slugs] };
}
