"use client";

/**
 * 본문 이미지 — 줄에 혼자 있으면 `Figure`(캡션 + 확대), 연속 줄이면
 * `ImageGroup`(그리드). 폭은 `{sm}` 380px · 기본 본문 폭 · `{wide}` 880px 셋뿐이고
 * 열 수는 `{2}`~`{4}` 로 고정한다. 임의 px 은 자리가 없다 (시안 DEC-27).
 *
 * 못 불러온 이미지는 깨진 아이콘 대신 점선 자리 + 파일명으로 떨어진다 —
 * 경로 오타를 발행 전에 잡으라고.
 */
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useMounted } from "@/lib/hooks";
import { colsFor, ratioFor, type ImageItem, type ImageSize } from "@/lib/image-blocks";

export type { ImageItem, ImageSize };

/**
 * 본문 폭 밖으로 나가는 이미지. 좁은 화면에서는 본문 폭으로 접힌다 —
 * transform 을 남겨 두면 가로 스크롤이 생긴다.
 */
const WIDE_CLASS =
  "w-[min(880px,calc(100%+64px))] ml-[50%] -translate-x-1/2 max-[680px]:w-full max-[680px]:ml-0 max-[680px]:translate-x-0";

function fileNameOf(src: string): string {
  return src.split("/").filter(Boolean).pop() || "image";
}

function ImgSlot({
  src,
  alt,
  ratio,
  cover,
}: {
  src: string;
  alt: string;
  ratio?: string;
  cover?: boolean;
}) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <span
        className="flex w-full flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed border-border-strong bg-surface-alt"
        style={{ aspectRatio: ratio ?? "16 / 9" }}
      >
        <span aria-hidden className="font-mono text-[15px] leading-none text-ink-subtle">
          ▣
        </span>
        <span className="break-all px-2.5 text-center font-mono text-[11px] leading-[1.3] text-ink-muted">
          {fileNameOf(src)}
        </span>
      </span>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      loading="lazy"
      onError={() => setFailed(true)}
      className="block w-full rounded-lg bg-surface-alt"
      style={cover ? { aspectRatio: ratio, objectFit: "cover", height: "100%" } : undefined}
    />
  );
}

export function Figure({
  src,
  alt,
  size = "",
}: {
  src: string;
  alt: string;
  size?: ImageSize;
}) {
  const [zoom, setZoom] = useState(false);
  return (
    <figure
      className={["my-[26px]", size === "wide" ? WIDE_CLASS : ""].join(" ")}
      style={size === "sm" ? { maxWidth: 380 } : undefined}
    >
      <button
        type="button"
        onClick={() => setZoom(true)}
        aria-label={alt ? `${alt} — 확대` : "이미지 확대"}
        className="block w-full cursor-zoom-in border-0 bg-transparent p-0"
      >
        <ImgSlot src={src} alt={alt} />
      </button>
      {alt ? (
        <figcaption className="mt-[9px] font-sans text-[12.5px] leading-[1.5] tracking-[-0.005em] text-ink-muted">
          {alt}
        </figcaption>
      ) : null}
      {zoom && (
        <Lightbox items={[{ src, alt }]} index={0} onClose={() => setZoom(false)} />
      )}
    </figure>
  );
}

export function ImageGroup({
  items,
  opt = "",
}: {
  items: ImageItem[];
  opt?: string;
}) {
  const [zoom, setZoom] = useState(-1);
  const cols = colsFor(items.length, opt);
  const ratio = ratioFor(cols);

  return (
    <div className={["my-[26px]", opt === "wide" ? WIDE_CLASS : ""].join(" ")}>
      <div
        className="grid gap-2 max-[680px]:grid-cols-2 max-[440px]:grid-cols-1"
        style={{ gridTemplateColumns: `repeat(${cols}, minmax(0,1fr))` }}
      >
        {items.map((it, idx) => (
          <figure key={idx} className="m-0 grid content-start gap-1.5">
            <button
              type="button"
              onClick={() => setZoom(idx)}
              aria-label={`${idx + 1}번째 이미지 확대`}
              className="block cursor-zoom-in overflow-hidden rounded-lg border-0 bg-transparent p-0 leading-none"
            >
              <ImgSlot src={it.src} alt={it.alt} ratio={ratio} cover />
            </button>
            {it.alt ? (
              <figcaption className="line-clamp-2 font-sans text-[11.5px] leading-[1.45] tracking-[-0.005em] text-ink-muted">
                {it.alt}
              </figcaption>
            ) : null}
          </figure>
        ))}
      </div>
      {zoom >= 0 && (
        <Lightbox
          items={items}
          index={zoom}
          onClose={() => setZoom(-1)}
          onMove={(d) => setZoom((v) => (v + d + items.length) % items.length)}
        />
      )}
    </div>
  );
}

/**
 * 라이트박스는 body 로 포털한다 — `{wide}` 묶음의 transform 안에서는
 * `position: fixed` 가 그 컨테이너에 갇힌다.
 */
function Lightbox({
  items,
  index,
  onClose,
  onMove,
}: {
  items: ImageItem[];
  index: number;
  onClose: () => void;
  onMove?: (delta: number) => void;
}) {
  const mounted = useMounted();
  const it = items[index];

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (onMove && e.key === "ArrowRight") onMove(1);
      else if (onMove && e.key === "ArrowLeft") onMove(-1);
    };
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose, onMove]);

  if (!mounted || !it) return null;

  const navBtn =
    "flex h-[38px] w-[38px] items-center justify-center rounded-full border border-white/20 bg-white/10 text-sm leading-none text-[#f2efe8]";

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={it.alt || "확대된 이미지"}
      onClick={onClose}
      className="fixed inset-0 z-[200] flex cursor-zoom-out flex-col items-center justify-center gap-3.5 px-6 py-12"
      style={{
        background: "rgba(12,11,10,0.9)",
        backdropFilter: "blur(3px)",
        WebkitBackdropFilter: "blur(3px)",
      }}
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="닫기"
        className={`absolute right-5 top-[18px] ${navBtn}`}
      >
        ✕
      </button>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={it.src}
        alt={it.alt}
        onClick={(e) => e.stopPropagation()}
        className="max-h-[76vh] max-w-[min(1100px,92vw)] cursor-default rounded-[10px] object-contain"
      />
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-w-[min(1100px,92vw)] items-center gap-3.5"
      >
        {onMove && (
          <button type="button" onClick={() => onMove(-1)} aria-label="이전" className={navBtn}>
            ←
          </button>
        )}
        <div className="flex-1 text-center font-sans text-[13px] tracking-[-0.005em] text-[rgba(242,239,232,0.72)]">
          {it.alt}
          {items.length > 1 && (
            <span className="ml-2.5 font-mono text-[11.5px] tabular-nums text-[rgba(242,239,232,0.45)]">
              {index + 1} / {items.length}
            </span>
          )}
        </div>
        {onMove && (
          <button type="button" onClick={() => onMove(1)} aria-label="다음" className={navBtn}>
            →
          </button>
        )}
      </div>
    </div>,
    document.body,
  );
}
