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
| `--plugin <폴더>` | 그 플러그인·mod 만 싣고 띄운다(`--setting-sources project --plugin-dir`). safe-mode 는 플러그인을 끄므로 mod 화면은 이걸로 뜬다. 여러 번 줄 수 있다 |
| `--setup "<셸 명령>"` | 띄우기 전에 캡처 폴더에서 돈다. 예제가 다룰 파일을 만든다(지울 `build/`, 고칠 `greet.js` 등) |
| `--wait <글자>` | `--keys` 사이에 끼운다. 그 글자가 화면에 뜰 때까지(최대 `--timeout`) 기다렸다가 다음 키를 보낸다. 턴이 끝난 뒤 명령을 칠 때 쓴다 |
| `--timeout <초>` | 기다리는 상한(기본 40). 모델이 한 턴 일하는 화면은 120 안팎 |
| `--keep <폴더>` | 끝난 뒤 캡처 폴더를 그 폴더로, 원본 화면을 `<폴더>.ansi` 로, 세션 기록을 `<폴더>-log/` 로 남긴다. 범위를 다시 자를 때는 띄우지 않고 `--ansi <폴더>.ansi` |

### 스킬·플러그인 글의 전·후 캡처

스킬·플러그인 글은 같은 예시 프롬프트를 도구 없이 한 번, `--plugin` 으로 싣고 한 번 떠서 두 장을 싣는다. 두 장은 이미지 묶음 첫 줄에 `{tabs}` 를 붙여 한 자리에서 버튼으로 바꿔 보게 싣는다(alt 가 버튼 이름: "설정 없음", "manual 설정"). `{tabs}` 없이 연달아 두면 그리드 묶음이 되어 4:3 칸으로 잘린다(cover).

플러그인이 아닌 스킬(SKILL.md 폴더)은 `--setup` 으로 캡처 폴더의 `.claude/skills/<이름>/` 에 복사한다. safe-mode 는 프로젝트 스킬까지 끄므로 `--no-safe-mode` 를 주고 `--run "CLAUDE_CODE_DISABLE_CLAUDE_MDS=1 CLAUDE_CODE_DISABLE_AUTO_MEMORY=1 claude --setting-sources project --strict-mcp-config …"` 처럼 설정 출처를 직접 붙인다. 이렇게 띄우면 내 플러그인·훅·`~/.claude/skills` 는 실리지 않고(stream-json init 의 skills 에 프로젝트 스킬과 내장 스킬만 나온다) 전역 CLAUDE.md 는 환경 변수가 막는다. 2026-10-12 make-interfaces 글에서 safe-mode 로 띄웠더니 슬래시 명령이 잡히지 않았다. 프롬프트·폴더(`--setup`)·모델·자르는 범위를 똑같이 두고 `--plugin` 만 바꾼다. 태그가 skill·plugin 인 글은 실제 캡처가 두 장 미만이면 점검(`tool-no-capture`)에서 막힌다.

```bash
P="Add a date picker component to the frontend."
SETUP='git clone -q --depth 1 https://github.com/fastapi/full-stack-fastapi-template .'
# 전: 도구 없이
node .claude/skills/blog-capture/capture.mjs --timeout 180 --setup "$SETUP" \
  --run "claude --model claude-opus-5-5" --keys "$P" --keys Enter \
  --wait "<턴이 끝나면 뜨는 글자>" --from "<첫 줄 글자>" --to "<끝 줄 글자>" --out /tmp/before.svg
# 후: 같은 명령에 --plugin 만 더한다
node .claude/skills/blog-capture/capture.mjs --timeout 180 --setup "$SETUP" --plugin ./ponytail \
  --run "claude --model claude-opus-5-5" --keys "$P" --keys Enter \
  --wait "<턴이 끝나면 뜨는 글자>" --from "<첫 줄 글자>" --to "<끝 줄 글자>" --out /tmp/after.svg
```

자리표시(`<…>`)는 처음 한 번 짐작으로 띄워 끝 코드 5 가 보여 주는 화면을 보고 채운다. 브라우저에 그려지는 결과(고친 카드, 기본 달력과 직접 만든 달력)는 dev-browser 스킬로 띄워 PNG 로 찍어 `upload_post_image` 로 올린다. 본문은 "조작 한 줄 → 캡처 → 결과 한 줄"로 잇는다.

