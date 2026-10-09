---
name: blog-figure-extend
description: Use when a dongding 블로그 글에 필요한 그림·애니메이션을 지금 키트로 표현할 수 없을 때 — 새 figure 키트 클래스(fig-*), 새 등장 모션(data-anim), 새 장면 속성·상태(data-step·data-on 같은), 새 그림 모양을 블로그 코드에 추가해야 할 때. "키트 추가", "새 그림 모양", "애니메이션 추가", "장면 효과 추가", "이런 화면을 재현하는 키트", 실행기 노트의 "키트 필요".
---

# 그림 키트·애니메이션 추가

글에 필요한 그림이 지금 어휘로 안 될 때, 블로그 코드에 모듈 하나를 더해 배포한 뒤 글에 쓴다. 쓰는 법(문법·고르는 기준)은 **blog-figures**, 여기는 그 어휘를 늘리는 법이다.

## 먼저: 정말 새로 필요한가

아래 순서로 되면 추가하지 않는다. 글 하나에만 쓰일 모양도 추가하지 않는다 — 키트는 다른 글에서도 쓸 수 있어야 한다.

1. 그림 블록 10종(+ `scene: on`)
2. ```figure 에 지금 키트 클래스 조합
3. figure 장면 속성(`data-step`·`data-on`·`data-v`·`data-text`)과 `fig-layer`
4. 그래도 안 되면 → 아래로

## 어디에 무엇을 — 모듈 하나 + 등록 한 줄

그림 확장은 `src/lib/figure/` 한 자리에 모듈로 있다. 모듈이 생김새·검증·동작·설명을 같이 갖고, 목록에 등록하면 허용 목록(lib/html-figure), 런타임(lib/figure-motion, 장면), 쓰기 기준(lib/voice), 스킬 표가 그 목록을 따라간다.

| 늘릴 것 | 모듈 | 등록 | 뼈대 만들기 |
| --- | --- | --- | --- |
| 키트(모양) | `kits/<이름>.ts`(클래스 설명·기본 모션) + `kits/<이름>.css` | `kits/index.ts` 의 `KITS`, `figure.css` | `scaffold.mjs kit <이름>` |
| 등장 모션 | `anims/<이름>.ts`(길이·준비·재생) | `anims/index.ts` 의 `ANIM_MODULES` | `scaffold.mjs anim <이름>` |
| 장면 속성 | `scene-attrs/<이름>.ts`(값 검사·단계 점검·적용) + 상태 CSS 는 `states.css` | `scene-attrs/index.ts` 의 `SCENE_ATTRS` | `scaffold.mjs scene-attr <이름>` |
| 장면 상태(`data-on` 값) | `scene-attrs/on.ts` 의 `STATES` + `states.css` 의 `.sc-html .is-<상태>` | — | 손으로 |
| 그림 블록 종류 | `lib/diagram.ts`(파서·`sceneCells`) + `components/prose/diagram/*.tsx` + `Diagram.tsx` | `DIAGRAM_LANGS` | 손으로. 드물다 |

스크립트는 저장소(워크트리) 뿌리에서 `node .claude/skills/blog-figure-extend/<스크립트>` 로 부른다. `.ts` 는 `node_modules/.bin/jiti` 로.

- 모듈은 서로 모른다. 공통 조각은 같은 폴더의 도우미(`anims/keyframes.ts`, `scene-attrs/range.ts`)에서 가져온다.
- 모션 모듈은 Motion 을 import 하지 않는다. `prepare(el, rt, timing)` 의 `rt.animate` 로 받는다 — 그래서 목록을 서버·점검기도 읽는다.
- 장면 속성의 `apply` 만 DOM 을 쓴다. `valid`·`fits` 는 순수 함수. 통과한 값은 거를 때 늘 이스케이프된다.
- 키트의 `motion` 은 목록 순서대로 먼저 맞는 선택자가 이긴다(`KITS` 순서가 우선순위).
- 키트에 `live`(화면에 있을 때 반복)를 쓰면 같은 키트 CSS 에 `[data-live] <선택자>` 반복 규칙을 둔다(`box.css` 참고, 키프레임 `dg-breathe` 는 globals.css 공용). sync-docs 가 빠진 것을 잡는다.

## 지킬 것

- **색은 테마 변수만.** 라이트·다크 둘 다 본다. 늘 어두운 판(터미널)은 `--code-*` 토큰.
- **상태가 바뀌어도 높이는 그대로.** 단계 화면은 `fig-layer` 에 겹친다. 그림 아래에 패널을 열지 않는다.
- **판 안에 세로 스크롤을 만들지 않는다.** 가로만 넘기려고 `overflow-x: auto` 를 쓰면 세로도 auto 가 된다. 칸이 올라오는 모션(16px)만큼 넘치는 사이에 휠이 판 안쪽을 내려 머리줄이 잘린다. `overflow-y: hidden` 을 같이 둔다(2026-10-08 matrix). `release-post/mobile-check.mjs` 가 "그림 안에 세로 스크롤"로 잡는다.
- **장면이 DOM 에 입힌 상태를 React 가 지우지 않게 한다.** `dangerouslySetInnerHTML` 객체는 `useMemo` 로 고정한다. React 19 는 이 객체를 동일성으로 비교해, 렌더마다 새로 만들면 state 하나만 바뀌어도 innerHTML 을 다시 쓴다. 2026-10-09 `FigureScene` 이 `setReady` 로 다시 그려지며 첫 단계 상태가 지워졌고, 판이 화면에 들어오는 동안 `fig-layer` 화면이 모두 포개졌다. `release-post/mobile-check.mjs` 가 "겹친 단계 화면이 함께 보임"으로 잡는다.
- **움직이는 것은 opacity·transform·translate·clip-path·선 길이·숫자.** 크기·위치 속성을 애니메이션하지 않는다. 움직임 줄이기 설정이면 바로 끝 모습.
- **JS 없이도 읽힌다.** 서버가 그린 첫 모습(모션 끝 모습, 장면 1단계)이 그대로 그림이다.
- **값은 정규식으로 모양을 묶는다.** 글자가 들어가는 속성은 `write` 에서 `escAttr` 로 이스케이프하고 화면엔 `textContent` 로만 넣는다. 스크립트·`on*`·`style` 색은 열지 않는다.
- **이모지·그림 문자 금지.** 화면을 재현하는 키트라도 ☂ 같은 기호는 빼고 글자만.
- **취향:** 판 좌우 여백 넉넉히, 강조는 한두 곳, 반복은 3초 이상 주기로 아껴서. 화면 방향을 정할 때는 먼저 시안(artifact)으로 보여 고르게 한다.

## 순서

1. **워크트리**를 열고(main 에서 바로 고치지 않는다) `preview.mjs link` 로 원래 저장소의 `node_modules`·`.env.local` 을 잇는다. 그래야 `jiti`·`tsc`·`next` 가 돈다(둘 다 git 이 무시한다).
2. **뼈대**: `scaffold.mjs kit|anim|scene-attr <이름>` → TODO 를 채운다. CSS·설명·예시까지.
3. **문서 표**: `jiti sync-docs.ts` — blog-figures 의 키트·모션·장면 속성 표를 모듈 목록으로 다시 쓰고, 등록 누락(CSS 를 figure.css 가 안 부름, 상태 CSS 없음, 이름 겹침)을 잡는다. 쓰기 기준(lib/voice)은 목록을 직접 읽어 따로 고칠 것이 없다. blog-figures 본문에 쓰는 법(언제·예시)은 직접 한 단락 더한다.
4. **확인용 글**: 새 어휘를 쓰는 그림과 기존 그림 하나를 담은 `.md` 를 만든다(스크래치 폴더). `jiti check-figures.ts 글.md` 로 오류·지워진 것 0 을 본다.
5. **미리보기**: `preview.mjs start 글.md` → `check-scenes.mjs http://localhost:3107/figure-preview/ --out <폴더>` → 스크린샷을 직접 본다(데스크톱·모바일·라이트) → `preview.mjs stop`.
   - check-scenes 는 JS 없이 서버가 그린 모습을 기준으로, 모든 그림 칸의 끝 모습(투명도·잘림·변형·막대 채움·글자)이 기준과 같은지, 처음엔 재생을 기다리며 숨어 있는지, 장면은 단계마다 설명이 맞고 판 높이가 같은지 본다. 키트 선택자를 따로 적지 않아 새 키트도 그대로 검사된다.
6. **검사**: `npx tsc --noEmit -p .`, 바꾼 파일 `npx eslint`, `node scripts/check-lint-rules.mjs`, `jiti sync-docs.ts --check`, `npx next build`.
7. **독립 리뷰**: code-reviewer 에이전트에 커밋을 맡겨 보안(허용 목록·이스케이프)·높이 흔들림·움직임 줄이기를 본다. 고친 뒤 4~6 을 다시.
8. **커밋** `[FEAT] figures — …` → main 에 ff 병합 → push → 배포 확인(운영 지시서 `https://blog.dongding.dev/api/releases/worker/` 에 새 설명이 뜰 때까지, 보통 90초).
9. **그 다음에 글을 고친다.** 배포 전에 고치면 옛 렌더러가 새 머리 줄·속성을 글자로 보이거나 지운다. MCP `update_post` 의 `replacements` 로 그림 자리만 바꾸고, 응답 점검과 `check_release_voice` 를 본다.
10. **운영 글 확인**: `check-scenes.mjs https://blog.dongding.dev/posts/<slug>/`.

## 실행기(AI에게 맡기기)

실행기는 코드를 고치지 못한다. 지금 어휘로 그릴 수 없는 그림은 흉내 내지 말고, 노트의 "사람이 확인할 것"에 `키트 필요: 무엇을(화면·움직임), 왜(어느 문단)` 를 남긴 뒤 지금 어휘로 쓴다. 사람이 이 스킬로 추가하고 글을 고친다.

## 예: 터미널 키트와 figure 장면(2026-10-08)

Mods 글의 공식 예제를 timeline 장면으로 넘겼다가 "시간 순서가 아닌 예제에 타임라인은 어색하다"는 지적을 받았다. 예제가 띄우는 실제 화면을 재현하려고 `term` 키트(`fig-term`·`fig-t-*`)와 `layer` 키트(`fig-layer`), figure 장면 속성 넷을 더했다. 이 구조로 다시 하면: `scaffold.mjs kit term` → `term.ts` 에 클래스 설명, `term.css` 에 어두운 판 → `sync-docs` → 확인용 글에 터미널 장면 → 미리보기 검사 → 배포 → Mods 글의 timeline 블록을 figure 장면으로 교체.
