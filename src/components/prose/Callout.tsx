/**
 * Callout — info / warning / tip / note variants.
 * Port of prose.jsx#Callout. Colors come from CSS variables defined per
 * theme in globals.css (--callout-{kind}-{role}).
 */
import type { ReactNode } from "react";

export type CalloutKind = "info" | "warning" | "tip" | "note";

interface Props {
  kind?: CalloutKind;
  title?: string;
  children: ReactNode;
}

const LABELS: Record<CalloutKind, string> = {
  info: "INFO",
  warning: "WARNING",
  tip: "TIP",
  note: "NOTE",
};

const GLYPHS: Record<CalloutKind, string> = {
  info: "i",
  warning: "!",
  tip: "✓",
  note: "※",
};

export function Callout({ kind = "info", title, children }: Props) {
  return (
    <aside
      className="my-[22px] flex items-start gap-3.5 rounded-[10px] px-[18px] py-3.5"
      style={{
        background: `var(--callout-${kind}-bg)`,
        color: `var(--callout-${kind}-ink)`,
      }}
    >
      <div
        aria-hidden
        className="mt-px flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full font-sans text-[13px] font-bold"
        style={{
          background: `var(--callout-${kind}-bd)`,
          color: `var(--callout-${kind}-bg)`,
        }}
      >
        {GLYPHS[kind]}
      </div>
      <div className="flex-1">
        <div
          className={`font-sans text-[11px] font-bold uppercase tracking-[0.08em] ${
            title ? "mb-0.5" : "mb-1"
          }`}
          style={{ color: `var(--callout-${kind}-glyph)` }}
        >
          {LABELS[kind]}
          {title ? ` · ${title}` : ""}
        </div>
        <div className="text-[14.5px] leading-[1.7] [&_p]:m-0 [&_p:not(:last-child)]:mb-2 [&_p]:font-sans [&_p]:text-[inherit] [&_p]:leading-[inherit] [&_p]:tracking-normal [&_p]:text-current">
          {children}
        </div>
      </div>
    </aside>
  );
}