**눌러 보는 결과는 찍지 말고 띄운다.** 스킬이 만든 위젯·인터랙티브 그림처럼 HTML 한 파일로 돌아가는 결과는 스크린샷 대신 그 HTML 을 `.html` 로 올려(`node .claude/skills/release-post/upload-image.mjs <slug> <파일>.html`) 본문에 ```embed 블록으로 띄운다. 독자가 버튼을 누르고 숫자를 바꿔 보는 것이 그 결과의 전부라, 정지 화면은 절반만 보여 준다(2026-10-13 anatomy 글: 토큰 버킷 위젯·기계를 PNG 로 실었다가 "실제 작동 가능한 건 실제로 작동하게"라는 지적).

```embed
caption: 같은 토큰 버킷 요청을 스킬 없이와 /anatomy로 만든 결과
src: /posts/<slug>/before.html | 스킬 없이
src: /posts/<slug>/after.html | /anatomy
```

- 외부 스크립트·폰트 없이 한 파일이어야 한다. npm 패키지로 나온 그림(예: `anatomy-figures` 의 커스텀 엘리먼트)은 `bun build <진입>.js --minify --target=browser` 로 묶어 `<script type="module">` 에 넣고, 라이선스 머리말(`/*! 이름 버전 | MIT | Copyright */`)을 남긴다.
- `src` 가 둘 이상이면 `| 버튼 이름` 으로 전·후 탭이 된다. `height` 를 빼면 안쪽 문서 높이에 맞춘다. 판 안은 스크롤되지 않으니(`overflow: hidden`), `height` 를 적었는데 내용이 더 길면 아래가 잘린다. 안쪽이 창 높이를 따르면(`100vh`, `height: 100%`, 화면 전체를 덮는 `position: absolute`) 재는 높이가 틀리니 `height: 560` 처럼 적는다.
- 화면에서는 스크립트·폼만 허용한 sandbox iframe 이라 블로그 쿠키·저장소에 닿지 못한다. 안쪽 `localStorage` 는 예외를 던지고 `alert`·클립보드는 조용히 안 되며 링크·팝업도 열리지 않는다. 이것에 기대는 위젯은 고쳐서 올린다.
- 외부 `<script src>` 가 있으면 업로드가 거부된다. 140만 자 안쪽. 같은 이름으로 다시 올리면 1분 안에 새 판이 보인다.
- 실행기는 `image` 액션에 `name: <이름>.html`, `html: <원문>` 으로 올린다.
- 움직이지 않는 결과(달라진 카드 한 장)만 PNG 로 찍는다.

스킬이 만든 파일(그린 HTML, 고친 컴포넌트)을 브라우저로 찍으려면 `--keep <폴더>` 로 캡처 폴더를 남긴다. 같은 문장으로는 스킬이 불리지 않을 수 있다. 2026-10-12 diagram-design 은 스킬을 실어도 Claude 가 SVG 를 직접 그렸다. 그러면 후 캡처는 `/<스킬 이름> <프롬프트>` 로 부르고, 본문에 이름을 붙여 불러야 한다는 것을 반 문장으로 적는다.

스킬이 몇 분씩 일하는 전·후(그림을 그리고 스스로 찍어 보는 스킬 등)는 이렇게 뜬다. 2026-10-13 anatomy 글에서 겪은 것이다.

- 첫 실행은 `--keep` 을 주고 `--from` 을 일부러 화면에 없는 글자로 둔다. 끝 코드 5 로 끝나도 `<폴더>.ansi` 가 남으니 화면을 읽고 `--ansi` 로 다시 자른다. 턴 중간의 화면(스킬이 크기를 정하는 첫 응답 등)은 실행 중에 `tmux -L blogcap-<pid> capture-pane -e -p -S -` 로 받아 두고 같은 `--ansi` 로 자른다.
- 프롬프트는 입력창이 뜬 뒤에 친다: `--wait "bypass permissions on"`(권한 모드에 따라 `for shortcuts`) → `--keys "<프롬프트>"` → `--wait "<프롬프트 앞 글자>"` → `--keys Enter --keys C-m`. Claude Code 가 늦게 뜨거나 `--setup` 이 몇 초 걸리면 첫 대기가 그 사이에 끝나 키가 셸에 먼저 들어가고, 프롬프트가 입력창에 남은 채 제출되지 않았다.
- 턴 끝은 `--wait " · done"`(`✻ Baked for 9m 48s · done`). 스크립트를 돌리는 스킬은 권한 확인에서 멈추니, 사용자 동의를 받아 `--permission-mode bypassPermissions` 를 전·후 똑같이 붙인다(캡처 전용 빈 폴더에서만 돈다).
- 걸린 시간·토큰은 `<폴더>-log/*.jsonl` 의 assistant 메시지 usage(같은 message id 는 한 번만)와 첫·끝 timestamp 로 센다.
- 바로 끝나는 명령(`npx skills add` 등)은 끝나는 순간 끝 코드 3 이 된다. `--run "<명령>; sleep 20"` 으로 화면을 붙잡고 뜬다.

### 플러그인·mod 를 실제로 돌려 뜨기

예제가 무엇을 하는지는 실제로 돌린 화면이 가장 빨리 전한다. 모델에게 일을 시켜야 뜨는 화면이면 프롬프트를 `--keys` 로 치고, 결과가 뜰 때까지 `--wait` 로 기다린다. 모델 호출이 한 번 드니 사용자 몫의 비용이라는 것을 알리고 뜬다.

```bash
# 턴에서 파일 셋을 고치게 한 뒤, 턴이 끝나면 /replay 로 pane 을 연다
node .claude/skills/blog-capture/capture.mjs --timeout 150 \
  --plugin ./claude-code/mods/replay-theater \
  --setup 'printf "export const greet = (name) => \"hi \" + name\n" > greet.js && printf "# Notes\n" > README.md' \
  --run "claude --model claude-sonnet-5-5" \
  --keys "greet.js 의 hi 를 hello 로 바꾸고, README.md 에 사용법 한 줄을 더하고, greet.test.js 를 새로 만들어 줘" --keys Enter \
  --wait "press r" --keys "/replay" --keys Enter --wait "step 1 of" \
  --from "step 1 of" --to "Close" --out /tmp/replay-theater-pane.svg
```

- 띠·버튼의 글자 단축키(`press r` 같은)는 프롬프트에 글자로 들어갈 수 있다. 플러그인이 등록한 `/명령` 으로 연다.
- 경고 표시처럼 그림 문자(픽토그램)가 든 줄은 `--from`/`--to` 로 범위에서 뺀다. 블로그는 이모지·픽토그램을 싣지 않는다.
- 처음 뜰 때 범위를 모르면 `--from`/`--to` 를 짐작으로 주고, 끝 코드 5 가 보여 주는 화면을 보고 고친다.

도구가 창 크기(100×60), 폴더 신뢰 확인, 화면이 멈출 때까지 기다리기, 세션·기록 정리를 모두 맡는다. 폴더 신뢰 기록은 캡처 전용 폴더 하나만 처음 한 번 `~/.claude.json` 에 남는다. 실행이 끝나면 띄운 프로그램의 버전과 잘라 낸 화면을 글자로 보여 준다. 그 글자를 읽고 본문에 쓸 사실을 고른다.

| 끝 코드 | 할 일 |
| --- | --- |
| 0 | 올린다 |
| 2 | 경로·이메일·키·사용량·플랜이 범위에 들었다. 출력된 줄을 보고 `--from`/`--to` 를 좁혀 다시 뜬다 |
| 3 | 명령이 뜨지 않았다(미설치·미로그인). 2단계로 |
| 4 | tmux 가 없다. 2단계로 |
| 5 | `--from`/`--to` 글자가 화면에 없다. 출력된 화면을 보고 글자나 `--keys` 를 고친다 |

도구가 출력한 버전이 글이 다루는 버전보다 낮으면 그 변경은 화면에 없다. 사용자 동의를 받아 `claude update` 뒤에 뜨거나, 2단계로 간다(클라우드 루틴은 보통 최신이다).

화면이 바뀌는 선택은 하지 않는다. `/model` 같은 선택기에서 항목을 고르는 Enter 는 사용자 기본값을 저장한다. 선택기는 여는 데까지만 키를 보낸다.

## 올리기

- **로컬·MCP:** `upload_post_image` 에 `slug`, `name`(파일 이름), `svg`(파일 내용)를 넣는다.
- **실행기:** `--upload-json <slug>` 로 만든 파일을 그대로 보낸다: `curl -sS -X POST "$APP/api/releases/worker/" -H "Authorization: Bearer $TOKEN" -H "content-type: application/json" --data-binary @/tmp/context-1m.svg.json`

## 본문

- 캡션에 도구가 출력한 버전을 넣는다: `![v2.1.292 Sonnet 5.5 세션의 /context](/posts/<slug>/context-1m.svg)`
- 문단에서 버전과 함께 확인한 것임을 밝힌다: "v2.1.292에서 `/context`를 열어 보니 창이 1m tokens였습니다." '직접'은 붙이지 않는다.
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
