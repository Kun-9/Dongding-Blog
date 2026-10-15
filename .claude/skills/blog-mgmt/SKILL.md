---
name: blog-mgmt
description: Use when writing, editing, checking, or deleting posts in this dongding-blog repo — "글 작성", "포스트 추가/수정/삭제", "글 점검", "전체 점검", "오타 고쳐", "draft 발행", "slug 변경", "시리즈 추가", "카테고리 변경". Also use when writing post body markdown (callout, 코드블록, 표, 이미지 너비), when a lint rule fires, or when operating the MCP connector (토큰, OAuth, 커넥터 연결, 배포).
---

# blog-mgmt — Dongding Blog 글 관리

**글 정본은 Supabase `posts` 테이블이다.** `content/posts/*.md` 는 이관 후 남은
빈 껍데기이고 사이트는 읽지 않는다 — 거기에 파일을 만들면 아무 일도 일어나지 않는다.

건드리는 경로는 셋이고, 전부 같은 DB 를 본다:

| 경로 | 언제 |
|---|---|
| **MCP 도구** | Claude 가 직접 읽고 점검하고 고칠 때. 기본 경로 |
| **Studio** (`/studio`, dev) | 사람이 미리보기 보며 쓸 때. 드래그·붙여넣기 이미지 업로드 |
| `/api/posts/*` | Studio 가 쓰는 편집 API. 직접 호출할 일은 거의 없음 |

## 참고 문서

| 문서 | 내용 |
|---|---|
| [MARKDOWN.md](MARKDOWN.md) | 자체 마크다운 문법. **본문 쓰기 전 반드시 훑을 것** |
| [RULES.md](RULES.md) | 점검 규칙 카탈로그 (규칙 id → 뜻 → 고치는 법) |
| [CONNECTOR.md](CONNECTOR.md) | MCP 커넥터 인증·연결·배포·문제 해결 |

관련 스킬: DB·마이그레이션·타입 재생성은 `dongding-supabase`,
로그인이 필요한 화면·API 를 브라우저로 실측할 때는 `studio-login`.

## MCP 도구

| 도구 | 언제 |
|---|---|
| `check_posts` | "글 점검" 전반. 문제 있는 글만 돌려준다 |
| `get_post` | 본문이 필요할 때. **수정 전 반드시** — replacements 가 여기서 본 문자열을 찾는다 |
| `list_posts` | 어떤 글이 있는지 훑기, 카테고리·태그·상태로 고르기. 본문 없음 |
| `list_taxonomy` | 카테고리/시리즈 id 확인. **글 만들거나 카테고리 바꾸기 전 필수** |
| `create_post` | 새 글. 기본 draft |
| `update_post` | 수정. 본문은 `replacements` 우선 |
| `delete_post` | 삭제. `confirm: true` 필요 |

`create_post`·`update_post` 는 **작업 후 점검 결과를 같은 응답으로** 돌려준다.
끝났다고 말하기 전에 `report.counts` 를 확인할 것.

## 점검의 경계

**규칙으로 잡히는 건 서버가, 판단이 필요한 건 모델이.**

`check_posts` 가 잡는 것은 결정론적인 것뿐이다 — 렌더 파손, 메타데이터 정합,
링크·이미지 무결성, 정해진 상투구와 후속편 도입(info). **오타·비문·사실 오류는 안 나온다.** 그건 `get_post` 로
본문을 읽고 직접 찾아야 한다. "점검 돌렸으니 오타도 봤다"는 성립하지 않는다.

심각도: `error` 는 사이트에서 실제로 깨져 보이는 것, `warning` 은 의도와 다르게
렌더되는 것, `info` 는 참고. `check_posts({minSeverity:"error"})` 로 좁힌다.

## 오타 수정 워크플로

```
get_post(slug)                          # 원문 확보
  → 본문 읽고 오타·비문 직접 판단
  → update_post(slug, replacements: [{old, new}, ...])
  → 응답의 report 로 렌더가 안 깨졌는지 확인
```

