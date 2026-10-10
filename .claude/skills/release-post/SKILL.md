---
name: release-post
description: Use when the user asks you directly (not through the admin "AI에게 맡기기") to write, rewrite, continue, or polish a dongding 블로그 릴리스·업데이트 글 — "릴리스 글 써줘", "업데이트 글", "이 주제로 글", "릴리스 글 재작성", "초안 다듬어", 릴리스 주제(release topic)·글감(candidates)을 다룰 때.
---

# 릴리스 글 직접 쓰기

릴리스 글의 절차는 실행기 지시서 하나가 정본이다. 직접 쓸 때도 그 절차를 그대로 밟고, HTTP 액션 대신 블로그 MCP 도구를 쓴다. 그래야 어드민에서 맡긴 글과 같은 기준·같은 단계 기록이 남는다.

## 시작

1. 지시서를 읽는다: `curl -sS https://blog.dongding.dev/api/releases/worker/` (토큰 없이 열린다). "단계별 할 일"과 "쓰기 기준"이 이 작업의 규칙이다. "순서"의 claim·report·finish 는 실행기 전용이라 건너뛴다.
2. `list_release_topics` 로 주제의 `stage` 와 `next` 를 본다. 요청이 지금 단계와 맞지 않으면(이미 점검까지 끝난 주제를 "처음부터" 등) 쓰기 전에 고르게 한다: 기존 초안 다듬기 / `update_release_topic` revert 로 되돌려 다시 쓰기 / 새 slug. revert 는 한 번에 한 단계만 내리고 그 단계의 근거만 지운다. 작업 노트·글·postSlug 는 남는다.
3. `next` 단계부터 하나씩 한다. 단계를 건너뛰지 않는다.

주제가 어드민에서 **예약**된 것(`ai.status` queued, `ai.local` true)이면 release-reserved 로 집은 뒤 쓴다. 집지 않고 쓰면 어드민에는 계속 "예약"으로 남고 로컬 실행기가 같은 주제를 또 집는다.

## 대응표

| 지시서 액션 | MCP 도구 |
| --- | --- |
| candidates | `get_release_candidates` — `released` 가 배포일 |
| notes | `save_release_notes` (`## 2차 소스`, `## 자료` 섹션) |
| advance | `advance_release_topic` (근거 note, 자료 단계에서 `postSlug`) |
| taxonomy / slugs | `list_taxonomy` / `list_posts` |
| post_get | `get_post` |
| post_create | `create_post` (visibility `draft`) |
| post_update | `update_post` |
| check | `check_release_voice` |
| image | `upload_post_image` |
| (쓰기 기준) | `get_release_writing_guide` — 지시서 안의 기준과 같다. 주제 `kind` 가 `concept` 이면 `kind: "concept"` |

## 단계마다

- **2차 소스:** 공식 문서·PR·이슈를 읽고 확인한 사실에 링크를 단다. 직접 실행해 볼 수 있으면 해 보고 결과를 노트에 남긴다. 활용 예 두세 개도 이때 찾는다. 공식 예제·샘플 저장소·문서 예시에서 고르고, 코드를 실행하지 않는 확인으로 직접 열어 본다. 예: Mods 글은 `claude-code-playground` 의 샘플 mod 셋을 받아 `claude plugin validate` 로 받는 이벤트·부르는 API 를 확인했다. 기준 독자(Claude Code는 쓰지만 이 기능은 처음 보는 개발자)가 이미 아는 것 한 줄과, 모를 용어를 한 문장 풀이와 함께 노트에 모은다.
- **자료:** 그림이 이 블로그의 차별점이다. **REQUIRED SUB-SKILL:** blog-figures 맨 앞 "그림이 글의 중심이다" 절을 따라, 글에서 이해가 막히는 지점(바뀐 동작·계산·순서·관계)마다 무엇을 그릴지 초안 전에 정하고 최대한 단순하게 그린다(그림 블록은 쓰기만 하면 스크롤 애니메이션이 붙는다). 실제 화면이 필요하면 **REQUIRED SUB-SKILL:** blog-capture.
  - 글의 핵심 그림 하나는 장면(`scene: on`)으로 만든다. 버전마다 바뀐 것은 timeline 장면, 단계마다 달라지는 계산은 bars 장면. 문법과 설명 쓰는 법은 blog-figures 의 "장면".
  - 글의 핵심 숫자 두세 개는 `stats` 카드로 모은다. 값이 굴러 멈추는 자리라 다른 그림에 숫자 카드를 흩지 않는다.
  - 지금 키트로 그릴 수 없는 그림(새 화면 모양, 새 움직임)이 필요하면 흉내 내지 말고 **REQUIRED SUB-SKILL:** blog-figure-extend 로 키트를 더해 배포한 뒤 그 그림을 쓴다.
  - 활용 예 두세 개는 blog-figures 의 "활용 예"대로 figure 장면의 터미널로 화면을 재현하고(문구는 직접 띄운 화면·README·소스에서 옮긴다, 캡처는 장면 안에 합친다, 어떻게 옮겼는지는 캡션 괄호로만 밝히고 본문에 쓰지 않는다), 따라 할 명령 한 줄로 맺는다. 이름·이벤트만 적은 카드로 끝내지 않는다.
