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
import { findDiagrams, findFences } from "./diagram";
import { parseFigureHtml } from "./html-figure";

/* ── 기준 ─────────────────────────────────────────────────────────────── */

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
];

/**
 * 릴리스 배포일 — GitHub 릴리스 공개 시각(UTC)의 한국 날짜. 글감 응답의 `released` 와
 * 요약 박스 표기 `v2.1.280(2026년 9월 23일 배포)` 가 같은 값을 쓴다. UTC 날짜를 그대로 옮기면 하루씩 틀린다.
 */
export function releaseDay(iso: string): string {
  return new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", year: "numeric", month: "long", day: "numeric" }).format(new Date(iso));
}

/** 글 한 편에 꼭 있어야 하는 구성 요소. 차별점이 여기서 나온다. */
export const REQUIRED_PARTS = [
  { key: "summary-box", label: "도입 요약 박스", how: "첫머리 `> [!INFO]` 에 무엇이·언제부터·누구에게 바뀌는지를 두세 문장 산문으로. 버전마다 실제 배포일을 `v2.1.280(2026년 9월 23일 배포)` 꼴로 붙인다. 배포일은 GitHub 릴리스 공개 시각의 한국 날짜(글감의 `released`), 글감이 없으면 공식 발표일. 굵은 라벨 불릿 금지" },
  { key: "table", label: "비교 표", how: "꼭 필요한 비교 하나(전/후, 버전별). markdown 표나 ```compare·```matrix 블록. 글 전체 두 개까지" },
  { key: "visual", label: "본문 속 그림", how: "설명하는 문단 바로 아래에 그림 블록(```flow 등 10종)·```figure 또는 단독 줄 `![캡션](경로)`. 캡처 자리(todo-)만으로는 안 되고 직접 만든 그림이 하나 이상. 글에서 이해가 막히는 지점(바뀐 동작·계산·순서·관계)에 둔다" },
  { key: "source", label: "출처 링크", how: "본문 문장 안 링크로. 끝에 목록으로 몰지 않는다" },
] as const;

/** 글 종류. 릴리스 글만 배포일·버전 표기를 요구한다. */
export type PostKind = "release" | "concept";

/**
 * 개념 글(MVC, JWT 처럼 헷갈리는 개념 하나)의 필수 구성. 키는 릴리스와 같고
 * 쓰는 법만 다르다 — 점검기가 같은 판정으로 본다.
 */
export const CONCEPT_PARTS = [
  { key: "summary-box", label: "도입 요약 박스", how: "첫머리 `> [!INFO]` 에 무엇이 헷갈리는지와 한 줄 답을 두세 문장 산문으로. 날짜·버전은 쓰지 않는다(특정 버전의 동작을 말할 때만 본문에 밝힌다)" },
  { key: "table", label: "비교 표", how: "헷갈리는 두세 개념의 차이 하나. markdown 표나 ```compare·```matrix 블록. 글 전체 두 개까지" },
  { key: "visual", label: "본문 속 그림", how: "설명하는 문단 바로 아래에 그림 블록(```flow 등 10종)·```figure 또는 단독 줄 `![캡션](경로)`. 흐름·구조·순서를 그림으로" },
  { key: "source", label: "출처 링크", how: "표준·공식 문서(RFC, MDN, 언어·프레임워크 문서, 원전) 링크를 본문 문장 안에. 끝에 목록으로 몰지 않는다" },
] as const;

const PARTS: Record<PostKind, readonly { key: (typeof REQUIRED_PARTS)[number]["key"]; label: string; how: string }[]> = {
  release: REQUIRED_PARTS,
  concept: CONCEPT_PARTS,
};

/** 문체 규칙. 화면의 기준 카드와 GUIDE 가 같이 쓴다. */
export const VOICE_RULES = [
  "본문은 합니다체로 통일. 해요체·서술체와 섞지 않기 (표·코드 안은 예외)",
  "제목은 명사형·질문형. 헤드라인 말투(~가 됐다), 콜론 부제(…: …) 금지",
  "영어·코드 뒤 조사는 붙여 쓰기: mode가, CLAUDE.md를",
  "직접 해 본 것은 \"직접 실행해 보니 ~했습니다\"로 구분",
  "문장은 짧게, 한 문장에 한 가지. 문단은 서너 문장",
  "줄표(—)는 글 전체 두 번 이하, 굵게는 섹션당 한두 곳",
] as const;

/**
 * 설명 규칙 — 글의 목표는 처음 읽는 사람이 한 번에 이해하는 것이다.
 * 릴리스 노트를 옮겨 적으면 아는 사람만 읽힌다.
 */
