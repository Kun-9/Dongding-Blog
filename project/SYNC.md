# project/ — 기획·디자인 시안 미러

claude.ai/design 프로젝트 `BLOG`(`7b833edf-d807-40c6-ba64-764bd77f5bd8`)를 그대로 내려받은 사본.
마지막 갱신: 2026-08-09 (3회차 — 글 관리 화면)

## 규칙

- **읽기 전용 참조다.** 여기 파일을 고쳐도 클라우드에 반영되지 않는다. 시안을 바꾸려면 claude.ai/design 에서 바꾸고 다시 내려받는다.
- **코드를 복사해 쓰지 않는다.** 시안은 브라우저에서 `window.DD_TOKENS` 를 읽는 순수 JSX 고, 구현은 Next.js 서버 컴포넌트 + TypeScript 다. 구조가 달라 옮겨붙지 않는다. 화면을 만들 때 옆에 띄워놓고 눈으로 대조하는 용도.
- **`window.DD_DATA` 는 가짜 데이터다.** 글 8편·시리즈 5개 전부 실재하지 않는다. 실제 데이터는 Supabase 에서 온다.
- **시안에 없다고 구현을 지우지 않는다.** 아래 "구현에만 있는 것" 참조.

## 파일 대응

| 시안 | 구현 |
| --- | --- |
| `tokens.js` | `src/app/globals.css` (색값 60여 개 그대로 포팅) |
| `page-home.jsx` | `src/app/page.tsx` |
| `page-list.jsx` | `src/components/post/PostList.tsx`, `src/app/category/`, `src/app/tags/` |
| `page-detail.jsx` | `src/app/posts/[slug]/page.tsx`, `src/components/post/AdminBar.tsx` |
| `page-about-404.jsx` | `src/app/about/`, `src/app/not-found.tsx` |
| `page-extras.jsx` | `src/app/series/`, `src/app/search/`, `src/app/bookmarks/`, `src/app/studio/` |
| `page-settings.jsx` | `src/app/settings/`, `src/components/settings/CategoryManager.tsx` |
| `page-manage.jsx` | `src/app/manage/`, `src/app/drafts/`, `src/components/manage/*`, `src/lib/manage.ts` |
| `page-stats.jsx` | `src/app/admin/stats/` |
| `prose.jsx` | `src/components/prose/*` |
| `markdown.jsx` | `src/lib/markdown.tsx` |
| `fields.jsx` | `src/app/studio/page.tsx` 안의 분류·시리즈 선택 UI (전용 파일 없음) |
| `components.jsx` | `src/components/ui/*`, `src/components/layout/*` |
| `avatar.jsx` | `src/components/layout/Avatar.tsx` |
| `comments.jsx` | `src/components/comments/*` |
| `confirm-dialog.jsx` | `src/components/ui/ConfirmDialog.tsx` |
| `blog.html` | 시안 셸 — 구현 대상 아님 |
| `tweaks-panel.jsx` | 시안 전용 조작 패널 — 구현 대상 아님 |

시안 페이지 컴포넌트 13개(`HomePage` `PostListPage` `PostDetailPage` `AboutPage` `NotFoundPage` `SeriesPage` `SearchPage` `BookmarksPage` `SettingsPage` `AdminPage` `StatsPage` `StudioPage` `LoginPage`)는 **전부 구현되어 있다.**

### 이름이 다른 대응

| 시안 | 구현 |
| --- | --- |
| `TrendingSection` | `src/components/analytics/TopPosts.tsx` |
| `IC` | `src/components/prose/InlineCode.tsx` |
| `HeroGlow` | `globals.css` 의 `--glow-1` / `--glow-2` + body scenic glow |
| `LeadStripes` | `src/components/post/LeadFigure.tsx` 안에 흡수 |
| `BookmarkRow` / `BookmarkEditor` | `src/components/bookmarks/BookmarkList.tsx` |
| `SeriesCard` / `SeriesEditor` | `src/components/series/SeriesGrid.tsx` |