- **초안:**
  - 개념 글(`kind: concept`, MVC·JWT 같은 개념 하나)은 지시서의 "개념 글일 때"를 따른다. 날짜·버전을 쓰지 않는다. 아래 배포일 규칙은 릴리스 글만.
  - 요약 박스는 두 문장, 160자 안팎. 첫 문장은 독자가 무엇을 할 수 있게 되는지, 버전·배포일은 둘째 문장에. 고칠 때는 문장을 덧붙이지 말고 있던 문장을 줄여서 맞추고, 고친 문장도 글자 수를 다시 잰다. 2026-10-08 Mods 글에서 독자 문장을 앞에 덧붙이기만 해 박스가 201자에서 237자로 늘었다.
  - 요약 박스에 버전마다 `v2.1.280(2026년 9월 23일 배포)` 를 붙인다. 날짜는 `released` 를 그대로 쓴다. 공식 발표일(미국 기준)과 하루 다르더라도 배포일 하나만 쓴다. 배포일 값이 없는 버전(글감이 아닌 이전 버전)은 요약 박스에 쓰지 않는다.
  - 제목은 쓰기 기준대로 짓는다. 주제 이름을 그대로 쓰지 않는다.
  - 본문 통째(`body`)는 처음 만들 때와 초안 단계에서 다시 쓸 때만 쓴다. 그 뒤 수정은 `replacements`.
  - 나란한 방법·선택지를 "첫째, 둘째, 셋째"로 한 문단에 잇지 않는다. blog-figures 의 figure 카드(`fig-grid-3`)로 나누고 문단에는 고르는 기준이나 용어 풀이만 남긴다. 점검이 `stock-phrase`(첫째·둘째로 잇는 나열 문단)로 잡는다.
  - 장황함을 걷어 낸다. 그림·표·장면이 보여 준 것은 문단에서 다시 풀지 않고, 용어 풀이는 괄호나 반 문장으로 붙인다. 다 쓴 뒤 문장마다 지워 보고 뜻이 통하면 지운다. 2026-10-08 JWT 글은 점검을 통과하고 읽기 6분이었는데도 "설명이 장황한 부분이 꽤 있다"는 지적을 받아 문단마다 한두 문장씩 줄였다.
  - `create_post`·`update_post` 응답의 `report.stats.readTime` 이 6 이하인지 본다. 점검(`check_release_voice`)은 산문 4,000자만 보고 읽기 시간은 보지 않는다. 읽기 시간은 코드 블록의 단어와 링크 주소까지 세므로, 코드는 핵심 몇 줄만 남긴다.
- **점검:** `check_release_voice` 경고를 replacements 로 고쳐 다시 검사한다. 통과하면 `advance_release_topic`. 서버가 같은 기준으로 한 번 더 막는다.
  - 문체 점검은 사실을 보지 않는다. 경고가 없어도 "미확인", "문서에 없음", "초안"으로 적은 사실은 공식 문서를 다시 찾고, 여러 언어·도구로 넓혀 말한 문장은 확인한 범위로 좁힌다. 2026-10-10 발행 전 검토에서 점검을 통과한 일곱 편을 다시 읽었다. Cursor 가 CLAUDE.md 를 읽는다는 것, Haiku 5.5 의 100K 기준에 캐시 토큰이 들어간다는 것, IETF 초안이 RFC 10017 로 나왔다는 것이 이미 문서에 있었다. "예외는 다른 스레드로 번지지 않는다"는 C++·Go 에서 틀려 Python·Java 로 좁혔다.
  - advance 전에 모바일에서 본다: `node .claude/skills/release-post/mobile-check.mjs <slug>`. 운영 미리보기(`/preview/<slug>`)에 `.env.local` 스튜디오 계정으로 로그인해 390px 화면을 라이트·다크로 끝까지 내리며(장면은 박자마다) 문서 가로 넘침, 그림 판 밖으로 나간 요소, 터미널 줄이 토큰 중간에서 끊긴 곳, 한 칸에 겹친 단계 화면(`fig-layer`)이 둘 이상 보이는 곳을 잡는다. 끝 코드 0 통과, 1 문제 목록(글 쪽이면 replacements 로, 렌더러 쪽이면 사용자에게 알리고 코드는 워크트리에서 고친다), 3 브라우저·로그인 불가(finish 의 `todo` 에 "모바일 확인"을 남긴다). 출력의 `figures` 가 0이면 미리보기를 못 본 것이다. 문체 점검은 화면을 보지 않는다. 2026-10-08 JWT 글은 점검을 통과했는데 모바일에서 sequence 세로선이 안 보이고 상자가 판 밖으로 나갔다. 검사가 통과해도 장면은 박자마다 한 번 떠서 눈으로 본다. 2026-10-09 Haiku 5.5 글은 검사를 통과했지만, 떠 보니 터미널 장면이 화면에 들어오는 순간 단계 화면 셋이 포개져 있었다(렌더러 버그, 겹침 검사를 더함).

## 끝

- `check_release_voice` 가 `passed: true` 이고, `update_post`·`create_post` 응답의 `report.counts` 가 0이다.
- 주제에 끝낸 단계마다 근거가 기록돼 있다.
- 발행은 하지 않는다. `update_post` 로 visibility 를 published 로 바꾸지 않는다. 사람이 어드민의 발행 버튼으로 한다. 스튜디오 링크(`https://blog.dongding.dev/studio`)와 남은 일만 알린다.
