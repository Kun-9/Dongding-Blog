# Umami 분석 통합 설계서

- **작성일**: 2026-04-27
- **대상 프로젝트**: `dongding-blog` (Next.js 16 + 정적 export, GitHub Pages)
- **상태**: 설계 승인 대기

---

## 1. 목표·범위

`dongding-blog`에 Umami Cloud(무료 플랜)를 통합해 가벼운 트래픽 분석을 도입한다.

### 포함

- 자동 페이지뷰 추적 (Umami 스크립트)
- 태그 클릭 커스텀 이벤트
- 글 페이지 하단 조회수 노출
- 홈 페이지 하단 "인기글 TOP 5" 섹션 (최근 7일)
- `/admin` 어드민 통계 패널 (개발 모드 전용)

### 제외 (YAGNI)

- 북마크·CTA·검색·다크모드 등 추가 커스텀 이벤트
- 공개 통계 페이지 / 외부 임베드
- 다국가·세그먼트 필터 UI
- A/B 테스트, 히트맵, 세션 리플레이

### 성공 기준

- prod 배포 후 Umami 대시보드에 페이지뷰 집계 시작
- 글 페이지에서 조회수가 표시됨 (또는 데이터 없으면 조용히 비표시)
- 홈 하단의 인기글 섹션이 7일치 데이터로 채워짐
- 태그 클릭이 Umami 이벤트로 잡힘
- `npm run dev` → `/admin/stats` 에서 요약 통계 확인 가능
- `npm run build`(정적 export) 가 깨지지 않음

---

## 2. 아키텍처

```
                 ┌─ prod (GitHub Pages, output: "export") ─────┐
브라우저          │                                              │
  ├─ <Umami>     ├─→ cloud.umami.is/script.js                   │ 자동 pageview
  │              │                                              │
  ├─ track()     ├─→ cloud.umami.is/api/send                    │ 태그 클릭
  │              │                                              │
  └─ fetch()     └─→ api.umami.is/v1/share/{shareId}/...        │ 조회수·인기글
                                                                │
                 ┌─ dev (npm run dev) ──────────────────────── ─│
                 │                                              │
어드민 통계  ←──→ /api/stats/* (Next.js route)                  │
                  └─→ api.umami.is/v1/websites/{id}/...         │ Bearer token
                                                                │
                  (prod 빌드 시 static-build.mjs가              │
                   src/app/api 디렉토리 통째로 stash → 자동 제외)│
                                                                ┘
```

### 핵심 설계 결정

1. **Umami Cloud 사용** — 셀프호스팅 운영 부담 회피, 무료 플랜(10k events/월)으로 충분
2. **share URL 기반 공개 통계** — prod엔 백엔드가 없으므로 토큰을 노출하지 않는 read-only 공개 API 사용
3. **어드민은 dev 전용** — 기존 `/api/settings`, `/api/bookmarks` 등의 프로젝트 패턴(`static-build.mjs` stash) 준수
4. **클라이언트 사이드 fetch** — 정적 빌드 환경에서 빌드 타임 데이터 의존성 회피, sessionStorage로 캐시
5. **기능 별 컴포넌트 격리** — `PostViews`, `TopPosts`, `TagLink` 가 각각 독립적으로 실패해도 나머지는 동작

---

## 3. 환경 변수

`.env.local` / `.env.example`:

```env
# Umami — public (브라우저 노출 OK)
NEXT_PUBLIC_UMAMI_WEBSITE_ID=88c7ae24-aaad-4636-a0a1-eb9325c8a858
NEXT_PUBLIC_UMAMI_SCRIPT_URL=https://cloud.umami.is/script.js
NEXT_PUBLIC_UMAMI_SHARE_ID=                # Umami → Settings → Enable share URL → 발급된 ID
NEXT_PUBLIC_UMAMI_SHARE_BASE=https://api.umami.is/v1   # share API 호스트 (cloud는 api.umami.is 사용)

# Umami — server only (dev 어드민 패널용)
UMAMI_API_KEY=                             # Umami → Profile → API keys
UMAMI_API_BASE=https://api.umami.is/v1     # 인증 API 호스트 (share와 동일)
```

