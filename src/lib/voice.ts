/**
 * 릴리스 글 문체·구성 기준과 그 점검기.
 *
 * 차별점은 "누가 먼저 썼나"가 아니라 말투와 자료다. 릴리스 요약은 어디서나
 * "~가 추가됐다" 서술체에 불릿 나열로 나온다. 이 블로그는 합니다체로 한
 * 톤을 지키고, 표·그림으로 정리해 보여준다.
 *
 * 기준(GUIDE)과 점검(checkVoice)을 한 파일에 둔다. 따로 두면 문서는 바뀌는데
 * 검사는 옛 기준으로 도는 일이 생긴다.
 *
 * next 에 의존하지 않는 순수 모듈이다 — 스크립트에서도 그대로 돌린다.
 */
import type { Issue } from "./lint";

/* ── 기준 ─────────────────────────────────────────────────────────────── */

/** 피할 표현. 사람이 잘 안 쓰고 생성 모델이 즐겨 쓰는 상투구. */
export const AVOID: { pattern: RegExp; label: string; hint: string }[] = [
  { pattern: /결론부터 말하(면|자면)/, label: "결론부터 말하면", hint: "결론을 그냥 첫 문장에 쓰세요" },
  { pattern: /핵심은\s/, label: "핵심은 ~", hint: "무엇이 핵심인지 바로 말하세요" },
  { pattern: /단순히\s.{1,20}(이|가)\s?아니라/, label: "단순히 ~가 아니라", hint: "비교 대상을 구체적으로" },
  { pattern: /의 모든 것/, label: "~의 모든 것", hint: "다루는 범위를 그대로 쓰세요" },
  { pattern: /완벽\s?(가이드|정리)/, label: "완벽 가이드/정리", hint: "과장 빼기" },
  { pattern: /(살펴|알아|정리해)\s?보(겠습니다|도록 하겠습니다|겠어요|도록 할게요)/, label: "~살펴보겠습니다", hint: "예고하지 말고 바로 보여주세요" },
  { pattern: /주목할 만한/, label: "주목할 만한", hint: "왜 중요한지를 쓰세요" },
  { pattern: /게임\s?체인저|혁신적인|획기적인/, label: "게임 체인저·혁신적", hint: "무엇이 달라졌는지로 대신" },
  { pattern: /라고 할 수 있(습니다|어요|다)/, label: "~라고 할 수 있다", hint: "단정하거나 근거를 붙이세요" },
  { pattern: /것이 중요(합니다|해요|하다)/, label: "~것이 중요하다", hint: "왜 중요한지 한 줄로" },
  { pattern: /요약하자면|한마디로 (말하면|정리하면)/, label: "요약하자면", hint: "정리는 표나 박스로" },
  { pattern: /마무리하며|맺으며/, label: "마무리하며", hint: "소제목은 내용으로" },
  { pattern: /되어지|되어집니다|되어져/, label: "이중 피동(되어지다)", hint: "~됩니다" },
  { pattern: /을 볼 수 있(습니다|어요|다)|를 볼 수 있(습니다|어요|다)/, label: "~를 볼 수 있다", hint: "번역투, 그냥 서술하세요" },
];

/** 글 한 편에 꼭 있어야 하는 구성 요소. 차별점이 여기서 나온다. */
export const REQUIRED_PARTS = [
  { key: "summary-box", label: "도입 요약 박스", how: "본문 첫 단락 근처에 `> [!INFO]` 로 무엇이·언제·누구에게 바뀌었는지 세 줄" },
  { key: "table", label: "비교·정리 표", how: "전/후 비교, 버전별 변화, 설정값 정리 중 하나 이상" },
  { key: "visual", label: "시각 자료", how: "직접 찍은 스크린샷이나 흐름 그림. 릴리스 노트 캡처만으로는 부족" },
  { key: "source", label: "출처 링크", how: "해당 릴리스·PR·공식 문서 링크" },
] as const;