export const CLARITY_RULES = [
  "독자는 이 기능을 처음 보는 사람이다. 릴리스 노트의 용어를 그대로 옮기지 않고 풀어 쓴다",
  "새 용어는 처음 나올 때 한 문장으로 무엇인지 설명한다. 예: \"mod는 Claude Code의 동작 사이에 끼워 넣는 작은 스크립트입니다.\"",
  "섹션은 '무엇이 달라지나 → 그래서 나에게 어떤 차이인가' 순서로. 변경 사항보다 그 결과를 먼저 말한다",
  "추상적인 설명 바로 뒤에 구체적인 예(명령, 설정 한 줄, 화면, 숫자)를 붙인다",
  "순서·구조·전후 차이는 글로 길게 풀기 전에 그림 블록으로 먼저 보여 주고, 문단은 그림이 못 하는 이유를 말한다",
  "한 문단에 새 개념은 하나만. 개념이 둘이면 문단을 나눈다",
  "새 기능·개념은 어디에 쓰는지 보여 준다. 활용 예 두세 개(무엇을 하는지와 그때 쓰는 설정·이벤트·명령)와 독자가 바로 따라 할 최소 예제(명령·설정·코드) 하나를 붙인다. 공식 예제·샘플 저장소·문서 예시에서 고르고, 직접 돌려 보거나 출처를 단다. 이름·이벤트만 적은 카드로 끝내지 말고, 예제가 화면에 띄우는 것을 보여 준다. 예: Mods 글이면 공식 샘플 mod 셋을 timeline 장면으로 넘기고, 둘은 직접 돌려 뜬 화면(편집 되감기 pane, rm -rf 를 붙잡은 pane)을 붙인 뒤 `--plugin-dir` 로 불러오는 명령 한 줄",
] as const;

/**
 * 모양 규칙 — 다듬기 수준의 지침. 점검기는 그림·캡션·캡처 자리만 잡는다.
 */
export const FORMAT_RULES = [
  "소제목은 그 섹션이 말하는 내용으로 짓는다. '정리·출처·마무리' 같은 틀 제목은 피한다",
  "설명은 문단으로. 불릿은 정말 나열일 때만, '**라벨**: 설명' 꼴은 피한다",
  "표는 꼭 필요한 비교만. 표 둘을 붙여 두지 않는다",
  "끝은 표나 목록보다 한 문단으로 맺는다",
  "분량은 그림·코드를 뺀 산문 3,000자 안팎(읽기 5~6분). 4,000자를 넘으면 점검에서 막힌다. 다 담으려 하지 말고 독자가 바로 쓸 것만 남긴다",
] as const;

/** 산문 분량 상한(그림·코드 블록·링크 주소·이미지 줄 제외). FORMAT_RULES 와 같은 값. */
const PROSE_MAX = 4000;

