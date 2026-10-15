/**
 * lib/voice 구조 규칙 자체 점검 — `node_modules/.bin/jiti scripts/check-voice-rules.mjs`
 * (voice.ts 가 확장자 없는 import 를 써서 node 가 바로 못 읽는다)
 *
 * 2026-10-15 글 설계 A(답부터)에서 더한 규칙만 본다: 요약 박스 뒤 문단(intro-paragraph),
 * 해법 없는 첫 섹션(answer-late), 끝 문단·틀 제목(closing-block), 4박자 넘는 장면(scene-long),
 * 16줄 넘는 본문 코드(code-long), 생성 말투(stock-phrase). 오탐은 정탐 누락보다 나쁘다 —
 * 참(잡아야 함)과 거짓(잡으면 안 됨) 케이스를 짝으로 둔다.
 */
import assert from "node:assert/strict";
import { checkVoice } from "../src/lib/voice.ts";
import { lintPhrases } from "../src/lib/phrases.ts";

const BOX = `> [!INFO]
> **해당** 사내 서비스
> **문제** 막은 계정의 토큰이 통과합니다.
> **할 일** 수명을 줄입니다.
`;
const FIX = "## 수명은 15분으로 둔다\n\n설정에서 값을 바꿉니다.\n\n```toml\nlifespan = 900\n```\n";
const WHY = "## 왜 만료까지 통과하나\n\nAPI 서버는 서명만 봅니다.\n\n```compare\ncaption: 두 토큰\n| 액세스 | 리프레시\n보내는 곳 | API | 인가 *\n```\n";
const SRC = "[문서](https://code.claude.com/docs/en/x \"설명\")";

const rules = (body) => checkVoice({ title: "제목", summary: "요약", body }, "concept").issues.map((i) => i.rule);
const has = (body, rule) => rules(body).includes(rule);

// ── 요약 박스 → 첫 소제목 ─────────────────────────────────────────────
assert.ok(has(`${BOX}\n용어를 먼저 풉니다.\n\n${FIX}${WHY}${SRC}`, "intro-paragraph"), "박스와 첫 소제목 사이 문단");
assert.ok(!has(`${BOX}\n${FIX}${WHY}${SRC}`, "intro-paragraph"), "바로 이어진 소제목은 통과");
assert.ok(!has(`> [!WARNING] 수정된 버그 · 2026년 10월 20일\n> 더 생기지 않습니다.\n\n${BOX}\n${FIX}${WHY}${SRC}`, "intro-paragraph"), "박스 위·아래 다른 박스는 통과");

// ── 첫 섹션이 해법인가 ────────────────────────────────────────────────
assert.ok(has(`${BOX}\n## 왜 만료까지 통과하나\n\n서명만 봅니다.\n\n${FIX}${SRC}`, "answer-late"), "첫 섹션에 쓸 것이 없음");
assert.ok(!has(`${BOX}\n${FIX}${WHY}${SRC}`, "answer-late"), "코드가 있는 첫 섹션은 통과");
assert.ok(!has(`${BOX}\n## 무엇을 고르나\n\n| 상황 | 고를 것 |\n| --- | --- |\n| A | B |\n\n${WHY}${SRC}`, "answer-late"), "표가 있는 첫 섹션은 통과");
assert.ok(!has(`${BOX}\n## 설치하고 부른다\n\n![전](/posts/x/a.svg){tabs}\n![후](/posts/x/b.svg)\n\n${WHY}${SRC}`, "answer-late"), "캡처가 있는 첫 섹션은 통과");
assert.ok(has(`${BOX}\n## 순서는 이렇다\n\n\`\`\`flow\ncaption: 순서\nA | 하나\nB | 둘\n\`\`\`\n\n${FIX}${SRC}`, "answer-late"), "흐름 그림만 있는 첫 섹션은 해법이 아님");

// ── 끝 문단·틀 제목 ───────────────────────────────────────────────────
assert.ok(has(`${BOX}\n${FIX}${WHY}## 지금 해 볼 일\n\n1. 설정을 바꿉니다.\n${SRC}`, "closing-block"), "지금 해 볼 일 섹션");
assert.ok(has(`${BOX}\n${FIX}${WHY}> [!MORE] 옛 버전이라면\n> 다릅니다.\n\n지금 바로 설정을 바꿉니다. ${SRC}\n`, "closing-block"), "접힌 칸 뒤 끝 문단");
assert.ok(!has(`${BOX}\n${FIX}${WHY}문단 하나. ${SRC}\n\n> [!MORE] 옛 버전이라면\n> 다릅니다.\n`, "closing-block"), "접힌 칸으로 끝나면 통과");
assert.ok(!has(`${BOX}\n${FIX}## 결론이 다른 이유\n\n설명. ${SRC}\n`, "closing-block"), "'결론'이 든 평서문 소제목은 통과");

// ── 장면 박자·본문 코드 길이 ──────────────────────────────────────────
const scene = (n) => "```figure\ncaption: 장면\nscene: on\n" + Array.from({ length: n }, (_, i) => `step: ${i + 1}\n> 설명 ${i + 1}\n`).join("") + '<div class="fig-box" data-step="1">a</div>\n```\n';
assert.ok(has(`${BOX}\n${FIX}## 왜\n\n${scene(4)}${SRC}`, "scene-long"), "4박자 장면");
assert.ok(!has(`${BOX}\n${FIX}## 왜\n\n${scene(3)}${SRC}`, "scene-long"), "3박자 장면은 통과");
const code = (n) => "```js\n" + Array.from({ length: n }, (_, i) => `line${i};`).join("\n") + "\n```\n";
assert.ok(has(`${BOX}\n## 해법\n\n${code(17)}${WHY}${SRC}`, "code-long"), "17줄 본문 코드");
assert.ok(!has(`${BOX}\n## 해법\n\n${code(16)}${WHY}${SRC}`, "code-long"), "16줄은 통과");
assert.ok(!has(`${BOX}\n${FIX}${WHY}> [!MORE] 전체 코드\n> \`\`\`js\n${Array.from({ length: 30 }, (_, i) => `> line${i};`).join("\n")}\n> \`\`\`\n${SRC}`, "code-long"), "접힌 칸 안 긴 코드는 통과");

// ── 생성 말투 ─────────────────────────────────────────────────────────
const phrase = (text) => lintPhrases(text, "warning").map((i) => i.message);
assert.ok(phrase("즉, 토큰은 서명만 봅니다.").some((m) => m.includes("즉·다시 말해")), "즉,");
assert.ok(phrase("이는 서명을 보기 때문입니다.").some((m) => m.includes("이는")), "이는");
assert.ok(phrase("회전을 켬으로써 사본을 막습니다.").some((m) => m.includes("함으로써")), "~으로써");
assert.ok(phrase("API를 통해 값을 받습니다.").some((m) => m.includes("를 통해")), "~를 통해");
assert.ok(phrase("강력한 기능을 제공합니다.").some((m) => m.includes("홍보 형용사")), "홍보 형용사");
assert.ok(phrase("빠르게 열리는 것이 가능합니다.").some((m) => m.includes("가능합니다")), "가능합니다");
assert.equal(phrase("즉시 끊깁니다. 이는점 없이. 또한번 열립니다.").length, 0, "'즉시'·'이는점'·'또한번'은 통과");
assert.equal(phrase("물론을 쓴 낱말과 참고로만 된 말은 다릅니다.").length, 0, "낱말 안의 물론·참고로는 통과");

console.log("check-voice-rules: ok");
