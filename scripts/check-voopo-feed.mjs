/**
 * Voopo 피드 변환 자체 점검 — `node scripts/check-voopo-feed.mjs`
 *
 * 이게 틀리면 Voopo 브리핑에 엉뚱한 요약이 실리거나, 접은 주제·초안 글이
 * 릴리스 연결로 새어 나간다.
 */
import assert from "node:assert/strict";
import { SUMMARY_MAX, dateToISO, postSummary, releaseLinks } from "../src/lib/voopo-feed.ts";

// ── 글 요약 ─────────────────────────────────────────────────────────────
assert.equal(postSummary("  요약이 있다 ", "본문"), "요약이 있다", "요약이 있으면 그대로");
assert.equal(
  postSummary(
    "",
    [
      "# 제목",
      "> [!INFO] 요약 박스",
      "> 해당: 모두",
      "```ts",
      "const x = 1;",
      "```",
      "- 목록",
      "![그림](a.png)",
      "| 표 | 칸 |",
      "<figure>",
      "",
      "첫 **문단**은 [링크](https://a.dev)와 `코드`를 품는다.",
      "둘째 문단",
    ].join("\n"),
  ),
  "첫 문단은 링크와 코드를 품는다.",
  "제목·박스·코드·목록·그림·표·HTML 을 건너뛰고 첫 산문 줄의 글자만",
);
const long = postSummary("", "가".repeat(SUMMARY_MAX + 10));
assert.equal(long.length, SUMMARY_MAX + 1, "길면 잘라 말줄임표");
assert.ok(long.endsWith("…"));
assert.equal(postSummary("", "```\n코드뿐\n```"), "", "산문이 없으면 빈 문자열");

// ── 날짜 ────────────────────────────────────────────────────────────────
assert.equal(dateToISO("2026-10-15"), "2026-10-15T00:00:00.000Z", "날짜만 있는 발행일은 UTC 자정");

// ── 릴리스 연결 ─────────────────────────────────────────────────────────
const published = new Map([["mods", "uuid-mods"]]);
const topic = (id, over) => ({ id, post_slug: null, proposal: null, dropped_reason: null, ...over });

assert.deepEqual(releaseLinks([], published), { note: null, postId: null }, "주제가 없으면 둘 다 null");
assert.deepEqual(
  releaseLinks([topic(1, { post_slug: "mods", proposal: { summary: " 플러그인이 미들웨어로 " } })], published),
  { note: "플러그인이 미들웨어로", postId: "uuid-mods" },
  "제안 요약과 발행 글 id",
);
assert.deepEqual(
  releaseLinks([topic(1, { post_slug: "draft-post", proposal: { summary: "" } })], published),
  { note: null, postId: null },
  "발행 안 된 글·빈 요약은 null",
);
assert.deepEqual(
  releaseLinks([topic(1, { post_slug: "mods", proposal: { summary: "접음" }, dropped_reason: "안 씀" }), null], published),
  { note: null, postId: null },
  "접거나 버린 주제는 보지 않는다",
);
assert.deepEqual(
  releaseLinks(
    [topic(9, { proposal: { summary: "나중" } }), topic(2, { proposal: { summary: "먼저" } }), topic(5, { post_slug: "mods" })],
    published,
  ),
  { note: "먼저", postId: "uuid-mods" },
  "먼저 만든 주제의 요약, 글은 처음 찾은 발행 글",
);
assert.deepEqual(releaseLinks([topic(1, { proposal: "문자열" })], published).note, null, "proposal 모양이 다르면 null");

console.log("check-voopo-feed: ok");
