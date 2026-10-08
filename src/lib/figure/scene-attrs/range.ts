/**
 * 장면 속성이 같이 쓰는 단계 표기.
 * - 범위: `2`(그 단계), `2+`(2부터 끝까지), `2-3`(2부터 3까지)
 * - 값 목록: `1:값|3:값` — 그 단계까지 마지막으로 정해진 값이 쓰인다
 */
export const RANGE = String.raw`\d{1,2}(?:\+|-\d{1,2})?`;

/** `2`·`2+`·`2-3` 이 단계 n 을 덮나. exact 면 `2` 는 그 단계만, 아니면 2부터 끝까지. */
export function covers(range: string, n: number, exact: boolean) {
  const m = range.match(/^(\d+)(\+|-(\d+))?$/);
  if (!m) return false;
  const a = Number(m[1]);
  if (m[3]) return n >= a && n <= Number(m[3]);
  if (m[2] === "+" || !exact) return n >= a;
  return n === a;
}

/** 범위가 1~n 안에 있고 앞이 작은가. */
export function rangeFits(range: string, n: number) {
  const m = range.match(/^(\d+)(?:\+|-(\d+))?$/);
  const ok = (k: number) => k >= 1 && k <= n;
  return !!m && ok(Number(m[1])) && (!m[2] || (ok(Number(m[2])) && Number(m[2]) >= Number(m[1])));
}

/** `1:값|3:값` 의 항목들. */
export const items = (spec: string) =>
  spec.split("|").map((it) => {
    const at = it.indexOf(":");
    return { key: it.slice(0, at), value: it.slice(at + 1) };
  });

/** `1:값|3:값` 에서 단계 n 까지 마지막으로 정해진 값. 없으면 null. */
export function latest(spec: string, n: number): string | null {
  let best = -1;
  let out: string | null = null;
  for (const { key, value } of items(spec)) {
    const k = Number(key);
    if (k <= n && k > best) {
      best = k;
      out = value;
    }
  }
  return out;
}

/** 값 목록의 단계 번호가 모두 1~n 안인가. */
export const keysFit = (spec: string, n: number) => items(spec).every(({ key }) => Number(key) >= 1 && Number(key) <= n);
