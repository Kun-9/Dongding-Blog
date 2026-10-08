/**
 * 트렌드 신호 — 트렌드 탐색기(release-scout.ts 의 TREND_PROMPT)가 탐색기 API 의
 * `signals`·`volume` 액션으로 읽는다.
 *
 * 외부 소스는 서버가 대신 부른다. 루틴 환경의 네트워크 허용 목록을 타지 않고,
 * 네이버 키도 서버 밖으로 나가지 않는다. 소스 하나가 막혀도 나머지는 돌려준다.
 */
import "server-only";

const UA = "Mozilla/5.0 (compatible; dongding-blog-trends/1.0; +https://blog.dongding.dev)";
const DAY = 86_400;
/** volume 의 칸 수. 7일씩, 오래된 것부터. */
const WEEKS = 4;

async function get(url: string, init?: RequestInit): Promise<Response> {
  const res = await fetch(url, {
    ...init,
    headers: { "user-agent": UA, ...init?.headers },
    cache: "no-store",
    signal: AbortSignal.timeout(8_000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res;
}

/* ── RSS·Atom ── 피드 세 개라 파서를 들이지 않는다. ─────────────────────── */

const decode = (s: string) =>
  s
    .replace(/^<!\[CDATA\[|\]\]>$/g, "")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;|&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .trim();

/** 첫 `<name>` 의 내용. `title` 은 `ht:news_item_title` 에 걸리지 않는다. */
const tag = (xml: string, name: string) =>
  decode(xml.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`))?.[1] ?? "");

const blocks = (xml: string, name: string) =>
  xml.match(new RegExp(`<${name}[\\s>][\\s\\S]*?</${name}>`, "g")) ?? [];

const href = (xml: string) => xml.match(/<link[^>]*href=["']([^"']+)["']/)?.[1] ?? null;

/* ── 소스 ─────────────────────────────────────────────────────────────── */

async function hn() {
  const since = Math.floor(Date.now() / 1000) - 3 * DAY;
  const q = new URLSearchParams({ tags: "story", numericFilters: `created_at_i>${since}`, hitsPerPage: "40" });
  const { hits } = (await (await get(`https://hn.algolia.com/api/v1/search?${q}`)).json()) as {
    hits: { title: string; url: string | null; points: number; num_comments: number; created_at: string; objectID: string }[];
  };
  return hits
    .map((h) => ({
      title: h.title,
      url: h.url,
      points: h.points,
      comments: h.num_comments,
      at: h.created_at,
      hn: `https://news.ycombinator.com/item?id=${h.objectID}`,
    }))
    .sort((a, b) => b.points - a.points);
}

const SUBREDDITS = ["ClaudeAI", "ChatGPTCoding", "LocalLLaMA", "cursor", "programming", "webdev"];

async function reddit() {
  const xml = await (await get(`https://www.reddit.com/r/${SUBREDDITS.join("+")}/top/.rss?t=day&limit=30`)).text();
  return blocks(xml, "entry").map((e, i) => ({
    rank: i + 1,
    title: tag(e, "title"),
    sub: e.match(/<category term="([^"]+)"/)?.[1] ?? null,
    url: href(e),
    at: tag(e, "published"),
  }));
}

async function github() {
  const since = new Date(Date.now() - 7 * DAY * 1000).toISOString().slice(0, 10);
  const token = process.env.GITHUB_TOKEN;
  const q = new URLSearchParams({ q: `created:>${since}`, sort: "stars", order: "desc", per_page: "30" });
  const { items } = (await (
    await get(`https://api.github.com/search/repositories?${q}`, {
      headers: { accept: "application/vnd.github+json", ...(token ? { authorization: `Bearer ${token}` } : {}) },
    })
  ).json()) as {
    items: { full_name: string; description: string | null; stargazers_count: number; language: string | null; created_at: string; html_url: string }[];
  };
  return items.map((r) => ({
    repo: r.full_name,
    description: r.description?.slice(0, 200) ?? null,
    stars: r.stargazers_count,
    language: r.language,
    created: r.created_at,
    url: r.html_url,
  }));
}

async function huggingface() {
  const list = (await (await get("https://huggingface.co/api/models?sort=trendingScore&direction=-1&limit=20")).json()) as {
    id: string;
    trendingScore: number;
    likes: number;
    downloads: number;
    pipeline_tag?: string;
  }[];
  return list.map((m) => ({
    model: m.id,
    trending: m.trendingScore,
    likes: m.likes,
    downloads: m.downloads,
    task: m.pipeline_tag ?? null,
    url: `https://huggingface.co/${m.id}`,
  }));
}

async function googleTrends(geo: "US" | "KR") {
  const xml = await (await get(`https://trends.google.com/trending/rss?geo=${geo}`)).text();
  return blocks(xml, "item").map((it) => ({
    query: tag(it, "title"),
    traffic: tag(it, "ht:approx_traffic"),
    at: tag(it, "pubDate"),
    news: blocks(it, "ht:news_item")
      .slice(0, 2)
      .map((n) => ({ title: tag(n, "ht:news_item_title"), url: tag(n, "ht:news_item_url") })),
  }));
}

async function geeknews() {
  const xml = await (await get("https://news.hada.io/rss/news")).text();
  return blocks(xml, "entry")
    .slice(0, 30)
    .map((e, i) => ({ rank: i + 1, title: tag(e, "title"), url: href(e), at: tag(e, "updated") }));
}

const SOURCES = {
  hn,
  reddit,
  github,
  huggingface,
  gtrends_us: () => googleTrends("US"),
  gtrends_kr: () => googleTrends("KR"),
  geeknews,
};

const reason = (e: unknown) => (e instanceof Error ? e.message : String(e));

export async function collectSignals() {
  const names = Object.keys(SOURCES) as (keyof typeof SOURCES)[];
  const settled = await Promise.allSettled(names.map((n) => SOURCES[n]()));
  const signals: Partial<Record<keyof typeof SOURCES, unknown>> = {};
  const errors: Partial<Record<keyof typeof SOURCES, string>> = {};
  settled.forEach((r, i) => {
    if (r.status === "fulfilled") signals[names[i]] = r.value;
    else errors[names[i]] = reason(r.reason);
  });
  return { at: new Date().toISOString(), signals, errors };
}

/* ── 키워드 추이 ──────────────────────────────────────────────────────── */

export interface VolumeKeyword {
  /** 해외에서 쓰는 이름 그대로. HN 과 네이버에 같이 쓴다. */
  term: string;
  /** 국내 표기. 네이버에서 term 과 합쳐 센다. */
  ko?: string;
}

/** HN 스토리·댓글에서 term 을 언급한 수. 7일씩 4칸, 오래된 것부터. */
async function hnWeekly(term: string): Promise<number[]> {
  const now = Math.floor(Date.now() / 1000);
  return Promise.all(
    Array.from({ length: WEEKS }, async (_, i) => {
      const to = now - (WEEKS - 1 - i) * 7 * DAY;
      const q = new URLSearchParams({
        query: `"${term}"`,
        tags: "(story,comment)",
        numericFilters: `created_at_i>${to - 7 * DAY},created_at_i<=${to}`,
        hitsPerPage: "0",
      });
      const { nbHits } = (await (await get(`https://hn.algolia.com/api/v1/search_by_date?${q}`)).json()) as { nbHits: number };
      return nbHits;
    }),
  );
}

/**
 * 네이버 데이터랩 상대 검색량을 7일씩 4칸으로 더한다. 어제까지 28일, 오래된 것부터.
 * 비율은 한 요청 안에서 가장 많이 검색된 날이 100 이라 키워드끼리만 비교된다.
 */
async function naverWeekly(keywords: VolumeKeyword[]): Promise<number[][]> {
  const id = process.env.NAVER_CLIENT_ID;
  const secret = process.env.NAVER_CLIENT_SECRET;
  if (!id || !secret) throw new Error("NAVER_CLIENT_ID·NAVER_CLIENT_SECRET 없음");
  // 한국 날짜. 오늘은 덜 찼으니 어제까지.
  const day = (ago: number) => new Date(Date.now() + 9 * 3600_000 - ago * DAY * 1000).toISOString().slice(0, 10);
  const startDate = day(WEEKS * 7);
  const res = await get("https://openapi.naver.com/v1/datalab/search", {
    method: "POST",
    headers: { "X-Naver-Client-Id": id, "X-Naver-Client-Secret": secret, "content-type": "application/json" },
    body: JSON.stringify({
      startDate,
      endDate: day(1),
      timeUnit: "date",
      keywordGroups: keywords.map((k) => ({ groupName: k.term, keywords: k.ko ? [k.term, k.ko] : [k.term] })),
    }),
  });
  const { results } = (await res.json()) as { results: { data: { period: string; ratio: number }[] }[] };
  return results.map((r) => bucketWeeks(r.data, startDate));
}

/** 날짜별 값을 startDate 부터 7일씩 WEEKS 칸으로 더한다. 빠진 날은 0 이다. */
export function bucketWeeks(data: { period: string; ratio: number }[], startDate: string): number[] {
  const weeks = Array<number>(WEEKS).fill(0);
  const start = Date.parse(startDate);
  for (const d of data) {
    const i = Math.floor((Date.parse(d.period) - start) / (7 * DAY * 1000));
    if (i >= 0 && i < WEEKS) weeks[i] += d.ratio;
  }
  return weeks.map((v) => Math.round(v * 10) / 10);
}

export async function keywordVolume(keywords: VolumeKeyword[]) {
  const [hnCounts, naver] = await Promise.all([
    Promise.allSettled(keywords.map((k) => hnWeekly(k.term))),
    naverWeekly(keywords).then(
      (v) => ({ ok: true as const, v }),
      (e: unknown) => ({ ok: false as const, error: reason(e) }),
    ),
  ]);
  return {
    windows: `최근 ${WEEKS * 7}일을 7일씩 ${WEEKS}칸, 오래된 것부터`,
    keywords: keywords.map((k, i) => {
      const h = hnCounts[i];
      return {
        term: k.term,
        ko: k.ko ?? null,
        hn: h.status === "fulfilled" ? h.value : null,
        naver: naver.ok ? naver.v[i] : null,
      };
    }),
    errors: {
      ...(naver.ok ? {} : { naver: naver.error }),
      ...Object.fromEntries(
        hnCounts.flatMap((h, i) => (h.status === "rejected" ? [[`hn:${keywords[i].term}`, reason(h.reason)]] : [])),
      ),
    },
  };
}
