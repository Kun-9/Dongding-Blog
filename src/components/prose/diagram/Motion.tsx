"use client";

/**
 * 그림 모션(lib/figure-motion)을 붙이는 자리. Motion 은 그림이 있는 글에서만 늦게
 * 불러온다 — 처음 그리는 데는 필요 없고, 최종 상태는 서버가 그린 그대로다.
 */
import { useEffect, useRef, type ReactNode, type RefObject } from "react";

/** `dep` 가 바뀌면 다시 붙인다(본문 SVG 는 받아 온 뒤에 그려진다). */
export function useFigureMotion(ref: RefObject<HTMLElement | null>, dep?: unknown) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let alive = true;
    let stop: (() => void) | undefined;
    import("@/lib/figure-motion")
      .then((m) => {
        if (alive) stop = m.attachFigureMotion(el);
      })
      .catch(() => {}); // 못 불러오면 서버가 그린 그대로 둔다.
    return () => {
      alive = false;
      stop?.();
    };
  }, [ref, dep]);
}

/**
 * 그림 판. 그림 내용이 바뀌면(스튜디오에서 고치면) 부르는 쪽이 key 로 새로
 * 그린다 — 움직이던 노드에 새 값을 덮으면 Motion 이 남긴 값과 섞인다.
 * ponytail: 버린 판은 Motion 의 ViewTimeline 캐시에 남는다. 스튜디오에서 그림을
 * 오래 고칠 때만 쌓이고 새로고침하면 비워진다.
 */
export function MotionFigure({ className, children }: { className?: string; children: ReactNode }) {
  const ref = useRef<HTMLElement>(null);
  useFigureMotion(ref);
  return (
    <figure ref={ref} className={className}>
      {children}
    </figure>
  );
}
