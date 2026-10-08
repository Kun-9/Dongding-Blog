/**
 * 글쓰기 습관 점검 — 상투구와 후속편 도입.
 *
 * 릴리스 글은 쓰기 기준 점검(lib/voice)이 warning 으로, 그 밖의 글은
 * lintPost 가 info 로 본다. 같은 함수를 쓰므로 두 결과가 어긋나지 않는다.
 *
 * 의존이 없는 순수 모듈이다. lib/lint 는 스크립트가 직접 로드하고
 * lib/voice 는 클라이언트 화면이 불러서, 둘 다 여기만 가져다 쓴다.
 */
import type { Issue, Severity } from "./lint.ts";

/** 피할 표현. 사람이 잘 안 쓰고 생성 모델이 즐겨 쓰는 상투구. */
export const AVOID: { pattern: RegExp; label: string; hint: string }[] = [
  { pattern: /결론부터 말하(면|자면)/, label: "결론부터 말하면", hint: "결론을 그냥 첫 문장에 쓰세요" },
  { pattern: /핵심은\s/, label: "핵심은 ~", hint: "무엇이 핵심인지 바로 말하세요" },
  { pattern: /단순히\s.{1,20}(이|가)\s?아니라/, label: "단순히 ~가 아니라", hint: "비교 대상을 구체적으로" },
  { pattern: /의 모든 것/, label: "~의 모든 것", hint: "다루는 범위를 그대로 쓰세요" },
  { pattern: /완벽\s?(가이드|정리)/, label: "완벽 가이드/정리", hint: "과장 빼기" },
  { pattern: /(살펴|알아|정리해)\s?보(겠습니다|도록 하겠습니다|겠어요|도록 할게요)/, label: "~살펴보겠습니다", hint: "예고하지 말고 바로 보여주세요" },
  { pattern: /이 글(은|에서는?|에서)\s.{0,40}(정리|다룹|다루|살펴|소개|알아)/, label: "이 글은 ~를 정리합니다", hint: "글 소개 대신 바로 본론" },
  { pattern: /주목할 만한/, label: "주목할 만한", hint: "왜 중요한지를 쓰세요" },
  { pattern: /게임\s?체인저|혁신적인|획기적인/, label: "게임 체인저·혁신적", hint: "무엇이 달라졌는지로 대신" },
  { pattern: /라고 할 수 있(습니다|어요|다)/, label: "~라고 할 수 있다", hint: "단정하거나 근거를 붙이세요" },
  { pattern: /것이 중요(합니다|해요|하다)/, label: "~것이 중요하다", hint: "왜 중요한지 한 줄로" },
  { pattern: /요약하자면|한마디로 (말하면|정리하면)|정리하면|결론적으로|요컨대/, label: "정리하면·결론적으로", hint: "맺음 문단에서 그냥 말하세요" },
  { pattern: /마무리하며|맺으며/, label: "마무리하며", hint: "소제목은 내용으로" },
  { pattern: /되어지|되어집니다|되어져/, label: "이중 피동(되어지다)", hint: "~됩니다" },
  { pattern: /을 볼 수 있(습니다|어요|다)|를 볼 수 있(습니다|어요|다)/, label: "~를 볼 수 있다", hint: "번역투, 그냥 서술하세요" },
  { pattern: /에 의해/, label: "~에 의해", hint: "하는 쪽을 주어로: \"A가 B를 ~합니다\"" },
  { pattern: /(줄여|간추려|다시 그려) 옮겼|예시를 옮겼|(화면|구성)을 (줄여 )?다시 그렸|띄운 것을 (줄여|옮)/, label: "그림 제작 경위", hint: "어떻게 만들었는지는 캡션 괄호에만. 본문은 그림이 보여 주는 것과 직접 해 보고 안 사실을 쓰세요" },
];

/**
 * 이전 글을 가리키는 표현. 낱말이 이어지는 "이전 글자", "앞 편집기"는 아니다.
 * 가리키는 것 자체는 괜찮다. 같은 줄에서 요약하고 링크를 걸면 처음 온 독자도 따라온다.
 */
const SEQUEL = /(지난번|지난|이전|앞|저번)\s?(글(?![자씨쓰꼴귀])|편(?![집리하지안])|포스트(?!잇))|\d+\s?편\]?(에서|부터)/;

/**
 * 이전 글을 먼저 읽고 오라는 요구. 링크가 있어도 독자에게 숙제를 넘긴다.
 * "처음부터 읽어 주세요", "로그를 읽고 오세요" 처럼 이전 글이 아닌 것은 SEQUEL 이 같은 줄에 있어야 잡는다.
 */
const READ_FIRST = /(먼저|부터)\s?(읽|보)(고\s?(오|와)|어\s?(주|보))|읽고\s?오(시|세|면)/;

/** 링크가 남은 산문 줄 — proseLines 가 주소를 지워 `[글자]` 만 남긴다. */
const LINKED = /\[[^\]]+\]|https?:\/\//;

/** 도입부로 보는 산문 줄 수 — 요약 박스와 첫 문단 한두 개. 첫 H2 가 먼저 오면 거기까지. */
const INTRO_LINES = 8;

/** 산문 줄만 남긴다. 코드 펜스·표·HTML 주석·이미지 줄은 문체 검사 대상이 아니다. */
export function proseLines(body: string): { n: number; text: string }[] {
  const out: { n: number; text: string }[] = [];
  let fenced = false;
  body.split("\n").forEach((raw, i) => {
    if (/^\s*(```|~~~)/.test(raw)) {
      fenced = !fenced;
      return;
    }
    if (fenced) return;
    const t = raw.trim();
    if (!t || t.startsWith("|") || t.startsWith("<!--") || /^!\[/.test(t)) return;
    // callout 첫 줄의 [!INFO] 표기와 링크 주소는 지운다.
    const text = t
      .replace(/^>\s?(\[![A-Za-z]+\][^\n]*)?/, "")
      .replace(/\]\([^)]*\)/g, "]")
      .trim();
    if (text) out.push({ n: i + 1, text });
  });
  return out;
}

export function excerpt(text: string, at = 0): string {
  const s = text.slice(Math.max(0, at - 12), at + 28);
  return s.length < text.length ? `…${s}…` : s;
}

export function lintPhrases(body: string, severity: Severity): Issue[] {
  const out: Issue[] = [];
  const lines = proseLines(body);
  for (const { n, text } of lines) {
    for (const a of AVOID) {
      const m = text.match(a.pattern);
      if (m) {
        out.push({ rule: "stock-phrase", severity, line: n, message: `"${a.label}" — ${a.hint}: "${excerpt(text, m.index)}"` });
      }
    }
  }
  // 도입부만 본다. 본문 중간에 이전 글을 가리키는 것은 괜찮다.
  for (const { n, text } of lines.slice(0, INTRO_LINES)) {
    if (/^##\s/.test(text)) break;
    const demand = SEQUEL.test(text) ? text.match(READ_FIRST) : null;
    const bare = LINKED.test(text) ? null : text.match(SEQUEL);
    const m = demand ?? bare;
    if (m) {
      out.push({
        rule: "sequel-intro",
        severity,
        line: n,
        message: demand
          ? `도입부가 이전 글을 먼저 읽으라고 합니다. 필요한 부분을 여기서 한두 문장으로 요약하고, 링크는 더 읽을 거리로 두세요: "${excerpt(text, m.index)}"`
          : `도입부가 이전 글을 링크 없이 가리킵니다. 그 글에서 필요한 부분을 이 문장에서 요약하고 요약에 링크를 거세요: "${excerpt(text, m.index)}"`,
      });
    }
  }
  return out;
}
