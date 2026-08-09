/**
 * 검색결과·SNS 카드에서 문구가 잘리는 자리를 계산한다.
 *
 * 한글은 검색결과에서 라틴 문자 두 배 폭을 먹는다. 그래서 글자 수가 아니라
 * 폭 단위로 센다 — `"가나다"` 는 3자지만 6폭이다.
 *
 * `node scripts/check-seo-text.mjs` 가 이 파일을 직접 로드한다 — 번들러를 안
 * 거치므로 런타임 의존성을 들이지 말 것.
 */

/** 전각 취급할 문자 — 한글 자모·한중일 통합·한글 음절·호환 한자·전각 기호. */
const WIDE_CHAR =
  /[ᄀ-ᇿ⺀-鿿가-힯豈-﫿＀-｠]/;

/** 문자열의 표시 폭. 전각 2, 그 외 1. */
export function seoUnits(s: string): number {
  return [...s].reduce((n, ch) => n + (WIDE_CHAR.test(ch) ? 2 : 1), 0);
}

/**
 * 폭 기준으로 자른다. 잘렸으면 말줄임표를 붙이고, 잘린 자리에 남은 공백이나
 * 구분자(`,` `·`)는 떼어낸다 — `"스프링, …"` 보다 `"스프링…"` 이 낫다.
 */
export function seoClip(s: string, max: number): string {
  let n = 0;
  let out = "";
  for (const ch of s) {
    const w = WIDE_CHAR.test(ch) ? 2 : 1;
    if (n + w > max) return `${out.replace(/[\s,·]+$/, "")}…`;
    n += w;
    out += ch;
  }
  return out;
}