/** 그림 규칙 — 점검기가 캡션·캡처 자리를 잡는다. */
export const VISUAL_RULES = [
  "그림은 이 블로그의 차별점이다. 처음 읽는 사람이 막힐 지점(바뀐 동작, 숫자 계산, 순서·흐름, 관계)은 문장으로 길게 풀기 전에 그림으로 먼저 보여 준다. 모든 섹션에 넣지는 않는다",
  "그림은 최대한 단순하게, 움직임이 이해를 돕게 그린다. 칸은 이야기 순서대로 쓴다(모션이 그 순서로 나타난다). 전/후는 compare, 크기 차이는 bars 처럼 움직임이 변화를 보여 주는 종류를 고른다. 본문을 가리고 그림과 캡션만 봐도 섹션의 요점이 읽혀야 한다",
  "그림은 그 내용을 설명하는 문단 바로 다음에 둔다(앞뒤 빈 줄). 그림 모음 섹션은 만들지 않는다",
  "그림을 고르는 순서: ① 그림 블록(아래 10종) → ② 그림 블록으로 안 되는 구성만 ```figure(디자인 키트 HTML) → ③ 그래도 안 되는 모양만 SVG. 앞 단계로 되면 뒤로 가지 않는다",
  "그림 블록은 내용에 맞는 종류로: 단계는 flow, 반복은 cycle, 전/후는 compare, 기능×대상은 matrix, 버전 흐름은 timeline, 주고받는 순서는 sequence, 포함·우선순위는 layers, 파일·계층은 tree, 핵심 숫자는 stats, 수치 비교는 bars",
  "그림 하나에 생각 하나. 칸의 글자는 짧게(제목 몇 단어 + 짧은 설명). 문장은 본문이 한다",
  "강조(`*`)는 그림마다 지금 이야기하는 한두 곳만. 다 강조하면 아무것도 안 보인다",
  "그림 블록·figure 의 캡션은 첫 줄 `caption: …`, 이미지는 alt 자리에. 그림이 보여 주는 것을 40자 안팎 명사구로",
  "모션은 블로그가 정한다. 그림 블록은 아무것도 안 써도 칸이 화면의 읽는 높이에 오면 차례로 나타나고, figure 는 키트 기본 모션이 있다. figure·SVG 에서 바꾸거나 더할 때만 `data-anim`·`data-loop` 을 의미가 있는 곳에 단다. 모션이 없어도 읽히게 그린다",
  "글의 핵심 그림 하나는 장면(`scene: on`)으로 만든다. 단계를 따라 바뀌는 timeline·bars 가 화면에 붙어 스크롤 박자마다 다음 단계로 넘어가고, 단계마다 `> ` 설명이 바뀐다. 한 글에 한두 개까지. 장면이 아닌 그림의 `> ` 줄은 그려지지 않으니 쓰지 않는다. 배포일·출처·계산 내역 같은 보충은 본문 문장이나 캡션에 쓴다",
  "실제 화면은 사람 몫으로 남기지 않는다. blog-capture 스킬대로 ① 직접 뜬다: `node .claude/skills/blog-capture/capture.mjs --run \"claude\" --keys /model --keys Enter --from \"Select model\" --to \"Esc to cancel\" --out /tmp/<이름>.svg` 한 줄로 SVG 를 만들어 올리고, 본문에는 '직접 v2.1.292에서 열어 보니'처럼 버전과 함께 밝힌다 ② 띄울 수 없으면(끝 코드 3·4) 자료 조사: 공식 문서·릴리스·이슈의 같은 화면이나 출력 예시를 코드 블록으로 옮기고 출처를 단다 ③ 그것도 없으면 화면의 구조·숫자를 그림 블록·figure 로 다시 그리고 캡션에 실제 화면이 아니라 구성이라고 밝힌다",
  "셋 다 안 될 때만 그 자리에 `![캡션](/posts/<slug>/todo-<이름>.png)` 를 남기고 못 뜬 이유를 노트에 적는다. 본문에 '캡처 필요' 자리로 보이고, 남아 있으면 발행이 막힌다. 점검은 경로에 `/todo-` 가 있으면 캡처 대기로 보므로, 실제 캡처는 todo- 없는 이름으로 올리고 경로를 바꾼다",
] as const;

/**
 * SVG 그림 양식. 본문에 인라인으로 그려지므로 CSS 변수가 그대로 먹는다.
 * 변수마다 라이트 색을 대체값으로 둬서, 확대 보기처럼 <img> 로 뜰 때도
 * 읽히게 한다.
 */
export const SVG_STYLE = `- 캔버스: \`viewBox="0 0 720 H"\` (H 는 내용만큼, 보통 240~420). width·height 속성은 넣지 않는다. 배경은 투명
- 글꼴: 루트에 \`font-family="inherit"\`. 본문 14px(500), 보조 12px, 강조 15px(600). 라벨은 12자 안쪽
- 색은 변수로만, 대체값을 함께:
  - 글자 \`var(--ink, #1c1c1c)\` · 보조 글자 \`var(--ink-muted, #5f5f5d)\`
  - 상자 \`fill="var(--surface-alt, #f1ede2)"\` · 선 \`var(--border-strong, rgba(28,28,28,.4))\`
  - 강조(지금 이야기하는 것) \`var(--callout-tip-glyph, #5d7a46)\` 와 바탕 \`var(--callout-tip-bg, #ecf1e8)\`
  - 두 번째 강조 \`var(--callout-info-glyph, #5a8590)\` / 경고 \`var(--callout-warning-glyph, #9a7a23)\`
- 모양: 상자 \`rx="10"\`, 선 1.5px, 화살표는 \`<marker>\` 하나를 정의해 재사용. 여백 24px 이상, 노드는 6~8개 이하
- 종류: 흐름(왼→오, 번호 배지), 전/후 비교(두 열, 바뀐 칸만 강조색), 버전 타임라인(가로선 위 점), 겹친 상자(계층)
- 그림 하나에 생각 하나. 설명은 캡션과 본문이 한다 — 그림 안에 문장을 쓰지 않는다
- \`<script>\`, \`on*\` 속성, \`<foreignObject>\`, 외부 링크는 넣지 않는다(올릴 때 거절된다)
- 모션: 표기한 것만 움직인다. 묶음 \`<g data-anim="rise">\`, 선 \`data-anim="draw"\`, 점 \`pop\`, 큰 숫자 \`<text>\`(tspan 없이) \`count\`. 순서는 \`style="--i: 1"\`(없으면 문서 순서). 되풀이 경로(점선)는 \`data-loop="orbit"\`, 지금 이야기하는 도형 하나는 \`data-loop="pulse"\`. \`transform\` 속성이 있는 요소는 rise·pop 대신 나타나기만 하므로 움직일 묶음은 좌표로 놓는다

\`\`\`svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 200" font-family="inherit">
  <defs>
    <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto">
      <path d="M0,0 L10,5 L0,10 z" fill="var(--ink-muted, #5f5f5d)"/>
    </marker>
  </defs>
  <g data-anim="rise">
    <rect x="24" y="70" width="180" height="60" rx="10" fill="var(--surface-alt, #f1ede2)" stroke="var(--border-strong, rgba(28,28,28,.4))" stroke-width="1.5"/>
    <text x="114" y="105" text-anchor="middle" font-size="14" font-weight="500" fill="var(--ink, #1c1c1c)">tool.call</text>
  </g>
  <line data-anim="draw" x1="204" y1="100" x2="270" y2="100" stroke="var(--ink-muted, #5f5f5d)" stroke-width="1.5" marker-end="url(#arrow)"/>
  <g data-anim="rise">
    <rect data-loop="pulse" x="272" y="70" width="180" height="60" rx="10" fill="var(--callout-tip-bg, #ecf1e8)" stroke="var(--callout-tip-glyph, #5d7a46)" stroke-width="1.5"/>
    <text x="362" y="105" text-anchor="middle" font-size="14" font-weight="600" fill="var(--ink, #1c1c1c)">사용자 mod</text>
  </g>
</svg>
\`\`\``;

