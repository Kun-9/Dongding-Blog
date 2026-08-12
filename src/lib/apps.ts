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
    desc: "카드로 한 장씩 넘겨 푸는 나만의 문제집",
    host: "solve.dongding.dev",
  },
];

export function findApp(slug: string): ShowcaseApp | undefined {
  return APPS.find((a) => a.slug === slug);
}

/** slug → 앱 아이콘. seulseul·solve-card 는 원본 SVG, Plate 는 앱이 쓰는 64px PNG 그대로. */
export const APP_ICONS: Record<string, string> = {
  seulseul:
    "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA2NCA2NCI+CiAgPHJlY3Qgd2lkdGg9IjY0IiBoZWlnaHQ9IjY0IiByeD0iMTUiIGZpbGw9IiMwZjEyMTEiPjwvcmVjdD4KICA8ZyBmaWxsPSIjNGZiNWFhIj4KICAgIDxyZWN0IHg9IjE3IiB5PSIxMiIgd2lkdGg9IjkiIGhlaWdodD0iNDAiIHJ4PSI0LjUiIHRyYW5zZm9ybT0icm90YXRlKDE0IDIxLjUgMzIpIj48L3JlY3Q+CiAgICA8cmVjdCB4PSIzOCIgeT0iMTIiIHdpZHRoPSI5IiBoZWlnaHQ9IjQwIiByeD0iNC41IiB0cmFuc2Zvcm09InJvdGF0ZSgxNCA0Mi41IDMyKSI+PC9yZWN0PgogIDwvZz4KPC9zdmc+Cg==",
  plate:
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAIAAAAlC+aJAAABNElEQVR4nO3aMW7CMBTG8X8+dUdU4gr0GJW4QBk7kaF7VfUC9AQMzO3gTmxwAiSOAafpVjEkUkwM4YvzmxLJcSy992JbcTF6HHOp0+lICtPp08XPCnPCnDBXxNZAXd7H5nGqfoQ5YU6Yezi/Ce/PlY3K9YEuhAbjsY+AMCf6VAOxuXgNIfJd9hEQ5kSf1kLhhrneRjnMA3dEmCt2X3OcCXPCnMhhLfSy3P5fT8ajyjbfH7OoF6fqU5gT5kQONTCpydE2UvUpzAlzwpwwJ8wJcyLn/cDs7TPJIPY/q3wjIMyJHNZCTfL+db4gxmb3W9lnbD3YR0CYE+aEOWFOmBO5zQNNvuu3JMwJcyK3GtifrVWG/UAC9ikkzBXDf+KOCXOir+dGw52dmyhrzu3ZR0CYU9cDaOsPaJY2gqI+mW8AAAAASUVORK5CYII=",
  "solve-card":
    "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAzMiAzMiI+CiAgPHJlY3Qgd2lkdGg9IjMyIiBoZWlnaHQ9IjMyIiByeD0iNiIgZmlsbD0iI2Y3ZjRlZCIvPgogIDxyZWN0IHg9IjYiIHk9IjgiIHdpZHRoPSIyMCIgaGVpZ2h0PSIxNiIgcng9IjMiCiAgICAgICAgZmlsbD0iI2ZiZjlmMyIgc3Ryb2tlPSIjMWMxYzFjIiBzdHJva2Utd2lkdGg9IjIiLz4KICA8Y2lyY2xlIGN4PSIxNiIgY3k9IjE2IiByPSIzLjIiIGZpbGw9IiMyZDZhNGYiLz4KPC9zdmc+Cg==",
};