**제거**: `NEXT_PUBLIC_PLAUSIBLE_DOMAIN`

각 변수가 비어 있을 때의 동작:

| 변수 | 비어 있을 때 |
|---|---|
| `NEXT_PUBLIC_UMAMI_WEBSITE_ID` | `<Umami>` 컴포넌트가 null 반환 (스크립트 미주입) |
| `NEXT_PUBLIC_UMAMI_SHARE_ID` | `PostViews` / `TopPosts` 가 null 반환 (조용히 비표시) |
| `UMAMI_API_KEY` | `/api/stats/*` 가 503 반환, `/admin/stats` 가 안내 메시지 |

---

## 4. 파일 구조

### 신규

```
src/
├─ components/
│  └─ analytics/
│     ├─ Umami.tsx              # 스크립트 주입 (Plausible.tsx 대체)
│     ├─ PostViews.tsx          # 글 조회수 표시 ("use client")
│     ├─ TopPosts.tsx           # 홈 인기글 위젯 ("use client")
│     └─ TagLink.tsx            # 태그 링크 + track('Tag Click') ("use client")
│
├─ lib/
│  ├─ umami-share.ts            # 클라이언트용 share API + sessionStorage 캐시
│  └─ umami-server.ts           # 서버용 (dev API route 전용)
│
└─ app/
   ├─ api/
   │  └─ stats/
   │     ├─ summary/route.ts    # 7/30일 요약
   │     ├─ pageviews/route.ts  # 시계열
   │     └─ metrics/route.ts    # top pages·referrers·events
   │
   └─ admin/
      └─ stats/
         └─ page.tsx            # 어드민 통계 패널 (dev only)
```

### 삭제

- `src/components/analytics/Plausible.tsx`

### 수정

| 파일 | 변경 내용 |
|---|---|
| `src/app/layout.tsx` | `Plausible` import → `Umami` import |
| `src/app/posts/[slug]/page.tsx` | 글 메타 영역에 `<PostViews slug={slug} />` 마운트 |
| `src/app/page.tsx` (홈) | 하단에 `<TopPosts />` 섹션 추가 |
| 기존 태그 렌더링 위치 | `<Link>` → `<TagLink>` 교체 (위치는 구현 단계에서 grep으로 식별) |
| `src/app/admin/page.tsx` | "Stats" 링크/섹션 추가 (또는 sub-route로 이동) |
| `src/lib/types.ts` | `declare global { interface Window { umami?: { track(...): void } } }` 추가 |
| `.env.example` | Plausible 변수 제거, Umami 변수 추가 |

---

## 5. 컴포넌트 명세

### 5-1. `Umami.tsx`

```tsx
"use client";
import Script from "next/script";

export function Umami() {
  const websiteId = process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID;
  const src = process.env.NEXT_PUBLIC_UMAMI_SCRIPT_URL;
  if (!websiteId || !src) return null;
  return <Script defer src={src} data-website-id={websiteId} strategy="afterInteractive" />;
}
```

### 5-2. `umami-share.ts`

공개 함수:

```ts
export async function getPageViews(path: string, opts?: { ttlMs?: number }): Promise<number | null>
export async function getTopPages(opts?: { range?: '7d' | '30d'; limit?: number }): Promise<{ url: string; count: number }[]>
```

내부:
- 환경변수에서 share host + shareId 읽음
- `sessionStorage` key: `umami:views:{path}` (30분), `umami:top:{range}:{limit}` (1시간)
- 실패(네트워크/4xx/5xx) → `null` 반환, `console.warn`만 남김
- date range 계산은 epoch ms로 변환해서 query string에 포함

### 5-3. `PostViews.tsx`

```tsx
"use client";
export function PostViews({ slug }: { slug: string }) {
  const [views, setViews] = useState<number | null>(null);
  useEffect(() => {
    getPageViews(`/posts/${slug}`).then(setViews);
  }, [slug]);
  if (views == null) return null;            // 환경변수 없거나 실패 → 비표시
  return <span aria-label={`${views} views`}>{views.toLocaleString()} views</span>;
}
```