/** 그림 블록 문법(lib/diagram.ts). 사람과 실행기가 같이 본다. */
export const DIAGRAM_SYNTAX = String.raw`코드 펜스 언어를 아래 종류로 쓰면 그림이 된다. 머리 줄 ${"`caption: …`"} 은 그림 아래 캡션. 줄 끝 ${"`*`"} 는 강조, ${"`~`"} 는 흐리게(예정·선택). 칸은 ${"`|`"} 로 가른다. 칸 줄 바로 아래 ${"`> 내용`"} 은 장면(아래)의 단계 설명이고, 장면이 아닌 그림에서는 그려지지 않는다. 문법이 틀리면 코드로 보이고 점검에서 경고가 난다.

- flow — 한 방향 단계. ${"`제목 | 설명`"}. 2~8단계, 제목 24자
- cycle — 되풀이되는 고리. ${"`제목 | 설명`"}, 머리 ${"`center: 가운데 글`"}. 3~6단계, 제목 14자
- compare — 전/후. 머리 ${"`| 이전 | 이후`"}, ${"`항목 | 이전 | 이후`"}. 10줄
- matrix — 기능 × 대상. 머리 ${"`| A | B | C`"}, ${"`항목 | o | x | △`"}(글자도 됨). 5열, 12줄
- timeline — 시점별 사건. ${"`시점 | 일어난 일`"}. 2~10줄
- sequence — 주고받는 순서. 머리 ${"`actors: A, B, C`"}, ${"`A -> B | 내용`"}(응답은 ${"`-->`"}, 혼자 하는 일은 ${"`A -> A`"}). 참여자 2~5, 12줄
- layers — 포함(바깥→안) / 우선순위. ${"`제목 | 설명`"}, 머리 ${"`layout: stack`"} 이면 위가 먼저인 층. 5겹 / 8층
- tree — 파일·계층. 들여쓰기 두 칸이 한 단계, ${"`이름 | 설명`"}. ${"`폴더/`"}·${"`파일.ts`"} 는 아이콘이 붙는다. 40칸, 6단계
- stats — 핵심 숫자. ${"`값 | 설명 | 출처(선택)`"}, 값에 ${"`14회 → 2회`"} 처럼 변화. 6개
- bars — 수치 비교. ${"`이름 | 숫자 | 표시(선택)`"}, 머리 ${"`unit: 회`"}. 2~10줄
- 장면 — timeline·bars 에 머리 ${"`scene: on`"}. 화면에 붙는 무대가 스크롤 박자마다 다음 단계로 넘어가 멈춘다. timeline 은 시점마다 바로 아래 ${"`> 설명`"}(2~6줄). bars 는 ${"`step: 단계 이름`"} 줄마다 바로 아래 ${"`> 설명`"} 과 그 단계의 값을 쓴다. 머리 ${"`parts: 조각1, 조각2`"} 면 값을 ${"`이름 | 2.00 + 0.02`"} 처럼 조각 합으로, ${"`ratio: A ÷ B`"} 면 첫 행 ÷ 둘째 행을 크게 보인다. ${"`unit: $`"} 처럼 통화 기호는 숫자 앞에 붙는다. 뒤 단계에서 빠진 행은 앞 값을 쓰고, ${"`step: 이름 | zoom`"} 이면 축을 그 단계 값에 맞게 당긴다. 2~5단계, 행 6개. 설명의 ${"`**굵게**`"} 는 형광펜이 칠해진다

${"````"}
${"```"}flow
caption: tool.call 이벤트가 mod 체인을 지나는 순서
tool.call | 도구 호출 이벤트
sec-default | 내장 가드
사용자 mod | 직접 설치 *
기본 동작 | 설정 훅 → 권한 → 실행 ~
${"```"}

