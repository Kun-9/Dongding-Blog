/**
 * 숫자 — stats(큰 숫자 카드)와 bars(가로 막대 비교).
 */
import type { Bar, Stat } from "@/lib/diagram";
import { ACCENT_GLYPH, cx, step, tone } from "./parts";

export function Stats({ items }: { items: Stat[] }) {
  return (
    <ul className="grid grid-cols-[repeat(auto-fit,minmax(9.5rem,1fr))] gap-3">
      {items.map((s, i) => (
        <li key={i} data-anim="rise" className={cx("flex flex-col rounded-xl border px-4 py-4", tone(s))} style={step(i)}>
          {s.before ? (
            <span className="mb-1 font-mono text-[12px] tabular-nums text-ink-muted">
              <span className="line-through decoration-ink-subtle">{s.before}</span>
              <span className="mx-1.5">→</span>
            </span>
          ) : null}
          {/* 바뀐 숫자(14회 → 2회)는 앞 값에서 센다. */}
          <span
            data-anim="count"
            data-from={s.before ? parseFloat(s.before.replace(/,/g, "")) || undefined : undefined}
            className={cx(
              "text-[28px] leading-[1.1] font-semibold tracking-[-0.025em] tabular-nums break-keep",
              s.accent ? ACCENT_GLYPH : s.muted ? "text-ink-muted" : "text-ink",
            )}
          >
            {s.value}
          </span>
          <span className={cx("mt-2 text-[13px] leading-[1.45] break-keep", s.accent ? "" : "text-ink-soft")}>{s.label}</span>
          {s.note ? <span className="mt-1 font-mono text-[11px] leading-[1.4] text-ink-muted">{s.note}</span> : null}
        </li>
      ))}
    </ul>
  );
}

function fmt(n: number): string {
  return Number.isInteger(n) ? n.toLocaleString("ko-KR") : String(n);
}

export function Bars({ items, unit }: { items: Bar[]; unit?: string }) {
  const max = Math.max(...items.map((b) => b.value)) || 1;
  return (
    <ul className="flex flex-col gap-3 sm:grid sm:grid-cols-[minmax(6rem,9.5rem)_1fr_auto] sm:gap-x-3">
      {items.map((b, i) => (
        <li
          key={i}
          data-anim="rise"
          className="grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-1.5 sm:col-span-3 sm:grid-cols-subgrid"
          style={step(i)}
        >
          <span className={cx("text-[13.5px] leading-[1.4] break-keep", b.accent ? "font-semibold text-ink" : b.muted ? "text-ink-muted" : "text-ink-soft")}>
            {b.label}
          </span>
          <span className="order-3 col-span-2 h-2.5 overflow-hidden rounded-full bg-ink/[0.07] sm:order-none sm:col-span-1">
            <span
              data-anim="grow"
              className={cx(
                "block h-full rounded-full",
                b.accent
                  ? "bg-[var(--callout-tip-glyph)]"
                  : b.muted
                    ? "border border-dashed border-ink-muted bg-transparent"
                    : "bg-ink-muted/70",
              )}
              style={{ width: `${Math.max(2, (b.value / max) * 100)}%` }}
            />
          </span>
          <span
            data-anim="count"
            className={cx(
              "text-right font-mono text-[12.5px] tabular-nums",
              b.accent ? cx("font-semibold", ACCENT_GLYPH) : "text-ink-muted",
            )}
          >
            {b.display ?? `${fmt(b.value)}${unit ?? ""}`}
          </span>
        </li>
      ))}
    </ul>
  );
}
