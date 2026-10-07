/**
 * 그림 블록 — ```flow · ```compare · ```timeline 펜스를 그림으로 그린다.
 * 문법은 `lib/diagram.ts`.
 *
 * 좌표 대신 HTML 로 그려서 글자가 넘치지 않고, 좁은 화면에서는 세로로
 * 접히고, 색은 블로그 테마 변수를 따라간다. 강조색은 SVG 그림 양식과 같은
 * tip 팔레트다. 등장 애니메이션은 스크롤 타임라인을 지원하는 브라우저에서만
 * (`.dg-step`, globals.css) — 지원하지 않으면 그냥 보인다.
 *
 * 훅이 없어서 서버·클라이언트(스튜디오 미리보기) 어디서나 그려진다.
 */
import type { CSSProperties, ReactNode } from "react";
import type { CompareRow, Diagram as DiagramData, FlowNode, TimelinePoint } from "@/lib/diagram";

const ACCENT_BOX =
  "border-[var(--callout-tip-glyph)] bg-[var(--callout-tip-bg)] text-[var(--callout-tip-ink)]";

const step = (i: number) => ({ "--i": i }) as CSSProperties;

function Shell({ caption, children }: { caption?: string; children: ReactNode }) {
  return (
    <figure className="my-8">
      <div className="rounded-xl border border-border-token bg-surface-alt px-4 py-5 sm:px-6">{children}</div>
      {caption ? (
        <figcaption className="mt-[9px] font-sans text-[12.5px] leading-[1.5] tracking-[-0.005em] text-ink-muted">
          {caption}
        </figcaption>
      ) : null}
    </figure>
  );
}

