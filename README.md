# Dong-Ding

Java, Spring, DB, 시스템 설계 등을 정리해두는 개인 기술 블로그.

[https://blog.dongding.dev](https://blog.dongding.dev)

## 구성

- 글: Java, Spring, DB(JPA·MySQL), 시스템 설계, 면접, 알고리즘 풀이
- 시리즈, 태그, 북마크 라우트
- 클라이언트 검색과 `/feed.xml` RSS
- 글을 작성·미리보기하는 `/studio` 에디터

## 스택

- Next.js 16 (App Router, SSR/ISR)
- React 19, TypeScript 5
- Tailwind CSS v4
- Supabase (Postgres) — 글·시리즈·카테고리·북마크의 정본
- 자체 마크다운 파서 (MDX 미사용)
- Vercel 배포

## 개발

```bash
npm install
npm run dev          # http://localhost:3000
```

`.env.local`에 Supabase 접속 정보가 필요합니다(`.env.example` 참고).
로컬 개발도 원격 Supabase 프로젝트를 그대로 바라봅니다 — **dev에서 고친 글이
곧바로 배포판에 반영된다**는 뜻이니 주의하세요.

dev 모드에서만 `/studio`(에디터)와 `/admin`, `/settings`가 활성화됩니다.

## 빌드

```bash
npm run build        # next build (빌드 시 Supabase 에서 글을 읽어 프리렌더)
```

공개 페이지는 ISR 1시간이며, 글을 저장하면 편집 API가 `revalidatePath`로
캐시를 즉시 비웁니다.

## 데이터

정본은 Supabase입니다. 스키마는 `supabase/migrations/`에 있고, 적용은
`supabase db push`로 합니다.

| 테이블 | 비고 |
|---|---|
| `posts` | `slug`는 rename 가능해 PK 대신 unique. 본문은 `body` 컬럼 |
| `series` | `planned_count`는 발행 수가 아니라 **계획 편수** (미작성 회차를 대시로 표시) |
| `categories` | `parent_id` self-reference로 2계층 |
| `bookmarks` | `url` unique |

RLS는 공개 읽기만 허용하고 쓰기 정책은 두지 않았습니다 — 변경은 secret 키를
쓰는 서버 경로에서만 가능합니다. 경계가 살아 있는지는 아래로 확인합니다.

```bash
node --env-file=.env.local scripts/verify-rls.mjs
```

`readTime`과 목차는 본문에서 파생하므로 저장하지 않습니다(frontmatter로
명시했던 값만 `read_time`에 남아 있습니다).

## 디렉토리

```
src/app/            라우트
src/components/     UI
src/lib/            posts · markdown · categories · supabase · site
supabase/migrations 스키마
scripts/            검증·이관 스크립트

```

## 라이선스

글의 권리는 저작자 Kun-9에게 있습니다. 인용 시 출처를 남겨주세요.
