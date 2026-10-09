---
name: blog-figures
description: dongding 블로그 글 본문에 그림을 넣는 방법 — 그림 블록 10종(```flow·cycle·compare·matrix·timeline·sequence·layers·tree·stats·bars), ```figure 디자인 키트 HTML, SVG 의 문법과 고르는 기준, 그림 애니메이션 표준(data-anim·data-loop, Motion), 장면(`scene: on` — 화면에 붙어 스크롤 박자마다 넘어가는 그림. 그림 블록 전부와 figure, 터미널 화면 재현)과 숫자 굴리기. 블로그 글(특히 릴리스 글)을 쓰거나 고치다가 흐름·비교·구조·숫자를 그림으로 보여 줘야 할 때, 그림에 애니메이션·인터랙션을 넣거나 고칠 때, 또는 점검에서 diagram-error·figure-dropped·figure-no-caption 경고가 났을 때 쓴다.
---

# 블로그 그림 넣기

## 먼저: 그림이 글의 중심이다

이 블로그의 차별점은 그림이다. 처음 읽는 사람이 한 번에 이해하도록, 글에서 이해가 막히는 지점은 문장으로 길게 풀기 전에 그림으로 먼저 보여 준다.

- **어디에:** 바뀐 동작(전/후), 숫자 계산, 순서·흐름, 관계·포함처럼 글로만 읽으면 머릿속에 그려야 하는 곳. 모든 섹션에 넣지는 않는다.
- **최대한 단순하게:** 그림 하나에 생각 하나, 칸 글자는 몇 단어. 꾸밈, 분위기용 그림, 본문과 같은 말을 되풀이하는 그림은 넣지 않는다.
- **움직임이 이해를 돕게:** 칸은 이야기 순서대로 쓴다. 모션이 그 순서로 나타난다. 지금 이야기하는 칸 한두 곳만 강조(`*`)하고, 예정·선택은 흐리게(`~`) 한다. 전/후는 compare, 크기 차이는 bars 처럼 움직임 자체가 변화를 보여 주는 종류를 고른다.
- **확인:** 본문을 가리고 그림과 캡션만 훑어도 섹션의 요점이 읽히는지 본다.

글의 핵심 그림 하나는 장면으로 만든다(아래 "장면"). 단계를 따라 바뀌는 이야기(버전마다 바뀐 것, 계산이 단계마다 달라지는 것)가 장면에 맞는다. 누르는 인터랙션은 없다.

## 넣는 방법

본문(markdown)에 그림을 넣는 세 가지 방법이 있다. 앞 단계로 되면 뒤로 가지 않는다.

1. **그림 블록** — 코드 펜스 언어로 종류를 고르고 내용만 줄로 쓴다. 모양·테마 색·모바일 배치·등장 애니메이션은 블로그가 정한다. 대부분 여기서 끝난다.
2. **```figure** — 그림 블록으로 안 되는 구성(두 갈래로 나뉘는 흐름, 숫자 카드와 흐름을 한 그림에 등)만. `fig-*` 키트 클래스를 조합한 HTML.
3. **SVG** — 위 둘로도 안 되는 모양만. 올려서 `![캡션](/posts/<slug>/<이름>.svg)` 로 넣는다. 양식은 쓰기 기준(GUIDE)의 "SVG 그림 양식".

구현 위치: 파서 `src/lib/diagram.ts`, 렌더 `src/components/prose/Diagram.tsx`·`diagram/*`, figure 필터 `src/lib/html-figure.ts`, 키트·모션·장면 속성 모듈 `src/lib/figure/`(kits·anims·scene-attrs), 모션 런타임 `src/lib/figure-motion.ts`·`diagram/Motion.tsx`, 점검 `src/lib/voice.ts`.

지금 어휘로 그릴 수 없는 그림이면 흉내 내지 말고 **blog-figure-extend** 스킬로 키트·모션·장면 속성을 더한다. 이 문서의 키트·모션·장면 속성 표는 모듈 목록에서 만들어진다(`<!-- figure:… -->` 자리, 손으로 고치지 않는다).

## 공통 규칙

- 그림은 그 내용을 설명하는 문단 **바로 다음**에, 앞뒤 빈 줄. 그림만 모은 섹션은 만들지 않는다.
- 첫 줄 `caption: …` 이 그림 아래 캡션이 된다. 그림이 보여 주는 것을 **40자 안팎 명사구**로. 없으면 점검 경고.
- 줄 끝 ` *` = 강조(지금 이야기하는 것), ` ~` = 흐리게(점선, 예정·선택). 강조는 그림마다 한두 곳만. 왜 그 칸인지가 그림과 캡션만으로 읽혀야 한다. 대등하게 나란한 칸(예제 카드 셋 등) 중 하나만 강조하지 않는다. 독자에게는 이유 없는 하이라이트로 보인다.
- 칸 줄 바로 아래 `> 내용` = 장면의 단계 설명. 장면이 아닌 그림에서는 그려지지 않으니 쓰지 않는다.
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
| 활용 예 두세 개(무엇을 하는지, 화면에 무엇이 뜨는지) | figure 장면으로 화면 재현(아래 "활용 예") |
| 나란한 방법·선택지 두세 개(무엇이 다르고 언제 고르나) | figure 카드: `fig-grid-3` 안에 칸마다 `fig-num`·`fig-title`·`fig-sub`·`fig-chip`. "첫째, 둘째, 셋째"로 문단에 잇지 않는다 |

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

## 장면 — 스크롤 박자마다 넘어가는 그림

그림 블록이나 ```figure 에 머리 줄 `scene: on` 을 쓰면 장면이 된다. 그림과 설명이 화면 가운데 무대로 붙고, 스크롤은 다음 단계로 넘어가라는 신호로만 쓰인다. 단계가 바뀌면 그림이 0.8초 동안 다음 상태로 가서 멈추고, 설명은 아래에서 올라오며 바뀐 뒤 `**굵게**` 부분에 형광펜이 칠해진다. 스크롤을 놓으면 단계 자리에 맞춰 선다. 아래 점 표시줄이 지금 단계와 다음 단계까지 남은 거리를 보여 준다.

- 글마다 한두 개, 이야기의 핵심 그림에만. 나머지는 정지 그림으로 둔다.
- 캡션은 판 안 왼쪽 위 제목이 된다.
- 단계 설명은 한두 문장, 200자까지. 머리말은 시점(timeline)이나 단계 이름(bars)이다. `**굵게**` 는 형광펜, `` `코드` `` 는 코드 글자. 본문 문단을 그대로 옮기지 말고, 그 단계에서 그림이 보여 주는 것을 짚는다.
- 장면 하나는 단계 수만큼 화면 절반씩 스크롤을 차지한다. 단계를 늘리기보다 줄인다.
- 그림마다 단계를 나누는 법이 다르다.

| 그림 | 단계 | 움직임 |
| --- | --- | --- |
| timeline | 시점마다 `>` | 버전 슬라이드가 넘어가고 레일이 찬다 |
| bars | `step:` 줄마다 그 단계의 값 | 막대가 자라고·줄고·축이 당겨진다 |
| flow·cycle·compare·matrix·sequence·layers·tree·stats | `>` 가 달린 칸마다 | 지금 칸이 빛나고, 아직 안 온 칸은 흐리다. 설명 없는 칸은 앞 단계와 함께 나온다 |
| figure | `step:` 줄마다, 요소에 단 `data-step`·`data-on`·`data-v`·`data-text` | 정한 대로 나타나고·강조되고·값과 글자가 바뀐다. 화면 재현 같은 자유 구성 |

### timeline 장면 — 2~6줄

시점마다 바로 아래 `> 설명` 이 필수다. 위에는 버전 슬라이드가 넘어가고(지금 시점이 가운데 크게, 앞뒤는 흐리게 양옆), 아래 레일은 지금 점까지 선이 찬다.

````
```timeline
caption: 별칭과 컨텍스트 기본값이 바뀐 버전
scene: on
v2.1.219 | opus가 Opus 5로
> Max·Team Premium·Enterprise의 기본 모델이 **Opus 5**였던 때입니다.
v2.1.280 | opus가 Opus 5.5로 *
> 9월 23일 배포. `opus` 별칭이 **Opus 5.5**를 가리킵니다.
v2.1.284 | sonnet이 Sonnet 5.5로 *
> 9월 29일 배포. Anthropic API의 `sonnet`이 **Sonnet 5.5**로 바뀌었습니다.
```
````

### bars 장면 — 2~5단계, 행 6개

같은 행들이 단계마다 다른 값을 갖는다. `step: 단계 이름` 줄마다 바로 아래 `> 설명` 과 그 단계의 값을 쓴다. 첫 단계에는 모든 행이 있어야 하고, 뒤 단계에서 빠진 행은 앞 단계 값을 그대로 쓴다.

| 머리 줄 | 뜻 |
| --- | --- |
| `parts: 조각1, 조각2, 조각3` | 값을 `이름 \| 2.00 + 0.02 + 0.04` 처럼 조각 합으로 쓴다. 조각마다 색이 다르고 범례가 붙는다. 없으면 값 하나 |
| `ratio: A ÷ B` | 첫 행 합 ÷ 둘째 행 합을 오른쪽 위에 크게 보인다. 단계가 바뀌면 같이 세어진다 |
| `unit: $` | `$`·`€`·`£`·`¥`·`₩` 는 숫자 앞에, 그 밖의 단위는 뒤에 붙는다 |

- 값이 줄어든 행은 가장 길었던 길이가 점선으로 남는다.
- `step: 이름 | zoom` 이면 축을 그 단계 값에 맞게 당긴다. 줄어서 안 보이던 조각을 크게 보여 줄 때 쓴다. 이때 값 줄은 비워도 된다.
- 조각이 40px 보다 넓으면 안에 금액이 쓰인다.

````
```bars
caption: 500K 토큰 세션에서 요청 한 번의 비용
scene: on
unit: $
parts: 쌓인 대화 500K, 새 입력 5K, 출력 2K
ratio: Opus ÷ Sonnet
step: 캐시가 없으면
> 쌓인 대화까지 전부 입력 단가로 냅니다. Opus 5.5는 **$2.06**, Sonnet 5.5는 **$1.03**입니다.
Opus 5.5 | 2.00 + 0.02 + 0.04
Sonnet 5.5 | 1.00 + 0.01 + 0.02
step: 캐시가 맞으면
> 앞부분 500K가 캐시 읽기 단가로 바뀌어 **$0.16 대 $0.13**이 됩니다.
Opus 5.5 | 0.10 + 0.02 + 0.04
Sonnet 5.5 | 0.10 + 0.01 + 0.02
step: 줄어든 막대를 키워 보면 | zoom
> 쌓인 대화 몫 $0.10은 두 모델이 같습니다. 차이는 **$0.03**뿐입니다.
```
````

### 그 밖의 그림 블록 장면 — 설명이 달린 칸이 단계

flow·cycle·compare·matrix·sequence·layers·tree·stats 는 `>` 설명이 달린 칸마다 한 단계다(2~8단계). 그림 모양은 정지 그림과 같고, 지금 칸이 빛나며 커지고 아직 안 온 칸은 흐리다.

````
```flow
caption: tool.call 하나가 지나는 순서
scene: on
tool.call | 도구 호출 이벤트
> Claude가 도구를 부르면 **tool.call** 이벤트가 생깁니다.
sec-default | 내장 가드
> 조직 설정이 있으면 **내장 가드**가 먼저 봅니다.
사용자 mod | 직접 설치 *
> 내가 설치한 mod가 **next를 부를지** 정합니다.
```
````

### figure 장면 — 요소마다 단계를 적는 자유 구성

정해진 그림 블록으로 안 되는 장면(실제 화면 재현, 값이 단계마다 바뀌는 구성)은 ```figure 로 짠다. HTML 앞 머리 줄에 `scene: on`, 단계마다 `step: 이름` 과 바로 아래 `> 설명`(2~8단계)을 쓰고, 요소에 단계를 적는다. 단계는 1부터 센다.

<!-- figure:scene-attrs -->
| 속성 | 뜻 |
| --- | --- |
| `data-step="2"` | 2단계에 나타나 끝까지 남는다. `"2-3"` 은 2~3단계에만 보인다 |
| `data-on="2:accent\|3+:dim"` | 그 단계에 상태를 입힌다: `accent`·`dim`·`hide`·`strike`(빛남·흐림·숨김·취소선). `2` 는 그 단계만, `3+` 는 3부터, `2-3` 은 범위 |
| `data-v="1:90%\|2:12%"` | 단계마다 `--v` 를 바꾼다(`fig-bar` 길이). 그 단계까지 마지막 값 |
| `data-text="1:$2.06\|2:$0.16"` | 단계마다 글자를 바꾼다. 앞뒤 글자가 같은 숫자끼리면 센다 |
<!-- /figure:scene-attrs -->

- 단계마다 바뀌는 화면은 `fig-layer` 안에 겹쳐 두고 `data-step="1-1"`·`"2-2"` 로 하나씩 보인다. 높이는 가장 큰 화면이 정해 흔들리지 않는다.
- 터미널 화면은 `fig-term`(어두운 판) 안에 `fig-term-bar`(머리줄, 점 셋은 자동)와 `fig-term-body` 를 둔다. 머리줄 오른쪽 `fig-term-tag` 칩에 지금 움직이는 훅·명령을 `data-text` 로 바꿔 넣는다. 줄은 `div` 하나씩, 색은 `fig-t-dim`·`fig-t-ok`·`fig-t-bad`·`fig-t-warn`, 안쪽 상자 `fig-t-box`, 버튼·배지 `fig-t-key`, 위 구분선 `fig-t-sep`.

### 활용 예 — 실제 화면을 장면으로 재현한다

새 기능을 어디에 쓰는지는 공식 예제·샘플에서 고른 두세 개로 보여 준다. 예제마다 그것이 화면에 띄우는 것을 figure 장면의 터미널로 다시 그려, 스크롤하면 예제가 차례로 실행되는 것처럼 넘긴다.

2026-10-08 Mods 글에서 두 번 고쳤다. 이름·이벤트만 적은 카드 셋은 "무슨 예제인지 모르겠고 인터랙티브하지 않다"는 지적을 받았다. 그 뒤 timeline 장면으로 넘겼더니 "시간 순서가 아닌 예제에 타임라인은 어색하다"는 지적을 받았다. 예제는 버전 레일이 아니라 화면으로 보여 준다.

1. **예제마다 한두 단계.** 화면이 뜨는 순간, 사용자가 무언가를 누른 뒤처럼 달라지는 화면마다 한 단계다. `>` 설명에는 화면에 무엇이 떴는지와 그때 쓰는 훅·명령을 한두 문장으로 쓴다.
2. **화면 문구는 옮긴다. 지어내지 않는다.** 직접 띄운 화면(blog-capture 의 `--plugin`·`--setup`·`--wait`), 공식 README·스크린샷, 소스의 문자열에서 옮긴다. 캡션에 "v2.1.292 화면을 줄여 다시 그림"처럼 밝힌다. ☂ 같은 그림 문자는 빼고 글자만 옮긴다.
3. **캡처는 장면 안에 합친다.** 같은 화면을 장면과 이미지로 두 번 보이지 않는다. 장면으로 못 옮기는 화면(그림·색이 핵심인 화면)만 이미지로 붙인다.
4. **제작 경위는 캡션 괄호 한 번으로 끝낸다.** 장면 아래 본문에 "장면의 화면은 직접 띄운 것을 줄여 옮겼습니다", "README 예시를 옮겼습니다" 같은 문장이나, `>` 설명을 되풀이하는 문단을 쓰지 않는다. 2026-10-08 Mods 글에서 이런 문단을 걷어 냈다. 본문에는 직접 돌려서 장면에 없는 사실을 알게 됐을 때만 "직접 v2.1.292에서 ~해 보니 ~했습니다"로 쓴다. 점검의 `stock-phrase`(그림 제작 경위)가 잡는다.
5. **따라 할 명령 한 줄**을 마지막에 붙인다(예: `claude --plugin-dir ./claude-code/mods/blast-radius`).
6. **JSON·긴 토큰은 줄을 나눈다.** 공백 없는 한 줄은 좁은 화면에서 `"user-` / `42"`처럼 토큰 중간에서 끊긴다. 실제 출력을 `JSON.stringify(x, null, 2)`로 다시 받아 줄마다 `div` 로 나누고(줄 안 앞 공백은 그대로 들여쓰기가 된다), 문자열은 `fig-t-ok`, 숫자는 `fig-t-bad` 로 색을 입힌다. 2026-10-08 JWT 글에서 "json 같은 문법이 이쁘게 안 보인다"는 지적을 받고 고쳤다.
7. **직접 돌린 데모는 코드와 결과를 짝으로 보인다.** 출력 줄만 두면 그 출력을 무엇이 찍었는지 몰라 읽히지 않는다. 단계마다 위에 돌린 코드 몇 줄(핵심만, 줄마다 34자 안쪽), `fig-t-sep fig-t-dim` 구분선 "실행 결과", 그 아래 출력을 둔다. 출력이 암호 같으면(`c.d.c == c`) `fig-t-dim` 주석 한 줄로 뜻을 단다. 머리줄 칩(`fig-term-tag`)은 단계 이름을 짧게. 2026-10-08 DI 글에서 "적은 코드만으로 이해하기 힘들다"는 지적을 받고 출력만 있던 장면을 이렇게 고쳤다.

````
```figure
caption: 공식 예제 mod를 띄운 세션(v2.1.292 화면을 줄여 다시 그림)
scene: on
step: replay-theater · 턴이 끝나면
> 턴이 끝나면 프롬프트 위에 **Replay: 3 edits**가 뜹니다.
step: blast-radius · 실행 직전
> `rm -rf build`가 실행되기 전에 멈추고 **지워질 파일**을 보여 줍니다.
<div class="fig-term">
  <div class="fig-term-bar">claude · ~/demo<span class="fig-term-tag" data-text="1:tool.call → next(e)|2:tool.call 붙잡기">tool.call → next(e)</span></div>
  <div class="fig-term-body fig-layer">
    <div data-step="1-1">
      <div class="fig-t-ok">● 세 파일을 고쳤습니다.</div>
      <div class="fig-t-sep"><span class="fig-t-key" data-on="1:accent">Replay: 3 edits</span></div>
    </div>
    <div data-step="2-2">
      <div>&gt; build 폴더 지워 줘</div>
      <div class="fig-t-box" data-on="2:accent">
        <div>Command <span class="fig-t-warn">rm -rf build</span></div>
        <div>Would delete 4 files <span class="fig-t-dim">(about 68 KB)</span></div>
      </div>
    </div>
  </div>
</div>
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

<!-- figure:kits -->
| 분류 | 클래스 |
| --- | --- |
| 배치 | `fig-flow`(가로 흐름, 640px 아래는 세로 + 화살표 회전) `fig-row`(줄바꿈 되는 가로) `fig-col`(세로) `fig-stack`(세로) `fig-grid-2` `fig-grid-3` `fig-grid-4`(좁으면 2열→1열) `fig-center` `fig-gap-lg` |
| 상자 | `fig-box` `fig-accent`(강조) `fig-muted`(점선) `fig-info`(파랑) `fig-warn`(노랑) |
| 조각 | `fig-arrow`(→, `fig-down` 을 더하면 ↓) `fig-num`(번호 배지) `fig-chip`(알약) `fig-dot` `fig-ok`(✓) `fig-no`(–) `fig-part`(반쯤) `fig-bar`(막대, `style="--v: 70%"`, `fig-accent` 면 강조색) |
| 글자 | `fig-label`(작은 대문자 머리말) `fig-title`(굵은 제목) `fig-sub`(보조 설명) `fig-big`(큰 숫자) `fig-mono` |
| 겹치기 | `fig-layer`(자식이 한 칸에 겹친다)<br>장면에서 단계마다 바뀌는 화면을 한 칸에 겹쳐 둔다. 높이는 가장 큰 화면이 정해 흔들리지 않는다 |
| 터미널 | `fig-term`(어두운 판) `fig-term-bar`(머리줄, 점 셋은 자동) `fig-term-tag`(머리줄 오른쪽 칩. 장면에서 지금 움직이는 훅·명령을 data-text 로) `fig-term-body`(본문. 줄은 div 하나씩) `fig-t-dim` `fig-t-ok` `fig-t-bad` `fig-t-warn`(줄 색) `fig-t-box`(안쪽 상자) `fig-t-key`(버튼·배지) `fig-t-sep`(위 구분선)<br>활용 예의 실제 화면을 다시 그릴 때. 두 테마 모두 어두운 판이고, 문구는 실제 화면·README·소스에서 옮긴다 |
<!-- /figure:kits -->

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

칸마다 화면의 읽는 높이(아래에서 4분의 1)를 넘어오거나 화면에 0.6초 머물면, 그 칸이 한 번 재생된다(0.5~0.9초). 그림이 화면 아래로 막 들어올 때 끝나 버리면 눈이 닿기 전이라 아무도 못 본다. 이미 화면에 있거나 지나간 칸은 그대로 두고, 같은 순간 걸린 칸은 차례 순서대로 0.09초 간격으로 튼다. 라이브러리는 Motion(`motion`, MIT)이고 그림이 있는 글에서만 늦게 불러온다.

구현: 런타임 `src/lib/figure-motion.ts`, 붙이는 자리 `src/components/prose/diagram/Motion.tsx`(판 `Shell`, 본문 SVG `InlineSvg`), 모션 모듈 `src/lib/figure/anims/`(`ANIM_MODULES`·`LOOPS`, 허용 목록이 따라간다), 키트 기본 모션 `src/lib/figure/kits/`, 반복 CSS `src/app/globals.css`(`dg-orbit`·`dg-breathe`). 런타임은 움직인 흔적을 되돌리지 않는다. 그림 내용이 바뀌면(스튜디오) 판을 `key` 로 새로 그린다. 장면은 이 런타임을 거치지 않고 `src/components/prose/diagram/Scene.tsx` 가 직접 움직인다(무대 CSS 는 `globals.css` 의 `.sc-*`, figure 장면 상태는 `src/lib/figure/scene-attrs/states.css`).

### 원칙

1. **움직임은 내용을 따른다.** 순서가 있으면 차례로, 방향이 있는 선은 그 방향으로 그려지고, 크기는 0에서 자라고, 되풀이되는 것만 계속 돈다. 꾸미려고 넣는 모션은 없다.
2. **눈이 닿는 곳에서 움직인다.** 화면 맨 아래에서 끝나는 모션은 없다. 스크롤을 멈춘 자리에서도 0.6초 안에 나타난다.
3. **최종 상태 = 서버가 그린 그림.** JS 가 없거나, Motion 을 못 불러오거나, 움직임 줄이기 설정이면 처음부터 완성된 그림이 보인다. 그러니 모션 없이도 읽히게 그린다.
4. **움직이는 것은 opacity·transform·clip-path·선 길이·숫자뿐.** 크기·위치·색을 바꿔 레이아웃을 흔들지 않는다.
5. **반복(`data-loop`)은 아껴 쓴다.** 되풀이가 내용인 곳(고리·순환 경로)과 지금 이야기하는 칸에만, 3초 이상 주기로 느리게, 그림이 화면에 있을 때만 돈다. 한 그림에 둘까지.
6. **짧게 끝나고, 눌러야 보이는 것은 없다.** 반복을 빼면 재생은 1초 안에 끝난다. 예외는 숫자 굴리기(1.5초, 핵심 숫자 카드에만)와 장면 전환(0.8초, 스크롤 박자마다)뿐이다. 클릭·호버 인터랙션은 없다.
7. **상태가 바뀌어도 그림 높이는 그대로다.** 바뀌는 글은 같은 칸에 겹쳐 두고 하나만 보인다. 그림 아래에 패널을 열지 않는다. 판 좌우 여백은 넓은 화면 28px, 좁은 화면 18px.

### 등장 — `data-anim`

<!-- figure:anims -->
| 값 | 움직임 | 쓰는 곳 |
| --- | --- | --- |
| `rise` | 16px 아래에서 올라오며 나타남 | 칸·카드·행. 기본 |
| `fade` | 제자리에서 나타남 | 다른 것을 감싸는 상자, 점선, 배경 |
| `pop` | 0.6배에서 커지며 나타남 | 점·번호 배지·체크·칩·화살촉 |
| `draw` | 선이 그려짐. HTML 은 긴 쪽 방향(왼→오, 위→아래), SVG 는 경로를 따라 | 연결선·화살표·타임라인 선 |
| `draw-back` | `draw` 의 반대 방향(오→왼, 아래→위) | 되돌아오는 메시지·응답 |
| `grow` | 왼쪽에서 자람 | 막대 |
| `count` | 0(또는 `data-from`)에서 값까지 숫자를 셈 | 큰 숫자. 안에 다른 요소 없이 `86%`·`1.2s`·`2,400건` 처럼 숫자가 하나인 글자만 센다. `v2.1.283`·`007`·`<tspan>` 이 든 글자는 나타나기만 한다 |
| `roll` | 숫자 자리마다 0~9 띠가 두 바퀴 돌아 제 숫자에 멈춤(1.5초, 자리마다 0.09초씩 늦게). 다 돌면 원래 글자로 돌아간다 | 글의 핵심 숫자 카드. stats 값이 쓴다. 남용하지 않는다 |
| `none` | 움직이지 않음 | 키트 기본 모션을 끌 때 |
<!-- /figure:anims -->

순서:
- `style="--i: N"` 이 차례다. 같은 값은 함께 움직이고 소수도 된다(연결선은 앞 칸 + 0.5).
- `--i` 가 없으면 가장 가까운 움직이는 조상과 함께 움직인다(칸 안의 배지·숫자는 칸과 함께). 조상도 없으면 문서 순서로 앞 차례 다음.
- 지금 화면 폭에서 안 보이는 요소(넓은 화면용 고리, 좁은 화면용 목록 등)는 차례에서 빠진다.
- 차례마다 그 첫 칸의 위치로 재생 시점이 정해진다. 위아래로 긴 그림은 내려가며 차례로, 한 줄에 놓인 칸은 동시에 걸려 0.09초 간격으로 재생된다.

### 반복 — `data-loop`

<!-- figure:loops -->
| 값 | 움직임 | 쓰는 곳 |
| --- | --- | --- |
| `orbit` | 점선 무늬가 경로 방향으로 천천히 흐름(초당 약 12px) | 고리·순환 경로. `stroke-dasharray` 가 있는 SVG 선에만 |
| `pulse` | 강조 테두리(HTML)나 불투명도(SVG)가 3.2초 주기로 숨 쉼 | 지금 이야기하는 칸 하나 |
<!-- /figure:loops -->

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
| stats | 카드 rise, 값 roll(`14회 → 2회` 는 바뀐 뒤 값 2회가 구른다) |
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

## 모션을 확인하는 법

- 스튜디오 미리보기에서 그림을 화면 아래부터 천천히 올려 본다. 칸이 읽는 높이에서 차례대로 나타나는지, 스크롤을 화면 아래쪽에서 멈춰도 곧 나타나는지, 다 나타난 뒤 서버가 그린 그림과 같은지 본다. 다크 모드·좁은 화면도 한 번.
- 브라우저로 재려면 그림 위쪽을 화면 90% 높이에 두면 칸이 숨어 있고(opacity 0), 45% 로 올리면 0.3초 안에 움직이기 시작해 1.7초 안에 모두 opacity 1·transform 항등·clip 없음이어야 한다(`scroll-behavior: auto`).
- 장면은 무대가 붙은 뒤 박자(화면 절반)마다 스크롤해, 단계마다 설명 `.sc-note.on` 과 그림이 바뀌는지, 무대 높이(`.sc-in`)가 단계마다 같은지, 박자의 30%만 내리고 놓으면 제자리로, 70%면 다음 단계로 서는지 본다.
- Motion 에 `transform` 끝값으로 `"none"` 을 주지 않는다. 상대 값의 0 으로 바뀌어 `scale(0.6) → none` 이 `scale(0)` 으로 끝난다. 끝값은 `scale(1)`·`translateY(0px)` 처럼 적는다.

## 실제 화면

스크린샷·캡처가 필요하면 **blog-capture 스킬**을 따른다. 순서는 직접 뜨기(`capture.mjs` 한 줄) → 자료 조사 → 그림으로 다시 그리기이고, 셋 다 안 될 때만 그 자리에 `![캡션](/posts/<slug>/todo-<이름>.png)` 를 남긴다. 본문에 "캡처 필요" 자리로 보이고, 남아 있으면 발행이 막힌다.

## 확인

- 릴리스 글: MCP `check_release_voice`(slug) 또는 실행기 API `check`. 그림 관련 규칙은 `diagram-error`·`figure-dropped`·`figure-empty`·`figure-no-caption`·`figure-long-caption`·`capture-pending`.
- 직접 보려면 스튜디오(`/studio`) 미리보기가 같은 렌더러를 쓴다. 다크 모드와 좁은 화면에서도 한 번 본다.
- 좁은 화면 확인은 `node .claude/skills/release-post/mobile-check.mjs <slug>` 로 한다. 390px·라이트/다크로 끝까지 내리며 가로 넘침, 판 밖으로 나간 요소, 토큰 중간에서 끊긴 터미널 줄, 함께 보이는 겹친 단계 화면을 잡는다. 렌더러(`diagram/*`)를 고쳤으면 그 그림이 든 글로 돌려 본다.
- 키트·모션·장면 속성을 늘리거나 바꾸면 **blog-figure-extend** 스킬을 따른다(모듈 하나 + 등록, `sync-docs.ts` 로 표 갱신). 그림 블록 종류·장면 문법은 `src/lib/diagram.ts`(`barScene`·`sceneCells`)와 `Scene.tsx`, 쓰기 기준 `src/lib/voice.ts` 의 `DIAGRAM_SYNTAX`, 스튜디오 문법표를 같이 고친다.
