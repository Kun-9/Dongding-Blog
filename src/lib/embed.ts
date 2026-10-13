/**
 * ```embed 블록 — 스킬이 만든 위젯처럼 실제로 작동하는 HTML 을 글 안에서 그대로 돌린다(2026-10-13 anatomy 글).
 * 파서(`markdown.tsx`)·점검(`lint.ts`)·쓰기 기준(`voice.ts`)이 같은 판정을 쓰도록 여기 한 벌만 둔다.
 *
 *   ```embed
 *   caption: 같은 요청을 스킬 없이와 /anatomy로 만든 결과
 *   src: /posts/<slug>/before.html | 스킬 없이
 *   src: /posts/<slug>/after.html | /anatomy
 *   height: 560
 *   ```
 *
 * src 가 둘 이상이면 `|` 뒤 이름을 버튼으로 바꿔 보는 탭이 된다. height 를 빼면 안쪽 문서 높이에 맞춘다.
 * HTML 은 Storage(post-images)에 올리고, 화면에서는 스크립트만 허용한 sandbox iframe 에 srcdoc 으로 넣는다.
 * Storage 는 HTML 을 text/plain 으로 내주므로 주소를 직접 열면 글자로만 보인다.
 */

export interface EmbedItem {
  src: string;
  label: string;
}

export interface EmbedBlock {
  items: EmbedItem[];
  caption: string;
  /** 없으면 안쪽 문서 높이에 맞춘다. */
  height?: number;
}

export const EMBED_SRC_RE = /^\/posts\/[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\/[a-z0-9][a-z0-9-]*\.html$/;
export const EMBED_MIN_H = 120;
export const EMBED_MAX_H = 2000;

/** 올릴 HTML 의 글자 수 상한. 한글이 많아도 Vercel 요청 본문 한도(4.5MB) 안에 든다. */
export const EMBED_MAX_CHARS = 1_400_000;

/**
 * Storage 에 올릴 때의 옵션. Storage 는 HTML 을 어차피 text/plain 으로 내주니 그대로 둔다.
 * 위젯은 고쳐 올리는 일이 잦아 브라우저 캐시를 1분으로 줄인다(기본 1시간).
 */
export const EMBED_UPLOAD = { contentType: "text/plain; charset=utf-8", cacheControl: "60", upsert: true } as const;

/** 올리기 전에 거를 것. 문제가 없으면 null. */
export function embedHtmlProblem(html: string): string | null {
  if (html.length > EMBED_MAX_CHARS) return `HTML 이 ${html.length}자입니다. ${EMBED_MAX_CHARS}자 안으로 줄이세요`;
  if (/<script\b[^>]*\ssrc\s*=\s*["']?(?:https?:)?\/\//i.test(html)) {
    return "외부 스크립트를 부르는 HTML 은 올릴 수 없습니다. 스크립트를 한 파일 안에 넣으세요";
  }
  return null;
}

/** 틀린 데가 하나라도 있으면 embed 는 null — 렌더러는 코드 블록으로 보여 주고 점검이 errors 를 알린다. */
export function parseEmbed(source: string): { embed: EmbedBlock | null; errors: string[] } {
  const items: EmbedItem[] = [];
  const errors: string[] = [];
  let caption = "";
  let height: number | undefined;

  for (const raw of source.split("\n")) {
    const line = raw.trim();
    if (!line) continue;
    const m = line.match(/^([a-z]+):\s*(.*)$/);
    if (!m) {
      errors.push(`알 수 없는 줄: ${line}`);
      continue;
    }
    const [, key, value] = m;
    if (key === "src") {
      const [src, ...rest] = value.split("|");
      const path = src.trim();
      if (!EMBED_SRC_RE.test(path)) errors.push(`src 는 /posts/<slug>/<이름>.html 입니다: ${path}`);
      else if (items.some((it) => it.src === path)) errors.push(`같은 src 가 두 번 나옵니다: ${path}`);
      else items.push({ src: path, label: rest.join("|").trim() });
    } else if (key === "height") {
      const n = Number(value);
      if (Number.isInteger(n) && n >= EMBED_MIN_H && n <= EMBED_MAX_H) height = n;
      else errors.push(`height 는 ${EMBED_MIN_H}~${EMBED_MAX_H} 사이 정수(px)입니다: ${value}`);
    } else if (key === "caption") {
      caption = value.trim();
    } else {
      errors.push(`알 수 없는 키: ${key} (src·height·caption)`);
    }
  }

  if (!items.length && !errors.length) errors.push("src 가 없습니다");
  if (items.length > 1 && items.some((it) => !it.label)) {
    errors.push("src 가 둘 이상이면 `src: 경로 | 버튼 이름` 으로 이름을 붙입니다");
  }
  return { embed: errors.length ? null : { items, caption, height }, errors };
}
