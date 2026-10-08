/**
 * lib/lint 규칙 자체 점검 — `node scripts/check-lint-rules.mjs`
 *
 * 점검 규칙이 틀리면 MCP 가 멀쩡한 글을 깨졌다고 하거나(오탐) 깨진 글을
 * 통과시킨다. 파서(`lib/markdown`)를 고칠 때 이 파일부터 돌려 볼 것.
 */
import assert from "node:assert/strict";
import { lintPost, lintCollection } from "../src/lib/lint.ts";
import { extractCardTargets, linkKey } from "../src/lib/link-cards.ts";

const base = {
  slug: "sample",
  title: "샘플",
  summary: "요약",
  category: "db",
  tags: ["jpa"],
  date: "2026-01-01",
  visibility: "published",
  featured: false,
  series: null,
  seriesOrder: null,
  body: "",
};

const rulesOf = (body, ctx) =>
  lintPost({ ...base, body }, ctx).issues.map((i) => i.rule);

const has = (body, rule, ctx) => rulesOf(body, ctx).includes(rule);

// ── 렌더 파손 ────────────────────────────────────────────────────────────
assert.ok(has("```java\ncode\n", "unclosed-fence"), "미닫힌 펜스");
assert.ok(!has("```java\ncode\n```\n", "unclosed-fence"), "닫힌 펜스는 통과");

// 코드 블록 안의 표기는 건드리지 않는다 — 오탐의 주범.
// (본문이 짧아 붙는 thin-body 는 문법 규칙이 아니므로 뺀다)
assert.deepEqual(
  rulesOf("## 가\n\n### 나\n\n```html\n<div>x</div>\n#제목\n  - 들여씀\n```\n").filter(
    (r) => r !== "thin-body",
  ),
  [],
  "펜스 안은 규칙 미적용",
);

assert.ok(has("  - 들여쓴 항목\n", "nested-list"), "중첩 리스트");
assert.ok(!has("1. 하나\n- 하위\n", "nested-list"), "번호 리스트의 하위 불릿은 정상");
assert.ok(has("본문에 <br> 태그\n", "html-tag"), "HTML 태그");
assert.ok(!has("제네릭 `List<String>` 은 괜찮다\n", "html-tag"), "인라인 코드는 예외");
assert.ok(has("> [!DANGER] 위험\n", "unknown-callout"), "없는 callout 종류");
assert.ok(!has("> [!WARNING] 주의\n> 이어짐\n", "unknown-callout"), "정상 callout");
assert.ok(has("> 그냥 인용\n", "plain-blockquote"), "일반 인용은 INFO 박스가 된다");
assert.ok(
  !has("> [!TIP] 팁\n> [!NOTE] 는 본문 안이라 종류 판정 대상이 아니다\n", "unknown-callout"),
  "callout 이어지는 줄은 첫 줄만 판정",
);
assert.ok(has("#제목\n", "heading-no-space"), "공백 없는 #");
assert.ok(has("##### 너무 깊음\n", "heading-too-deep"), "H5");
assert.ok(has("- [x] 완료\n", "task-list"), "체크박스");
assert.ok(has("~~취소~~\n", "strikethrough"), "취소선");
assert.ok(has("| 가 | 나 |\n| 다 | 라 |\n", "broken-table"), "구분행 없는 표");
assert.ok(
  !has("| 가 | 나 |\n|---|---|\n| 다 | 라 |\n", "broken-table"),
  "정상 표",
);
// 문장 안 맨 URL 은 자동 링크가 된다 — 더 이상 경고 대상이 아니다.
assert.deepEqual(
  rulesOf("참고: https://example.com 을 보라\n").filter(
    (r) => r !== "thin-body" && r !== "no-toc",
  ),
  [],
  "문장 안 맨 URL 은 무해",
);

// ── 링크·이미지 ──────────────────────────────────────────────────────────
const ctx = {
  slugs: new Set(["sample", "other"]),
  categoryIds: new Set(["db"]),
  seriesIds: new Set(["s1"]),
  tags: new Set(["jpa"]),
  images: new Set(["/posts/sample/a.png"]),
  today: "2026-08-06",
};

assert.ok(has("[다른 글](/posts/nope)\n", "broken-link", ctx), "없는 글 링크");
assert.ok(!has("[다른 글](/posts/other)\n", "broken-link", ctx), "있는 글 링크");
assert.ok(!has("[태그](/tags/jpa)\n", "broken-link", ctx), "있는 태그 링크");
assert.ok(has("![그림](/posts/sample/none.png)\n", "missing-image", ctx), "없는 이미지");
assert.ok(!has("![그림](/posts/sample/a.png)\n", "missing-image", ctx), "있는 이미지");
assert.ok(has("![그림](posts/sample/a.png)\n", "image-path", ctx), "앞 슬래시 누락");
assert.ok(
  has("![그림](/posts/sample/a.png){huge}\n", "image-option", ctx),
  "알 수 없는 이미지 옵션",
);
assert.ok(
  !has("![그림](/posts/sample/a.png){wide}\n", "image-option", ctx),
  "정상 폭 옵션",
);
assert.ok(
  !has("![그림](/posts/sample/a.png){3}\n", "image-option", ctx),
  "정상 열 옵션",
);
assert.ok(
  has("![그림|480](/posts/sample/a.png)\n", "image-width-legacy", ctx),
  "옛 너비 표기",
);
assert.ok(
  !has("![그림](/posts/sample/a.png)\n", "image-width-legacy", ctx),
  "옵션 없는 이미지",
);
assert.ok(has("## 제목\n\n[가기](#없는앵커)\n", "dead-anchor", ctx), "죽은 앵커");
assert.ok(!has("## 제목\n\n[가기](#제목)\n", "dead-anchor", ctx), "살아있는 앵커");

