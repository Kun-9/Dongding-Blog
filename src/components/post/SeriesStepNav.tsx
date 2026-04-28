/**
 * SeriesStepNav — 시리즈에 속한 글 하단에 표시되는 단계 네비게이션.
 * 헤더 스트립(시리즈 타이틀 + 전체 보기) + 이전/다음 단계 카드 두 칸.
 */
import Link from "next/link";
import type { PostMeta } from "@/lib/types";

interface Props {
  seriesId: string;
  seriesTitle: string;
  color: string;
  publishedCount: number;
  prev?: PostMeta;
  next?: PostMeta;
}

function StepLabel({ order }: { order?: number }) {
  if (!order) return null;
  return (
    <>
      <span className="opacity-30">·</span>
      <span className="font-mono tabular-nums tracking-[0.06em]">
        STEP {String(order).padStart(2, "0")}
      </span>
    </>
  );
}

export function SeriesStepNav({
  seriesId,
  seriesTitle,
  color,
  publishedCount,
  prev,
  next,
}: Props) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border-token bg-surface">
      <div className="flex items-center justify-between gap-4 border-b border-border-token bg-surface-alt px-5 py-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span
            aria-hidden
            className="h-2 w-2 shrink-0 rounded-full"
            style={{ background: color, boxShadow: `0 0 0 3px ${color}22` }}
          />
          <span className="font-sans text-[10.5px] font-bold uppercase tracking-[0.14em] text-ink-muted">
            Series
          </span>
          <span className="opacity-30">·</span>
          <span className="truncate font-sans text-[13px] font-semibold tracking-[-0.01em] text-ink">
            {seriesTitle}
          </span>
        </div>
        <Link
          href={`/series/${seriesId}`}
          className="group/all shrink-0 font-sans text-[12px] font-medium text-ink-soft no-underline hover:text-ink"
        >
          전체 보기 ({publishedCount}편){" "}
          <span
            aria-hidden
            className="inline-block font-mono transition-transform duration-200 group-hover/all:translate-x-0.5"
          >
            →
          </span>
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2">
        {prev ? (
          <Link
            href={`/posts/${prev.slug}`}
            className="group/prev flex flex-col gap-1.5 border-b border-border-token p-5 text-inherit no-underline transition-colors duration-200 hover:bg-surface-alt sm:border-b-0 sm:border-r"
          >
            <div className="flex items-center gap-2 font-sans text-[10.5px] font-bold uppercase tracking-[0.14em] text-ink-muted">
              <span
                aria-hidden
                className="font-mono transition-transform duration-200 group-hover/prev:-translate-x-1"
              >
                ←
              </span>
              <span>이전 단계</span>
              <StepLabel order={prev.seriesOrder} />
            </div>
            <div className="font-sans text-[15.5px] font-semibold leading-[1.4] tracking-[-0.018em] text-ink">
              {prev.title}
            </div>
          </Link>
        ) : (
          <div className="hidden items-center gap-2 border-b border-border-token p-5 sm:flex sm:border-b-0 sm:border-r">
            <span className="font-sans text-[10.5px] font-bold uppercase tracking-[0.14em] text-ink-muted opacity-50">
              ◌ 시리즈 시작
            </span>
          </div>
        )}

        {next ? (
          <Link
            href={`/posts/${next.slug}`}
            className="group/next flex flex-col items-end gap-1.5 p-5 text-right text-inherit no-underline transition-colors duration-200 hover:bg-surface-alt"
            style={{ ["--accent" as string]: color }}
          >
            <div
              className="flex items-center gap-2 font-sans text-[10.5px] font-bold uppercase tracking-[0.14em]"
              style={{ color }}
            >
              <StepLabelInline order={next.seriesOrder} />
              <span>다음 단계</span>
              <span
                aria-hidden
                className="font-mono transition-transform duration-200 group-hover/next:translate-x-1"
              >
                →
              </span>
            </div>
            <div className="font-sans text-[15.5px] font-semibold leading-[1.4] tracking-[-0.018em] text-ink">
              {next.title}
            </div>
          </Link>
        ) : (
          <div className="flex items-center justify-end gap-2 p-5">
            <span className="font-sans text-[10.5px] font-bold uppercase tracking-[0.14em] text-ink-muted opacity-50">
              마지막 단계 ●
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

function StepLabelInline({ order }: { order?: number }) {
  if (!order) return null;
  return (
    <>
      <span className="font-mono tabular-nums tracking-[0.06em]">
        STEP {String(order).padStart(2, "0")}
      </span>
      <span className="opacity-30">·</span>
    </>
  );
}
