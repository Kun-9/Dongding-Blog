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

/**
 * 카드 렌더 배율. README 본문 폭이 890px 이라 3x 디스플레이는 2670px 을 요구한다 —
 * 등배는 물론 2배로도 거기서 흐려진다. 좌표는 전부 논리 크기로 쓰고 이 값을 곱한다.
 */
export const CARD_SCALE = 3;

/** 프로필 README 등 외부에 붙이는 가로 카드 (`/card`). */
export const CARD_SIZE = { width: 1200, height: 250 } as const;

/**
 * 카드는 GitHub 다크 모드에서도 읽혀야 해서 두 벌이 필요하다. glow 색은
 * `globals.css` 의 `--glow-1` / `--glow-2` 를 가져오되 알파는 낮췄다 —
 * 저쪽은 화면 전체에 까는 것이고 여기는 높이 250 짜리 띠라서, 같은 알파로는
 * 카드가 통째로 물든다.
 */
export const CARD_THEMES = {
  light: {
    bg: "#f7f4ed",
    ink: "#1c1c1c",
    inkInverse: "#fcfbf8",
    inkMuted: "#5f5f5d",
    line: "#e6e1d4",
    chip: "rgba(28, 28, 28, 0.055)",
    /** 앱 아이콘 테두리 — 아이콘 바탕이 카드 바탕과 같을 때 경계를 살린다. */
    ring: "rgba(28, 28, 28, 0.1)",
    glow1: "rgba(255, 210, 170, 0.5)",
    glow2: "rgba(190, 205, 225, 0.28)",
  },
  dark: {
    bg: "#161513",
    ink: "#ece9e0",
    inkInverse: "#161513",
    inkMuted: "#9a948a",
    line: "#2c2925",
    chip: "rgba(236, 233, 224, 0.07)",
    ring: "rgba(236, 233, 224, 0.14)",
    glow1: "rgba(110, 75, 40, 0.4)",
    glow2: "rgba(40, 55, 80, 0.3)",
  },
} as const;

export type CardTheme = keyof typeof CARD_THEMES;