// ── 링크 카드 ────────────────────────────────────────────────────────────
assert.ok(has("/posts/nope\n", "missing-post-ref", ctx), "없는 글 카드");
assert.ok(!has("/posts/other\n", "missing-post-ref", ctx), "있는 글 카드");
assert.ok(
  !has("```\n/posts/nope\n```\n", "missing-post-ref", ctx),
  "펜스 안 카드 줄은 규칙 미적용",
);
// URL 카드 줄은 링크 규칙(#앵커·/경로 검사)에 걸리지 않는다.
assert.deepEqual(
  rulesOf("## 가\n\n### 나\n\nhttps://example.com/a\n\n/posts/other\n", ctx).filter(
    (r) => r !== "thin-body",
  ),
  [],
  "정상 카드 줄은 무해",
);

// ── 메타데이터 ───────────────────────────────────────────────────────────
assert.ok(
  lintPost({ ...base, summary: "" }, ctx).issues.some(
    (i) => i.rule === "missing-summary" && i.severity === "error",
  ),
  "발행 글의 빈 요약은 error",
);
assert.ok(
  lintPost({ ...base, series: "s1" }, ctx).issues.some(
    (i) => i.rule === "series-order-missing",
  ),
  "seriesOrder 누락",
);
assert.ok(
  lintPost({ ...base, category: "없는id" }, ctx).issues.some(
    (i) => i.rule === "unknown-category",
  ),
  "없는 카테고리",
);

// ── 글 사이 정합 ─────────────────────────────────────────────────────────
const collection = [
  { ...base, slug: "a", featured: true },
  { ...base, slug: "b", featured: true },
  { ...base, slug: "c", series: "s1", seriesOrder: 1 },
  { ...base, slug: "d", series: "s1", seriesOrder: 1 },
  { ...base, slug: "e", series: "s1", seriesOrder: 4 },
];
const cross = lintCollection(collection).map((i) => i.rule);
assert.ok(cross.includes("multiple-featured"), "featured 중복");
assert.ok(cross.includes("series-order-duplicate"), "시리즈 순서 중복");
assert.ok(cross.includes("series-order-gap"), "시리즈 순서 빈 자리");

// ── 통계 ─────────────────────────────────────────────────────────────────
const stats = lintPost(
  { ...base, body: "## 가\n\n### 나\n\n```js\nx\n```\n\n![i](/posts/sample/a.png)\n" },
  ctx,
).stats;
assert.equal(stats.h2, 1);
assert.equal(stats.h3, 1);
assert.equal(stats.codeBlocks, 1);
assert.equal(stats.images, 1);

// ── 링크 카드 추출 (파서·점검·OG 수집이 공유하는 판정) ────────────────────
{
  const t = extractCardTargets(
    [
      "https://a.com/x",
      "  /posts/one  ",
      "문장 안 https://b.com 은 카드가 아니다",
      "```",
      "https://fenced.com",
      "```",
      "http://a.com/x/", // 같은 문서 — 키가 같아야 한다
    ].join("\n"),
  );
  assert.deepEqual(t.slugs, ["one"], "카드 slug");
  assert.deepEqual(
    t.urls,
    ["https://a.com/x", "http://a.com/x/"],
    "카드 URL — 펜스 안과 문장 안은 제외",
  );
  assert.equal(linkKey("https://a.com/x"), linkKey("http://a.com/x/"), "캐시 키 정규화");
}

// ── 글쓰기 습관 (lib/phrases, 직접 쓴 글에는 info) ────────────────────────
{
  const sev = (body, rule) => lintPost({ ...base, body }).issues.find((i) => i.rule === rule)?.severity;
  assert.equal(sev("결론적으로 캐시가 빠르다.\n", "stock-phrase"), "info", "상투구는 info");
  assert.ok(has("요청은 프록시에 의해 막힌다.\n", "stock-phrase"), "에 의해");
  assert.ok(has("권한은 정책에 의해서는 안 바뀐다\n", "stock-phrase"), "에 의해서는·줄 끝");
  assert.ok(!has("```js\n// 결론적으로\n```\n", "stock-phrase"), "펜스 안은 제외");

  assert.ok(has("지난 글에서 만든 테이블에 열을 더한다.\n\n## 가\n", "sequel-intro"), "지난 글에서");
  assert.ok(has("> [!INFO]\n> 이전 편에 이어 RLS를 다룬다.\n", "sequel-intro"), "요약 박스 안");
  assert.ok(has("3편에서 만든 버킷을 쓴다.\n", "sequel-intro"), "N편에서");
  assert.ok(!has("이전 글자를 지운다. 앞 편집기는 닫는다.\n", "sequel-intro"), "글자·편집은 낱말");
  assert.ok(!has("RLS를 켠다.\n\n## 가\n\n지난 글에서 만든 정책을 쓴다.\n", "sequel-intro"), "첫 H2 뒤는 본문");
}

console.log("lint 규칙 자체 점검 통과");
