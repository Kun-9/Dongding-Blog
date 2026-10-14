/**
 * 접힌 칸 — `> [!MORE] 제목`. 닫힌 채 제목 한 줄만 보이고, 필요한 독자만 연다.
 * JS 없이 details 로 열고 닫는다(서버 렌더 그대로).
 */
import type { ReactNode } from "react";

export function Fold({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <details className="group my-[22px] rounded-[10px] border border-border-token bg-surface open:border-border-strong">
      <summary className="flex cursor-pointer list-none items-baseline gap-2.5 rounded-[10px] px-[18px] py-3 font-sans text-[15px] font-semibold leading-[1.5] text-ink hover:bg-surface-alt [&::-webkit-details-marker]:hidden">
        <span aria-hidden className="w-3 shrink-0 font-mono text-[15px] text-ink-muted transition-transform group-open:rotate-45">
          +
        </span>
        {title || "더 보기"}
      </summary>
      <div className="px-[18px] pb-1 pl-[40px] [&_li]:text-[15px] [&_p]:mb-3 [&_p]:text-[15.5px] [&_p]:leading-[1.8]">
        {children}
      </div>
    </details>
  );
}
