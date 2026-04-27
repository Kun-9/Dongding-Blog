"use client";

import { useEffect, useRef } from "react";
import type { ReactNode } from "react";
import { useTheme } from "next-themes";
import { useMounted } from "@/lib/hooks";

export type ConfirmTone = "danger" | "warning" | "info";

interface Props {
  open: boolean;
  tone?: ConfirmTone;
  title: string;
  body?: ReactNode;
  meta?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

interface ToneStyle {
  glyph: string;
  glyphBg: string;
  glyphFg: string;
  ringBg: string;
  btnBg: string;
  btnInk: string;
  btnHover: string;
}

function getTones(isDark: boolean): Record<ConfirmTone, ToneStyle> {
  return {
    danger: {
      glyph: "⌫",
      glyphBg: isDark ? "rgba(163,90,77,0.22)" : "rgba(160,74,58,0.12)",
      glyphFg: isDark ? "#d99a8c" : "#a04a3a",
      ringBg: isDark ? "rgba(163,90,77,0.10)" : "rgba(160,74,58,0.06)",
      btnBg: isDark ? "#7a3a30" : "#a04a3a",
      btnInk: "#fff",
      btnHover: isDark ? "#8a4438" : "#b25646",
    },
    warning: {
      glyph: "!",
      glyphBg: isDark ? "rgba(194,160,90,0.22)" : "rgba(154,122,35,0.12)",
      glyphFg: isDark ? "#e0c486" : "#9a7a23",
      ringBg: isDark ? "rgba(194,160,90,0.10)" : "rgba(154,122,35,0.06)",
      btnBg: isDark ? "#a07a2a" : "#9a7a23",
      btnInk: "#fff",
      btnHover: isDark ? "#b8893a" : "#b08a2c",
    },
    info: {
      glyph: "?",
      glyphBg: isDark ? "rgba(127,165,176,0.22)" : "rgba(90,133,144,0.12)",
      glyphFg: isDark ? "#7fa5b0" : "#5a8590",
      ringBg: isDark ? "rgba(127,165,176,0.10)" : "rgba(90,133,144,0.06)",
      btnBg: "var(--ink)",
      btnInk: "var(--bg)",
      btnHover: isDark ? "#fff" : "#000",
    },
  };
}

export function ConfirmDialog({
  open,
  tone = "info",
  title,
  body,
  meta,
  confirmLabel = "확인",
  cancelLabel = "취소",
  onConfirm,
  onCancel,
}: Props) {
  const confirmBtnRef = useRef<HTMLButtonElement | null>(null);
  const mounted = useMounted();
  const { resolvedTheme } = useTheme();
  const isDark = mounted ? resolvedTheme === "dark" : false;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onCancel();
      }
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const id = window.setTimeout(() => confirmBtnRef.current?.focus(), 30);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
      window.clearTimeout(id);
    };
  }, [open, onCancel]);

  if (!open) return null;

  const tones = getTones(isDark);
  const t = tones[tone];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="cd-title"
      onClick={onCancel}
      className="fixed inset-0 z-[100] flex items-center justify-center p-6"
      style={{
        background: isDark ? "rgba(8,7,6,0.72)" : "rgba(28,28,28,0.42)",
        backdropFilter: "blur(6px) saturate(120%)",
        WebkitBackdropFilter: "blur(6px) saturate(120%)",
        animation: "cd-fade-in 0.18s ease-out",
      }}
    >
      <style>{`
        @keyframes cd-fade-in { from { opacity: 0; } to { opacity: 1; } }
        @keyframes cd-pop-in {
          from { opacity: 0; transform: translateY(6px) scale(0.98); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>

      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[440px] rounded-[14px] border border-border-token bg-surface px-7 pb-[22px] pt-7 outline-none"
        style={{
          boxShadow: isDark
            ? "0 20px 60px rgba(0,0,0,0.5), 0 4px 12px rgba(0,0,0,0.3)"
            : "0 20px 60px rgba(28,28,28,0.18), 0 4px 12px rgba(28,28,28,0.06)",
          animation: "cd-pop-in 0.22s cubic-bezier(0.2, 0.8, 0.2, 1)",
        }}
      >
        {/* Tone glyph */}
        <div
          className="mb-[18px] flex h-11 w-11 items-center justify-center rounded-[10px] font-sans text-[20px] font-bold"
          style={{
            background: t.glyphBg,
            color: t.glyphFg,
            boxShadow: `0 0 0 6px ${t.ringBg}`,
          }}
        >
          {t.glyph}
        </div>

        <h3
          id="cd-title"
          className="m-0 font-sans text-[19px] font-semibold leading-[1.35] tracking-[-0.025em] text-ink"
        >
          {title}
        </h3>

        {body && (
          <div
            className="mt-2 font-sans text-sm leading-[1.65] tracking-[-0.005em] text-ink-soft"
            style={{ textWrap: "pretty" } as React.CSSProperties}
          >
            {body}
          </div>
        )}

        {meta && (
          <div
            className="mt-4 break-all rounded-lg border border-border-token bg-surface-alt px-3 py-2.5 font-mono text-[12.5px] leading-[1.5] text-ink-soft"
          >
            {meta}
          </div>
        )}

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="cursor-pointer whitespace-nowrap rounded-[7px] border border-border-token bg-transparent px-3.5 py-2 font-sans text-[13.5px] font-medium tracking-[-0.005em] text-ink-soft transition-[border-color,color] duration-[120ms] hover:border-border-strong hover:text-ink"
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmBtnRef}
            type="button"
            onClick={onConfirm}
            className="whitespace-nowrap rounded-[7px] border border-transparent px-4 py-2 font-sans text-[13.5px] font-semibold tracking-[-0.005em] outline-none transition-[background] duration-[120ms]"
            style={{
              background: t.btnBg,
              color: t.btnInk,
              boxShadow:
                "inset 0 0.5px 0 rgba(255,255,255,0.18), inset 0 0 0 0.5px rgba(0,0,0,0.2), 0 1px 2px rgba(0,0,0,0.08)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = t.btnHover;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = t.btnBg;
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
