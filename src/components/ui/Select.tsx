"use client";

/**
 * 커스텀 셀렉트 — 네이티브 <select> 대신 쓰는 목록 상자.
 *
 * 항목마다 제목·설명을 둘 수 있고, 테마 색을 따른다. 키보드: ↑↓ 이동,
 * Enter·Space 선택, Esc 닫기, Home·End. 바깥을 누르면 닫힌다.
 * 트리거 모양은 호출부가 정한다(className·children).
 */
import { useEffect, useId, useRef, useState, type ReactNode } from "react";

export interface SelectOption<T extends string> {
  value: T;
  label: string;
  hint?: string;
  /** 오른쪽 작은 글자. 예: "2단계" */
  meta?: string;
}

interface Props<T extends string> {
  value: T;
  options: SelectOption<T>[];
  onChange: (value: T) => void;
  label: string;
  /** 트리거 버튼 class. */
  className?: string;
  /** 트리거 안 내용. 없으면 선택된 항목의 label. */
  children?: ReactNode;
  align?: "left" | "right";
  disabled?: boolean;
}

export function Select<T extends string>({
  value,
  options,
  onChange,
  label,
  className = "",
  children,
  align = "left",
  disabled,
}: Props<T>) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const id = useId();
  const current = options.find((o) => o.value === value);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    list.current?.focus();
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  function show() {
    setActive(Math.max(0, options.findIndex((o) => o.value === value)));
    setOpen(true);
  }

  function choose(i: number) {
    const o = options[i];
    if (o) onChange(o.value);
    setOpen(false);
  }

  function onKey(e: React.KeyboardEvent) {
    const last = options.length - 1;
    if (e.key === "ArrowDown") setActive((a) => Math.min(last, a + 1));
    else if (e.key === "ArrowUp") setActive((a) => Math.max(0, a - 1));
    else if (e.key === "Home") setActive(0);
    else if (e.key === "End") setActive(last);
    else if (e.key === "Enter" || e.key === " ") choose(active);
    else if (e.key === "Escape" || e.key === "Tab") setOpen(false);
    else return;
    e.preventDefault();
  }

  return (
    <div ref={root} className="relative inline-flex">
      <button
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={id}
        aria-label={label}
        onClick={() => (open ? setOpen(false) : show())}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" || e.key === "ArrowUp") {
            e.preventDefault();
            show();
          }
        }}
        className={className}
      >
        {children ?? current?.label}
        <svg
          viewBox="0 0 12 12"
          aria-hidden
          className={`size-3 shrink-0 opacity-60 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        >
          <path d="m3 4.5 3 3 3-3" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && (
        <ul
          ref={list}
          id={id}
          role="listbox"
          tabIndex={-1}
          aria-label={label}
          aria-activedescendant={`${id}-${active}`}
          onKeyDown={onKey}
          className={`pop-in absolute top-[calc(100%+6px)] z-50 m-0 w-[min(280px,80vw)] list-none rounded-xl border border-border-token bg-surface p-1.5 shadow-[0_18px_44px_-14px_rgba(0,0,0,0.35)] outline-none ${
            align === "right" ? "right-0" : "left-0"
          }`}
        >
          <li role="presentation" className="px-2.5 pt-1 pb-1.5 font-sans text-[10.5px] font-semibold tracking-[0.06em] text-ink-subtle uppercase">
            {label}
          </li>
          {options.map((o, i) => {
            const selected = o.value === value;
            return (
              <li
                key={o.value}
                id={`${id}-${i}`}
                role="option"
                aria-selected={selected}
                onMouseEnter={() => setActive(i)}
                onClick={() => choose(i)}
                className={`flex cursor-pointer items-start gap-2.5 rounded-lg px-2.5 py-2 transition-colors ${
                  i === active ? "bg-hover" : ""
                }`}
              >
                <span
                  aria-hidden
                  className={`mt-[3px] grid size-4 shrink-0 place-items-center rounded-full border transition-colors ${
                    selected
                      ? "border-[var(--callout-tip-glyph)] bg-[var(--callout-tip-glyph)] text-[var(--callout-tip-bg)]"
                      : "border-border-strong"
                  }`}
                >
                  {selected && (
                    <svg viewBox="0 0 12 12" className="size-2.5">
                      <path d="m2.5 6.5 2.2 2.2L9.5 3.8" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline justify-between gap-2">
                    <span className={`font-sans text-[13px] ${selected ? "font-semibold text-ink" : "font-medium text-ink-soft"}`}>
                      {o.label}
                    </span>
                    {o.meta ? <span className="shrink-0 font-mono text-[10.5px] text-ink-subtle">{o.meta}</span> : null}
                  </span>
                  {o.hint ? <span className="mt-0.5 block text-[12px] leading-[1.45] text-ink-muted">{o.hint}</span> : null}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
