"use client";

/**
 * 본문 이미지 — 줄에 혼자 있으면 `Figure`(캡션 + 확대), 연속 줄이면
 * `ImageGroup`(그리드). 폭은 `{xs}` 120px · `{sm}` 380px · 기본 본문 폭 ·
 * `{wide}` 880px, 또는 `{240}` 처럼 px 직접. 열 수는 `{2}`~`{4}`.
 *
 * 못 불러온 이미지는 깨진 아이콘 대신 점선 자리 + 파일명으로 떨어진다 —
 * 경로 오타를 발행 전에 잡으라고.
 */
import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useMounted } from "@/lib/hooks";
import {
  colsFor,
  isTabs,
  ratioFor,
  widthOf,
  type ImageItem,
  type ImageSize,
} from "@/lib/image-blocks";
import { prepareSvg, scopeIds } from "@/lib/svg-theme";
import { useFigureMotion } from "./diagram/Motion";

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
  const imgRef = useRef<HTMLImageElement>(null);
  // 하이드레이션 전에 로드가 실패하면 onError 를 놓친다. 붙은 뒤 한 번 더 본다.
  useEffect(() => {
    const img = imgRef.current;
    if (img && img.complete && img.naturalWidth === 0) setFailed(true);
  }, []);

  if (failed && /\/todo-[^/]*$/.test(src)) {
    // 아직 채우지 않은 캡처 자리. 발행 점검이 이게 남아 있으면 막는다.
    return (
      <span
        className="flex w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border-strong bg-surface-alt"
        style={{ aspectRatio: ratio ?? "16 / 9" }}
      >
        <span aria-hidden className="text-[20px] leading-none text-ink-subtle">⌗</span>
        <span className="font-sans text-[12.5px] font-semibold text-ink-muted">캡처 필요</span>
        <span className="break-all px-2.5 text-center font-mono text-[11px] leading-[1.3] text-ink-subtle">
          {fileNameOf(src)}
        </span>
      </span>
    );
  }

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
      ref={imgRef}
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
  const width = widthOf(size);
  return (
    <figure
      className={["my-[26px]", size === "wide" ? WIDE_CLASS : ""].join(" ")}
      style={width ? { maxWidth: width } : undefined}
    >
      <button
        type="button"
        onClick={() => setZoom(true)}
        aria-label={alt ? `${alt} — 확대` : "이미지 확대"}
        className="block w-full cursor-zoom-in border-0 bg-transparent p-0"
      >
        {/\.svg(\?|$)/i.test(src) ? <InlineSvg src={src} alt={alt} /> : <ImgSlot src={src} alt={alt} />}
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

/**
 * SVG 는 본문에 직접 그린다 — 그래야 그림이 블로그 테마 색 변수를 쓴다.
 * 받아오기 전이나 처리에 실패하면 <img> 로 보여 준다. 안의 `data-anim`·
 * `data-loop` 은 그림 블록과 같은 모션으로 움직인다.
 */
function InlineSvg({ src, alt }: { src: string; alt: string }) {
  const [markup, setMarkup] = useState<string | null>(null);
  const prefix = `f${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const ref = useRef<HTMLSpanElement>(null);
  useFigureMotion(ref, markup);

  useEffect(() => {
    let alive = true;
    fetch(src)
      .then((res) => (res.ok ? res.text() : Promise.reject(res.status)))
      .then((text) => {
        const ready = prepareSvg(text);
        if (alive && ready) setMarkup(scopeIds(ready, prefix));
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [src, prefix]);

  if (!markup) return <ImgSlot src={src} alt={alt} />;
  return (
    <span
      ref={ref}
      role="img"
      aria-label={alt}
      className="block w-full [&>svg]:block [&>svg]:h-auto [&>svg]:w-full"
      dangerouslySetInnerHTML={{ __html: markup }}
    />
  );
}

export function ImageGroup({
  items,
  opt = "",
}: {
  items: ImageItem[];
  opt?: string;
}) {
  if (isTabs(opt)) return <ImageTabs items={items} />;
  return <ImageGrid items={items} opt={opt} />;
}

/**
 * `{tabs}` 묶음 — 버튼(이미지 alt)으로 한 자리에서 바꿔 보는 전·후 그림. 모든 이미지를 같은 칸에
 * 겹쳐 두고 고른 것만 보이게 해, 높이는 가장 큰 이미지가 정하고 바꿔도 흔들리지 않는다.
 * 그리드 묶음처럼 4:3 으로 자르지 않는다. 서버가 그린 첫 모습은 첫 이미지다.
 */
function ImageTabs({ items }: { items: ImageItem[] }) {
  const [on, setOn] = useState(0);
  const [zoom, setZoom] = useState(false);
  const id = useId();
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const move = (d: number) => setOn((v) => (v + d + items.length) % items.length);
  const pick = (next: number) => {
    setOn(next);
    tabs.current[next]?.focus();
  };
  return (
    <figure className="my-[26px]">
      <div
        role="tablist"
        aria-label="비교할 화면"
        className="mb-2.5 flex flex-wrap gap-1.5"
        onKeyDown={(e) => {
          const last = items.length - 1;
          const next =
            e.key === "ArrowRight" ? (on + 1) % items.length
            : e.key === "ArrowLeft" ? (on - 1 + items.length) % items.length
            : e.key === "Home" ? 0
            : e.key === "End" ? last
            : -1;
          if (next < 0) return;
          e.preventDefault();
          pick(next);
        }}
      >
        {items.map((it, idx) => (
          <button
            key={idx}
            ref={(el) => {
              tabs.current[idx] = el;
            }}
            type="button"
            role="tab"
            id={`${id}-t${idx}`}
            aria-selected={idx === on}
            aria-controls={`${id}-p${idx}`}
            tabIndex={idx === on ? 0 : -1}
            onClick={() => setOn(idx)}
            className={[
              "rounded-full border px-3.5 py-1.5 font-sans text-[13px] font-semibold leading-none transition-colors",
              idx === on
                ? "border-ink bg-ink text-bg"
                : "border-border-strong bg-transparent text-ink-muted hover:text-ink",
            ].join(" ")}
          >
            {it.alt || `${idx + 1}`}
          </button>
        ))}
      </div>
      {/* 패널을 같은 칸에 겹친다. 숨긴 패널은 invisible 이라 자리는 차지하고 포커스는 받지 않는다. */}
      <div className="grid">
        {items.map((it, idx) => (
          <div
            key={idx}
            role="tabpanel"
            id={`${id}-p${idx}`}
            aria-labelledby={`${id}-t${idx}`}
            className={[
              "[grid-area:1/1] self-start motion-safe:transition-opacity motion-safe:duration-150",
              idx === on ? "opacity-100" : "invisible opacity-0",
            ].join(" ")}
          >
            <button
              type="button"
              onClick={() => setZoom(true)}
              aria-label={`${it.alt || "이미지"} 확대`}
              className="block w-full cursor-zoom-in border-0 bg-transparent p-0"
            >
              {/\.svg(\?|$)/i.test(it.src) ? <InlineSvg src={it.src} alt={it.alt} /> : <ImgSlot src={it.src} alt={it.alt} />}
            </button>
          </div>
        ))}
      </div>
      {zoom && <Lightbox items={items} index={on} onClose={() => setZoom(false)} onMove={move} />}
    </figure>
  );
}

function ImageGrid({
  items,
  opt,
}: {
  items: ImageItem[];
  opt: string;
}) {
  const [zoom, setZoom] = useState(-1);
  const cols = colsFor(items.length, opt);
  const ratio = ratioFor(cols);

  return (
    <div className={["my-[26px]", opt === "wide" ? WIDE_CLASS : ""].join(" ")}>
      {/* 열 수는 변수로 넘긴다. 인라인 grid-template-columns 는 좁은 화면의 열 수 클래스를 덮어
          390px 에서도 175px 두 칸으로 남았다. */}
      <div
        className="grid gap-2 grid-cols-[repeat(var(--cols),minmax(0,1fr))] max-[680px]:grid-cols-2 max-[440px]:grid-cols-1"
        style={{ "--cols": cols } as React.CSSProperties}
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
