"use client";

/**
 * Studio 전용 그림 블록. 그림을 누르면 폭 4단(`{xs}` / `{sm}` / 기본 / `{wide}`)이
 * 열리고, 고른 값을 콜백으로 올려 본문의 `![…](…){…}` 토큰을 고쳐 쓴다.
 *
 * 본문에 `{240}` 처럼 px 을 직접 적은 그림은 어느 버튼도 켜지지 않고 현재 px 을
 * 함께 보여 준다 — 버튼을 누르면 그 px 은 이름 폭으로 덮인다.
 * 묶음(연속 줄)의 열 수는 여기서 못 바꾼다. 본문에서 `{2}`~`{4}` 로 적는다.
 */
import { useEffect, useRef, useState } from "react";
import { Figure, type ImageSize } from "@/components/prose/Figure";

interface Props {
  src: string;
  alt?: string;
  size?: ImageSize;
  onResize?: (size: ImageSize) => void;
}

const SIZES: { v: ImageSize; label: string; hint: string }[] = [
  { v: "xs", label: "뱃지", hint: "120px" },
  { v: "sm", label: "좁게", hint: "380px" },
  { v: "", label: "기본", hint: "본문 폭" },
  { v: "wide", label: "넓게", hint: "880px" },
];

export function EditableImage({ src, alt = "", size = "", onResize }: Props) {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const onDown = (e: MouseEvent) => {
      if (panelRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onDown);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onDown);
    };
  }, [open]);

  return (
    <div className="relative">
      {/* 실물과 같은 렌더를 그대로 쓰고, 클릭만 가로채 폭 패널을 연다. */}
      <div
        onClickCapture={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen((o) => !o);
        }}
        className={open ? "rounded-lg outline outline-2 outline-ink" : undefined}
      >
        <Figure src={src} alt={alt} size={size} />
      </div>

      {open && onResize && (
        <div
          ref={panelRef}
          role="dialog"
          aria-label="이미지 폭"
          className="mb-4 flex w-full max-w-[420px] items-center gap-1.5 rounded-lg border border-border-token bg-surface px-3 py-2.5 shadow-md"
        >
          <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.05em] text-ink-muted">
            폭
          </span>
          {SIZES.map((s) => (
            <button
              key={s.v || "default"}
              type="button"
              onClick={() => onResize(s.v)}
              title={s.hint}
              className="rounded-md border px-2 py-[3px] font-sans text-[11.5px] transition"
              style={{
                borderColor: size === s.v ? "var(--ink)" : "var(--border)",
                background: size === s.v ? "var(--ink)" : "transparent",
                color: size === s.v ? "var(--bg)" : "var(--ink-soft)",
              }}
            >
              {s.label}
            </button>
          ))}
          {typeof size === "number" && (
            <span className="font-mono text-[11.5px] tabular-nums text-ink-muted">
              {size}px
            </span>
          )}
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="닫기"
            className="ml-auto rounded p-1 text-[12px] text-ink-muted hover:bg-hover hover:text-ink"
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
}