${"```"}sequence
caption: 권한이 필요한 도구 호출이 처리되는 순서
actors: 사용자, Claude, 분류기
사용자 -> Claude | 테스트 고쳐 줘
Claude -> 분류기 | 이 명령 실행해도 되나? *
분류기 --> Claude | 안전함
Claude --> 사용자 | 테스트 통과
${"```"}

${"```"}bars
caption: 500K 토큰 세션에서 요청 한 번의 비용
scene: on
unit: $
parts: 쌓인 대화 500K, 새 입력 5K, 출력 2K
ratio: Opus ÷ Sonnet
step: 캐시가 없으면
> 전부 입력 단가로 냅니다. Opus 5.5는 **$2.06**, Sonnet 5.5는 **$1.03**입니다.
Opus 5.5 | 2.00 + 0.02 + 0.04
Sonnet 5.5 | 1.00 + 0.01 + 0.02
step: 캐시가 맞으면
> 앞부분 500K가 캐시 읽기 단가로 바뀌어 **$0.16 대 $0.13**이 됩니다.
Opus 5.5 | 0.10 + 0.02 + 0.04
Sonnet 5.5 | 0.10 + 0.01 + 0.02
step: 줄어든 막대를 키워 보면 | zoom
> 쌓인 대화 몫 $0.10은 두 모델이 같습니다.
${"```"}

${"```"}layers
caption: 같은 설정이 겹칠 때 이기는 순서
layout: stack
관리형 설정 | 회사 정책 *
프로젝트 | .claude/settings.json
사용자 | ~/.claude/settings.json
${"```"}

${"```"}stats
caption: auto mode 전환 뒤 달라진 숫자
14회 → 2회 | 세션당 권한 확인 *
2.1.283 | 기본값이 된 버전
${"```"}
${"````"}`;

/** ```figure 디자인 키트. 허용 목록은 lib/html-figure.ts. */
export const FIGURE_KIT = String.raw`그림 블록으로 안 되는 구성(두 갈래로 나뉘는 흐름, 숫자 카드와 흐름을 한 그림에, 화면 배치 설명 등)만 ${"```figure"} 로 쓴다. 조합은 자유, 생김새는 키트가 정한다.

- 태그: div span p ul ol li strong em code kbd mark small br hr table thead tbody tr th td details summary. 링크·이미지·스크립트·SVG 는 지워진다
- class: ${"`fig-`"} 로 시작하는 것만 남는다. style: 배치(display, grid-template-columns, gap, flex, width, text-align, margin-top 등)만 남고 색·글꼴·위치는 지워진다. 지워진 게 있으면 점검에서 경고
- 배치: ${"`fig-flow`"}(가로 흐름, 좁으면 세로) ${"`fig-row`"} ${"`fig-col`"} ${"`fig-grid-2|3|4`"} ${"`fig-center`"}
- 상자: ${"`fig-box`"} + ${"`fig-accent`"}(강조) ${"`fig-muted`"}(점선) ${"`fig-info`"} ${"`fig-warn`"}
- 글자: ${"`fig-label`"}(작은 머리말) ${"`fig-title`"} ${"`fig-sub`"} ${"`fig-big`"}(큰 숫자) ${"`fig-mono`"}
- 조각: ${"`fig-arrow`"}(→, ${"`fig-down`"} 이면 ↓) ${"`fig-num`"}(번호) ${"`fig-chip`"} ${"`fig-dot`"} ${"`fig-ok`"} ${"`fig-no`"} ${"`fig-part`"} ${"`fig-bar`"}(style ${"`--v: 70%`"})
- 모션: 키트가 기본을 갖는다(상자·행 올라오기, 화살표 그려지기, 막대 자라기, 배지·체크 튀어나오기, ${"`fig-big`"} 숫자 세기, 강조 상자 숨쉬기). 바꿀 때만 ${"`data-anim=\"rise|fade|pop|draw|draw-back|grow|count|roll|none\"`"}(${"`roll`"} 은 숫자가 자리마다 굴러 멈춘다, 핵심 숫자 하나에만), 반복은 ${"`data-loop=\"pulse|orbit\"`"}, 순서는 style ${"`--i: 2`"}, 세기 시작 값은 ${"`data-from=\"14\"`"}. 다른 값은 지워진다

