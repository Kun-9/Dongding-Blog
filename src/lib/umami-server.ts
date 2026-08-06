/**
 * Server-side Umami client. Used only by /api/stats/* (dev-only).
 *
 * Uses the public share link (same two-step protocol as umami-share.ts), not
 * the Cloud API key — api.umami.is rejects our key with 401 and the share
 * token already grants every stats endpoint this page needs.
 */
const SHARE_BASE = process.env.NEXT_PUBLIC_UMAMI_SHARE_BASE;
const SHARE_ID = process.env.NEXT_PUBLIC_UMAMI_SHARE_ID;

export function umamiConfigured(): boolean {
  return Boolean(SHARE_BASE && SHARE_ID);
}

interface ShareSession {
  token: string;
  websiteId: string;
}

let session: ShareSession | null = null;

async function getSession(force = false): Promise<ShareSession> {
  if (session && !force) return session;
  const res = await fetch(`${SHARE_BASE}/share/${SHARE_ID}`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Umami share ${res.status}`);
  const json = await res.json();
  if (!json?.token || !json?.websiteId) throw new Error("Umami share malformed");
  session = { token: json.token, websiteId: json.websiteId };
  return session;
}

export async function umamiGet<T = unknown>(
  endpoint: string,
  params: Record<string, string | number>,
): Promise<T> {
  if (!umamiConfigured()) {
    throw new Error("NEXT_PUBLIC_UMAMI_SHARE_ID missing");
  }
  const qs = new URLSearchParams(
    Object.entries(params).map(([k, v]) => [k, String(v)]),
  );
  const call = async (s: ShareSession) =>
    fetch(`${SHARE_BASE}/websites/${s.websiteId}/${endpoint}?${qs}`, {
      headers: {
        "x-umami-share-token": s.token,
        "x-umami-share-context": "1",
        Accept: "application/json",
      },
      cache: "no-store",
    });

  let res = await call(await getSession());
  if (res.status === 401) res = await call(await getSession(true));
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
