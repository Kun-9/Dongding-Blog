# project/ — 기획·디자인 시안 미러

claude.ai/design 프로젝트 `BLOG`(`7b833edf-d807-40c6-ba64-764bd77f5bd8`)를 그대로 내려받은 사본.
마지막 갱신: 2026-08-09

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
| `page-stats.jsx` | `src/app/admin/stats/` |
| `prose.jsx` | `src/components/prose/*` |
| `markdown.jsx` | `src/lib/markdown.tsx` |
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

### 시안에 있는데 미구현 — 없음

`page-settings.jsx` 의 `SeoPreview` · `SeoMeter` 가 마지막 미구현 항목이었고
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
- `src/components/prose/ZoomableImage.tsx` · `EditableImage.tsx` — 이미지 확대·편집
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
- `PRD.html` 표지에 `v1.3.0 (작업 중)` 이 남아 있다. v1.3.0 은 이제 확정본이라 손봐야 한다.

### 지금 로컬이 클라우드보다 앞선 것 — 손으로 옮겨야 함

**`project/CLAUDE.md`.** 배포 상태 표기 규칙(§2·§3·§5)을 걷어낸 판이 로컬에만
있다. `DesignSync` 는 `CLAUDE.md` 와 `.claude/` 쓰기를 **차단한다** — 디자인
에이전트에게 지시를 흘려보낼 수 있는 경로라서 계획에 넣어도 거부된다.

claude.ai/design 에서 직접 열어 `project/CLAUDE.md` 내용으로 덮어써야 한다.
그때까지 클라우드 규칙은 없어진 `Deployed` 배지를 계속 요구한다.

## 갱신 방법

claude.ai/design 에서 시안을 바꾼 뒤, `DesignSync` 로 바뀐 파일만 다시 받아 이 디렉터리에 덮어쓴다.

```
DesignSync({method:"list_files", projectId:"7b833edf-d807-40c6-ba64-764bd77f5bd8"})
DesignSync({method:"get_file",   projectId:"7b833edf-d807-40c6-ba64-764bd77f5bd8", path:"<파일>"})
```

파일 하나가 최대 1,200줄 / 70KB 라 여러 개를 한 컨텍스트에서 받으면 금방 찬다. 여러 개면 서브에이전트에 나눠 맡긴다.

## 내려받지 않은 것

바이너리라 제외했다. 필요하면 claude.ai/design 에서 직접 받는다.

- `assets/` — avatar / favicon PNG · SVG (구현본은 `public/`, `src/app/icon.svg` 에 이미 반영됨)
- `uploads/` — 초기 레퍼런스 이미지, `DESIGN-lovable.md`