${"````"}
${"```"}figure
caption: 분류기가 명령을 두 갈래로 나누는 방식
<div class="fig-flow">
  <div class="fig-box"><span class="fig-label">입력</span><span class="fig-title">셸 명령</span></div>
  <span class="fig-arrow"></span>
  <div class="fig-box fig-accent"><span class="fig-label">판단</span><span class="fig-title">분류기</span><span class="fig-sub">위험한 것만 묻기</span></div>
  <span class="fig-arrow"></span>
  <div class="fig-col" style="flex: 1">
    <div class="fig-box"><span class="fig-ok">바로 실행</span></div>
    <div class="fig-box fig-muted"><span class="fig-part">사용자에게 확인</span></div>
  </div>
</div>
${"```"}
${"````"}`;

/** 권장 흐름. 이름은 흐름일 뿐 소제목으로 쓰지 않는다. */
export const OUTLINE = [
  ["들어가기", "요약 박스(산문) 뒤에 왜 지금 읽을 만한지 한 문단"],
  ["달라진 점", "무엇이 어떻게 바뀌었는지 문단으로, 필요하면 비교 표 하나와 흐름 그림"],
  ["써 보기", "활용 예 두세 개와 따라 할 최소 예제 하나. 명령·코드·화면 캡처를 이야기 흐름 안에"],
  ["배경", "PR·이슈·문서에서 읽은 이유와 제약"],
  ["맺음", "한 문단: 조심할 점이나 남은 의문"],
] as const;

/** 개념 글의 권장 흐름. */
export const CONCEPT_OUTLINE = [
  ["들어가기", "요약 박스(산문) 뒤에 이 개념이 헷갈리는 실제 장면 하나(면접 질문, 코드 리뷰, 버그)"],
  ["한 줄 정의", "각 개념을 한 문장으로. 비유는 하나만, 정의 바로 뒤에"],
  ["갈리는 지점", "무엇이 같고 어디서 갈리는지. 비교 표 하나와 흐름·구조 그림"],
  ["코드로 보기", "같은 일을 두 방식으로 쓴 짧은 코드. 언어는 독자가 가장 많이 쓰는 것으로(예: Java·Spring, JavaScript)"],
  ["자주 하는 오해", "Stack Overflow 상위 질문 같은 실제 오해 두세 개와 바로잡는 근거"],
  ["맺음", "한 문단: 언제 무엇을 고르면 되는지"],
] as const;

/** 사람과 모델이 같이 읽는 기준 문서. MCP 가 그대로 내보낸다. */
const TITLE_EXAMPLES: Record<PostKind, string> = {
  release: `- 나쁨: auto mode 가 기본값이 됐다 / Claude Code Mods 정리: next(e)로 이어지는 미들웨어
- 좋음: Claude Code가 권한을 묻지 않게 된 이유 / 플러그인이 미들웨어가 된 Claude Code Mods`,
  concept: `- 나쁨: MVC 패턴 완벽 정리 / JWT란?: 개념부터 활용까지
- 좋음: MVC와 MVVM은 어디서 갈리나 / JWT를 쓰면 왜 로그아웃이 어려운가`,
};

/** 사람과 모델이 같이 읽는 기준 문서. 종류마다 제목 예시·구성·흐름만 다르다. */
export function guide(kind: PostKind = "release"): string {
  const outline = kind === "concept" ? CONCEPT_OUTLINE : OUTLINE;
  return `# ${kind === "concept" ? "개념" : "릴리스"} 글 쓰기 기준

## 문체
${VOICE_RULES.map((v) => `- ${v}`).join("\n")}

제목 예시
${TITLE_EXAMPLES[kind]}

## 설명 (목표: 처음 읽는 사람이 한 번에 이해)
${CLARITY_RULES.map((v) => `- ${v}`).join("\n")}

## 모양
${FORMAT_RULES.map((v) => `- ${v}`).join("\n")}

## 그림
${VISUAL_RULES.map((v) => `- ${v}`).join("\n")}

배치 예시 (설명 문단 바로 다음 줄, 앞뒤 빈 줄)

