/**
 * 트렌드 신호 — 트렌드 탐색기(release-scout.ts 의 TREND_PROMPT)가 탐색기 API 의
 * `signals`·`volume` 액션으로 읽는다.
 *
 * 외부 소스는 서버가 대신 부른다. 루틴 환경은 허용 목록 밖 사이트를 열지 못한다.
 * 키 없이 열리는 소스만 쓴다. 소스 하나가 막혀도 나머지는 돌려준다.
 */
import "server-only";

import { CONCEPT_AREAS, type ConceptArea } from "@/lib/concept-areas";

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
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&#x([0-9a-f]+);/gi, (_, h: string) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, n: string) => String.fromCodePoint(Number(n)))
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

export async function keywordVolume(terms: string[]) {
  const counts = await Promise.allSettled(terms.map(hnWeekly));
  return {
    windows: `최근 ${WEEKS * 7}일을 7일씩 ${WEEKS}칸, 오래된 것부터`,
    keywords: terms.map((term, i) => {
      const c = counts[i];
      return { term, hn: c.status === "fulfilled" ? c.value : null };
    }),
    errors: Object.fromEntries(counts.flatMap((c, i) => (c.status === "rejected" ? [[terms[i], reason(c.reason)]] : []))),
  };
}

/* ── 개념 질문 ─────────────────────────────────────────────────────────── */

/**
 * 큰 주제의 태그마다 Stack Overflow 가 꼽은 자주 묻는 질문(FAQ). 오래 많이 읽힌
 * 질문이 곧 개발자가 헷갈리는 지점이다. 키 없이 IP 당 하루 300회라 넉넉하다.
 */
export async function conceptQuestions(area: ConceptArea) {
  const { tags } = CONCEPT_AREAS.find((a) => a.key === area)!;
  const settled = await Promise.allSettled(
    tags.map(async (tag) => {
      const res = await get(`https://api.stackexchange.com/2.3/tags/${encodeURIComponent(tag)}/faq?site=stackoverflow&pagesize=6`);
      const { items } = (await res.json()) as {
        items: { title: string; link: string; view_count: number }[];
      };
      // 태그 여덟 개를 한 번에 읽는다. 조회수와 제목이면 헷갈리는 지점을 고르기에 족하다.
      return items.map((q) => ({ title: decode(q.title), views: q.view_count, url: q.link }));
    }),
  );
  return {
    area,
    questions: Object.fromEntries(tags.map((t, i) => [t, settled[i].status === "fulfilled" ? settled[i].value : []])),
    errors: Object.fromEntries(
      settled.flatMap((r, i) => (r.status === "rejected" ? [[tags[i], reason(r.reason)]] : [])),
    ),
  };
}

/* ── 페이지 읽기 ──────────────────────────────────────────────────────── */

/** 본문은 사실 확인에 이 정도면 족하다. */
const READ_LIMIT = 20_000;

/**
 * 루틴 환경은 허용 목록 밖 사이트(openai.com, mistral.ai 등)를 열지 못한다.
 * 1차 출처는 서버가 대신 받아 글자만 돌려준다. 토큰을 가진 루틴만 부른다.
 */
export async function readPage(raw: string) {
  const url = new URL(raw);
  if (url.protocol !== "https:" || /^(localhost|[\d.]+|\[.*\])$/i.test(url.hostname)) {
    throw new Error("https 공개 주소만 읽는다");
  }
  const res = await get(url.toString(), { headers: { accept: "text/html,text/plain,application/json;q=0.9,*/*;q=0.5" } });
  const type = res.headers.get("content-type") ?? "";
  if (!/text|json|xml/.test(type)) throw new Error(`읽을 수 없는 형식: ${type || "알 수 없음"}`);
  const page = await res.text();
  const html = type.includes("html");
  // 주소에 #조각이 있으면 그 요소부터 읽는다. RFC·명세는 한 쪽이 길어 앞 2만 자에 원하는 절이 없다.
  const id = url.hash ? decodeURIComponent(url.hash.slice(1)) : "";
  const escaped = id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const at = html && id ? page.search(new RegExp(`\\sid=["']${escaped}["']`)) : -1;
  const body = at > 0 ? page.slice(page.lastIndexOf("<", at)) : page;
  const text = html
    ? decode(body.replace(/<(script|style|noscript|svg|nav|footer)[\s\S]*?<\/\1>/gi, " ").replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ")
    : body;
  return {
    url: res.url,
    title: html ? tag(page, "title") : null,
    text: text.slice(0, READ_LIMIT),
    truncated: text.length > READ_LIMIT,
  };
}
