/**
 * Shared color/size tokens for `next/og` ImageResponse routes. The OG
 * runtime can't read CSS variables, so colors live as static hex values
 * here. Keep these in lockstep with the on-page palette in `tokens.ts`.
 */

export const OG_SIZE = { width: 1200, height: 630 } as const;

export const OG_COLORS = {
  bg: "#f7f4ed",
  ink: "#1c1c1c",
  inkInverse: "#fcfbf8",
  inkMuted: "#5f5f5d",
} as const;
