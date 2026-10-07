/**
 * 릴리스 글감 필터 자체 점검 — `node scripts/check-releases.mjs`
 *
 * 이게 틀리면 글감이 조용히 사라진다. 버전 번호로 걸렀을 때 claude-code 가
 * 통째로 빠진 적이 있다 — 그쪽은 마이너를 안 내고 패치에 기능을 담는다.
 */
import assert from "node:assert/strict";
import { worthWriting, MIN_BODY } from "../src/lib/releases.ts";

const long = "x".repeat(MIN_BODY);

// ── 본문 길이로만 판정한다 ───────────────────────────────────────────────
assert.equal(
  worthWriting("v2.1.267", "x".repeat(7970)),
  true,
  "claude-code 는 패치에 기능을 담는다 — 버전으로 걸러선 안 된다",
);
assert.equal(
  worthWriting("v2.1.266", "x".repeat(532)),
  false,
  "같은 레포의 사소한 패치는 본문이 짧다",
);
assert.equal(worthWriting("v19.3.0", ""), false, "본문 없는 릴리스");
assert.equal(worthWriting("v19.3.0", null), false, "본문이 null 인 릴리스");
assert.equal(worthWriting("v1.0.0", long), true, "딱 한도면 통과");
assert.equal(
  worthWriting("v1.0.0", long.slice(1)),
  false,
  "한 글자 모자라면 탈락",
);

// ── monorepo 하위 패키지 ────────────────────────────────────────────────
assert.equal(
  worthWriting("@ai-sdk/xai@4.0.57", long),
  false,
  "스코프 붙은 하위 패키지는 본문이 길어도 버린다",
);
assert.equal(
  worthWriting("ai@7.0.97", long),
  true,
  "스코프 없는 루트 패키지는 남긴다",
);

console.log("릴리스 필터 점검 통과");
