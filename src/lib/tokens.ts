/**
 * Design tokens — typed mirror of CSS custom properties defined in globals.css.
 * Use these when inline styles are unavoidable (rare). Prefer Tailwind utilities
 * (bg-surface, text-ink-soft, border-border-token) for layout work.
 */

export const fonts = {
  sans: `'Pretendard Variable', Pretendard, -apple-system, BlinkMacSystemFont, system-ui, sans-serif`,
  mono: `'JetBrains Mono', 'D2Coding', ui-monospace, SFMono-Regular, Menlo, monospace`,
  serif: `'Source Serif 4', 'Noto Serif KR', Georgia, serif`,
} as const;

export const tokenVar = {
  bg: "var(--bg)",
  surface: "var(--surface)",
  surfaceAlt: "var(--surface-alt)",
  ink: "var(--ink)",
  inkSoft: "var(--ink-soft)",
  inkMuted: "var(--ink-muted)",
  inkSubtle: "var(--ink-subtle)",
  border: "var(--border)",
  borderStrong: "var(--border-strong)",
  accent: "var(--accent)",
  accentInk: "var(--accent-ink)",
  hover: "var(--hover)",

  code: {
    bg: "var(--code-bg)",
    ink: "var(--code-ink)",
    muted: "var(--code-muted)",
    keyword: "var(--code-keyword)",
    string: "var(--code-string)",
    number: "var(--code-number)",
    comment: "var(--code-comment)",
    type: "var(--code-type)",
    filename: "var(--code-filename)",
    lineNum: "var(--code-line-num)",
  },

  callout: {
    info: {
      bg: "var(--callout-info-bg)",
      bd: "var(--callout-info-bd)",
      ink: "var(--callout-info-ink)",
      glyph: "var(--callout-info-glyph)",
    },
    warning: {
      bg: "var(--callout-warning-bg)",
      bd: "var(--callout-warning-bd)",
      ink: "var(--callout-warning-ink)",
      glyph: "var(--callout-warning-glyph)",
    },
    tip: {
      bg: "var(--callout-tip-bg)",
      bd: "var(--callout-tip-bd)",
      ink: "var(--callout-tip-ink)",
      glyph: "var(--callout-tip-glyph)",
    },
    note: {
      bg: "var(--callout-note-bg)",
      bd: "var(--callout-note-bd)",
      ink: "var(--callout-note-ink)",
      glyph: "var(--callout-note-glyph)",
    },
  },
} as const;

export type CalloutKind = keyof typeof tokenVar.callout;

/** Format ISO date as YYYY.MM.DD (Korean blog convention). */
export function fmtDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${y}.${m}.${d}`;
}