### 5-4. `TopPosts.tsx`

```tsx
"use client";
export function TopPosts({ posts }: { posts: PostMeta[] }) {
  const [items, setItems] = useState<RankedPost[] | null>(null);
  useEffect(() => {
    getTopPages({ range: '7d', limit: 10 }).then(top => {
      if (!top) return setItems(null);
      const ranked = top
        .map(t => ({ ...posts.find(p => `/posts/${p.slug}` === t.url), count: t.count }))
        .filter(p => p.slug)
        .slice(0, 5);
      setItems(ranked);
    });
  }, [posts]);
  if (!items?.length) return null;
  return /* 5개 카드/리스트 */;
}
```

홈에서 `getAllPosts()` 결과를 props로 내려줌 (서버에서 fetch한 메타와 join).

### 5-5. `TagLink.tsx`

```tsx
"use client";
import Link from "next/link";
export function TagLink({ tag, href, children }: Props) {
  return (
    <Link
      href={href}
      onClick={() => window.umami?.track('Tag Click', { tag })}
    >
      {children}
    </Link>
  );
}
```

### 5-6. `umami-server.ts` + `/api/stats/*`

`umami-server.ts`:

```ts
export async function umamiFetch<T>(path: string): Promise<T>
// internal: Authorization: Bearer ${UMAMI_API_KEY}
```

각 route handler는 GET only, query string을 그대로 Umami에 forward, JSON 변환:

- `/api/stats/summary?range=7d` → `/websites/{id}/stats?startAt=...&endAt=...`
- `/api/stats/pageviews?range=7d&unit=day` → `/websites/{id}/pageviews?...`
- `/api/stats/metrics?range=7d&type=url|referrer|event` → `/websites/{id}/metrics?...`

`UMAMI_API_KEY` 미설정 시 503 + `{ error: "UMAMI_API_KEY missing" }`.

### 5-7. `/admin/stats/page.tsx`

서버 컴포넌트 + 클라이언트 차트.

- 상단: 7일 / 30일 탭
- 카드 4개: visitors, pageviews, bounce rate, avg duration (Umami `stats` 응답 그대로)
- 시계열 SVG (deps 추가 없음, 100~150줄 자체 구현)
- 표 2개: Top pages, Top referrers
- 표 1개: Top events (`Tag Click` 이벤트의 props별 분포 — 어떤 태그가 인기인지)

---

## 6. 데이터 흐름

```
1. 사용자가 /posts/foo 방문
   └─ Umami 스크립트가 자동으로 cloud.umami.is/api/send 에 pageview 전송
   └─ <PostViews slug="foo" /> 마운트
       └─ sessionStorage 확인 → 없으면 share API fetch
           → "1,234" 표시
   └─ 글 안의 #tag 클릭
       └─ window.umami.track('Tag Click', { tag: 'nextjs' })
       └─ 이동

2. 사용자가 / (홈) 방문
   └─ <TopPosts posts={...} /> 마운트
       └─ sessionStorage 확인 → 없으면 share API fetch (top 10 URL)
       → 메타데이터 join → 상위 5개 표시

3. 작성자가 npm run dev → /admin/stats 방문
   └─ 차트가 /api/stats/* 호출
       └─ route handler가 UMAMI_API_KEY로 api.umami.is 호출
       → 차트·표 렌더
```

---

## 7. 캐싱·에러 처리

| 상황 | 처리 |
|---|---|
| `NEXT_PUBLIC_UMAMI_WEBSITE_ID` 미설정 | `<Umami>` null — 스크립트 미주입 |
| `NEXT_PUBLIC_UMAMI_SHARE_ID` 미설정 | `PostViews` / `TopPosts` null — 조용히 비표시 |
| Share API 4xx/5xx | `console.warn` + null 반환 → UI 비표시 |
| sessionStorage 차단 (private browsing) | try/catch로 감싸 캐시 미동작 + 매번 fetch |
| `UMAMI_API_KEY` 미설정 | `/api/stats/*` 503 → 어드민 페이지에 안내 메시지 |
| prod 빌드 시 `/admin/stats` 접근 | 404 (페이지 자체가 빌드 제외 — `_api_stashed` 패턴은 API에만 적용되므로 admin 라우트는 별도 가드 필요 — see 8.) |
| 빈 데이터 (서비스 초기) | 컴포넌트가 null 반환 |