## 어긋난 곳

### 시안에 있는데 미구현 — 남은 것

**시리즈 선택 드롭다운 (`fields.jsx` 의 `SeriesField`).**
시안은 진행도(`n/N`)와 한 줄 설명이 붙은 커스텀 드롭다운인데, 구현은
`src/app/studio/page.tsx:2003` 이 아직 native `<select>` 다. 같은 필드의
**회차 슬롯 레일은 이미 구현돼 있다** — 남은 건 드롭다운 하나뿐이라
급하지 않다.

### 2026-08-09 3회차에 반영한 것

**글 관리 화면 (DEC-28) — 반영 완료.**
`/manage` 는 발행·비공개·검토·초안을 한 목록에 두고 상태 탭으로 가르고,
`/drafts` 는 같은 화면의 초안 필터 프리셋이다. 상태 탭 · 분류 칩 · 제목/요약
검색 · 정렬 3종 · 행 액션 · 체크박스 다중 선택 벌크까지 옮겼다.

시안과 다르게 만든 것 — 되돌리지 말 것:

- **행 액션이 hover 로 숨지 않는다.** 시안은 hover 시에만 띄우는데,
  DEC-22("hover 는 어포던스가 아니다")와 어긋난다. 항상 보이게 뒀다.
- **벌크는 클라이언트 루프**다 (`PATCH /api/posts/[slug]` 를 건별로).
  한 번에 옮기는 게 많아야 수십 건이라 배치 엔드포인트를 파지 않았다.
- 상태 변경 전용 `PATCH` 를 새로 냈다. `PUT` 은 본문까지 전부 요구해서
  상태 하나 옮기자고 글을 통째로 왕복시킬 이유가 없다.

**`review` 상태 신설.** 시안이 요구한 4번째 상태라 스키마까지 넓혔다 —
`supabase/migrations/20260809210000_visibility_review.sql`(check 제약),
`types.ts` · `posts.ts`(`VisibilitySchema`) · `lint.ts` · `mcp-blog.ts` ·
MCP 도구 인자 · Studio 공개범위 세그먼트(4-way). 공개 범위는 draft 와 같다 —
RLS 는 그대로 published 만 내보낸다.

**이미지 블록 문법 (DEC-27) — 반영 완료.**
`src/lib/image-blocks.ts` 에 판정 규칙을 모으고 `markdown.tsx` 가 줄 단위로
블록 승격, `src/components/prose/Figure.tsx` 가 `Figure` · `ImageGroup` ·
라이트박스 · 못 불러온 자리(점선 + 파일명)를 그린다.
`node scripts/check-image-blocks.mjs` 가 규칙을 돌려본다.

- `EditableImage` 의 px 슬라이더는 걷어내고 폭 3단 선택으로 바꿨다.
  임의 px 은 새 문법에 자리가 없다.
- 인라인 이미지(문장 안)는 캡션도 확대도 안 붙는다 — 시안과 같다.
  대신 **인라인 이미지는 Studio 에서 폭을 못 고른다** (새 문법에 자리가 없다).
- `ZoomableImage` 는 `Figure` 로 흡수돼 삭제했다.
- lint 규칙 `image-width` → `image-option` + `image-width-legacy` 로 교체.
- **본문 마이그레이션 4곳 완료** (2026-08-09): `baekjoon-3085-candy-game`
  의 `|20%` → `{sm}`, `supabase-practical-guide` 의 `|480` → `{sm}` ·
  `|720` → 옵션 없음(본문 폭과 같은 값이라 무손실),
  `blog-step-4-implementation` 은 문법 설명 표라 새 문법으로 고쳐 썼다.
  `|480` 을 `{sm}`(380px) 으로 좁힌 건 사람이 고른 값이다 — 둘 다 로고·캡처라
  작게 두는 편이 낫다고 봤다.

