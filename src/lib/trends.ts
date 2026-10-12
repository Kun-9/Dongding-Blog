/**
 * 트렌드 신호 — 트렌드 탐색기(release-scout.ts 의 TREND_PROMPT)가 탐색기 API 의
 * `signals`·`volume` 액션으로, 도구 글감 탐색기(TOOLS_PROMPT)가 `tools`, 인기 스킬
 * 탐색기(SKILLS_PROMPT)가 `skills` 액션으로 읽는다.
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

async function hn(tags = "story", days = 3) {
  const since = Math.floor(Date.now() / 1000) - days * DAY;
  const q = new URLSearchParams({ tags, numericFilters: `created_at_i>${since}`, hitsPerPage: "40" });
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

/* ── 스킬 ── 도구 글감 탐색기(TOOLS_PROMPT)는 `tools`, 인기 스킬 탐색기(SKILLS_PROMPT)는 `skills` 로 읽는다. ── */

type SkillRow = {
  source: string;
  skillId: string;
  installs: number;
  installsYesterday?: number;
  change?: number;
  isOfficial?: boolean;
  /** 전체 순위에만 있다. 최근 8주의 주별 설치 수, 오래된 주부터. */
  weeklyInstalls?: number[];
};

/**
 * skills.sh 순위 페이지에 박힌 행. 공개 API 는 Vercel OIDC 인증이 있어야 해서
 * 페이지를 읽는다. 같은 데이터가 두 번 실려 중복을 지운다.
 */
