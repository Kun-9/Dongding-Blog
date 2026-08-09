/**
 * LinkCard — 본문에 URL 만 한 줄로 두면 펼쳐지는 외부 링크 카드.
 * Port of prose.jsx#LinkCard.
 *
 * 메타데이터는 서버가 글 저장 시점에 OG 태그를 읽어 캐싱한 표에서 온다
 * (`lib/link-meta`). 브라우저에서 남의 사이트를 긁을 수 없기 때문이다.
 * 캐시에 없으면 도메인 + 경로 한 줄로 떨어진다 — 빈 카드보다 낫다.
 */
import type { LinkCardMeta } from "@/lib/link-cards";

interface Props {
  url: string;
  meta?: LinkCardMeta;
}

function host(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url.replace(/^https?:\/\//, "").split("/")[0];
  }
}

function path(url: string): string {
  try {
    const u = new URL(url);
    return (u.pathname + u.search).replace(/\/$/, "");
  } catch {
    return "";
  }
}

/** FNV-1a — 같은 도메인이면 늘 같은 색조가 나오게. */
function hue(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) % 360;
}

export function LinkCard({ url, meta }: Props) {
  const h = host(url);
  const title = meta?.title;

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={`group my-[22px] flex gap-3.5 rounded-[10px] border border-border-token bg-surface no-underline transition-colors hover:border-border-strong hover:bg-surface-alt ${
        title ? "px-[17px] py-[15px]" : "px-3.5 py-3"
      }`}
    >
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-2">
          <span
            aria-hidden
            className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-[5px] font-mono text-[10.5px] font-bold uppercase"
            style={{
              background: `hsl(${hue(h)} 34% var(--link-tile-l))`,
              color: `hsl(${hue(h)} 32% var(--link-tile-ink-l))`,
            }}
          >
            {h.charAt(0)}
          </span>
          <span className="whitespace-nowrap font-mono text-[11.5px] text-ink-muted">
            {h}
          </span>
          {title ? (
            <span className="flex-1" />
          ) : (
            <span className="min-w-0 flex-1 truncate font-mono text-[11.5px] text-ink-subtle">
              {path(url)}
            </span>
          )}
          <span
            aria-hidden
            className="text-[12.5px] text-ink-muted transition-transform group-hover:translate-x-px group-hover:-translate-y-px group-hover:text-ink"
          >
            ↗
          </span>
        </div>
        {title && (
          <>
            <div className="mt-[9px] line-clamp-2 font-sans text-[15.5px] font-semibold leading-[1.4] tracking-[-0.018em] text-ink">
              {title}
            </div>
            {meta?.description && (
              <div className="mt-[5px] line-clamp-2 font-sans text-[13.5px] leading-[1.6] text-ink-muted">
                {meta.description}
              </div>
            )}
          </>
        )}
      </div>
      {title && meta?.image && (
        // eslint-disable-next-line @next/next/no-img-element -- 남의 도메인 이미지라 next/image 의 최적화 대상이 아니다
        <img
          src={meta.image}
          alt=""
          className="h-24 w-[132px] shrink-0 self-center rounded-[7px] bg-surface-alt object-cover"
        />
      )}
    </a>
  );
}
