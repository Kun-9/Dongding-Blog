# 점검 규칙 카탈로그

`src/lib/lint.ts` 가 내는 규칙 전체. 규칙 id 는 `check_posts({rule: "..."})` 로
좁혀 볼 수 있다.

규칙은 전부 **자체 파서(`src/lib/markdown.tsx`)가 실제로 어떻게 읽는지**에서 나온다.
GFM 상식이 아니라 이 파서 기준이다. 파서를 고치면 여기도 어긋난다 —
`node scripts/check-lint-rules.mjs` 로 먼저 확인할 것.

## 본문 문법

코드 펜스 안은 규칙을 적용하지 않는다. 인라인 코드(`` `...` ``) 안도 태그·취소선
검사에서 제외된다.

| 규칙 | 심각도 | 무슨 일이 일어나나 | 고치는 법 |
|---|---|---|---|
| `unclosed-fence` | error | 그 줄부터 **글 끝까지 전부 코드 블록**으로 렌더 | 여는 펜스를 안 닫았거나, 위쪽에서 여는 펜스가 빠져 닫는 펜스가 여는 걸로 읽힌 것. 펜스 짝을 다시 셀 것 |
| `nested-list` | error | 들여쓴 리스트는 리스트가 아니라 **단락**이 됨 | 한 단계로 펴거나 H3 로 분할. 번호 리스트의 하위 불릿만 예외 — 들여쓰기 **없이** `- ` |
| `html-tag` | error | `<br>`, `<Callout>` 등이 글자 그대로 출력 | callout 은 `> [!INFO]`, 줄바꿈은 빈 줄 |
| `unknown-callout` | error | `[!DANGER]` 같은 표기가 제목 자리에 그대로 찍힘 | `INFO` / `WARNING` / `TIP` / `NOTE` 4종과 접힌 칸 `MORE` 만 |
| `fold-no-title` | warning | 접힌 칸이 '더 보기'로만 보여 누구에게 필요한지 모름 | `> [!MORE] 창마다 프록시를 다르게 쓴다면` 처럼 제목을 |
| `fold-empty` | warning | 빈 접힌 칸 | 다음 줄부터 `>` 로 이어 쓴다 |
| `fold-content` | warning | 접힌 칸 안 그림·이미지·소제목·카드·박스 — 닫힌 칸에서 크기를 못 재고 목차·짝 번호가 어긋남 | 칸 안은 문단·코드·표·목록만. 나머지는 본문에 |
| `plain-blockquote` | warning | `>` 는 callout 전용 → 제목 없는 INFO 박스가 됨 | 인용이 목적이면 일반 단락으로 |
| `heading-no-space` | warning | `#제목` 은 헤더가 아니라 단락 | `# 제목` |
| `heading-too-deep` | warning | H5 이상은 파서가 처리 안 함 → 단락 | H1–H4 만 |
| `task-list` | warning | `- [x]` 의 `[x]` 가 그대로 보임 | 일반 `- ` 항목 |
| `strikethrough` | warning | `~~` 가 그대로 출력 | 빼거나 다르게 표현 |
| `broken-table` | warning | 표로 인식 안 됨 → 단락 | 헤더 **바로 다음 줄**에 `\|---\|---\|` 구분행 |

> 표, 번호 리스트의 하위 불릿, 문장 안 맨 URL 자동 링크는 **지원된다**. 예전 문서에
> 미지원으로 적혀 있으면 그쪽이 낡은 것이다 — `bare-url` 규칙은 v1.5.0 에서 없어졌다.

## 링크·이미지

`check_posts({checkImages: false})` 로 Storage 조회를 끌 수 있다(느릴 때).

| 규칙 | 심각도 | 뜻 |
|---|---|---|
| `missing-image` | error | `post-images` 버킷에 없는 이미지·```embed HTML |
| `embed-error` | error | ```embed 문법이 틀려 코드 블록으로 보임(src 가 `/posts/<slug>/<이름>.html` 아님, 탭 이름 없는 src 둘 이상, height 범위 밖, 모르는 키) |
| `image-path` | error | 경로가 `/` 로 시작 안 함 |
| `image-path` | warning | `/` 로 시작하지만 `/posts/<slug>/<파일>` 규약이 아님 |
| `image-option` | warning | `{...}` 옵션이 폭(`{xs}`·`{sm}`·`{wide}`·`{240}`)도 열 수(`{1}`~`{4}`)도 아님 → 무시됨 |
| `image-width-legacy` | warning | 옛 표기 `![alt\|480]` → 폭이 아니라 캡션 글자로 새어 나감 |
| `broken-link` | error | 없는 글·카테고리·시리즈·태그를 가리킴 |
| `broken-link` | warning | 사이트에 없는 경로일 수 있음 |
| `dead-anchor` | warning | 이 글에 없는 `#앵커` |
| `missing-post-ref` | error | 링크 카드 줄 `/posts/<slug>` 가 없는 글을 가리킴 → 본문에 "찾을 수 없는 글" 점선 박스가 그대로 나감 |

