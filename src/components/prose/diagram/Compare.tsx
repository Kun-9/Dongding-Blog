/**
 * 비교 — compare(전/후 두 열)와 matrix(항목 × 대상 표).
 */
import type { CompareRow, MatrixCell, MatrixRow } from "@/lib/diagram";
import { ACCENT_GLYPH, Check, Chevron, cx, step } from "./parts";

const COLS = "sm:grid-cols-[minmax(7rem,0.85fr)_1fr_14px_1fr]";

export function Compare({ columns, rows }: { columns: [string, string]; rows: CompareRow[] }) {
  return (
    <div className="dg-lift overflow-hidden rounded-xl border border-border-token bg-surface text-[14px] leading-[1.5]">
      <div className={cx("hidden items-center gap-x-4 border-b border-border-token bg-surface-alt/60 px-4 py-2.5 sm:grid", COLS)}>
        <span />
        <span className="justify-self-start rounded-full border border-border-strong/50 px-2.5 py-0.5 text-[12px] font-medium text-ink-muted">
          {columns[0]}
        </span>
        <span />
        <span className="justify-self-start rounded-full border border-[var(--callout-tip-glyph)] bg-[var(--callout-tip-bg)] px-2.5 py-0.5 text-[12px] font-semibold text-[var(--callout-tip-ink)]">
          {columns[1]}
        </span>
      </div>
      <ul>
        {rows.map((r, i) => {
          const same = r.before === r.after;
          return (
            <li
              key={i}
              className={cx("dg-step grid grid-cols-1 gap-x-4 gap-y-1 border-t border-border-token px-4 py-3 first:border-t-0 sm:items-center", COLS)}
              style={step(i)}
            >
              <span className={cx("font-medium break-keep", r.muted ? "text-ink-muted" : "text-ink")}>{r.item}</span>
              {/* 좁은 화면에선 이전 → 이후 를 한 줄로, 넓은 화면에선 각자 칸으로. */}
              <span className="flex flex-wrap items-center gap-x-2 gap-y-1 sm:contents">
                <span className="text-ink-muted break-keep">{r.before || "—"}</span>
                <Chevron className={cx("size-[10px]", r.accent ? ACCENT_GLYPH : "text-ink-subtle")} />
                <span
                  className={cx(
                    "justify-self-start break-keep",
                    r.accent
                      ? "rounded-md bg-[var(--callout-tip-bg)] px-2 py-0.5 font-semibold text-[var(--callout-tip-ink)] ring-1 ring-[var(--callout-tip-glyph)]/40"
                      : same || r.muted
                        ? "text-ink-muted"
                        : "font-medium text-ink",
                  )}
                >
                  {same ? "그대로" : r.after || "—"}
                </span>
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/* ── matrix ───────────────────────────────────────────────────────────── */

function Cell({ c }: { c: MatrixCell }) {
  if (c.kind === "yes") {
    return (
      <span className="inline-grid size-[22px] place-items-center rounded-full bg-[var(--callout-tip-bg)] text-[var(--callout-tip-glyph)] ring-1 ring-[var(--callout-tip-glyph)]/35">
        <Check />
        <span className="sr-only">지원</span>
      </span>
    );
  }
  if (c.kind === "no") {
    return (
      <span className="inline-block h-[1.5px] w-2.5 rounded-full bg-ink-subtle align-middle">
        <span className="sr-only">미지원</span>
      </span>
    );
  }
  if (c.kind === "part") {
    return (
      <span className="inline-grid size-[22px] place-items-center rounded-full bg-[var(--callout-warning-bg)] text-[var(--callout-warning-glyph)] ring-1 ring-[var(--callout-warning-glyph)]/35">
        <svg viewBox="0 0 16 16" aria-hidden className="size-3">
          <circle cx="8" cy="8" r="5.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
          <path d="M8 2.5a5.5 5.5 0 0 1 0 11z" fill="currentColor" />
        </svg>
        <span className="sr-only">일부</span>
      </span>
    );
  }
  return <span className="text-[13px] text-ink-soft break-keep">{c.text}</span>;
}

export function Matrix({ columns, rows }: { columns: string[]; rows: MatrixRow[] }) {
  return (
    <div className="dg-lift overflow-x-auto rounded-xl border border-border-token bg-surface">
      <table className="w-full border-collapse text-[14px] leading-[1.45]">
        <thead>
          <tr className="border-b border-border-token bg-surface-alt/60">
            <th className="w-[38%] px-4 py-2.5" />
            {columns.map((c, i) => (
              <th key={i} scope="col" className="px-3 py-2.5 text-center text-[12.5px] font-semibold text-ink-soft break-keep">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr
              key={i}
              className={cx(
                "dg-step border-t border-border-token first:border-t-0",
                r.accent && "bg-[var(--callout-tip-bg)]/55",
                r.muted && "text-ink-muted",
              )}
              style={step(i)}
            >
              <th scope="row" className={cx("px-4 py-3 text-left font-medium break-keep", r.accent && "font-semibold")}>
                {r.item}
              </th>
              {r.cells.map((c, j) => (
                <td key={j} className="px-3 py-3 text-center">
                  <Cell c={c} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
