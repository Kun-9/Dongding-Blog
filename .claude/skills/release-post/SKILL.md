---
name: release-post
description: Use when the user asks you directly (not through the admin "AI에게 맡기기") to write, rewrite, continue, or polish a dongding 블로그 릴리스·업데이트 글 — "릴리스 글 써줘", "업데이트 글", "이 주제로 글", "릴리스 글 재작성", "초안 다듬어", 릴리스 주제(release topic)·글감(candidates)을 다룰 때.
---

# 릴리스 글 직접 쓰기

릴리스 글의 절차는 실행기 지시서 하나가 정본이다. 직접 쓸 때도 그 절차를 그대로 밟고, HTTP 액션 대신 블로그 MCP 도구를 쓴다. 그래야 어드민에서 맡긴 글과 같은 기준·같은 단계 기록이 남는다.

## 시작

1. 지시서를 읽는다: `curl -sS https://blog.dongding.dev/api/releases/worker/` (토큰 없이 열린다). "단계별 할 일"과 "쓰기 기준"이 이 작업의 규칙이다. "순서"의 claim·report·finish 는 실행기 전용이라 건너뛴다.
2. `list_release_topics` 로 주제의 `stage` 와 `next` 를 본다. 요청이 지금 단계와 맞지 않으면(이미 점검까지 끝난 주제를 "처음부터" 등) 쓰기 전에 고르게 한다: 기존 초안 다듬기 / `update_release_topic` revert 로 되돌려 다시 쓰기 / 새 slug.
3. `next` 단계부터 하나씩 한다. 단계를 건너뛰지 않는다.

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
| (쓰기 기준) | `get_release_writing_guide` — 지시서 안의 기준과 같다 |

## 단계마다

- **2차 소스:** 공식 문서·PR·이슈를 읽고 확인한 사실에 링크를 단다. 직접 실행해 볼 수 있으면 해 보고 결과를 노트에 남긴다.
- **자료:** **REQUIRED SUB-SKILL:** blog-figures 로 그림을 고른다(그림 블록은 쓰기만 하면 스크롤 애니메이션이 붙는다). 실제 화면이 필요하면 **REQUIRED SUB-SKILL:** blog-capture.
- **초안:**
  - 요약 박스에 버전마다 `v2.1.280(2026년 9월 23일 배포)` 를 붙인다. 날짜는 `released` 를 그대로 쓴다.
  - 제목은 쓰기 기준대로 짓는다. 주제 이름을 그대로 쓰지 않는다.
  - 본문 통째(`body`)는 처음 만들 때와 초안 단계에서 다시 쓸 때만 쓴다. 그 뒤 수정은 `replacements`.
- **점검:** `check_release_voice` 경고를 replacements 로 고쳐 다시 검사한다. 통과하면 `advance_release_topic`. 서버가 같은 기준으로 한 번 더 막는다.

## 끝

- `check_release_voice` 가 `passed: true` 이고, `update_post`·`create_post` 응답의 `report.counts` 가 0이다.
- 주제에 끝낸 단계마다 근거가 기록돼 있다.
- 발행은 하지 않는다. `update_post` 로 visibility 를 published 로 바꾸지 않는다. 사람이 어드민의 발행 버튼으로 한다. 스튜디오 링크(`https://blog.dongding.dev/studio`)와 남은 일만 알린다.
