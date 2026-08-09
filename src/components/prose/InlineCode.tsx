/**
 * InlineCode — `code` styling for prose body.
 * Warm amber tint (light) / mustard (dark) so identifiers pop without
 * looking like a chip. Tokens live in globals.css. 줄바꿈은 막지 않는다 —
 * nowrap 이면 긴 설정 키 하나가 좁은 화면을 통째로 밀어낸다.
 */
import type { ReactNode } from "react";

export function InlineCode({ children }: { children: ReactNode }) {
  return (
    <code className="rounded-[5px] bg-inline-code-bg px-1.5 py-[1.5px] font-mono text-[0.86em] font-medium tracking-[-0.005em] text-inline-code">
      {children}
    </code>
  );
}
