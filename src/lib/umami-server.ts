/**
 * Server-side Umami client. Used only by /api/stats/* (dev-only).
 * Reads UMAMI_API_KEY from server env (never exposed to client).
 */
const API_BASE = process.env.UMAMI_API_BASE;
const API_KEY = process.env.UMAMI_API_KEY;
const WEBSITE_ID = process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID;

export function umamiConfigured(): boolean {
  return Boolean(API_BASE && API_KEY && WEBSITE_ID);
}

export async function umamiGet<T = unknown>(
  endpoint: string,
  params: Record<string, string | number>,
): Promise<T> {
  if (!umamiConfigured()) {
    throw new Error("UMAMI_API_KEY or website ID missing");
  }
  const qs = new URLSearchParams(
    Object.entries(params).map(([k, v]) => [k, String(v)]),
  );
  const url = `${API_BASE}/websites/${WEBSITE_ID}/${endpoint}?${qs}`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      Accept: "application/json",
    },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Umami ${endpoint} ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export function rangeFromDays(days: number) {
  const endAt = Date.now();
  const startAt = endAt - days * 24 * 60 * 60_000;
  return { startAt, endAt };
}
