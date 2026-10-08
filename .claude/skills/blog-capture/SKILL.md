---
name: blog-capture
description: Use when a dongding 블로그 글에 실제 화면이 필요할 때 — 스크린샷, 캡처, 터미널·CLI 출력, Claude Code 의 /model·/context·/usage 같은 화면. 본문에 todo- 캡처 자리가 있거나 점검에 capture-pending 이 떴을 때, 실행기가 "캡처 필요"를 사람 몫으로 남기려 할 때도.
---

# 블로그 실제 화면 뜨기

화면 캡처는 사람 몫으로 남기지 않는다. 로컬 Claude Code, 클라우드 루틴, 릴리스 실행기 어디서든 같은 명령으로 뜨고, 같은 명령이면 같은 SVG 가 나온다.

## 순서 — 앞 단계로 되면 뒤로 가지 않는다

1. **직접 뜬다.** 아래 `capture.mjs` 한 줄.
2. **자료 조사.** 끝 코드가 3·4(띄울 수 없음)면, 공식 문서·릴리스·이슈에서 같은 화면이나 출력 예시를 찾아 코드 블록으로 옮기고 출처 링크를 단다.
3. **다시 그리기.** 그것도 없으면 화면의 구조·숫자를 그림 블록이나 figure 로 그리고(blog-figures 스킬), 캡션에 "실제 화면이 아니라 구성"이라고 밝힌다.
4. 셋 다 안 될 때만 `![캡션](/posts/<slug>/todo-<이름>.png)` 를 남기고, 무엇을 왜 못 떴는지 작업 노트와 finish 의 todo 에 적는다.

## 뜨기

레포 루트에서:

```bash
node .claude/skills/blog-capture/capture.mjs --run "claude --model claude-sonnet-5-5" \
  --keys /context --keys Enter \
  --from "Context Usage" --to "Auto-compact window" \
  --out /tmp/context-1m.svg
```

| 인자 | 뜻 |
| --- | --- |
| `--run` | 띄울 명령. `claude` 면 `--safe-mode --setting-sources project` 가 자동으로 붙어 내 CLAUDE.md·플러그인·훅·MCP·상태줄·저장된 모델·effort 없는 기본 설치 화면이 나온다. 모델이 화면에 영향을 주면 별칭(`sonnet`) 대신 모델 ID 로 띄운다. 별칭이 가리키는 모델은 버전마다 바뀐다 |
| `--keys` | 차례로 보낼 입력. `Enter`·`Escape`·`Down`·`Tab`·`C-c` 같은 키 이름이 아니면 글자 그대로 친다 |
| `--from` `--to` | 화면에서 자를 첫 줄·끝 줄에 들어 있는 글자. 행 번호는 쓰지 않는다 |
| `--out` | SVG 경로. 이름에 `todo-` 를 넣지 않는다 |
| `--upload-json <slug>` | 실행기 API 로 올릴 요청 본문을 `<out>.json` 으로 함께 만든다 |

도구가 창 크기(100×60), 폴더 신뢰 확인, 화면이 멈출 때까지 기다리기, 세션·기록 정리를 모두 맡는다. 폴더 신뢰 기록은 캡처 전용 폴더 하나만 처음 한 번 `~/.claude.json` 에 남는다. 실행이 끝나면 띄운 프로그램의 버전과 잘라 낸 화면을 글자로 보여 준다. 그 글자를 읽고 본문에 쓸 사실을 고른다.

| 끝 코드 | 할 일 |
| --- | --- |
| 0 | 올린다 |
| 2 | 경로·이메일·키·사용량·플랜이 범위에 들었다. 출력된 줄을 보고 `--from`/`--to` 를 좁혀 다시 뜬다 |
| 3 | 명령이 뜨지 않았다(미설치·미로그인). 2단계로 |
| 4 | tmux 가 없다. 2단계로 |
| 5 | `--from`/`--to` 글자가 화면에 없다. 출력된 화면을 보고 글자나 `--keys` 를 고친다 |

화면이 바뀌는 선택은 하지 않는다. `/model` 같은 선택기에서 항목을 고르는 Enter 는 사용자 기본값을 저장한다. 선택기는 여는 데까지만 키를 보낸다.

## 올리기

- **로컬·MCP:** `upload_post_image` 에 `slug`, `name`(파일 이름), `svg`(파일 내용)를 넣는다.
- **실행기:** `--upload-json <slug>` 로 만든 파일을 그대로 보낸다: `curl -sS -X POST "$APP/api/releases/worker/" -H "Authorization: Bearer $TOKEN" -H "content-type: application/json" --data-binary @/tmp/context-1m.svg.json`

## 본문

- 캡션에 도구가 출력한 버전을 넣는다: `![v2.1.292 Sonnet 5.5 세션의 /context](/posts/<slug>/context-1m.svg)`
- 문단에서 직접 확인한 것임을 밝힌다: "직접 v2.1.292에서 `/context`를 열어 보니 창이 1m tokens였습니다."
- 화면에서 새로 안 사실(안내 문구, 남아 있는 옛 선택지, 숫자)은 본문에 쓴다. 캡처만 붙이지 않는다.
- 계정 종류에 따라 다른 화면이 있다. `/model` 의 기본값·목록, `/usage`, `/status` 는 로그인한 계정(구독 요금제, API, 클라우드 루틴의 계정)을 그대로 보여 준다. 캡션이나 본문에 어떤 계정으로 떴는지 적는다("Max 구독 계정에서"). 글이 특정 요금제의 화면을 말하는데 그 요금제로 뜬 것이 아니면 쓰지 않고 2단계로 간다.
- safe-mode 화면의 사용량 숫자(시스템 도구 21.8k 같은)는 플러그인·MCP 가 없는 기본 설치의 값이다. "보통 이 정도 쓴다"로 쓰지 않는다. 창 크기·컴팩트 여유처럼 구성과 상관없는 숫자만 근거로 쓴다.

## 웹 화면

이 도구는 터미널 화면만 뜬다. 웹 페이지·데스크톱 앱 화면은 브라우저 자동화(Playwright)를 쓸 수 있으면 PNG 로 찍어 올리고, 없으면 2단계로 간다.

## 자주 틀리는 것

| 틀린 것 | 대신 |
| --- | --- |
| tmux 를 손으로 열고 `capture-pane`·행 번호로 자르기 | `capture.mjs` 한 줄. 창 크기·자르기가 매번 달라진다 |
| `--safe-mode` 를 빼고 내 구성으로 뜨기 | 기본값 그대로. 내 플러그인·MCP 숫자와 저장된 모델이 화면에 실린다. 내 구성이 보여야 하는 글만 `--no-safe-mode` |
| 클라우드에서 뜬 `/model` 로 "Pro 의 기본값"을 설명하기 | 계정 종류가 다르면 화면도 다르다. 그 요금제로 뜬 화면만 그 요금제의 근거로 쓴다 |
| 끝 코드 2 를 무시하거나 범위를 넓혀 통과시키기 | 범위를 좁힌다. 화면 자체가 그 정보를 보여 주는 글이면 `--allow <path|email|secret|usage|account>` |
| 캡처를 todo- 이름으로 올리기 | 점검은 경로에 `/todo-` 가 있으면 캡처 대기로 본다. todo- 없는 이름으로 올리고 본문 경로를 바꾼다 |
| 띄울 수 없다고 바로 todo- 남기기 | 2·3단계를 먼저 |
