"use client";

/**
 * Studio-only image wrapper. Click the image to reveal a width slider that
 * calls back with the new width token (e.g. "480" or "50%"); the Studio uses
 * the callback to rewrite the matching `![alt|width](url)` token in-place.
 *
 * Width semantics — number → px, "%"-suffixed → percent, null → natural.
 */
import { useEffect, useRef, useState } from "react";
import type { ImageWidth } from "@/lib/markdown";

interface Props {
  src: string;
  alt?: string;
  width?: string | null;
  onResize?: (width: ImageWidth | null) => void;
}

const PX_MIN = 80;
const PX_MAX = 1600;
const PX_DEFAULT = 640;

type Mode = "px" | "percent" | "natural";

function parseMode(width: string | null | undefined): Mode {
  if (!width) return "natural";
  return /%$/.test(width) ? "percent" : "px";
}

function parseValue(width: string | null | undefined): number {
  if (!width) return PX_DEFAULT;
  return parseInt(width.replace("%", ""), 10) || PX_DEFAULT;
}

function cssWidth(width: string | null | undefined): string | undefined {
  if (!width) return undefined;
  return /%$/.test(width) ? width : `${width}px`;
}

export function EditableImage({ src, alt = "", width, onResize }: Props) {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const mode = parseMode(width);
  const value = parseValue(width);

  // Close panel on outside click / Escape.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const onDown = (e: MouseEvent) => {
      if (!panelRef.current) return;
      if (panelRef.current.contains(e.target as Node)) return;
      // The image lives outside the panel — closing on its click is desired.
      setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onDown);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onDown);
    };
  }, [open]);

  const setWidth = (next: ImageWidth | null) => {
    onResize?.(next);
  };

  const sliderMin = mode === "percent" ? 10 : PX_MIN;
  const sliderMax = mode === "percent" ? 100 : PX_MAX;

  return (
    <span className="relative my-2 block">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((o) => !o);
        }}
        className="block max-w-full cursor-pointer rounded-lg ring-2 ring-transparent transition hover:ring-ink/20"
        style={{
          width: cssWidth(width),
          ...(open ? { outline: "2px solid var(--ink)", outlineOffset: 2 } : {}),
        }}
      />
      {open && onResize && (
        <span
          ref={panelRef}
          role="dialog"
          aria-label="이미지 크기 조정"
          onClick={(e) => e.stopPropagation()}
          className="mt-1.5 w-full max-w-[420px] flex-col gap-2 rounded-lg border border-border-token bg-surface px-3 py-2.5 shadow-md"
          style={{ display: "flex" }}
        >
          <span
            className="flex items-center gap-2 text-[11px] font-mono text-ink-muted"
            style={{ display: "flex" }}
          >
            <span className="font-semibold uppercase tracking-[0.05em]">
              너비
            </span>
            <span className="rounded bg-surface-alt px-1.5 py-[1px] text-ink">
              {mode === "natural"
                ? "원본"
                : mode === "percent"
                  ? `${value}%`
                  : `${value}px`}
            </span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="닫기"
              className="ml-auto rounded p-1 text-[12px] text-ink-muted hover:bg-hover hover:text-ink"
            >
              ×
            </button>
          </span>

          <span
            className="flex items-center gap-2"
            style={{ display: "flex" }}
          >
            <input
              type="range"
              min={sliderMin}
              max={sliderMax}
              step={mode === "percent" ? 5 : 10}
              value={mode === "natural" ? PX_DEFAULT : value}
              onChange={(e) => {
                const next = parseInt(e.target.value, 10);
                if (mode === "percent") {
                  setWidth(`${next}%` as ImageWidth);
                } else {
                  setWidth(`${next}` as ImageWidth);
                }
              }}
              className="flex-1 cursor-pointer accent-ink"
              disabled={mode === "natural"}
            />
            <input
              type="number"
              min={sliderMin}
              max={sliderMax}
              value={mode === "natural" ? "" : value}
              placeholder="—"
              onChange={(e) => {
                const raw = e.target.value;
                if (raw === "") {
                  setWidth(null);
                  return;
                }
                const next = parseInt(raw, 10);
                if (Number.isNaN(next)) return;
                if (mode === "percent") {
                  setWidth(`${next}%` as ImageWidth);
                } else {
                  setWidth(`${next}` as ImageWidth);
                }
              }}
              className="w-[70px] rounded-md border border-border-token bg-surface px-1.5 py-[3px] text-right font-mono text-[12px] text-ink outline-none"
            />
          </span>

          <span
            className="flex flex-wrap gap-1"
            style={{ display: "flex" }}
          >
            <PresetButton active={mode === "natural"} onClick={() => setWidth(null)}>
              원본
            </PresetButton>
            <PresetButton
              active={mode === "percent" && value === 100}
              onClick={() => setWidth("100%" as ImageWidth)}
            >
              100%
            </PresetButton>
            <PresetButton
              active={mode === "percent" && value === 75}
              onClick={() => setWidth("75%" as ImageWidth)}
            >
              75%
            </PresetButton>
            <PresetButton
              active={mode === "percent" && value === 50}
              onClick={() => setWidth("50%" as ImageWidth)}
            >
              50%
            </PresetButton>
            <PresetButton
              active={mode === "px" && value === 480}
              onClick={() => setWidth("480" as ImageWidth)}
            >
              480px
            </PresetButton>
            <PresetButton
              active={mode === "px" && value === 320}
              onClick={() => setWidth("320" as ImageWidth)}
            >
              320px
            </PresetButton>
          </span>
        </span>
      )}
    </span>
  );
}

function PresetButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-md border px-2 py-[3px] font-mono text-[11px] transition"
      style={{
        borderColor: active ? "var(--ink)" : "var(--border)",
        background: active ? "var(--ink)" : "transparent",
        color: active ? "var(--bg)" : "var(--ink-soft)",
      }}
    >
      {children}
    </button>
  );
}
