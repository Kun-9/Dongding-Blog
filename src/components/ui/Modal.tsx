"use client";

/**
 * 범용 모달 — 폼을 담는 대화상자. 생김새는 ConfirmDialog 와 같은 결
 * (흐린 배경, 살짝 떠오르는 판)이고 색은 테마 변수만 쓴다.
 *
 * Esc·바깥 클릭으로 닫히고, 열려 있는 동안 본문 스크롤을 막는다.
 * 첫 입력 칸(없으면 확인 버튼)에 초점을 둔다. 폼 안에서 ⌘/Ctrl+Enter 는
 * 확인과 같다.
 */
import { useEffect, useId, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useMounted } from "@/lib/hooks";

interface Props {
  open: boolean;
  title: string;
  /** 제목 위 작은 머리말. 예: "다음 단계 · 초안" */
  eyebrow?: string;
  description?: ReactNode;
  children?: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  /** 확인 버튼을 막는다(필수 칸이 비었을 때 등). */
  confirmDisabled?: boolean;
  busy?: boolean;
  tone?: "default" | "accent" | "danger";
  error?: string | null;
  onConfirm: () => void;
  onClose: () => void;
}

const CONFIRM_TONE = {
  default: "bg-ink text-bg hover:opacity-90",
  accent:
    "bg-[var(--callout-tip-glyph)] text-[var(--callout-tip-bg)] hover:opacity-90 shadow-[0_6px_18px_-8px_var(--callout-tip-glyph)]",
  danger: "bg-danger text-white hover:opacity-90",
} as const;

export function Modal({
  open,
  title,
  eyebrow,
  description,
  children,
  confirmLabel,
  cancelLabel = "취소",
  confirmDisabled,
  busy,
  tone = "default",
  error,
  onConfirm,
  onClose,
}: Props) {
  const mounted = useMounted();
  const panel = useRef<HTMLDivElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const id = window.setTimeout(() => {
      const first = panel.current?.querySelector<HTMLElement>("textarea, input, select");
      (first ?? confirmRef.current)?.focus();
    }, 40);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
      window.clearTimeout(id);
    };
  }, [open, onClose]);

  if (!open || !mounted) return null;

  const blocked = confirmDisabled || busy;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="modal-backdrop modal-fade fixed inset-0 z-[100] flex items-end justify-center p-0 sm:items-center sm:p-6"
    >
      <div
        ref={panel}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && !blocked) {
            e.preventDefault();
            onConfirm();
          }
        }}
        className="modal-pop w-full max-w-[480px] rounded-t-2xl border border-border-token bg-surface px-6 pt-6 pb-5 shadow-[0_24px_64px_-12px_rgba(0,0,0,0.35)] sm:rounded-2xl sm:px-7 sm:pt-7"
      >
        {eyebrow ? (
          <div className="mb-1.5 font-sans text-[11px] font-semibold tracking-[0.06em] text-ink-muted uppercase">{eyebrow}</div>
        ) : null}
        <h3 id={titleId} className="m-0 font-sans text-[18px] font-semibold leading-[1.35] tracking-[-0.02em] text-ink">
          {title}
        </h3>
        {description ? (
          <div className="mt-1.5 font-sans text-[13.5px] leading-[1.65] text-ink-soft" style={{ textWrap: "pretty" }}>
            {description}
          </div>
        ) : null}
        {children ? <div className="mt-4 space-y-2.5">{children}</div> : null}
        {error ? (
          <p className="m-0 mt-3 whitespace-pre-line rounded-lg border border-danger/30 px-3 py-2.5 text-[12.5px] leading-[1.6] text-danger">
            {error}
          </p>
        ) : null}
        <div className="mt-6 flex items-center justify-end gap-2">
          <span className="mr-auto hidden font-mono text-[11px] text-ink-subtle sm:inline">⌘↵</span>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-border-token px-3.5 py-2 font-sans text-[13.5px] font-medium text-ink-soft transition-colors hover:border-border-strong hover:text-ink"
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmRef}
            type="button"
            disabled={blocked}
            onClick={onConfirm}
            className={`rounded-lg px-4 py-2 font-sans text-[13.5px] font-semibold transition-[opacity,transform] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 ${CONFIRM_TONE[tone]}`}
          >
            {busy ? "처리 중…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

/** 모달 안 입력 칸 라벨. */
export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-baseline justify-between gap-3 font-sans text-[12.5px] font-medium text-ink-soft">
        {label}
        {hint ? <span className="text-[11.5px] font-normal text-ink-subtle">{hint}</span> : null}
      </span>
      {children}
    </label>
  );
}