/** 문체 규칙. 화면의 기준 카드와 GUIDE 가 같이 쓴다. */
export const VOICE_RULES = [
  "본문은 합니다체로 통일. 해요체·서술체와 섞지 않기 (표·코드·불릿 안의 명사형은 예외)",
  "제목은 명사형·질문형. \"~가 됐다\" 같은 헤드라인 말투 금지",
  "영어·코드 뒤 조사는 붙여 쓰기: mode가, CLAUDE.md를",
  "직접 해 본 것은 \"직접 실행해 보니 ~했습니다\"로 구분",
  "문장은 짧게, 한 문장에 한 가지",
  "줄표(—)는 글 전체 두 번 이하, 굵게는 섹션당 한두 곳",
] as const;

/** 권장 뼈대. */
export const OUTLINE = [
  ["요약 박스", "무엇이, 어느 버전부터, 누구에게"],
  ["무엇이 바뀌었나", "전/후 비교 표"],
  ["직접 써 보기", "스크린샷·명령·결과"],
  ["왜 바뀌었나", "PR·이슈에서 읽은 맥락"],
  ["정리", "설정값·명령 표, 출처 링크"],
] as const;

/** 사람과 모델이 같이 읽는 기준 문서. MCP 가 그대로 내보낸다. */
export const GUIDE = `# 릴리스 글 쓰기 기준

## 문체
${VOICE_RULES.map((v) => `- ${v}`).join("\n")}

제목 예시
- 나쁨: auto mode 가 기본값이 됐다
- 좋음: Claude Code, 권한을 묻지 않는 이유 / auto mode 기본값 전환 정리

## 피할 표현
${AVOID.map((a) => `- ${a.label} → ${a.hint}`).join("\n")}

## 구성 (필수)
${REQUIRED_PARTS.map((p) => `- ${p.label}: ${p.how}`).join("\n")}

## 권장 뼈대
${OUTLINE.map(([h, d], i) => `${i + 1}. ${h} — ${d}`).join("\n")}
`;

/* ── 점검 ─────────────────────────────────────────────────────────────── */

export interface VoiceInput {
  title: string;
  summary: string;
  body: string;
}

export interface VoiceReport {
  issues: Issue[];
  /** 통과 여부 — warning 이상이 없으면 통과. info 는 참고. */
  passed: boolean;
  parts: Record<(typeof REQUIRED_PARTS)[number]["key"], boolean>;
}

