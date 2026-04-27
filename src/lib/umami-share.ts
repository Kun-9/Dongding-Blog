/**
 * Umami share API client — read-only public stats via share URL.
 *
 * Two-step protocol:
 *   1. GET {SHARE_BASE}/share/{SHARE_ID} → { token, websiteId }
 *   2. GET {SHARE_BASE}/websites/{websiteId}/{endpoint} with
 *      x-umami-share-token + x-umami-share-context: 1 headers
 *
 * Returns null on missing env or any error so callers can render-or-hide.
 */
const SHARE_BASE = process.env.NEXT_PUBLIC_UMAMI_SHARE_BASE;
const SHARE_ID = process.env.NEXT_PUBLIC_UMAMI_SHARE_ID;

const VIEWS_TTL = 30 * 60_000;
const TOP_TTL = 60 * 60_000;

interface Cached<T> {
  v: T;
  t: number;
}

interface ShareSession {
  token: string;
  websiteId: string;
}

function read<T>(key: string, ttl: number): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    const c: Cached<T> = JSON.parse(raw);
    if (Date.now() - c.t > ttl) return null;
    return c.v;
  } catch {
    return null;
  }
}

function write<T>(key: string, v: T) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(key, JSON.stringify({ v, t: Date.now() }));
  } catch {
    /* private mode etc. */
  }
}

let sessionPromise: Promise<ShareSession | null> | null = null;

function getShareSession(): Promise<ShareSession | null> {
  if (!SHARE_BASE || !SHARE_ID) return Promise.resolve(null);
  if (sessionPromise) return sessionPromise;
  sessionPromise = (async () => {
    try {
      const res = await fetch(`${SHARE_BASE}/share/${SHARE_ID}`);
      if (!res.ok) throw new Error(String(res.status));
      const json = await res.json();
      if (!json?.token || !json?.websiteId) return null;
      return { token: json.token, websiteId: json.websiteId };
    } catch (err) {
      console.warn("[umami] share session failed:", err);
      sessionPromise = null;
      return null;
    }
  })();
  return sessionPromise;
}

async function shareFetch<T>(
  endpoint: string,
  params: Record<string, string | number>,
): Promise<T | null> {
  const session = await getShareSession();
  if (!session) return null;
  const qs = new URLSearchParams(
    Object.entries(params).map(([k, v]) => [k, String(v)]),
  );
  const url = `${SHARE_BASE}/websites/${session.websiteId}/${endpoint}?${qs}`;
  try {
    const res = await fetch(url, {
      headers: {
        "x-umami-share-token": session.token,
        "x-umami-share-context": "1",
        accept: "application/json",
      },
    });
    if (!res.ok) throw new Error(String(res.status));
    return (await res.json()) as T;
  } catch (err) {
    console.warn("[umami] shareFetch failed:", endpoint, err);
    return null;
  }
}

function range(days: number) {
  const endAt = Date.now();
  const startAt = endAt - days * 24 * 60 * 60_000;
  return { startAt, endAt };
}

interface StatsResponse {
  pageviews: number | { value: number };
  visitors: number | { value: number };
}

export async function getPageViews(path: string): Promise<number | null> {
  if (!SHARE_BASE || !SHARE_ID) return null;
  const key = `umami:views:${path}`;
  const cached = read<number>(key, VIEWS_TTL);
  if (cached != null) return cached;

  const { startAt, endAt } = range(365);
  const data = await shareFetch<StatsResponse>("stats", {
    startAt,
    endAt,
    url: path,
  });
  if (!data) return null;
  const pv = data.pageviews;
  const value = typeof pv === "number" ? pv : (pv?.value ?? 0);
  write(key, value);
  return value;
}

export interface TopPage {
  url: string;
  count: number;
}

export async function getTopPages(opts?: {
  days?: number;
  limit?: number;
}): Promise<TopPage[] | null> {
  if (!SHARE_BASE || !SHARE_ID) return null;
  const days = opts?.days ?? 7;
  const limit = opts?.limit ?? 10;
  const key = `umami:top:${days}:${limit}`;
  const cached = read<TopPage[]>(key, TOP_TTL);
  if (cached != null) return cached;

  const { startAt, endAt } = range(days);
  const data = await shareFetch<{ x: string; y: number }[]>("metrics", {
    startAt,
    endAt,
    type: "path",
    limit,
  });
  if (!data) return null;
  const value = data.map((r) => ({ url: r.x, count: r.y }));
  write(key, value);
  return value;
}