async function skillRows(tab: "" | "hot" | "trending"): Promise<SkillRow[]> {
  const html = (await (await get(`https://skills.sh/${tab}`)).text()).replace(/\\"/g, '"');
  const seen = new Set<string>();
  const rows = (html.match(/\{"source":"[^"]+","skillId":[^{}]*\}/g) ?? []).flatMap((s) => {
    try {
      const r = JSON.parse(s) as SkillRow;
      const key = `${r.source}/${r.skillId}`;
      if (seen.has(key)) return [];
      seen.add(key);
      return [r];
    } catch {
      return [];
    }
  });
  if (!rows.length) throw new Error("순위 데이터를 찾지 못함(페이지 구조가 바뀌었을 수 있음)");
  return rows;
}

/** GitHub 레포에서 온 스킬만 레포·상세 주소가 있다. uizze.sh 처럼 사이트에서 배포하는 것은 null. */
function skillLinks(source: string, skillId?: string) {
  const gh = /^[\w.-]+\/[\w.-]+$/.test(source);
  return {
    repo: gh ? `https://github.com/${source}` : null,
    page: gh ? `https://skills.sh/${source}${skillId ? `/${skillId}` : ""}` : null,
  };
}

/**
 * skills.sh hot·trending. 한 레포의 스킬 여러 개가 줄줄이 오르므로 레포(source)
 * 단위로 묶는다. hot 은 어제보다 는 설치, trending 은 24시간 설치 수다.
 */
async function skillsBoard(tab: "hot" | "trending") {
  const repos = new Map<string, { source: string; skills: string[]; installs: number; change: number; official: boolean }>();
  for (const r of await skillRows(tab)) {
    const g = repos.get(r.source) ?? { source: r.source, skills: [], installs: 0, change: 0, official: false };
    g.skills.push(r.skillId);
    g.installs += r.installs;
    g.change += r.change ?? 0;
    g.official ||= !!r.isOfficial;
    repos.set(r.source, g);
  }
  return [...repos.values()].slice(0, 20).map((g, i) => ({
    rank: i + 1,
    source: g.source,
    skills: g.skills.slice(0, 5),
    more: Math.max(0, g.skills.length - 5),
    installs: g.installs,
    ...(tab === "hot" ? { change: g.change } : {}),
    official: g.official,
    ...skillLinks(g.source),
  }));
}

/**
 * 주간·월간 인기 스킬. skills.sh 전체 순위(설치 상위 600개)의 행마다 최근 8주
 * 주별 설치 수가 있다. 주간은 마지막 칸, 월간은 마지막 네 칸 합. rise 는 마지막
 * 주를 앞 세 주 평균으로 나눈 값. 600개 밖의 작은 스킬은 보이지 않는다(막 뜬 것은
 * 도구 글감 탐색기가 hot 으로 본다).
 *
 * 개인·커뮤니티 스킬을 소개하려는 목록이라 셋을 미리 뺀다. 그대로 두면 상위 30이
 * 이것들로 차서 ponytail 같은 스킬이 목록에 들지 못한다(2026-10-12 실측).
 * - official: 회사가 자기 제품 쓰는 법을 담은 공식 스킬
 * - copies: 같은 스킬 이름 셋 이상을 공유하는 레포가 둘 넘게 더 있는 것. 한 묶음을
 *   이름만 바꾼 레포로 여럿 올려 설치 수를 부풀렸다(예: 여러 `*\/superpowers`).
 *   레포 안 스킬끼리 설치 수가 같은 것은 기준이 못 된다 — 레포를 통째로 설치하면
 *   mattpocock/skills 같은 정상 레포도 그렇다.
 * - flat: 최근 6주 주별 설치의 변동계수가 2.5% 미만. 사람이 골라 설치하면 이렇게
 *   일정하지 않다(예: 매주 113k 안팎인 reddit-automation).
 */
export async function popularSkills() {
  const sum = (a: number[]) => a.reduce((x, y) => x + y, 0);
  const rows = (await skillRows("")).filter((r) => r.weeklyInstalls?.length === 8);
  const names = new Map<string, Set<string>>();
  for (const r of rows) names.set(r.source, (names.get(r.source) ?? new Set()).add(r.skillId));
  const copies = new Set(
    [...names]
      .filter(([src, a]) => [...names].filter(([o, b]) => o !== src && [...a].filter((n) => b.has(n)).length >= 3).length >= 2)
      .map(([src]) => src),
  );
  const isFlat = (w: number[]) => {
    const a = w.slice(2);
    const m = sum(a) / a.length;
    return Math.min(...a) > 0 && Math.sqrt(sum(a.map((x) => (x - m) ** 2)) / a.length) / m < 0.025;
  };
  const flat = new Set(rows.filter((r) => isFlat(r.weeklyInstalls!)).map((r) => r.source));
  const official = new Set(rows.filter((r) => r.isOfficial).map((r) => r.source));
  const scored = rows
    .filter((r) => !official.has(r.source) && !copies.has(r.source) && !flat.has(r.source))
    .map((r) => {
      const w = r.weeklyInstalls!;
      const before = sum(w.slice(4, 7)) / 3;
      // 앞 세 주에 설치가 없던 새 스킬은 배수가 의미 없다.
      return { r, w, week: w[7], month: sum(w.slice(4)), rise: before >= 1 ? Math.round((w[7] / before) * 10) / 10 : null };
    });
  const top = (key: "week" | "month") => {
    // 레포마다 가장 높은 스킬 하나만 두고 나머지는 이름만 붙인다.
    const best = new Map<string, (typeof scored)[number] & { others: string[] }>();
    for (const s of [...scored].sort((a, b) => b[key] - a[key])) {
      const g = best.get(s.r.source);
      if (g) g.others.push(s.r.skillId);
      else best.set(s.r.source, { ...s, others: [] });
    }
    return [...best.values()].slice(0, 30).map((s, i) => ({
      rank: i + 1,
      id: `${s.r.source}/${s.r.skillId}`,
      source: s.r.source,
      skill: s.r.skillId,
      week: s.week,
      month: s.month,
      rise: s.rise,
      weeks: s.w,
      installs: s.r.installs,
      others: s.others.slice(0, 5),
      ...skillLinks(s.r.source, s.r.skillId),
    }));
  };
  // 루틴은 월요일마다 돈다. 한국 날짜로 1~7일이면 그달 첫 월요일이다.
  const kstDay = new Date(Date.now() + 9 * 3600_000).getUTCDate();
  return {
    at: new Date().toISOString(),
    monthly: kstDay <= 7,
    week: top("week"),
    month: top("month"),
    excluded: { official: [...official], copies: [...copies], flat: [...flat] },
  };
}

/** GitHub 트렌딩(오늘). 새 레포만 보는 github() 와 달리 오래된 레포가 다시 뜨는 것도 잡힌다. */
async function githubTrending() {
  const html = await (await get("https://github.com/trending?since=daily")).text();
  const num = (s?: string) => (s ? Number(s.replace(/,/g, "")) : null);
  return html
    .split('<article class="Box-row')
    .slice(1)
    .map((a, i) => {
      const repo = a.match(/<h2[\s\S]*?href="\/([^"]+)"/)?.[1] ?? "";
      return {
        rank: i + 1,
        repo,
        description: decode((a.match(/<p class="col-9[^"]*">([\s\S]*?)<\/p>/)?.[1] ?? "").replace(/<[^>]+>/g, "")).slice(0, 200) || null,
        language: a.match(/itemprop="programmingLanguage">([^<]+)</)?.[1] ?? null,
        stars: num(a.match(/\/stargazers"[\s\S]*?<\/svg>\s*([\d,]+)/)?.[1]),
        today: num(a.match(/([\d,]+) stars today/)?.[1]),
        url: `https://github.com/${repo}`,
      };
    });
}

const SOURCES = {
  hn: () => hn(),
  reddit,
  github,
  huggingface,
  gtrends_us: () => googleTrends("US"),
  gtrends_kr: () => googleTrends("KR"),
  geeknews,
};

const TOOL_SOURCES = {
  skills_hot: () => skillsBoard("hot"),
  skills_trending: () => skillsBoard("trending"),
  gh_trending: githubTrending,
  gh_new: github,
  show_hn: () => hn("show_hn", 7),
};

const reason = (e: unknown) => (e instanceof Error ? e.message : String(e));

async function collect<K extends string>(sources: Record<K, () => Promise<unknown>>) {
  const names = Object.keys(sources) as K[];
  const settled = await Promise.allSettled(names.map((n) => sources[n]()));
  const signals: Partial<Record<K, unknown>> = {};
  const errors: Partial<Record<K, string>> = {};
  settled.forEach((r, i) => {
    if (r.status === "fulfilled") signals[names[i]] = r.value;
    else errors[names[i]] = reason(r.reason);
  });
  return { at: new Date().toISOString(), signals, errors };
}

export const collectSignals = () => collect(SOURCES);
export const collectToolSignals = () => collect(TOOL_SOURCES);

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
