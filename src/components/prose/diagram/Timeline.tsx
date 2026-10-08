/**
 * 시간 — timeline(시점별 사건)과 sequence(참여자 사이 주고받는 순서).
 */
import type { Message, TimelinePoint } from "@/lib/diagram";
import { ACCENT_GLYPH, Badge, cx, step } from "./parts";

function Dot({ p }: { p: TimelinePoint }) {
  return (
    <span
      data-anim="pop"
      className={cx(
        "relative z-[1] block rounded-full",
        p.accent
          ? "size-[13px] bg-[var(--callout-tip-glyph)] ring-[5px] ring-[var(--callout-tip-bg)]"
          : p.muted
            ? "size-[11px] border-[1.5px] border-dashed border-ink-muted bg-surface-alt"
            : "size-[11px] border-2 border-ink bg-surface-alt",
      )}
    />
  );
}

export function Timeline({ points }: { points: TimelinePoint[] }) {
  // 다섯 개까지는 넓은 화면에서 가로 띠, 그 이상은 세로.
  const wide = points.length <= 5;
  return (
    <ol className={cx("relative", wide && "sm:flex sm:items-start")}>
      {points.map((p, i) => {
        const next = points[i + 1];
        return (
          <li
            key={i}
            data-anim="rise"
            className={cx(
              "relative grid grid-cols-[18px_1fr] gap-x-3.5 pb-5 last:pb-0",
              wide && "sm:flex sm:min-w-0 sm:flex-1 sm:flex-col sm:items-center sm:px-2 sm:pb-0 sm:text-center",
            )}
            style={step(i)}
          >
            {next && (
              <span
                aria-hidden
                data-anim="draw"
                style={step(i + 0.5)}
                className={cx(
                  "absolute top-[20px] bottom-0 left-[8.5px] w-0 border-l-[1.5px]",
                  wide && "sm:top-[8.5px] sm:right-[calc(-50%+12px)] sm:bottom-auto sm:left-[calc(50%+12px)] sm:w-auto sm:border-t-[1.5px] sm:border-l-0",
                  next.muted ? "border-dashed border-border-strong" : "border-border-strong",
                )}
              />
            )}
            <span className="grid h-[18px] place-items-center pt-[3px] sm:pt-0">
              <Dot p={p} />
            </span>
            <span className={cx("flex flex-col gap-1", wide && "sm:mt-3 sm:items-center")}>
              <span
                className={cx(
                  "font-mono text-[12px] tracking-[0.01em] tabular-nums",
                  p.accent ? cx("font-semibold", ACCENT_GLYPH) : "text-ink-muted",
                )}
              >
                {p.when}
              </span>
              <span
                className={cx(
                  "text-[14.5px] leading-[1.5] break-keep",
                  p.accent ? "font-semibold text-ink" : p.muted ? "text-ink-muted" : "text-ink-soft",
                )}
              >
                {p.what}
              </span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}

/* ── sequence ─────────────────────────────────────────────────────────── */

function ArrowHead({ left, className }: { left: boolean; className: string }) {
  return (
    <svg
      viewBox="0 0 8 10"
      aria-hidden
      data-anim="pop"
      className={cx("absolute top-1/2 size-[9px] -translate-y-1/2", left ? "-left-[1px] rotate-180" : "-right-[1px]", className)}
    >
      <path d="M0 0 8 5 0 10z" fill="currentColor" />
    </svg>
  );
}

function Lanes({ actors, messages }: { actors: string[]; messages: Message[] }) {
  const n = actors.length;
  const center = (i: number) => ((i + 0.5) / n) * 100;
  return (
    <div>
      <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}>
        {actors.map((a, i) => (
          <span key={i} data-anim="rise" style={step(-1)} className="dg-lift justify-self-center rounded-lg border border-border-token bg-surface px-3 py-1.5 text-center text-[13px] font-semibold break-keep text-ink">
            {a}
          </span>
        ))}
      </div>
      <div className="relative pt-1 pb-2">
        {actors.map((_, i) => (
          <span
            key={i}
            aria-hidden
            className="absolute top-0 bottom-0 w-0 border-l-[1.5px] border-dashed border-ink-subtle"
            style={{ left: `${center(i)}%` }}
          />
        ))}
        {messages.map((m, k) => {
          const self = m.from === m.to;
          const lo = Math.min(m.from, m.to);
          const hi = Math.max(m.from, m.to);
          const left = center(lo);
          const width = center(hi) - left;
          const color = m.accent ? "text-[var(--callout-tip-glyph)]" : m.muted ? "text-ink-subtle" : "text-ink-muted";
          return (
            <div key={k} data-anim="fade" className="relative h-[60px]" style={step(k)}>
              {self ? (
                <span
                  data-anim="pop"
                  className={cx(
                    "absolute top-1/2 z-[1] max-w-[46%] -translate-x-1/2 -translate-y-1/2 rounded-lg border px-2.5 py-1.5 text-center text-[12.5px] leading-[1.35] break-keep",
                    m.accent
                      ? "border-[var(--callout-tip-glyph)] bg-[var(--callout-tip-bg)] font-semibold text-[var(--callout-tip-ink)]"
                      : "border-border-token bg-surface text-ink-soft",
                  )}
                  // 상자는 최대 46% 폭이라 가운데를 23~77% 안에 두면 판 밖으로 나가지 않는다(양 끝 참여자).
                  style={{ left: `clamp(23%, ${center(m.from)}%, 77%)` }}
                >
                  <span className="mr-1.5 font-mono text-[10.5px] text-ink-muted">{k + 1}</span>
                  {m.label}
                </span>
              ) : (
                <>
                  <span
                    className={cx(
                      "absolute bottom-[20px] line-clamp-2 px-2 text-center text-[12.5px] leading-[1.35] break-keep",
                      m.accent ? "font-semibold text-ink" : m.muted ? "text-ink-muted" : "text-ink-soft",
                    )}
                    style={{ left: `${left}%`, width: `${width}%` }}
                  >
                    <span className="mr-1.5 font-mono text-[10.5px] font-normal text-ink-muted">{k + 1}</span>
                    {m.label}
                  </span>
                  <span className={cx("absolute bottom-[14px] h-0", color)} style={{ left: `${left}%`, width: `${width}%` }}>
                    <span
                      data-anim={m.to < m.from ? "draw-back" : "draw"}
                      className={cx(
                        "absolute inset-x-[3px] top-0 border-t-[1.5px] border-current",
                        m.reply && "border-dashed",
                        m.accent && "border-t-2",
                      )}
                    />
                    <ArrowHead left={m.to < m.from} className="" />
                  </span>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function Sequence({ actors, messages }: { actors: string[]; messages: Message[] }) {
  // 참여자가 넷 이상이면 좁은 화면에선 칸이 너무 좁다 — 번호 목록으로.
  const fold = actors.length > 3;
  return (
    <>
      <div className={fold ? "hidden sm:block" : ""}>
        <Lanes actors={actors} messages={messages} />
      </div>
      {fold && (
        <ol className="flex flex-col gap-2 sm:hidden">
          {messages.map((m, k) => (
            <li key={k} data-anim="rise" className="flex items-start gap-3" style={step(k)}>
              <Badge m={m} n={k + 1} />
              <span className="min-w-0 text-[13.5px] leading-[1.5]">
                <span className="font-semibold text-ink">{actors[m.from]}</span>
                <span className="mx-1.5 text-ink-muted">{m.reply ? "⇠" : "→"}</span>
                <span className="font-semibold text-ink">{actors[m.to]}</span>
                {m.label ? <span className="block text-ink-soft">{m.label}</span> : null}
              </span>
            </li>
          ))}
        </ol>
      )}
    </>
  );
}
