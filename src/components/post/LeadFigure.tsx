/**
 * LeadFigure — 홈 Featured 오른쪽 리드 그림.
 *
 * 우선순위는 썸네일 > 시리즈 진행 인디케이터 > 카테고리·태그 타이포다.
 * 앞의 둘은 글마다 실제로 다른 정보를 담고, 마지막은 어떤 글이든 성립하는
 * 폴백이라 "그릴 게 없어서 빈 상자"가 나오는 경우가 없다.
 */
import Image from "next/image";
import type { PostMeta, Series } from "@/lib/types";

const FRAME =
  "relative flex aspect-[4/3] items-center justify-center overflow-hidden rounded-xl border border-border-token bg-surface";

/** 가로줄 배경 — 원래 목업의 조판을 그대로 유지한다. */
function Stripes() {
  return (
    <div
      className="absolute inset-0 opacity-55"
      style={{
        background: `repeating-linear-gradient(180deg, transparent 0 18px, var(--surface-alt) 18px 19px)`,
      }}
    />
  );
}

/**
 * slug 를 색조로 접는다(FNV-1a). 글마다 다른 색이 나오되 재배포해도 같은 색이
 * 유지되고, 채도를 낮게 잡아 크림/다크 배경 어느 쪽에서도 튀지 않는다.
 */
function hueOf(slug: string): number {
  let h = 2166136261;
  for (let i = 0; i < slug.length; i++) {
    h ^= slug.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) % 360;
}

export function LeadFigure({
  post,
  series,
  categoryLabel,
}: {
  post: PostMeta;
  series?: Series;
  /** 카테고리 표시명. 없으면 id 를 대문자로 쓴다. */
  categoryLabel?: string;
}) {
  if (post.thumbnail) {
    return (
      <div className={FRAME}>
        <Image
          src={post.thumbnail}
          alt=""
          fill
          sizes="280px"
          className="object-cover"
        />
      </div>
    );
  }

  if (series && post.seriesOrder && series.count > 0) {
    return <SeriesFigure post={post} series={series} />;
  }

  return <TypeFigure post={post} label={categoryLabel} />;
}

function SeriesFigure({ post, series }: { post: PostMeta; series: Series }) {
  // 계획 편수보다 뒤 회차가 붙는 일이 있어(planned_count 를 안 올린 경우) 칸 수를
  // 둘 중 큰 값으로 잡는다. 안 그러면 현재 편이 트랙 밖으로 밀린다.
  const total = Math.max(series.count, post.seriesOrder ?? 1);

  return (
    <div className={FRAME}>
      <Stripes />
      <div className="relative flex h-full w-full flex-col justify-between p-5">
        <div className="text-[11.5px] font-semibold tracking-[0.02em] text-ink-muted">
          {series.title}
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-[66px] font-bold leading-[0.9] tracking-[-0.05em] tabular-nums text-ink">
            {String(post.seriesOrder).padStart(2, "0")}
          </span>
          <span className="font-mono text-[13px] text-ink-muted">
            / {String(total).padStart(2, "0")}
          </span>
        </div>
        <div className="grid gap-[5px]" style={{ gridTemplateColumns: `repeat(${total}, 1fr)` }}>
          {Array.from({ length: total }, (_, i) => (
            <span
              key={i}
              className="h-[3px] rounded-sm bg-ink"
              style={{ opacity: i + 1 === post.seriesOrder ? 1 : 0.16 }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function TypeFigure({ post, label }: { post: PostMeta; label?: string }) {
  const heading = label ?? post.category.split("-")[0].toUpperCase();
  const tags = post.tags.slice(0, 4);

  return (
    <div className={FRAME}>
      <Stripes />
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(120% 90% at 50% 0%, hsl(${hueOf(post.slug)} 38% 55% / 0.1), transparent 70%)`,
        }}
      />
      <div className="relative px-4 text-center">
        <div className="text-[44px] font-bold leading-[1.1] tracking-[-0.04em] text-ink">
          {heading}
        </div>
        {tags.length > 0 && (
          <>
            <div className="mx-auto my-3 h-px w-[34px] bg-border-strong opacity-50" />
            <div className="break-keep font-mono text-[11px] leading-[1.9] text-ink-muted">
              {tags.join(" · ")}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
