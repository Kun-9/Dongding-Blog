"use client";

import { useEffect, useState } from "react";

interface Props {
  src: string;
  alt?: string;
  /** "480" → 480px, "50%" → 50%. Null/undefined ⇒ natural max-width. */
  width?: string | null;
}

function parseWidth(width: string | null | undefined): string | undefined {
  if (!width) return undefined;
  return /%$/.test(width) ? width : `${width}px`;
}

export function ZoomableImage({ src, alt = "", width }: Props) {
  const [open, setOpen] = useState(false);
  const cssWidth = parseWidth(width);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        onClick={() => setOpen(true)}
        className="my-2 block max-w-full cursor-zoom-in rounded-lg transition-opacity hover:opacity-90"
        style={cssWidth ? { width: cssWidth } : undefined}
      />
      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={alt || "확대된 이미지"}
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-[100] flex cursor-zoom-out items-center justify-center p-4"
          style={{
            background: "rgba(8,7,6,0.82)",
            backdropFilter: "blur(6px) saturate(120%)",
            WebkitBackdropFilter: "blur(6px) saturate(120%)",
            animation: "zi-fade-in 0.18s ease-out",
          }}
        >
          <style>{`
            @keyframes zi-fade-in { from { opacity: 0; } to { opacity: 1; } }
            @keyframes zi-pop-in {
              from { opacity: 0; transform: scale(0.98); }
              to   { opacity: 1; transform: scale(1); }
            }
          `}</style>

          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={alt}
            onClick={(e) => e.stopPropagation()}
            className="max-h-full max-w-full cursor-default rounded-md object-contain shadow-2xl"
            style={{ animation: "zi-pop-in 0.2s ease-out" }}
          />
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="닫기"
            className="fixed right-5 top-5 flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-black/40 text-xl leading-none text-white/90 transition hover:bg-black/60"
            style={{
              backdropFilter: "blur(6px)",
              WebkitBackdropFilter: "blur(6px)",
            }}
          >
            ×
          </button>
        </div>
      )}
    </>
  );
}
