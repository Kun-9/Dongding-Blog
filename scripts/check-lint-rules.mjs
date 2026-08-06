/**
 * lib/lint 규칙 자체 점검 — `node scripts/check-lint-rules.mjs`
 *
 * 점검 규칙이 틀리면 MCP 가 멀쩡한 글을 깨졌다고 하거나(오탐) 깨진 글을
 * 통과시킨다. 파서(`lib/markdown`)를 고칠 때 이 파일부터 돌려 볼 것.
 */
import assert from "node:assert/strict";
import { lintPost, lintCollection } from "../src/lib/lint.ts";

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
assert.ok(has("참고: https://example.com 을 보라\n", "bare-url"), "맨 URL");
assert.ok(!has("[예시](https://example.com)\n", "bare-url"), "링크는 정상");

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
assert.ok(has("![그림|abc](/posts/sample/a.png)\n", "image-width", ctx), "잘못된 너비");
assert.ok(!has("![그림|480](/posts/sample/a.png)\n", "image-width", ctx), "정상 너비");
assert.ok(has("## 제목\n\n[가기](#없는앵커)\n", "dead-anchor", ctx), "죽은 앵커");
assert.ok(!has("## 제목\n\n[가기](#제목)\n", "dead-anchor", ctx), "살아있는 앵커");

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

console.log("lint 규칙 자체 점검 통과");