---

## 8. 빌드·배포 고려사항

### prod 정적 export 확인

- `src/app/api/`는 `static-build.mjs` 가 stash → `/api/stats/*` 자동 제외 ✓
- `src/app/admin/stats/page.tsx` 는 별도 처리 필요:
  - **선택 1 (권장)**: 페이지 자체에 `if (process.env.NODE_ENV === 'production' && process.env.BUILD_TARGET === 'static') notFound()` 가드 — 빌드 시 정적 페이지로 만들지 않음
  - **선택 2**: `static-build.mjs`를 확장해 `src/app/admin/stats`도 stash
  - 1번이 더 단순하고 기존 패턴과 충돌 없음
- basePath `/Dongding-Blog` 영향: share API 호출 시 path는 항상 `/posts/{slug}`(basePath 없는 형태)인지 Umami가 어떤 형태로 기록하는지 — 구현 단계에서 실제 데이터 한 번 찍어보고 조정 (Umami는 보통 `window.location.pathname` 그대로 기록 → basePath 포함). `umami-share.ts`의 `getPageViews(path)` 호출 측에서 basePath 합성 처리.

### 의존성 추가

- 없음. 모든 작업은 `next/script`, 표준 fetch, React, 자체 SVG로 처리

---

## 9. 구현 순서 (8단계, 단계별 commit 가능)

1. **사용자 작업**: Umami 대시보드에서
   - Settings → Websites → 해당 사이트 → "Enable share URL" → Share ID 복사
   - Profile → API keys → 새 키 발급 → 복사
2. `.env.local` 갱신 + `.env.example` 업데이트 (Plausible 제거, Umami 추가)
3. `Umami.tsx` 작성 + `layout.tsx` 교체 + `Plausible.tsx` 삭제
   → 이 시점에 **기본 트래킹 동작**
4. `umami-share.ts` (클라이언트 fetch + 캐시 헬퍼) + Window.umami 타입 선언
5. `PostViews.tsx` + `/posts/[slug]/page.tsx` 통합
6. `TagLink.tsx` 작성 + 기존 태그 렌더링 위치 grep → 교체
7. `TopPosts.tsx` + 홈 페이지 하단 섹션 통합
8. `umami-server.ts` + `/api/stats/*` 3개 route + `/admin/stats/page.tsx` (가드 포함)

각 단계가 독립적으로 동작 가능하므로 도중에 멈춰도 사이트가 깨지지 않음.

---

## 10. 테스트 전략

수동 검증 (자동 테스트 인프라가 없는 프로젝트이므로):

| 단계 | 검증 |
|---|---|
| 3 | `npm run dev` → 페이지 이동하며 Umami 대시보드에 페이지뷰 들어오는지 |
| 5 | 글 페이지 하단에 조회수 숫자 노출 확인 / 환경변수 비웠을 때 비표시 확인 |
| 6 | 태그 클릭 후 Umami → Events 탭에 `Tag Click` 보임 + props에 tag 이름 |
| 7 | 홈 새로고침 시 인기글 5개 노출 / 데이터 부족 시 섹션 비표시 |
| 8 | `/admin/stats`에서 차트·표 동작 / `npm run build` 성공 / 빌드 결과물에 `/admin/stats` 미포함 확인 |

---

## 11. 향후 확장 (이 설계 범위 밖)

- 추가 이벤트 (북마크 클릭, CTA, 검색 사용)
- 스크롤 깊이 (Intersection Observer)
- 검색어 빈도 분석 (이미 `/search` 라우트 존재)
- Goals 등록 후 전환율 표시
- Umami 무료 플랜 한도 초과 시 Vercel 셀프호스팅으로 마이그레이션