**남은 어긋남:** 시안 `PRD.html` §05 정보 구조에 `/manage` · `/drafts` 가 없다.
DEC-28 만 추가되고 사이트맵이 따라오지 않았다 — 클라우드에서 맞춰야 한다.

### 분류 필드 (DEC-26)

**분류 필드 커스텀 컴포넌트 (`fields.jsx`, DEC-26). — 대부분 반영됨.**
시안은 `<select>` 를 버렸다 — 카테고리는 상위 pill + 하위 pill 2단(펼친 채 고정),
시리즈는 진행도 붙은 커스텀 드롭다운 + 회차 슬롯 레일.

구현 상태 (2026-08-09 3회차 재확인):

- 카테고리 — `src/app/studio/page.tsx:1846` 의 `CategoryField` 로 **구현됨.**
  상위 pill + 하위 pill 2단. 다만 **저장되는 값은 여전히 하나**다 — 하위를 고르면
  서브 id, "전체" 를 고르면 부모 id 를 넣고 상위 줄은 역추적해 칠하기만 한다.
  시안이 말한 별도 `subcategory` frontmatter 필드는 **의도적으로 만들지 않았다**
  (같은 파일 주석에 근거가 남아 있다). 되돌리지 말 것.
- 시리즈 회차 슬롯 레일 — 같은 파일 `slotCount` 로 **구현됨.**
- 시리즈 선택 드롭다운 — 아직 native `<select>` 다 (위 "남은 것" 참조).

`page-settings.jsx` 의 `SeoPreview` · `SeoMeter` 는 1회차 미구현 항목이었고
2026-08-09 에 `src/app/settings/page.tsx` 로 구현했다.

다만 **SNS 카드 미리보기는 시안을 그대로 옮기지 않았다.** 시안 목업은 검은 배경
단일 헤드라인인데, 실제 OG 이미지(`src/app/opengraph-image.tsx`,
`src/app/posts/[slug]/opengraph-image.tsx`)는 크림 배경에 `동` 타일 + 여러 줄
헤드라인이다. 시안이 낡았다. 미리보기는 **실물 쪽**을 재현한다 — 실제와 다른
미리보기는 없느니만 못하다. 시안을 실물에 맞추는 건 남은 일.

폭 계산·잘림 로직은 `src/lib/seo-text.ts` 로 빼고
`node scripts/check-seo-text.mjs` 로 점검한다.

### 구현에만 있는 것 — 시안·문서 어디에도 없음

지우면 안 된다. 시안에 반영할지는 별도 판단.

- `src/app/api/**` — 백엔드 전체 (시안은 가짜 데이터라 애초에 없음)
- `src/app/card/` + `src/lib/og.ts` + `src/lib/og-tokens.ts` — OG 카드 이미지 생성 (satori)
- `src/lib/lint.ts` + `scripts/check-lint-rules.mjs` — 글 점검 규칙
- `src/lib/mcp-auth.ts` + `src/lib/mcp-blog.ts` — MCP 커넥터
- `src/components/prose/EditableImage.tsx` — 미리보기에서 그림 폭 3단을 고르는 패널 (시안엔 대응물 없음)
- `src/components/providers/ThemeProvider.tsx` — 다크모드 인프라
- `src/components/comments/Giscus.tsx` — 댓글 실연동
- `src/components/analytics/PostViews.tsx` · `Umami.tsx` — 분석 연동

### 문서에만 어긋난 것

- ~~클라우드 `CHANGELOG.md` 의 `Latest deployed: v1.2.1`~~ → 2026-08-09 정리 완료.
  `[Unreleased]` 를 `v1.3.0` 으로 승격하고 **배포 상태 표기 자체를 걷어냈다.**
  시안 프로젝트는 서버 상태를 알 수 없어서, 적는 순간부터 틀리기 시작한다
  (실제로 넉 달간 커밋 70여 개가 배포되는 동안 `v1.2.1` 로 굳어 있었다).
