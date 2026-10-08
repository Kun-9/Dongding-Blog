---
name: blog-figures
description: dongding 블로그 글 본문에 그림을 넣는 방법 — 그림 블록 10종(```flow·cycle·compare·matrix·timeline·sequence·layers·tree·stats·bars), ```figure 디자인 키트 HTML, SVG 의 문법과 고르는 기준, 그림 애니메이션 표준(data-anim·data-loop, Motion). 블로그 글(특히 릴리스 글)을 쓰거나 고치다가 흐름·비교·구조·숫자를 그림으로 보여 줘야 할 때, 그림에 애니메이션을 넣거나 고칠 때, 또는 점검에서 diagram-error·figure-dropped·figure-no-caption 경고가 났을 때 쓴다.
---

# 블로그 그림 넣기

본문(markdown)에 그림을 넣는 세 가지 방법이 있다. 앞 단계로 되면 뒤로 가지 않는다.

1. **그림 블록** — 코드 펜스 언어로 종류를 고르고 내용만 줄로 쓴다. 모양·테마 색·모바일 배치·등장 애니메이션은 블로그가 정한다. 대부분 여기서 끝난다.
2. **```figure** — 그림 블록으로 안 되는 구성(두 갈래로 나뉘는 흐름, 숫자 카드와 흐름을 한 그림에 등)만. `fig-*` 키트 클래스를 조합한 HTML.
3. **SVG** — 위 둘로도 안 되는 모양만. 올려서 `![캡션](/posts/<slug>/<이름>.svg)` 로 넣는다. 양식은 쓰기 기준(GUIDE)의 "SVG 그림 양식".

구현 위치: 파서 `src/lib/diagram.ts`, 렌더 `src/components/prose/Diagram.tsx`·`diagram/*`, figure 필터 `src/lib/html-figure.ts`, 키트 CSS `src/app/globals.css`(`.fig-*`), 모션 `src/lib/figure-motion.ts`·`diagram/Motion.tsx`, 점검 `src/lib/voice.ts`.

## 공통 규칙

- 그림은 그 내용을 설명하는 문단 **바로 다음**에, 앞뒤 빈 줄. 그림만 모은 섹션은 만들지 않는다.
- 첫 줄 `caption: …` 이 그림 아래 캡션이 된다. 그림이 보여 주는 것을 **40자 안팎 명사구**로. 없으면 점검 경고.
- 줄 끝 ` *` = 강조(지금 이야기하는 것), ` ~` = 흐리게(점선, 예정·선택). 강조는 그림마다 한두 곳만.
- 칸은 `|` 로 가른다. 첫 칸이 제목, 뒤는 짧은 설명.
- 그림 하나에 생각 하나. 칸 글자는 몇 단어로, 설명 문장은 본문이 한다.
- 문법이 틀리면 그림 대신 코드 블록으로 보이고 점검에 `diagram-error` 가 뜬다. 메시지에 고칠 곳이 적혀 있다.
- ` ```flow:파일명 ` 처럼 파일명을 붙이면 그림이 아니라 코드 블록이다.

## 어떤 종류를 고르나

| 보여 줄 것 | 종류 |
| --- | --- |
| 한 방향으로 진행되는 단계 | `flow` |
| 되풀이되는 고리(루프) | `cycle` |
| 이전/이후, 버전 전후 | `compare` |
| 기능 × 대상(요금제·OS·모드)의 지원 여부 | `matrix` |
| 버전·날짜별로 일어난 일 | `timeline` |
| 여러 참여자가 주고받는 순서 | `sequence` |
| 포함 관계(바깥이 안쪽을 감쌈) / 우선순위 층 | `layers` |
| 파일 구조, 계층 | `tree` |
| 핵심 숫자 몇 개 | `stats` |
| 수치 크기 비교 | `bars` |

글 전체에서 같은 종류만 반복하지 말고 내용에 맞게 섞는다. 비교는 `compare`·`matrix` 가 비교 표 요건도 채운다.

## 종류별 문법

### flow — 2~8단계, 제목 24자
네 단계까지는 넓은 화면에서 가로, 그 이상이거나 모바일이면 세로. 번호 배지가 붙는다.

````
```flow
caption: tool.call 이벤트가 mod 체인을 지나는 순서
tool.call | 도구 호출 이벤트
sec-default | 내장 가드
사용자 mod | 직접 설치 *
기본 동작 | 설정 훅 → 권한 → 실행 ~
```
````

### cycle — 3~6단계, 제목 14자
넓은 화면은 타원 고리(시계 방향), 모바일은 목록 + "다시 1단계로". `center:` 는 고리 가운데 글.

````
```cycle
caption: 에이전트가 한 작업을 끝낼 때까지 도는 고리
center: agent loop
생각 | 다음 할 일 고르기
도구 호출 | 파일 읽기·명령 실행 *
결과 확인 | 출력 읽기
판단 | 끝났나?
```
````

### compare — 10줄
머리 줄 `| 이전 | 이후`(열 이름은 바꿔도 됨), 아래는 `항목 | 이전 | 이후` 세 칸. 같은 값은 "그대로"로 보인다.

````
```compare
caption: 2.1.283 전후의 기본 권한 동작
| 이전 | 이후
기본 모드 | default | auto *
셸 명령 | 매번 확인 | 위험할 때만 확인
관리형 설정 | 우선 | 우선
```
````

### matrix — 5열, 12줄
머리 줄 `| A | B | C` 필수. 칸: `o`·`✓`·`있음` = 지원, `x`·`-`·`없음` = 미지원, `△`·`일부` = 일부. 그 밖의 글자는 그대로 표시.

````
```matrix
caption: 요금제별로 쓸 수 있는 기능
| Free | Pro | Team
auto mode | x | o | o *
관리형 설정 | x | △ | o
사용 한도 | 낮음 | 보통 | 높음
```
````

### timeline — 2~10줄
`시점 | 일어난 일`. 다섯 개까지는 넓은 화면에서 가로 띠.

````
```timeline
caption: auto mode가 기본값이 되기까지
v2.1.200 | 실험 기능으로 추가
v2.1.283 | 기본값으로 전환 *
다음 | 끄는 옵션 예정 ~
```
````

### sequence — 참여자 2~5(이름 16자), 12줄, 내용 40자
`actors:` 로 순서를 정한다(없으면 나온 순서). `A -> B | 내용`, 응답은 `-->`(점선), 혼자 하는 일은 `A -> A`. 참여자가 넷 이상이면 모바일에서 번호 목록이 된다.

````
```sequence
caption: 권한이 필요한 도구 호출이 처리되는 순서
actors: 사용자, Claude, 분류기
사용자 -> Claude | 테스트 고쳐 줘
Claude -> 분류기 | 이 명령 실행해도 되나? *
분류기 --> Claude | 안전함
Claude -> Claude | 명령 실행
Claude --> 사용자 | 테스트 통과
```
````

### layers — 포함 5겹 / 층 8개, 제목 28자
기본은 겹친 상자(첫 줄이 가장 바깥). `layout: stack` 이면 위가 우선인 층.

````
```layers
caption: 같은 설정이 겹칠 때 이기는 순서
layout: stack
관리형 설정 | 회사 정책 *
프로젝트 | .claude/settings.json
사용자 | ~/.claude/settings.json
```
````

### tree — 40칸, 6단계
들여쓰기 두 칸이 한 단계(탭도 됨). `├──`·`└──` 아스키 트리와 `- ` 불릿도 읽는다. `폴더/` 와 `파일.ts` 는 아이콘과 고정폭 글꼴이 붙는다.

````
```tree
caption: mod 하나의 파일 구조
my-mod/
  plugin.json | 이름·버전·권한
  hooks/
    tool-call.ts | tool.call 가로채기 *
  README.md ~
```
````

### stats — 6개, 값 14자
`값 | 설명 | 출처(선택)`. 값에 `14회 → 2회` 처럼 쓰면 앞 값은 취소선으로 작게.

````
```stats
caption: auto mode 전환 뒤 달라진 숫자
14회 → 2회 | 세션당 권한 확인 *
0.4% | 분류기가 막은 비율 | 내부 측정
```
````

### bars — 2~10줄, 이름 20자
`이름 | 숫자 | 표시(선택)`. `unit:` 은 숫자 뒤에 붙는 단위. 가장 큰 값이 막대 끝.

````
```bars
caption: 세션당 권한 확인 횟수
unit: 회
default 모드 | 14
auto 모드 | 2 *
bypass | 0 | 0회(확인 없음) ~
```
````

## ```figure — 디자인 키트 HTML

조합은 자유, 생김새는 키트가 정한다. 렌더 전에 허용 목록으로 다시 쓴다.

- **태그**: div span p ul ol li strong em b i code kbd mark small sub sup br hr table thead tbody tr th td details summary. 링크·이미지·스크립트·svg·iframe 은 지워진다.
- **class**: `fig-` 로 시작하는 것만 남는다. Tailwind 클래스는 지워진다.
- **style**: 배치 속성만 — display, grid-template-columns/rows, grid-column/row, gap, flex 계열, align/justify 계열, text-align, width·height 계열, margin-top/bottom/inline(음수 불가), padding, order, `--v`, `--i`. 색·글꼴·배경·테두리·position 은 지워진다.
- 지워진 것이 있으면 점검에 `figure-dropped` 경고와 목록이 뜬다. 키트 클래스로 바꾼다.
- 30,000자까지. 첫 줄 `caption: …` 은 다른 그림과 같다.

### 키트 클래스

| 분류 | 클래스 |
| --- | --- |
| 배치 | `fig-flow`(가로 흐름, 640px 아래는 세로 + 화살표 회전) `fig-row`(줄바꿈 되는 가로) `fig-col`·`fig-stack`(세로) `fig-grid-2`·`fig-grid-3`·`fig-grid-4`(좁으면 2열→1열) `fig-center` `fig-gap-lg` |
| 상자 | `fig-box` + `fig-accent`(강조) `fig-muted`(점선) `fig-info`(파랑) `fig-warn`(노랑) |
| 글자 | `fig-label`(작은 대문자 머리말) `fig-title`(굵은 제목) `fig-sub`(보조 설명) `fig-big`(큰 숫자) `fig-mono` |
| 조각 | `fig-arrow`(→, `fig-down` 을 더하면 ↓) `fig-num`(번호 배지) `fig-chip`(알약) `fig-dot` `fig-ok`(✓) `fig-no`(–) `fig-part`(반쯤) `fig-bar`(막대, `style="--v: 70%"`, `fig-accent` 면 강조색) |

`code`·`kbd`·`mark`·`table`·`details` 는 클래스 없이도 키트 모양이 입혀진다.

````
```figure
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
<div class="fig-grid-3" style="margin-top: 14px">
  <div class="fig-box"><span class="fig-label">평균 대기</span><span class="fig-big">1.2s</span><span class="fig-bar" style="--v: 30%"></span></div>
  <div class="fig-box fig-accent"><span class="fig-label">자동 승인</span><span class="fig-big">86%</span><span class="fig-bar fig-accent" style="--v: 86%"></span></div>
</div>
```
````

## 애니메이션

그림은 스크롤에 맞춰 조립된다. 그림 위쪽이 화면 아래에 닿으면 시작하고, 그림이 화면에 다 들어오면 완성, 다시 올리면 되감긴다. 라이브러리는 Motion(`motion`, MIT)이고 그림이 있는 글에서만 늦게 불러온다. opacity·transform·clip-path 는 ViewTimeline 이 있는 브라우저에서 네이티브로 돌고, 없는 브라우저(Firefox)와 선 길이·숫자·막대 채움은 Motion 이 스크롤마다 JS 로 맞춘다.

구현: 런타임 `src/lib/figure-motion.ts`, 붙이는 자리 `src/components/prose/diagram/Motion.tsx`(판 `Shell`, 본문 SVG `InlineSvg`), 표기 허용 목록 `src/lib/html-figure.ts`(`ANIMS`·`LOOPS`), 반복 CSS `src/app/globals.css`(`dg-orbit`·`dg-breathe`). 런타임은 움직인 흔적을 되돌리지 않는다. 그림 내용이 바뀌면(스튜디오) 판을 `key` 로 새로 그린다.

### 원칙

1. **움직임은 내용을 따른다.** 순서가 있으면 차례로, 방향이 있는 선은 그 방향으로 그려지고, 크기는 0에서 자라고, 되풀이되는 것만 계속 돈다. 꾸미려고 넣는 모션은 없다.
2. **그림이 화면에 다 들어오면 완성이다.** 더 내려야 완성되는 그림을 만들지 않는다.
3. **최종 상태 = 서버가 그린 그림.** JS 가 없거나, Motion 을 못 불러오거나, 움직임 줄이기 설정이면 처음부터 완성된 그림이 보인다. 그러니 모션 없이도 읽히게 그린다.
4. **움직이는 것은 opacity·transform·clip-path·선 길이·숫자뿐.** 크기·위치·색을 바꿔 레이아웃을 흔들지 않는다.
5. **반복(`data-loop`)은 아껴 쓴다.** 되풀이가 내용인 곳(고리·순환 경로)과 지금 이야기하는 칸에만, 3초 이상 주기로 느리게, 그림이 화면에 있을 때만 돈다. 한 그림에 둘까지.
6. **시간으로 재생하지 않는다.** 자동 재생, 클릭해야 보이는 모션, 끝나기를 기다려야 읽히는 모션은 쓰지 않는다.

### 등장 — `data-anim`

| 값 | 움직임 | 쓰는 곳 |
| --- | --- | --- |
| `rise` | 10px 아래에서 올라오며 나타남 | 칸·카드·행. 기본 |
| `fade` | 제자리에서 나타남 | 다른 것을 감싸는 상자, 점선, 배경 |
| `pop` | 0.6배에서 커지며 나타남 | 점·번호 배지·체크·칩·화살촉 |
| `draw` | 선이 그려짐. HTML 은 긴 쪽 방향(왼→오, 위→아래), SVG 는 경로를 따라 | 연결선·화살표·타임라인 선 |
| `draw-back` | `draw` 의 반대 방향(오→왼, 아래→위) | 되돌아오는 메시지·응답 |
| `grow` | 왼쪽에서 자람 | 막대 |
| `count` | 0(또는 `data-from`)에서 값까지 숫자를 셈 | 큰 숫자. 안에 다른 요소 없이 `86%`·`1.2s`·`2,400건`·`-12%` 처럼 숫자가 하나인 글자만 센다. 다 센 글자가 원문과 같아야 해서 `v2.1.283`·`007` 이나 `<tspan>` 이 든 글자는 나타나기만 한다 |
| `none` | 움직이지 않음 | 키트 기본 모션을 끌 때 |

순서:
- `style="--i: N"` 이 차례다. 같은 값은 함께 움직이고 소수도 된다(연결선은 앞 칸 + 0.5).
- `--i` 가 없으면 가장 가까운 움직이는 조상과 함께 움직인다(칸 안의 배지·숫자는 칸과 함께). 조상도 없으면 문서 순서로 앞 차례 다음.
- 지금 화면 폭에서 안 보이는 요소(넓은 화면용 고리, 좁은 화면용 목록 등)는 차례에서 빠진다.
- 차례 사이 간격은 같다. 칸이 몇 개든 그림 높이만큼 스크롤하는 동안 끝난다.

### 반복 — `data-loop`

| 값 | 움직임 | 쓰는 곳 |
| --- | --- | --- |
| `orbit` | 점선 무늬가 경로 방향으로 천천히 흐름(초당 약 12px) | 고리·순환 경로. `stroke-dasharray` 가 있는 SVG 선에만 |
| `pulse` | 강조 테두리(HTML)나 불투명도(SVG)가 3.2초 주기로 숨 쉼 | 지금 이야기하는 칸 하나 |

### 그림 블록 — 블로그가 정한다

작성자는 아무것도 쓰지 않는다. 종류마다 이렇게 움직인다. 상자로 그려지는 강조(`*`) 칸(flow·cycle·layers·tree·stats)은 화면에 있는 동안 `pulse`.

| 종류 | 모션 |
| --- | --- |
| flow | 칸 rise, 사이 연결선 draw(앞 칸 다음·다음 칸 전), 번호 pop |
| cycle | 고리 fade 뒤 orbit, 칸 rise(시계 방향 순서), 사이 꺾쇠 pop |
| compare | 행 rise, 강조 행의 이후 값 pop |
| matrix | 행 rise, ✓·△ pop |
| timeline | 시점 rise·점 pop, 다음 점까지 선 draw |
| sequence | 참여자 rise, 메시지 차례로 선 draw(보내는 쪽에서 받는 쪽으로, 오른쪽에서 왼쪽이면 draw-back)·화살촉 pop |
| layers | 겹친 상자는 바깥부터 fade, `layout: stack` 은 위부터 rise |
| tree | 위에서 아래로 rise |
| stats | 카드 rise, 값 count(`14회 → 2회` 는 14에서 2로 센다) |
| bars | 행 rise, 막대 grow, 값 count |

새 종류를 만들면 이 표의 어휘 안에서 고르고 칸마다 `data-anim` 과 `step(i)`(`--i`)를 단다. 옛 `.dg-step`·`.dg-grow` 클래스는 없어졌다.

### figure — 키트 기본, 필요할 때만 표기

키트 클래스에는 기본 모션이 있다: `fig-box`·`tr` rise, `fig-arrow` draw(`fig-down` 이면 위→아래), `fig-bar` grow(바탕은 두고 채움만), `fig-num`·`fig-ok`·`fig-no`·`fig-part`·`fig-dot`·`fig-chip` pop, `fig-big` count, `fig-box fig-accent` pulse. 기본과 다르게 할 때만 `data-anim`·`data-loop` 을 달고, 차례는 `style="--i: 2"`, 세기 시작 값은 숫자 `data-from`. 표에 없는 값은 지워지고 점검의 `figure-dropped` 에 `data-anim="spin"` 처럼 값까지 뜬다.

````
```figure
caption: 확인이 필요한 명령만 사용자에게 간다
<div class="fig-flow">
  <div class="fig-box"><span class="fig-title">셸 명령</span></div>
  <span class="fig-arrow"></span>
  <div class="fig-box fig-accent"><span class="fig-title">분류기</span></div>
  <span class="fig-arrow"></span>
  <div class="fig-box fig-muted" data-anim="fade"><span class="fig-part">사용자에게 확인</span></div>
</div>
```
````

### SVG — 표기한 것만 움직인다

- 모양 묶음은 `<g data-anim="rise">`, 선은 `data-anim="draw"`, 점은 `pop`, 큰 숫자 `<text>`(`<tspan>` 없이)는 `count`. 차례는 `style="--i: 1"`(없으면 문서 순서).
- draw 는 선이 그려지면서 함께 나타나므로 `marker-end` 화살촉도 선과 같이 보인다.
- `transform` 속성이 있는 요소에 rise·pop 을 걸면 나타나기만 한다. CSS transform 이 그 자리를 덮어써서 튀기 때문이다. 움직일 묶음은 `transform` 없이 좌표로 놓는다.
- 점선(자기 속성이든 부모 `<g>` 에서 물려받았든)에 draw 를 걸면 나타나기만 한다. 점선을 흐르게 하려면 `data-loop="orbit"`.
- `<style>`·SMIL(`<animate>`)은 쓰지 않는다. 다른 그림과 박자가 어긋나고 움직임 줄이기 설정을 무시한다.

```svg
<g data-anim="rise">
  <rect x="24" y="70" width="180" height="60" rx="10" .../>
  <text x="114" y="105" ...>tool.call</text>
</g>
<line data-anim="draw" x1="204" y1="100" x2="270" y2="100" ... marker-end="url(#arrow)"/>
<g data-anim="rise">
  <rect data-loop="pulse" x="272" y="70" .../>
  <text x="362" y="105" ...>사용자 mod</text>
</g>
<path data-anim="draw" data-loop="orbit" stroke-dasharray="5 6" d="..."/>
```

### 모션을 확인하는 법

- 스튜디오 미리보기에서 그림을 화면 아래부터 천천히 올려 본다. 차례가 내용 순서와 맞는지, 다 들어왔을 때 서버가 그린 그림과 같은지 본다. 다크 모드·좁은 화면도 한 번.
- 브라우저로 재려면 각 그림을 진행 0.02·0.5·1 위치로 스크롤한다(`scrollTo(top - (innerHeight - p * height))`, `scroll-behavior: auto`). 1 에서 `[data-anim]` 이 모두 opacity 1·transform 항등·clip 없음이면 맞다. `window.ViewTimeline` 을 지운 페이지로 한 번 더 재면 Firefox 경로다.
- Motion 에 `transform` 끝값으로 `"none"` 을 주지 않는다. 상대 값의 0 으로 바뀌어 `scale(0.6) → none` 이 `scale(0)` 으로 끝난다. 끝값은 `scale(1)`·`translateY(0px)` 처럼 적는다.

## 실제 화면

스크린샷·캡처가 필요하면 **blog-capture 스킬**을 따른다. 순서는 직접 뜨기(`capture.mjs` 한 줄) → 자료 조사 → 그림으로 다시 그리기이고, 셋 다 안 될 때만 그 자리에 `![캡션](/posts/<slug>/todo-<이름>.png)` 를 남긴다. 본문에 "캡처 필요" 자리로 보이고, 남아 있으면 발행이 막힌다.

## 확인

- 릴리스 글: MCP `check_release_voice`(slug) 또는 실행기 API `check`. 그림 관련 규칙은 `diagram-error`·`figure-dropped`·`figure-empty`·`figure-no-caption`·`figure-long-caption`·`capture-pending`.
- 직접 보려면 스튜디오(`/studio`) 미리보기가 같은 렌더러를 쓴다. 다크 모드와 좁은 화면에서도 한 번 본다.
- 그림 종류·키트·모션 어휘를 바꾸면 이 스킬, `src/lib/voice.ts` 의 `DIAGRAM_SYNTAX`·`FIGURE_KIT`·`SVG_STYLE`, `src/lib/html-figure.ts` 의 `ANIMS`·`LOOPS`, 스튜디오 문법표를 같이 고친다.
