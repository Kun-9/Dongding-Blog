/**
 * InlineCode — `code` styling for prose body.
 * Port of prose.jsx#IC.
 */
import type { ReactNode } from "react";

export function InlineCode({ children }: { children: ReactNode }) {
  return (
    <code className="rounded border border-border-token bg-surface-alt px-1.5 py-px font-mono text-[0.88em] text-ink">
      {children}
    </code>
  );
}