\`\`\`
체인의 순서는 mod의 출처로 정해집니다. 바깥에 있는 mod가 이벤트를 먼저 보고 결과를 마지막에 봅니다.

![tool.call 이벤트가 mod 체인을 지나는 순서](/posts/claude-code-mods/mod-chain.svg)

관리형 설정의 훅은 이 체인보다 먼저 실행됩니다.
\`\`\`

직접 뜬 화면 예시 (blog-capture 의 capture.mjs 로 만든 SVG)

\`\`\`
직접 v2.1.292에서 \`/model\`을 열어 보니 첫 행이 "Default (recommended) Opus 5.5"였습니다.

![v2.1.292 /model 선택기의 기본 행(Opus 5.5)](/posts/claude-code-opus-sonnet-5-5-pricing-1m/model-picker.svg)
\`\`\`

캡처 자리 예시 (직접 뜨기·자료 조사·다시 그리기가 모두 안 될 때만)

\`\`\`
예제 mod를 띄우면 스피너 옆에 도구 호출 수가 붙습니다.

![도구 호출 수가 붙은 스피너](/posts/claude-code-mods/todo-spinner.png)
\`\`\`

### 그림 블록 문법
${DIAGRAM_SYNTAX}

### figure 블록(디자인 키트 HTML)
${FIGURE_KIT}

### SVG 그림 양식
${SVG_STYLE}

## 피할 표현
${AVOID.map((a) => `- ${a.label} → ${a.hint}`).join("\n")}

## 구성 (필수)
${PARTS[kind].map((p) => `- ${p.label}: ${p.how}`).join("\n")}

## 권장 흐름 (소제목 이름이 아니다)
${outline.map(([h, d], i) => `${i + 1}. ${h} — ${d}`).join("\n")}
`;
}

export const GUIDE = guide("release");

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