이미지는 `/posts/<slug>/<파일>` 로 쓴다. 실제 저장소는 Supabase Storage 지만
`next.config` 의 fallback rewrite 가 넘겨준다 — 본문에 Storage URL 을 직접 쓰지 말 것.

앵커 id 는 헤더 텍스트에서 `github-slugger` 로 만들어진다(H1–H4 전부).

## 메타데이터

| 규칙 | 심각도 | 조건 |
|---|---|---|
| `missing-summary` | error / warning | 요약이 빔. 발행 글이면 error |
| `unknown-category` | error | `categories` 에 없는 id → DB FK 가 거부 |
| `unknown-series` | error | `series` 에 없는 id |
| `series-order-missing` | warning | `series` 는 있는데 `seriesOrder` 없음 → 목록 끝으로 밀림 |
| `thin-body` | warning | 발행 글인데 본문 200자 미만 |
| `long-summary` | info | 요약 150자 초과 → 카드에서 잘림 |
| `orphan-series-order` | info | `series` 없이 `seriesOrder` 만 |
| `no-tags` | info | 태그 없음 |
| `future-date` | info | 발행 글의 날짜가 미래 → 목록 맨 위 고정 |
| `no-toc` | info | H2+H3 가 2개 미만 → 목차 사이드바 안 나옴 |

카테고리는 **표시명이 아니라 id**. 예: 알고리즘 풀이 카테고리의 id 는 `algorithm-solve`.
확실하지 않으면 `list_taxonomy` 를 먼저.

## 글 사이 정합

한 편만 봐서는 알 수 없는 것들. `check_posts` 와 `get_post` 응답에 함께 붙는다.

| 규칙 | 심각도 | 뜻 |
|---|---|---|
| `multiple-featured` | warning | 발행 상태 featured 글이 2편 이상 → 홈엔 한 편만 |
| `series-order-duplicate` | warning | 같은 시리즈에서 순서 번호 충돌 |
| `series-order-gap` | info | 시리즈 순서에 빈 번호 |

## 글쓰기 습관

정해진 표현으로 잡히는 것만 본다. 목록은 `src/lib/phrases.ts` 하나이고, 릴리스·개념 글의
`check_release_voice` 는 같은 함수를 warning 으로 돌린다. 직접 쓴 글에는 참고(info)일 뿐이다.

| 규칙 | 심각도 | 뜻 |
|---|---|---|
| `stock-phrase` | info | "결론적으로", "~살펴보겠습니다", "이 글에서는 ~를 정리", "~에 의해" 같은 상투구·번역투, "줄여 옮겼습니다"·"README 예시를 옮겼습니다" 같은 그림 제작 경위, 캡션·alt 끝의 "(v2.1.292 화면을 줄여 다시 그림)"·"(로컬에서 실행)" 같은 제작 경위 괄호(범례·숫자 출처 괄호는 통과), "직접 v2.1.292에서 ~해 보니"의 '직접' 표지 |
| `sequel-intro` | info | 도입부(첫 H2 전, 산문 8줄)가 이전 글을 먼저 읽으라고 하거나, "지난 글에서"·"3편에서" 처럼 링크 없이 가리킴. 같은 줄에서 요약하고 링크를 걸면 통과 |

## 규칙을 추가할 때

1. `src/lib/lint.ts` 에 규칙 추가 — 순수 함수 유지(next·supabase import 금지).
   DB 를 봐야 아는 건 `LintContext` 로 받고, 없으면 그 규칙만 건너뛴다.
2. `scripts/check-lint-rules.mjs` 에 **참(잡아야 함) + 거짓(잡으면 안 됨)** 케이스 둘 다 추가.
   오탐은 정탐 누락보다 나쁘다 — 멀쩡한 글을 고치게 만든다.
3. 이 문서의 표에 추가.
4. `node scripts/check-lint-rules.mjs`
