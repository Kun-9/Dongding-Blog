/**
 * 그림 블록 공통 조각 — 판(Shell), 칸 모양, 번호 배지, 화살표.
 *
 * 색은 전부 테마 변수다. 강조는 SVG 그림 양식과 같은 tip 팔레트(초록),
 * 흐리게는 점선. 판 바탕의 점 격자·칸 그림자·강조 번짐은 globals.css 의
 * `.dg-*` 클래스가 맡는다(color-mix 가 필요해서).
 */
import type { CSSProperties, ReactNode } from "react";
import type { Mark } from "@/lib/diagram";
import { MotionFigure } from "./Motion";

export function cx(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(" ");
}

/** 등장 순서. `data-anim` 칸을 --i 순서로 스크롤에 묶는다(lib/figure-motion). */
export const step = (i: number) => ({ "--i": i }) as CSSProperties;

export const ACCENT_INK = "text-[var(--callout-tip-ink)]";
export const ACCENT_GLYPH = "text-[var(--callout-tip-glyph)]";

/** 칸 하나의 테두리·바탕·글자색. */
export function tone(m: Mark): string {
  if (m.accent) return "dg-accent border-[var(--callout-tip-glyph)] bg-[var(--callout-tip-bg)] text-[var(--callout-tip-ink)]";
  if (m.muted) return "border-dashed border-border-strong bg-transparent text-ink-muted";
  return "dg-lift border-border-token bg-surface text-ink";
}

export function Shell({
  caption,
  children,
  bare,
  sig,
}: {
  caption?: string;
  children: ReactNode;
  /** 판 없이(표처럼 자체 테두리가 있는 그림). */
  bare?: boolean;
  /** 그림 내용의 지문 — 바뀌면 판을 새로 그려 모션을 다시 붙인다. */
  sig: string;
}) {
  return (
    <MotionFigure key={sig} className="my-9">
      <div className={bare ? "" : "dg-panel rounded-2xl border border-border-token px-[18px] py-5 sm:px-7 sm:py-7"}>
        {children}
      </div>
      {caption ? (
        <figcaption className="mt-[10px] font-sans text-[12.5px] leading-[1.5] tracking-[-0.005em] text-ink-muted">
          {caption}
        </figcaption>
      ) : null}
    </MotionFigure>
  );
}

export function Badge({ m, n }: { m: Mark; n: number | string }) {
  return (
    <span
      data-anim="pop"
      className={cx(
        "grid size-[22px] shrink-0 place-items-center rounded-full font-mono text-[11px] font-semibold tabular-nums",
        m.accent
          ? "bg-[var(--callout-tip-glyph)] text-[var(--callout-tip-bg)]"
          : m.muted
            ? "border border-dashed border-border-strong text-ink-muted"
            : "bg-ink text-surface",
      )}
    >
      {n}
    </span>
  );
}

/** 오른쪽을 가리키는 꺾쇠. 회전해서 쓴다. */
export function Chevron({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 10 10" aria-hidden className={cx("size-[9px] shrink-0", className)}>
      <path d="M2.5 1.5 6.5 5l-4 3.5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Check({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" aria-hidden className={cx("size-3.5", className)}>
      <path d="m3.5 8.5 3 3 6-7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** 제목 + 짧은 설명. */
export function Label({ label, sub, m, size = "md" }: { label: string; sub?: string; m: Mark; size?: "sm" | "md" }) {
  return (
    <span className="block min-w-0">
      <span
        className={cx(
          "block leading-[1.4] break-keep",
          size === "sm" ? "text-[13.5px]" : "text-[14.5px]",
          m.accent ? "font-semibold" : "font-medium",
        )}
      >
        {label}
      </span>
      {sub ? (
        <span className={cx("mt-0.5 block text-[12.5px] leading-[1.45] break-keep", m.accent ? "opacity-75" : "text-ink-muted")}>
          {sub}
        </span>
      ) : null}
    </span>
  );
}
