"use client";

import type { ReactNode } from "react";

/**
 * 높이를 몰라도 부드럽게 접고 펴는 칸. grid-template-rows 를 0fr ↔ 1fr 로
 * 옮기면 내용 높이까지 전환된다. 닫힌 쪽은 inert 로 포커스에서 뺀다.
 */
export function Collapse({ open, children }: { open: boolean; children: ReactNode }) {
  return (
    <div
      className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out ${
        open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
      }`}
      inert={!open}
    >
      <div className="min-h-0 overflow-hidden">{children}</div>
    </div>
  );
}
