/**
 * 그림 블록 문법 자체 점검. 규칙이 바뀌면 여기가 먼저 깨진다.
 *   node scripts/check-image-blocks.mjs
 */
import assert from "node:assert/strict";
import {
  isImageLine,
  asImageSize,
  widthOf,
  colsFor,
  ratioFor,
} from "../src/lib/image-blocks.ts";

// ── 줄 단독일 때만 블록으로 승격 ─────────────────────────────────────────
assert.ok(isImageLine("![캡션](/posts/a/1.png)"), "이미지 한 줄");
assert.ok(isImageLine("  ![캡션](/posts/a/1.png){wide}  "), "앞뒤 공백은 무시");
assert.ok(isImageLine("![](/posts/a/1.png)"), "alt 없어도 블록");
assert.ok(!isImageLine("참고: ![캡션](/posts/a/1.png)"), "앞에 글자가 있으면 인라인");
assert.ok(!isImageLine("![캡션](/posts/a/1.png) 뒤에 글자"), "뒤에 글자가 있으면 인라인");
assert.ok(
  !isImageLine("![a](/posts/a/1.png) ![b](/posts/a/2.png)"),
  "한 줄에 둘이면 블록이 아니다",
);

// ── 폭 옵션 ──────────────────────────────────────────────────────────────
assert.equal(asImageSize("xs"), "xs");
assert.equal(asImageSize("sm"), "sm");
assert.equal(asImageSize("wide"), "wide");
assert.equal(asImageSize(""), "", "옵션 없으면 기본 폭");
assert.equal(asImageSize("3"), "", "열 수는 폭이 아니다");
assert.equal(asImageSize("huge"), "", "모르는 옵션은 기본 폭");
assert.equal(asImageSize("240"), 240, "정수는 px 폭");
assert.equal(asImageSize("1200"), 1200, "상한은 폭으로 받는다");
assert.equal(asImageSize("1201"), "", "상한 밖은 기본 폭");
assert.equal(asImageSize("64.5"), "", "소수는 폭이 아니다");

// ── 폭 → max-width ───────────────────────────────────────────────────────
assert.equal(widthOf("xs"), 120);
assert.equal(widthOf("sm"), 380);
assert.equal(widthOf(240), 240, "px 은 그대로");
assert.equal(widthOf(""), undefined, "기본 폭은 max-width 를 안 건다");
assert.equal(widthOf("wide"), undefined, "{wide} 는 클래스로 처리한다");

// ── 묶음 열 수 ───────────────────────────────────────────────────────────
assert.equal(colsFor(2, ""), 2, "2장 → 2열");
assert.equal(colsFor(3, ""), 3, "3장 → 3열");
assert.equal(colsFor(4, ""), 2, "4장 → 2열");
assert.equal(colsFor(5, ""), 2, "5장 → 2열");
assert.equal(colsFor(4, "4"), 4, "명시한 열 수가 이긴다");
assert.equal(colsFor(2, "1"), 1, "1열도 명시 가능");
assert.equal(colsFor(2, "9"), 2, "범위 밖은 무시");
assert.equal(colsFor(3, "wide"), 3, "폭 옵션은 열 수가 아니다");

// ── 칸 비율 ──────────────────────────────────────────────────────────────
assert.equal(ratioFor(1), "16 / 9");
assert.equal(ratioFor(4), "1 / 1");
assert.equal(ratioFor(7), "4 / 3", "모르는 열 수는 기본 비율");

console.log("그림 블록 문법 자체 점검 통과");