`replacements` 는 본문에 **정확히 한 번** 나오는 문자열만 바꾼다.
- 0곳 → 에러. 모델이 본 본문이 낡았다. `get_post` 다시.
- 여러 곳 → 에러. 앞뒤 문맥을 더 붙여 한 곳만 가리킬 것.

본문 전체를 `body` 로 다시 쓰지 말 것 — 원문이 조용히 유실된다.
`body` 와 `replacements` 는 함께 못 쓴다.

## 새 글 쓰기

1. `list_taxonomy` 로 카테고리·시리즈 id 확인. **표시명이 아니라 id** —
   예: 알고리즘 풀이 카테고리의 id 는 `algorithm-solve`. 없는 id 는 DB FK 가 거부한다.
2. 사용자에게 확인: 제목·요약·카테고리·태그·시리즈·slug.
3. 본문은 [MARKDOWN.md](MARKDOWN.md) 문법으로. H2/H3 최소 2개(목차가 잡히도록).
4. `create_post` — **visibility 는 draft 로 시작**. 발행은 사용자가 말했을 때만.
5. 응답의 `report` 확인.

slug 는 `^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$`. 대문자·언더스코어·한글 불가.

## 시리즈

메타(`series` 테이블)와 소속(글의 `series` + `seriesOrder`)이 따로다.
`series` 만 지정하고 `seriesOrder` 를 빠뜨리면 목록 끝으로 밀린다 — 항상 둘 다.

시리즈의 `count`(= `planned_count`)는 발행 편수가 아니라 **계획 편수**다.
아직 안 쓴 회차를 대시로 그리는 데 쓰인다.

## 사용자 확인이 필요한 동작

- 글 삭제 (`confirm: true` 없이는 도구가 거부한다)
- slug 변경 — URL 이 바뀐다. **Storage 이미지 폴더는 따라가지 않는다**
  (`post-images/<slug>/`). 응답의 `imageWarning` 확인
- published → draft/private 강등
- 시리즈 삭제 (소속 글들을 어떻게 할지)

## 이미지

- 저장소: Supabase Storage `post-images/<slug>/<파일>`
- 본문 표기: `![설명](/posts/<slug>/<파일>)` — `next.config` 의 fallback rewrite 가
  Storage 로 넘긴다. **Storage URL 을 본문에 직접 쓰지 말 것**
- 업로드: Studio 에디터(드래그·붙여넣기·툴바, dev 모드) 또는
  `POST /api/posts/[slug]/images`, MCP `upload_post_image`(SVG 는 `svg`, PNG·JPEG 는 `base64`).
  실제 화면 캡처는 blog-capture 스킬

## Red Flags — 멈추고 확인

- 카테고리·시리즈 id 가 `list_taxonomy` 에 없음
- 본문에 `<...>` JSX/HTML 태그
- 코드 펜스 ` ``` ` 짝이 안 맞음
- 시리즈 글인데 `seriesOrder` 누락
- 이미지 경로가 `/posts/...` 가 아님
- `content/posts/` 에 파일을 만들려 하고 있음 (사이트가 안 읽는다)

## 코드 위치

| 파일 | 역할 |
|---|---|
| `src/lib/markdown.tsx` | 자체 파서. 문법의 정본 |
| `src/lib/lint.ts` | 점검 규칙. 순수 모듈(next 의존 없음) |
| `src/lib/mcp-blog.ts` | MCP 데이터 계층 + 부분수정 병합 + 치환 |
| `src/app/api/mcp/route.ts` | 도구 정의와 `instructions` |
| `src/app/api/posts/_shared.ts` | **쓰기 검증·행 변환의 정본.** Studio API 와 공유 |

**쓰기 로직을 새로 짜지 말 것.** `_shared.ts` 가 두 벌이 되면 반드시 어긋난다.

`markdown.tsx` 를 고치면 `lint.ts` 규칙이 어긋난다 —
`node scripts/check-lint-rules.mjs` 를 먼저 돌릴 것.
