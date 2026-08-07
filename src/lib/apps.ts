/**
 * 프로필 README 에 전시하는 앱들 — `/card/app/{slug}` 가 이 배열을 읽어 카드를 그린다.
 *
 * 아이콘은 각 앱이 실제로 쓰는 파일을 data URI 로 박아 두었다. 매번 남의 사이트에서
 * 받아오면 그쪽이 죽었을 때 카드도 같이 깨지고, `public/` 에 두면 서버리스 함수 번들에
 * 딸려 간다는 보장이 없다. 셋 합쳐 3KB 라 소스에 들고 있는 편이 싸다.
 *
 * 새 앱을 전시하려면 여기에 한 줄, README 에 한 줄을 더하면 된다.
 */

export type ShowcaseApp = {
  /** URL 에 그대로 쓰인다 — `/card/app/{slug}` */
  slug: string;
  name: string;
  /** 카드에 한 줄로 들어간다. 두 줄이 되면 카드가 무너진다. */
  desc: string;
  /** 카드 오른쪽에 찍히는 표시용 주소 */
  host: string;
};

export const APPS: ShowcaseApp[] = [
  {
    slug: "seulseul",
    name: "SeulSeul",
    desc: "미루지 말고 슬슬. 시작한 것과 해낸 것이 쌓이는 곳",
    host: "seulseul.dongding.dev",
  },
  {
    slug: "plate",
    name: "PlateLog",
    desc: "운동과 식단을 기록하면 AI 가 분석하고, 트레이너에게 링크로 공유",
    host: "plate.dongding.dev",
  },
  {
    slug: "solve-card",
    name: "Solve-Card",
    desc: "정보처리기사 기출 920문항, 카드로 넘겨 푸는 나만의 문제집",
    host: "solve.dongding.dev",
  },
];

export function findApp(slug: string): ShowcaseApp | undefined {
  return APPS.find((a) => a.slug === slug);
}

/** slug → 앱 아이콘. seulseul·solve-card 는 원본 SVG, Plate 는 512px PNG 를 128 로 줄인 것. */
export const APP_ICONS: Record<string, string> = {
  seulseul:
    "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA2NCA2NCI+CiAgPHJlY3Qgd2lkdGg9IjY0IiBoZWlnaHQ9IjY0IiByeD0iMTUiIGZpbGw9IiMwZjEyMTEiPjwvcmVjdD4KICA8ZyBmaWxsPSIjNGZiNWFhIj4KICAgIDxyZWN0IHg9IjE3IiB5PSIxMiIgd2lkdGg9IjkiIGhlaWdodD0iNDAiIHJ4PSI0LjUiIHRyYW5zZm9ybT0icm90YXRlKDE0IDIxLjUgMzIpIj48L3JlY3Q+CiAgICA8cmVjdCB4PSIzOCIgeT0iMTIiIHdpZHRoPSI5IiBoZWlnaHQ9IjQwIiByeD0iNC41IiB0cmFuc2Zvcm09InJvdGF0ZSgxNCA0Mi41IDMyKSI+PC9yZWN0PgogIDwvZz4KPC9zdmc+Cg==",
  plate:
    "data:image/png;base64,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",
  "solve-card":
    "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAzMiAzMiI+CiAgPHJlY3Qgd2lkdGg9IjMyIiBoZWlnaHQ9IjMyIiByeD0iNiIgZmlsbD0iI2Y3ZjRlZCIvPgogIDxyZWN0IHg9IjYiIHk9IjgiIHdpZHRoPSIyMCIgaGVpZ2h0PSIxNiIgcng9IjMiCiAgICAgICAgZmlsbD0iI2ZiZjlmMyIgc3Ryb2tlPSIjMWMxYzFjIiBzdHJva2Utd2lkdGg9IjIiLz4KICA8Y2lyY2xlIGN4PSIxNiIgY3k9IjE2IiByPSIzLjIiIGZpbGw9IiMyZDZhNGYiLz4KPC9zdmc+Cg==",
};
