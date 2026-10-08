/**
 * 흐름 — flow(한 방향 단계)와 cycle(되돌아오는 고리).
 */
import { Fragment } from "react";
import type { Item } from "@/lib/diagram";
import { Badge, Chevron, Label, cx, step, tone } from "./parts";

/** 단계 사이 연결선. 좁은 화면에선 세로, wide 면 넓은 화면에서 가로. 앞 칸 다음, 다음 칸 전에 그려진다. */
function Connector({ wide, muted, i }: { wide: boolean; muted: boolean; i: number }) {
  return (
    <li
      aria-hidden
      data-anim="fade"
      className={cx("flex shrink-0 flex-col items-center py-1", wide && "sm:flex-row sm:px-1 sm:py-0")}
      style={step(i - 0.5)}
    >
      <span
        data-anim="draw"
        className={cx(
          "block h-4 w-0 border-l-[1.5px]",
          wide && "sm:h-0 sm:w-5 sm:border-t-[1.5px] sm:border-l-0",
          muted ? "border-dashed border-border-strong" : "border-ink-muted/60",
        )}
      />
      <Chevron className={cx("-mt-[3px] rotate-90 text-ink-muted", wide && "sm:mt-0 sm:-ml-[3px] sm:rotate-0")} />
    </li>
  );
}

export function Flow({ nodes }: { nodes: Item[] }) {
  // 네 단계까지는 넓은 화면에서 가로, 그 이상이거나 좁은 화면이면 세로.
  const wide = nodes.length <= 4;
  return (
    <ol className={cx("flex flex-col", wide && "sm:flex-row sm:items-stretch")}>
      {nodes.map((n, i) => (
        <Fragment key={i}>
          {i > 0 && <Connector wide={wide} muted={n.muted} i={i} />}
          <li
            data-anim="rise"
            data-detail={n.detail}
            className={cx("flex gap-3 rounded-xl border px-4 py-3.5", tone(n), wide && "sm:min-w-0 sm:flex-1 sm:flex-col sm:gap-2.5")}
            style={step(i)}
          >
            <Badge m={n} n={i + 1} />
            <Label label={n.label} sub={n.sub} m={n} />
          </li>
        </Fragment>
      ))}
    </ol>
  );
}

/* ── cycle ────────────────────────────────────────────────────────────── */

// 고리는 16:9 판 위의 타원. 반지름은 판 폭·높이에 대한 비율(%).
const RX = 36;
const RY = 37;
const ASPECT = 9 / 16;

function onRing(theta: number) {
  return { x: 50 + RX * Math.sin(theta), y: 50 - RY * Math.cos(theta) };
}

export function Cycle({ nodes, center }: { nodes: Item[]; center?: string }) {
  const n = nodes.length;
  const angle = (i: number) => (2 * Math.PI * i) / n;
  return (
    <>
      {/* 넓은 화면: 타원 고리 */}
      <div aria-hidden className="relative mx-auto hidden aspect-[16/9] w-full max-w-[620px] sm:block">
        <svg viewBox="0 0 100 56.25" preserveAspectRatio="none" data-anim="fade" style={step(-1)} className="absolute inset-0 size-full overflow-visible">
          {/* 고리가 내용이라 점선이 시계 방향으로 천천히 흐른다(data-loop). */}
          <ellipse
            data-loop="orbit"
            cx="50"
            cy="28.125"
            rx={RX}
            ry={RY * ASPECT}
            fill="none"
            stroke="var(--border-strong)"
            strokeWidth="1.5"
            strokeDasharray="5 6"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
        {nodes.map((_, i) => {
          // 두 칸 사이 고리 위에 진행 방향(시계 방향) 꺾쇠.
          const t = angle(i) + Math.PI / n;
          const p = onRing(t);
          const deg = (Math.atan2(RY * ASPECT * Math.sin(t), RX * Math.cos(t)) * 180) / Math.PI;
          return (
            <span
              key={`c${i}`}
              data-anim="pop"
              className="absolute grid size-5 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-surface-alt text-ink-muted"
              style={{ left: `${p.x}%`, top: `${p.y}%`, ...step(i + 0.5) }}
            >
              <span className="grid place-items-center" style={{ transform: `rotate(${deg}deg)` }}>
                <Chevron className="size-[10px]" />
              </span>
            </span>
          );
        })}
        {nodes.map((node, i) => {
          const p = onRing(angle(i));
          return (
            <div
              key={i}
              data-anim="rise"
              data-detail={node.detail}
              className={cx(
                "absolute flex w-max max-w-[34%] -translate-x-1/2 -translate-y-1/2 items-center gap-2.5 rounded-xl border px-3.5 py-2.5",
                tone(node),
              )}
              style={{ left: `${p.x}%`, top: `${p.y}%`, ...step(i) }}
            >
              <Badge m={node} n={i + 1} />
              <Label label={node.label} sub={node.sub} m={node} size="sm" />
            </div>
          );
        })}
        {center ? (
          <div className="absolute inset-0 grid place-items-center">
            <span className="max-w-[30%] text-center font-mono text-[11.5px] leading-[1.4] tracking-[0.03em] text-ink-muted uppercase">
              {center}
            </span>
          </div>
        ) : null}
      </div>

      {/* 좁은 화면: 목록 + 되돌아가는 표시 */}
      <ol className="flex flex-col gap-2 sm:hidden">
        {center ? (
          <li className="mb-1 font-mono text-[11px] tracking-[0.03em] text-ink-muted uppercase">{center}</li>
        ) : null}
        {nodes.map((node, i) => (
          <li key={i} data-anim="rise" data-detail={node.detail} className={cx("flex items-center gap-3 rounded-xl border px-3.5 py-3", tone(node))} style={step(i)}>
            <Badge m={node} n={i + 1} />
            <Label label={node.label} sub={node.sub} m={node} size="sm" />
          </li>
        ))}
        <li className="flex items-center gap-2 pl-1 text-[12.5px] text-ink-muted">
          <svg viewBox="0 0 16 16" aria-hidden className="size-4">
            <path d="M12.5 6.5A5 5 0 1 0 13 10M13 3v3.5H9.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          다시 1단계로
        </li>
      </ol>
    </>
  );
}
