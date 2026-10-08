---
name: release-reserved
description: Use when the user wants to see or work through dongding 블로그 릴리스 글 주제 that were reserved ("예약") in the admin — "예약된 글", "예약된 거 보여줘", "예약 목록", "예약된 글 써줘", "예약 작업 처리", "로컬에서 예약 처리". Lists the reserved topics, lets the user pick one, claims it, and writes it with release-post.
---

# 예약된 릴리스 글 쓰기

어드민에서 "AI에게 맡기기"의 실행 칸을 **예약**으로 고른 주제는 클라우드 루틴이 집지 않고 로컬 세션을 기다린다. 이 스킬은 그 목록을 보여 주고, 사용자가 고른 하나를 집어 release-post 절차로 쓴다.

## 1. 조회

블로그 MCP `list_release_topics` 를 `reserved: true` 로 부른다. 예약된 주제만 온다(`ai.status` queued, `ai.local` true).

비어 있으면 "예약된 글이 없습니다" 한 줄과, 어드민(https://blog.dongding.dev/admin/releases)에서 맡기기의 실행 칸을 "예약"으로 고르면 여기 쌓인다는 안내로 끝낸다.

## 2. 리스트업

맡긴 순서(`ai.updatedAt` 오래된 것부터)로 표를 보여 준다.

| 열 | 값 |
| --- | --- |
| 번호 | 1부터 |
| 제목 | `title` |
| 범위 | `next.label` → `ai.until` 라벨 (sources 2차 소스, assets 자료, draft 초안, review 점검) |
| 종류 | `kind` — release 릴리스, concept 개념 |
| 맡긴 시각 | `ai.updatedAt` 을 한국 시각 `MM.DD HH:mm` |

표 아래에 주제마다 `angle` 한 줄을 붙인다. 다른 설명은 덧붙이지 않는다.

## 3. 선택

AskUserQuestion 으로 고르게 한다. 하나뿐이어도 묻는다 — 집는 순간 어드민에 "작성 중"으로 바뀌기 때문이다.

- 1개: "이 주제 쓰기" / "그만두기" 두 선택지.
- 2~4개: 주제마다 선택지 하나(label 은 제목, description 은 범위·종류).
- 5개 이상: 오래된 4개를 선택지로 두고, 나머지는 Other 에 번호나 제목으로 받는다.

## 4. 집기

`claim_release_work` 를 고른 주제의 `id` 로 부른다. 주제가 running 이 되고 어드민 "AI 작성 중" 구역에 실시간 로그로 보인다. 돌아온 `work` 가 이후 작업의 기준이다.

`work` 가 null 이면 그 사이 다른 세션이 집었거나 어드민에서 취소한 것이다. 그렇게 알리고 1번부터 다시 한다.

## 5. 쓰기

**REQUIRED SUB-SKILL:** release-post 로 쓴다. 다만 이 주제는 집은 작업이라, release-post 가 실행기 몫이라며 건너뛰는 claim·report·finish 를 여기서는 한다.

- **범위:** `next` 단계부터 `ai.until` 까지만. until 을 넘기지 않는다. 더 하고 싶으면 끝낸 뒤 사용자에게 묻는다.
- **보고:** 단계를 시작할 때와 작은 일마다 `report_release_work` 로 한 줄 상황을 남긴다(1~2분에 한 번, "공식 문서 읽는 중 — …", "흐름 그림 그리는 중"처럼 구체적으로). 에러가 나면 어드민에서 취소한 것이다. 즉시 멈추고 finish 도 부르지 않는다.
- **끝내기:** 마지막에 반드시 `finish_release_work`. 성공이면 ok=true 와 한두 줄 요약, 막혔으면 ok=false 와 막힌 이유. 사람 몫의 남은 일(끝내 못 뜬 캡처, 미확인 사실 등)은 `todo` 에 한 줄로.
- **중단:** 사용자가 도중에 그만두라고 하면 finish ok=false 로 "사용자가 중단"과 어디까지 했는지를 남긴다. 집은 채 두면 어드민에 2시간 동안 "작성 중"으로 남는다.

## 끝

- release-post 의 "끝" 조건을 채웠고, `finish_release_work` 를 불렀다.
- 사용자에게 끝낸 단계, 초안 미리보기(`https://blog.dongding.dev/studio`), 남은 일을 알린다.
- 예약이 더 남았으면 몇 개인지 알리고, 이어서 고를지 3번처럼 묻는다.
