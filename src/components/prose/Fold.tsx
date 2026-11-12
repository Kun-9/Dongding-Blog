/**
 * 접힌 칸 — `> [!MORE] 제목`. 닫힌 채 제목 한 줄만 보이고, 필요한 독자만 연다.
 * JS 없이 details 로 열고 닫는다(서버 렌더 그대로).
 * 열리면 제목 아래 선으로 나누고, 안쪽은 네 변 여백을 같게 둔다(첫·끝 요소의 바깥 여백은 지운다).
 */
import type { ReactNode } from "react";

export function Fold({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <details className="group my-[22px] overflow-hidden rounded-[10px] border border-border-token bg-surface open:border-border-strong">
      <summary className="flex cursor-pointer list-none items-baseline gap-2.5 px-[18px] py-3 font-sans text-[15px] font-semibold leading-[1.5] text-ink outline-none hover:bg-surface-alt focus-visible:bg-surface-alt group-open:border-b group-open:border-border-token [&::-webkit-details-marker]:hidden">
        <span aria-hidden className="w-3 shrink-0 font-mono text-[15px] text-ink-muted transition-transform group-open:rotate-45">
          +
        </span>
        {title || "더 보기"}
      </summary>
      <div className="px-[18px] py-4 [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 [&_li]:text-[15px] [&_p]:mb-3 [&_p]:text-[15.5px] [&_p]:leading-[1.8]">
        {children}
      </div>
    </details>
  );
}