- 레포에서는 CHANGELOG · SemVer · 배포 상태 표기를 쓰지 않는다. `git log origin/main` 이 그 역할을 한다.
- 클라우드 `CLAUDE.md` 의 작업 규칙은 claude.ai/design 안에서만 유효하다. 이 레포에는 적용되지 않는다.
- `PRD.html` 의 결정 로그(DEC-NN)는 계속 쓴다 — "왜 그 방향으로 정했나"는 git log 가 대신하지 못한다.
- `PRD.html` 표지가 `v1.3.0 (작업 중)` · `Updated 2026.08.07` 에 멈춰 있다. 그런데
  결정 로그는 그 사이 `v1.4.0` · `v1.5.0` 을 지나 **`v1.6.0`(DEC-26·27)** 까지 왔고,
  `CHANGELOG.md` 는 `v1.3.0` 을 확정본으로 닫아 두었다. 표지·CHANGELOG·결정 로그
  세 곳이 서로 다른 버전을 가리킨다 — 클라우드에서 한 번에 맞춰야 한다.
- `MARKDOWN.html` 도 표지는 `v1.3.0` · `Updated 2026.08.09` 인데 본문에는
  §09 이미지(= v1.6.0 기능)가 들어 있다.
- 2회차 변경(이미지 블록 · 분류 필드)은 `CHANGELOG.md` 에 여전히 **기록되지 않았다.**
  3회차 글 관리 화면은 `[Unreleased]` 로 기록됐다 — 절차가 한 번 건너뛰어졌던 셈.
- `PRD.html` §05 정보 구조에 `/manage` · `/drafts` 가 없다. DEC-28 은 추가됐는데
  사이트맵이 따라오지 않았다.

### 지금 로컬이 클라우드보다 앞선 것 — 손으로 옮겨야 함

**`project/CLAUDE.md`.** 배포 상태 표기 규칙(§2·§3·§5)을 걷어낸 판이 로컬에만
있다. `DesignSync` 는 `CLAUDE.md` 와 `.claude/` 쓰기를 **차단한다** — 디자인
에이전트에게 지시를 흘려보낼 수 있는 경로라서 계획에 넣어도 거부된다.

claude.ai/design 에서 직접 열어 `project/CLAUDE.md` 내용으로 덮어써야 한다.
그때까지 클라우드 규칙은 없어진 `Deployed` 배지를 계속 요구한다.

2026-08-09 3회차에서 다시 확인했다 — 클라우드 판은 아직 옛 규칙(§2 `Latest deployed`,
§3 배포 상태 표기 3종) 그대로다. 로컬 판을 덮어쓰지 않았다.

## 갱신 방법

claude.ai/design 에서 시안을 바꾼 뒤, `DesignSync` 로 바뀐 파일만 다시 받아 이 디렉터리에 덮어쓴다.

```
DesignSync({method:"list_files", projectId:"7b833edf-d807-40c6-ba64-764bd77f5bd8"})
DesignSync({method:"get_file",   projectId:"7b833edf-d807-40c6-ba64-764bd77f5bd8", path:"<파일>"})
```

파일 하나가 최대 1,200줄 / 70KB 라 여러 개를 한 컨텍스트에서 받으면 금방 찬다.
**서브에이전트에 나눠 맡길 수는 없다** — `DesignSync` 는 claude.ai 로그인으로 붙는
도구라 메인 세션에만 있고, 서브에이전트에서는 `ToolSearch` 가 못 찾는다.
응답이 커서 하니스가 파일로 떨궈 주면 그 JSON 의 `content` 만 뽑아 `diff` 하는 쪽이
싸고 정확하다.

## 내려받지 않은 것

바이너리라 제외했다. 필요하면 claude.ai/design 에서 직접 받는다.

- `assets/` — avatar / favicon PNG · SVG (구현본은 `public/`, `src/app/icon.svg` 에 이미 반영됨)
- `uploads/` — 초기 레퍼런스 이미지, `DESIGN-lovable.md`
