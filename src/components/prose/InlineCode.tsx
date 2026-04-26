/**
 * InlineCode — `code` styling for prose body.
 * Warm amber tint (light) / mustard (dark) so identifiers pop without
 * looking like a chip. Tokens live in globals.css. nowrap keeps short
 * identifiers from breaking at line ends.
 */
import type { ReactNode } from "react";

export function InlineCode({ children }: { children: ReactNode }) {
  return (
    <code className="whitespace-nowrap rounded-[5px] bg-inline-code-bg px-1.5 py-[1.5px] font-mono text-[0.86em] font-medium tracking-[-0.005em] text-inline-code">
      {children}
    </code>
  );
}
