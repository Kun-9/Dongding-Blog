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

- **2차 소스:** 공식 문서·PR·이슈를 읽고 확인한 사실에 링크를 단다. 직접 실행해 볼 수 있으면 해 보고 결과를 노트에 남긴다. 활용 예 두세 개도 이때 찾는다. 공식 예제·샘플 저장소·문서 예시에서 고르고, 코드를 실행하지 않는 확인으로 직접 열어 본다. 예: Mods 글은 `claude-code-playground` 의 샘플 mod 셋을 받아 `claude plugin validate` 로 받는 이벤트·부르는 API 를 확인했다.
- **자료:** 그림이 이 블로그의 차별점이다. **REQUIRED SUB-SKILL:** blog-figures 맨 앞 "그림이 글의 중심이다" 절을 따라, 글에서 이해가 막히는 지점(바뀐 동작·계산·순서·관계)마다 무엇을 그릴지 초안 전에 정하고 최대한 단순하게 그린다(그림 블록은 쓰기만 하면 스크롤 애니메이션이 붙는다). 실제 화면이 필요하면 **REQUIRED SUB-SKILL:** blog-capture.
  - 글의 핵심 그림 하나는 장면(`scene: on`)으로 만든다. 버전마다 바뀐 것은 timeline 장면, 단계마다 달라지는 계산은 bars 장면. 문법과 설명 쓰는 법은 blog-figures 의 "장면".
  - 글의 핵심 숫자 두세 개는 `stats` 카드로 모은다. 값이 굴러 멈추는 자리라 다른 그림에 숫자 카드를 흩지 않는다.
  - 활용 예 두세 개는 blog-figures 의 "활용 예 카드"로 한 줄에 묶고, 카드 뒤 문단에서 하나를 골라 동작을 풀고 따라 할 명령·코드 한 줄을 붙인다.
- **초안:**
  - 개념 글(`kind: concept`, MVC·JWT 같은 개념 하나)은 지시서의 "개념 글일 때"를 따른다. 날짜·버전을 쓰지 않는다. 아래 배포일 규칙은 릴리스 글만.
  - 요약 박스에 버전마다 `v2.1.280(2026년 9월 23일 배포)` 를 붙인다. 날짜는 `released` 를 그대로 쓴다. 공식 발표일(미국 기준)과 하루 다르더라도 배포일 하나만 쓴다. 배포일 값이 없는 버전(글감이 아닌 이전 버전)은 요약 박스에 쓰지 않는다.
  - 제목은 쓰기 기준대로 짓는다. 주제 이름을 그대로 쓰지 않는다.
  - 본문 통째(`body`)는 처음 만들 때와 초안 단계에서 다시 쓸 때만 쓴다. 그 뒤 수정은 `replacements`.
- **점검:** `check_release_voice` 경고를 replacements 로 고쳐 다시 검사한다. 통과하면 `advance_release_topic`. 서버가 같은 기준으로 한 번 더 막는다.

## 끝

- `check_release_voice` 가 `passed: true` 이고, `update_post`·`create_post` 응답의 `report.counts` 가 0이다.
- 주제에 끝낸 단계마다 근거가 기록돼 있다.
- 발행은 하지 않는다. `update_post` 로 visibility 를 published 로 바꾸지 않는다. 사람이 어드민의 발행 버튼으로 한다. 스튜디오 링크(`https://blog.dongding.dev/studio`)와 남은 일만 알린다.
