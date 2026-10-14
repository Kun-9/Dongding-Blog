/**
 * 접힌 칸 `> [!MORE] 제목` — 일부 독자만 필요한 세부(환경별 예외, 같은 설정의 다른 표기, 확인 방법).
 * 본문은 닫힌 채 제목 한 줄만 보인다. 그래서 분량·읽기 시간은 본문과 따로 센다.
 * 2026-10-14 "맥락이 불분명하고 쓸데없이 장황하다"는 지적에 시안 B(핵심 + 접힌 세부)로 정했다.
 *
 * next 에 의존하지 않는 순수 모듈이다 — lint·voice·스크립트가 같이 쓴다.
 */

export const FOLD_RE = /^>\s?\[!MORE\]\s*(.*)$/i;

export interface Fold {
  /** 1-based, `> [!MORE]` 줄 */
  line: number;
  title: string;
  /** `>` 를 걷어 낸 안쪽 마크다운 */
  body: string;
}

/** 본문을 접힌 칸 밖(main)과 접힌 칸들로 가른다. 코드 펜스 안의 `> [!MORE]` 는 칸이 아니다. */
export function splitFolds(body: string): { main: string; folds: Fold[] } {
  const lines = String(body ?? "").split("\n");
  const main: string[] = [];
  const folds: Fold[] = [];
  let fenced = false;
  for (let i = 0; i < lines.length; i++) {
    const ln = lines[i];
    if (/^(```|~~~)/.test(ln)) fenced = !fenced;
    const m = fenced ? null : ln.match(FOLD_RE);
    if (!m) {
      main.push(ln);
      continue;
    }
    const line = i + 1;
    const inner: string[] = [];
    while (i + 1 < lines.length && lines[i + 1].startsWith(">")) inner.push(lines[++i].replace(/^>\s?/, ""));
    folds.push({ line, title: m[1].trim(), body: inner.join("\n").trim() });
  }
  return { main: main.join("\n"), folds };
}