export function checkVoice(post: VoiceInput, kind: PostKind = "release"): VoiceReport {
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

  // 그림 — 캡션, 캡처 자리.
  const figures = [...post.body.matchAll(/^!\[([^\]]*)\]\(([^)\s]+)\)(?:\{[A-Za-z0-9]+\})?\s*$/gm)];
  for (const f of figures) {
    const [, alt, src] = f;
    const line = post.body.slice(0, f.index).split("\n").length;
    if (!alt.trim()) {
      issues.push({ rule: "figure-no-caption", severity: "warning", line, message: `그림에 캡션이 없습니다. alt 자리에 40자 안팎 명사구로: ${src}` });
    } else if (alt.length > 60) {
      issues.push({ rule: "figure-long-caption", severity: "warning", line, message: `캡션이 깁니다(${alt.length}자). 그림이 보여 주는 것만 40자 안팎으로: "${excerpt(alt)}"` });
    }
  }
  // 그림 블록 — 문법 오류, 캡션.
  const diagrams = findDiagrams(post.body);
  for (const d of diagrams) {
    if (d.result.errors.length) {
      issues.push({ rule: "diagram-error", severity: "warning", line: d.line, message: `\`\`\`${d.kind} 블록을 그릴 수 없습니다: ${d.result.errors.join(" / ")}` });
      continue;
    }
    const cap = d.result.diagram?.caption ?? "";
    if (!cap) {
      issues.push({ rule: "figure-no-caption", severity: "warning", line: d.line, message: `\`\`\`${d.kind} 블록에 캡션이 없습니다. 첫 줄에 \`caption: …\` 을 40자 안팎으로` });
    } else if (cap.length > 60) {
      issues.push({ rule: "figure-long-caption", severity: "warning", line: d.line, message: `캡션이 깁니다(${cap.length}자). 40자 안팎으로: "${excerpt(cap)}"` });
    }
  }
  const drawn = diagrams.filter((d) => d.result.diagram);

  // figure 블록 — 거른 것, 캡션.
  const htmlFigures = findFences(post.body).filter((f) => f.lang === "figure" && !f.file);
  for (const f of htmlFigures) {
    const fig = parseFigureHtml(f.source);
    if (fig.dropped.length) {
      issues.push({ rule: "figure-dropped", severity: "warning", line: f.line, message: `figure 블록에서 지워진 것: ${fig.dropped.slice(0, 8).join(", ")}. fig-* 클래스와 배치 style 만 씁니다` });
    }
    if (!fig.html.trim()) {
      issues.push({ rule: "figure-empty", severity: "warning", line: f.line, message: "figure 블록이 비었습니다" });
    } else if (!fig.caption) {
      issues.push({ rule: "figure-no-caption", severity: "warning", line: f.line, message: "figure 블록에 캡션이 없습니다. 첫 줄에 `caption: …` 을 40자 안팎으로" });
    } else if (fig.caption.length > 60) {
      issues.push({ rule: "figure-long-caption", severity: "warning", line: f.line, message: `캡션이 깁니다(${fig.caption.length}자). 40자 안팎으로: "${excerpt(fig.caption)}"` });
    }
  }

  const captures = figures.filter((f) => /\/todo-[^/]*$/.test(f[2]));
  if (captures.length) {
    issues.push({
      rule: "capture-pending",
      // 초안·점검 단계에서는 참고. 발행 단계에서 막는다(release-topics).
      severity: "info",
      message: `캡처 자리 ${captures.length}곳이 남았습니다: ${captures.map((f) => f[1] || f[2]).join(", ")}`,
    });
  }
  post.body.split("\n").forEach((l, i) => {
    if (/^>\s?\[!(NOTE|INFO|TIP|WARNING)\]\s*(스크린샷|캡처|사진)/.test(l) || /^>\s*(스크린샷|캡처)\s*[:：]/.test(l)) {
      issues.push({
        rule: "capture-box",
        severity: "warning",
        line: i + 1,
        message: "캡처 자리를 박스로 표시했습니다. 그 자리에 `![캡션](/posts/<slug>/todo-<이름>.png)` 를 넣으세요",
      });
    }
  });

  // 분량 — 그림·코드를 뺀 산문만 센다.
  const prose = post.body
    .replace(/^(```|~~~)[\s\S]*?^\1\s*$/gm, "")
    .replace(/^!\[.*$/gm, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/\]\([^)]*\)/g, "]")
    .replace(/\s+/g, " ")
    .trim().length;
  if (prose > PROSE_MAX) {
    issues.push({
      rule: "too-long",
      severity: "warning",
      message: `분량이 깁니다(그림·코드 뺀 산문 ${prose.toLocaleString("ko-KR")}자). 3,000자 안팎으로 줄이세요`,
    });
  }

  // 배포일 — 요약 박스의 버전마다 `(YYYY년 M월 D일 배포)`. 버전이 없는 발표면 날짜 하나는 있어야 한다.
  // 개념 글은 보지 않는다.
  const bodyLines = post.body.split("\n");
  const boxAt = bodyLines.findIndex((l) => /^>\s?\[!(INFO|NOTE|TIP)\]/.test(l));
  if (kind === "release" && boxAt >= 0 && boxAt < 15) {
    let end = boxAt;
    while (end + 1 < bodyLines.length && /^>/.test(bodyLines[end + 1])) end++;
    const box = bodyLines.slice(boxAt, end + 1).join(" ");
    // 같은 버전이 여러 번 나오면 한 곳에만 붙어 있으면 된다.
    const versions = [...new Set(box.match(/v\d+(?:\.\d+)+/g) ?? [])];
    const esc = (v: string) => v.replace(/\./g, "\\.");
    const undated = versions.filter((v) => !new RegExp(`${esc(v)}\\s?\\(\\d{4}년 \\d{1,2}월 \\d{1,2}일 배포\\)`).test(box));
    if (undated.length || (!versions.length && !/\d{4}년 \d{1,2}월 \d{1,2}일/.test(box))) {
      issues.push({
        rule: "missing-release-date",
        severity: "warning",
        line: boxAt + 1,
        message: undated.length
          ? `요약 박스의 ${undated.join(", ")} 에 실제 배포일이 없습니다. \`v2.1.280(2026년 9월 23일 배포)\` 꼴로 붙이세요(글감의 released)`
          : "요약 박스에 실제 배포일이 없습니다. 발표·배포 날짜를 `2026년 9월 23일` 꼴로 쓰세요",
      });
    }
  }

  // 구성 — 필수 요소.
  const head = post.body.split("\n").slice(0, 15).join("\n");
  const parts = {
    "summary-box": /^>\s?\[!(INFO|NOTE|TIP)\]/im.test(head),
    table: /^\s*\|.*\|\s*\n\s*\|\s*:?-{3,}/m.test(post.body) || drawn.some((d) => d.kind === "compare" || d.kind === "matrix"),
    // 캡처 자리(todo-)는 그림으로 치지 않는다.
    visual: drawn.length > 0 || htmlFigures.length > 0 || figures.some((f) => !/\/todo-[^/]*$/.test(f[2])),
    // 개념 글은 표준·공식 문서 주소가 제각각이라 링크가 있으면 된다.
    source:
      kind === "concept"
        ? /(?<!!)\[[^\]]*\]\(https?:\/\//.test(post.body.replace(/^(```|~~~)[\s\S]*?^\1\s*$/gm, ""))
        : /https?:\/\/(github\.com|docs\.|code\.claude\.com|[^\s)]*anthropic\.com)/.test(post.body),
  };
  for (const p of PARTS[kind]) {
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
