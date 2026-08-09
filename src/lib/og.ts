/**
 * 외부 페이지의 OG 메타를 읽는다.
 *
 * 원래 `/api/bookmarks/preview` 안에만 있던 코드다. 링크 프리뷰 카드도 같은 일을
 * 하게 되면서 한 벌로 합쳤다 — 두 벌이 되면 SSRF 가드나 인코딩 처리가 한쪽에만
 * 들어가는 날이 온다.
 */
import "server-only";

const TIMEOUT_MS = 5000;
const MAX_BYTES = 256 * 1024;
const USER_AGENT = "Mozilla/5.0 (compatible; dongding-blog-bot)";

export interface OgMeta {
  title: string;
  description: string;
  image: string;
  source: string;
}

const EMPTY: OgMeta = { title: "", description: "", image: "", source: "" };

/** SSRF 가드 — 루프백·사설망은 요청 자체를 보내지 않는다. */
export function isPrivateHost(host: string): boolean {
  const h = host.toLowerCase();
  if (h === "localhost" || h === "::1" || h === "0.0.0.0") return true;
  if (h.endsWith(".localhost")) return true;

  const m = h.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!m) return false;
  const a = Number(m[1]);
  const b = Number(m[2]);
  if (a === 10) return true;
  if (a === 127) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 169 && b === 254) return true;
  return false;
}

/** 앞에 프로토콜이 없으면 https 를 붙여 정규화한다. 못 쓰는 주소면 null. */
export function normalizeUrl(raw: string): URL | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const withProto = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  let parsed: URL;
  try {
    parsed = new URL(withProto);
  } catch {
    return null;
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
  if (isPrivateHost(parsed.hostname)) return null;
  return parsed;
}

export function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, n) =>
      String.fromCodePoint(parseInt(n, 16)),
    );
}

function findMeta(html: string, property: string): string {
  const re = new RegExp(
    `<meta[^>]+(?:property|name)\\s*=\\s*["']${property}["'][^>]*>`,
    "i",
  );
  const tag = html.match(re)?.[0];
  if (!tag) return "";
  const content = tag.match(/content\s*=\s*["']([^"']*)["']/i)?.[1];
  return content ? decodeEntities(content).trim() : "";
}

function findTitleTag(html: string): string {
  const m = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return m ? decodeEntities(m[1]).trim() : "";
}

export function parseOg(html: string, base?: URL): OgMeta {
  const title =
    findMeta(html, "og:title") ||
    findMeta(html, "twitter:title") ||
    findTitleTag(html);
  const description =
    findMeta(html, "og:description") ||
    findMeta(html, "twitter:description") ||
    findMeta(html, "description");
  const rawImage =
    findMeta(html, "og:image") || findMeta(html, "twitter:image");
  const source =
    findMeta(html, "og:site_name") || findMeta(html, "application-name");

  let image = rawImage;
  if (rawImage && base) {
    try {
      image = new URL(rawImage, base).toString();
    } catch {
      image = "";
    }
  }

  return { title, description, image, source };
}

/** 앞부분만 읽고 끊는다 — OG 태그는 <head> 에 있고 본문은 필요 없다. */
async function readCappedText(res: Response): Promise<string> {
  const reader = res.body?.getReader();
  if (!reader) return "";
  const decoder = new TextDecoder("utf-8", { fatal: false });
  let received = 0;
  let out = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    received += value.byteLength;
    out += decoder.decode(value, { stream: true });
    if (received >= MAX_BYTES) {
      try {
        await reader.cancel();
      } catch {}
      break;
    }
  }
  out += decoder.decode();
  return out;
}

/**
 * 한 주소를 읽어 OG 를 돌려준다. 못 읽으면 빈 값 — 던지지 않는다.
 * 호출자는 "읽어 봤지만 없더라"와 "안 읽어 봤다"를 구분할 필요가 없다.
 */
export async function fetchOg(rawUrl: string): Promise<OgMeta> {
  const parsed = normalizeUrl(rawUrl);
  if (!parsed) return EMPTY;

  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(parsed.toString(), {
      method: "GET",
      redirect: "follow",
      signal: ac.signal,
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "text/html,application/xhtml+xml",
      },
    });
    if (!res.ok) return EMPTY;
    const ct = res.headers.get("content-type") ?? "";
    if (!ct.includes("text/html") && !ct.includes("xml")) return EMPTY;
    return parseOg(await readCappedText(res), parsed);
  } catch {
    return EMPTY;
  } finally {
    clearTimeout(timer);
  }
}
