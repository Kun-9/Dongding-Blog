/**
 * SEO 폭 계산·잘림 자체 점검 — `node scripts/check-seo-text.mjs`
 *
 * 이게 틀리면 설정 화면의 SEO 미리보기가 실제 검색결과와 다른 자리에서
 * 잘린 척한다 — 보고 고친 문구가 여전히 잘린다.
 */
import assert from "node:assert/strict";
import { seoUnits, seoClip } from "../src/lib/seo-text.ts";

// ── 폭 계산 ──────────────────────────────────────────────────────────────
assert.equal(seoUnits(""), 0);
assert.equal(seoUnits("abc"), 3, "라틴은 1폭");
assert.equal(seoUnits("가나다"), 6, "한글은 2폭");
assert.equal(seoUnits("Dong-Ding 개발 노트"), 19, "혼합: 10 + 4 + 1 + 4");
assert.equal(seoUnits("１２"), 4, "전각 숫자도 2폭");

// ── 잘림 ────────────────────────────────────────────────────────────────
assert.equal(seoClip("abc", 10), "abc", "한도 안이면 그대로");
assert.equal(seoClip("abcdef", 6), "abcdef", "정확히 한도면 그대로");
assert.equal(seoClip("abcdefg", 6), "abcdef…", "넘치면 자르고 말줄임");
assert.equal(seoClip("가나다", 6), "가나다", "폭이 정확히 맞으면 그대로");
assert.equal(seoClip("가나다", 5), "가나…", "전각은 반쪽으로 안 잘린다");
assert.equal(seoClip("", 10), "", "빈 문자열은 말줄임 없이 빈 문자열");

// 잘린 자리의 공백·구분자는 떼어낸다.
assert.equal(seoClip("스프링, 오라클", 8), "스프링…", "쉼표와 공백 제거");
assert.equal(seoClip("가나 다라", 5), "가나…", "끝 공백 제거");
assert.equal(seoClip("가나·다라", 5), "가나…", "가운뎃점 제거");

// 한도가 첫 글자보다 좁으면 본문 없이 말줄임만 남는다.
assert.equal(seoClip("가나", 1), "…", "전각 한 글자도 못 넣는 경우");

// 서로게이트 쌍이 쪼개지지 않는다 — [...s] 로 코드포인트 단위 순회.
assert.equal(seoUnits("👍"), 1, "BMP 밖 문자는 1폭으로 센다");
assert.equal(seoClip("ab👍", 3), "ab👍", "이모지가 반으로 갈리지 않는다");

console.log("check-seo-text: 전부 통과");