/** 산문 줄만 남긴다. 코드 펜스·표·HTML 주석은 문체 검사 대상이 아니다. */
function proseLines(body: string): { n: number; text: string }[] {
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

/**
 * 문장 끝을 해요체·합니다체·서술체로 가른다. 명사로 끝나는 불릿·제목은
 * 판정하지 않는다(null).
 */
function endingOf(sentence: string): "haeyo" | "hamnida" | "plain" | null {
  const s = sentence.replace(/[.!?…"'”’)\]]+$/, "").trim();
  if (/(니다|니까)$/.test(s)) return "hamnida";
  if (/[요죠]$/.test(s)) return "haeyo";
  // 서술체: ~다/~까 로 끝나되 위 둘이 아닌 것. "~이다/~했다/~한다/~된다".
  if (/(다|는가|을까|ㄴ가)$/.test(s)) return "plain";
  return null;
}

function excerpt(text: string, at = 0): string {
  const s = text.slice(Math.max(0, at - 12), at + 28);
  return s.length < text.length ? `…${s}…` : s;
}

export function checkVoice(post: VoiceInput): VoiceReport {
  const issues: Issue[] = [];
  const lines = proseLines(post.body);

  // 제목 — 헤드라인 말투.
  if (/(됐다|되었다|왔다|했다|나왔다|생겼다|바뀌었다)$/.test(post.title.trim())) {
    issues.push({
      rule: "headline-title",
      severity: "warning",
      message: `제목이 기사 헤드라인 말투입니다: "${post.title}". 명사형이나 질문형으로 바꾸세요.`,
    });
  }

  // 문장 끝 — 합니다체 기준. 마침표로 끝난 문장만 본다: 명사로 끝나는
  // 불릿·제목은 endingOf 가 null 을 주거나 마침표가 없어 걸리지 않는다.
  const off: Record<"plain" | "haeyo", { count: number; label: string }> = {
    plain: { count: 0, label: "서술체" },
    haeyo: { count: 0, label: "해요체" },
  };
  for (const { n, text } of lines) {
    if (/^#{1,6}\s/.test(text)) continue;
    for (const sentence of text.split(/(?<=[.!?])\s+/)) {
      const e = endingOf(sentence);
      if ((e === "plain" || e === "haeyo") && /[.!?]$/.test(sentence.trim())) {
        const o = off[e];
        o.count++;
        if (o.count <= 5) {
          issues.push({
            rule: `${e}-ending`,
            severity: "warning",
            line: n,
            message: `${o.label} 문장입니다. 합니다체로 바꾸세요: "${excerpt(sentence)}"`,
          });
        }
      }
    }
  }
  for (const [e, o] of Object.entries(off)) {
    if (o.count > 5) {
      issues.push({
        rule: `${e}-ending`,
        severity: "warning",
        message: `${o.label} 문장이 ${o.count - 5}개 더 있습니다.`,
      });
    }
  }

  // 상투구.
  for (const { n, text } of lines) {
    for (const a of AVOID) {
      const m = text.match(a.pattern);
      if (m) {
        issues.push({
          rule: "stock-phrase",
          severity: "warning",
          line: n,
          message: `"${a.label}" — ${a.hint}: "${excerpt(text, m.index)}"`,
        });
      }
    }
  }

  // 영어·코드 뒤 띄어 쓴 조사. "mode 가", "`x` 를".
  const particle = /([A-Za-z0-9)\]`]) (가|이|를|을|는|은|의|와|과|로|으로|에서|에게|에|도|만)(?=[\s.,!?]|$)/;
  let spaced = 0;
  for (const { n, text } of lines) {
    const m = text.match(particle);
    if (m) {
      spaced++;
      if (spaced <= 5) {
        issues.push({
          rule: "spaced-particle",
          severity: "warning",
          line: n,
          message: `조사를 띄어 썼습니다. 붙여 쓰세요: "${excerpt(text, m.index)}"`,
        });
      }
    }
  }

  // 줄표·굵게 과다 — 생성 글의 지문.
  const dashes = (post.body.match(/—/g) ?? []).length;
  if (dashes > 2) {
    issues.push({
      rule: "em-dash",
      severity: "warning",
      message: `줄표(—)가 ${dashes}개입니다. 두 개 이하로 줄이세요.`,
    });
  }
  const bolds = (post.body.match(/\*\*[^*\n]+\*\*/g) ?? []).length;
  const sections = Math.max(1, (post.body.match(/^##\s/gm) ?? []).length);
  if (bolds > sections * 2) {
    issues.push({
      rule: "bold-overuse",
      severity: "info",
      message: `굵게가 ${bolds}곳입니다(소제목 ${sections}개). 섹션당 한두 곳이면 충분합니다.`,
    });
  }

  // 구성 — 필수 요소.
  const head = post.body.split("\n").slice(0, 15).join("\n");
  const parts = {
    "summary-box": /^>\s?\[!(INFO|NOTE|TIP)\]/im.test(head),
    table: /^\s*\|.*\|\s*\n\s*\|\s*:?-{3,}/m.test(post.body),
    visual: /!\[[^\]]*\]\([^)]+\)/.test(post.body),
    source: /https?:\/\/(github\.com|docs\.|code\.claude\.com|[^\s)]*anthropic\.com)/.test(post.body),
  };
  for (const p of REQUIRED_PARTS) {
    if (!parts[p.key]) {
      issues.push({
        rule: `missing-${p.key}`,
        severity: "warning",
        // 라벨이 전부 모음으로 끝나 "가"로 고정한다.
        message: `${p.label}가 없습니다. ${p.how}`,
      });
    }
  }

  return {
    issues,
    passed: !issues.some((i) => i.severity !== "info"),
    parts,
  };
}
