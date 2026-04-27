/**
 * Umami share API client — read-only public stats via share URL.
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

function range(days: number) {
  const endAt = Date.now();
  const startAt = endAt - days * 24 * 60 * 60_000;
  return { startAt, endAt };
}

export async function getPageViews(path: string): Promise<number | null> {
  if (!SHARE_BASE || !SHARE_ID) return null;
  const key = `umami:views:${path}`;
  const cached = read<number>(key, VIEWS_TTL);
  if (cached != null) return cached;

  const { startAt, endAt } = range(365);
  const url = `${SHARE_BASE}/share/${SHARE_ID}/stats?startAt=${startAt}&endAt=${endAt}&url=${encodeURIComponent(path)}`;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(String(res.status));
    const json = await res.json();
    const value = json?.pageviews?.value ?? 0;
    write(key, value);
    return value;
  } catch (err) {
    console.warn("[umami] getPageViews failed:", err);
    return null;
  }
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
  const url = `${SHARE_BASE}/share/${SHARE_ID}/metrics?startAt=${startAt}&endAt=${endAt}&type=url&limit=${limit}`;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(String(res.status));
    const json: { x: string; y: number }[] = await res.json();
    const value = json.map((r) => ({ url: r.x, count: r.y }));
    write(key, value);
    return value;
  } catch (err) {
    console.warn("[umami] getTopPages failed:", err);
    return null;
  }
}