function Arrow({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" aria-hidden className={`size-4 shrink-0 text-ink-muted ${className}`}>
      <path d="M3 8h9M8.5 4.5 12 8l-3.5 3.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ── flow ─────────────────────────────────────────────────────────────── */

function nodeBox(n: FlowNode) {
  if (n.accent) return ACCENT_BOX;
  if (n.muted) return "border-dashed border-border-strong bg-transparent text-ink-muted";
  return "border-border-strong/60 bg-surface text-ink";
}

function Badge({ n, i }: { n: FlowNode; i: number }) {
  return (
    <span
      className={`grid size-[22px] shrink-0 place-items-center rounded-full font-mono text-[11px] font-semibold tabular-nums ${
        n.accent
          ? "bg-[var(--callout-tip-glyph)] text-[var(--callout-tip-bg)]"
          : n.muted
            ? "border border-dashed border-border-strong text-ink-muted"
            : "bg-ink text-surface"
      }`}
    >
      {i + 1}
    </span>
  );
}

function Flow({ nodes }: { nodes: FlowNode[] }) {
  // 네 단계까지는 넓은 화면에서 가로, 그 이상이거나 좁은 화면이면 세로.
  const wide = nodes.length <= 4;
  return (
    <ol className={`flex flex-col ${wide ? "sm:flex-row sm:items-stretch" : ""}`}>
      {nodes.map((n, i) => (
        <li key={i} className={`dg-step flex flex-col ${wide ? "sm:flex-1 sm:flex-row sm:items-center" : ""}`} style={step(i)}>
          {i > 0 && (
            <span className={`flex justify-center py-1 pl-0 ${wide ? "sm:px-1.5 sm:py-0" : ""}`}>
              <Arrow className={`rotate-90 ${wide ? "sm:rotate-0" : ""}`} />
            </span>
          )}
          <div
            className={`flex flex-1 items-start gap-2.5 rounded-lg border px-3.5 py-3 ${nodeBox(n)} ${
              wide ? "sm:h-full sm:flex-col sm:gap-2" : ""
            }`}
          >
            <Badge n={n} i={i} />
            <div className="min-w-0">
              <div className={`text-[14.5px] leading-[1.4] break-keep ${n.accent ? "font-semibold" : "font-medium"}`}>
                {n.label}
              </div>
              {n.sub ? (
                <div className={`mt-0.5 text-[12.5px] leading-[1.45] break-keep ${n.accent ? "opacity-80" : "text-ink-muted"}`}>
                  {n.sub}
                </div>
              ) : null}
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
}

/* ── compare ──────────────────────────────────────────────────────────── */

const COMPARE_COLS = "sm:grid-cols-[minmax(6.5rem,0.8fr)_1fr_1rem_1fr]";

function Compare({ columns, rows }: { columns: [string, string]; rows: CompareRow[] }) {
  return (
    <div className="text-[14px] leading-[1.5]">
      <div className={`hidden gap-x-3 px-3 pb-2 font-mono text-[11px] tracking-[0.04em] text-ink-muted uppercase sm:grid ${COMPARE_COLS}`}>
        <span />
        <span>{columns[0]}</span>
        <span />
        <span>{columns[1]}</span>
      </div>
      <ul className="flex flex-col gap-2">
        {rows.map((r, i) => {
          const same = r.before === r.after;
          return (
            <li
              key={i}
              className={`dg-step grid grid-cols-1 gap-x-3 gap-y-1.5 rounded-lg border bg-surface px-3 py-2.5 sm:items-center ${COMPARE_COLS} ${
                r.accent ? "border-[var(--callout-tip-glyph)]" : r.muted ? "border-dashed border-border-strong" : "border-border-token"
              }`}
              style={step(i)}
            >
              <span className={`font-medium break-keep ${r.muted ? "text-ink-muted" : "text-ink"}`}>{r.item}</span>
              <span className="flex items-baseline gap-2 text-ink-muted break-keep">
                <span className="w-9 shrink-0 font-mono text-[10.5px] tracking-[0.04em] uppercase opacity-70 sm:hidden">{columns[0]}</span>
                {r.before || "—"}
              </span>
              <Arrow className="hidden sm:block" />
              <span
                className={`flex items-baseline gap-2 break-keep ${
                  r.accent ? "-mx-1.5 rounded-md px-1.5 py-0.5 font-semibold " + ACCENT_BOX : same || r.muted ? "text-ink-muted" : "font-medium text-ink"
                }`}
              >
                <span className="w-9 shrink-0 font-mono text-[10.5px] font-normal tracking-[0.04em] uppercase opacity-70 sm:hidden">{columns[1]}</span>
                {same ? "그대로" : r.after || "—"}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/* ── timeline ─────────────────────────────────────────────────────────── */

function Timeline({ points }: { points: TimelinePoint[] }) {
  return (
    <ol className="relative">
      {points.map((p, i) => {
        const last = i === points.length - 1;
        return (
          <li key={i} className="dg-step relative grid grid-cols-[18px_1fr] gap-x-3 pb-4 last:pb-0" style={step(i)}>
            {!last && (
              <span
                aria-hidden
                className={`absolute top-[16px] bottom-[-2px] left-[8.25px] w-px ${
                  points[i + 1].muted ? "border-l border-dashed border-border-strong" : "bg-border-strong"
                }`}
              />
            )}
            <span className="relative mt-[5px] grid size-[18px] place-items-center">
              <span
                className={`block rounded-full ${
                  p.accent
                    ? "size-[13px] bg-[var(--callout-tip-glyph)] ring-4 ring-[var(--callout-tip-bg)]"
                    : p.muted
                      ? "size-[11px] border border-dashed border-ink-muted bg-surface-alt"
                      : "size-[11px] border-2 border-ink bg-surface-alt"
                }`}
              />
            </span>
            <div className={`flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:gap-3 ${p.muted ? "text-ink-muted" : ""}`}>
              <span
                className={`shrink-0 font-mono text-[12.5px] tabular-nums sm:w-28 ${
                  p.accent ? "font-semibold text-[var(--callout-tip-glyph)]" : "text-ink-muted"
                }`}
              >
                {p.when}
              </span>
              <span className={`text-[14.5px] leading-[1.5] break-keep ${p.accent ? "font-semibold text-ink" : p.muted ? "" : "text-ink"}`}>
                {p.what}
              </span>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export function Diagram({ diagram }: { diagram: DiagramData }) {
  return (
    <Shell caption={diagram.caption}>
      {diagram.kind === "flow" ? (
        <Flow nodes={diagram.nodes} />
      ) : diagram.kind === "compare" ? (
        <Compare columns={diagram.columns} rows={diagram.rows} />
      ) : (
        <Timeline points={diagram.points} />
      )}
    </Shell>
  );
}
