/**
 * SeriesBanner — 시리즈에 속한 글 상단에 표시되는 컨텍스트 배너.
 * 좌측 색상 마커 + 시리즈 타이틀 + 현재 STEP 진행 표시 + 시리즈 페이지 링크.
 */
import Link from "next/link";

interface Props {
  seriesId: string;
  seriesTitle: string;
  color: string;
  currentOrder: number;
  total: number;
  publishedCount: number;
}

export function SeriesBanner({
  seriesId,
  seriesTitle,
  color,
  currentOrder,
  total,
  publishedCount,
}: Props) {
  const totalDigits = String(total).length;
  const cur = String(currentOrder).padStart(totalDigits, "0");
  const tot = String(total).padStart(totalDigits, "0");

  return (
    <Link
      href={`/series/${seriesId}`}
      className="group relative mb-6 flex items-center gap-3.5 overflow-hidden rounded-xl border border-border-token bg-surface px-4 py-3 no-underline transition-[border-color,background-color,transform] duration-200 hover:-translate-y-px hover:border-border-strong hover:bg-surface-alt"
    >
      <span
        aria-hidden
        className="absolute inset-y-0 left-0 w-[3px]"
        style={{ background: color }}
      />
      <span
        aria-hidden
        className="ml-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-border-token bg-surface-alt font-mono text-[10px] font-bold tabular-nums tracking-[0.04em] text-ink"
      >
        {cur}
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="flex items-center gap-2 font-sans text-[10.5px] font-bold uppercase tracking-[0.14em] text-ink-muted">
          <span>Series</span>
          <span className="opacity-30">·</span>
          <span className="font-mono tabular-nums tracking-[0.06em]">
            STEP {cur} / {tot}
          </span>
        </span>
        <span className="truncate font-sans text-[14.5px] font-semibold tracking-[-0.015em] text-ink">
          {seriesTitle}
        </span>
      </div>
      <span className="flex shrink-0 items-center gap-2 font-sans text-[11px] font-medium tracking-[-0.005em] text-ink-soft">
        <span className="hidden sm:inline">전체 {publishedCount}편</span>
        <span
          aria-hidden
          className="font-mono text-[12px] text-ink-muted transition-transform duration-200 group-hover:translate-x-1"
        >
          →
        </span>
      </span>
    </Link>
  );
}
