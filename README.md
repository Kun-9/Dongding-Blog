# Dong-Ding · 개발 노트

자바 · 스프링 · DB · 시스템 설계를 깊고 천천히 따라가는 개인 기술 블로그.

🌐 **[dongding.dev](https://dongding.dev)**

---

## 무엇이 있나

- **글** — Java, Spring, DB(JPA·MySQL), 시스템 설계, 면접, 알고리즘 풀이
- **시리즈 / 태그 / 북마크** — 주제별로 묶어보는 라우트
- **검색 · RSS** — 클라이언트 검색과 `/feed.xml`
- **Studio** — 로컬에서 글을 작성·미리보기하는 자체 에디터

## 스택

- Next.js 16 (App Router · 정적 export)
- React 19 · TypeScript 5
- Tailwind CSS v4
- 자체 마크다운 파서 — MDX를 쓰지 않습니다
- gray-matter + zod 로 frontmatter 검증
- GitHub Pages 배포

## 빠른 시작

```bash
npm install
npm run dev          # http://localhost:3000
```

`npm run dev` 환경에서는 `/studio`(에디터)와 `/admin`이 활성화됩니다.

## 빌드

```bash
npm run build        # 정적 사이트 → out/
```

`scripts/static-build.mjs`가 `next build`를 감싸서 GitHub Pages용 `basePath`를 적용하고, 정적 export가 거부하는 dev 전용 PUT 라우트(`src/app/api`)를 빌드 동안 잠시 빼뒀다가 원복합니다.

## 글 작성

`content/posts/<slug>.md` 형식이며, frontmatter는 `src/lib/posts.ts`의 zod 스키마로 검증됩니다.

```yaml
---
title: 글 제목
summary: 한두 줄 요약
category: spring             # src/lib/categories.json 의 id
tags: [spring, jpa]
date: 2026-04-27             # YYYY-MM-DD
featured: false
visibility: published        # published | private | draft
---
```

`draft`는 빌드 결과에서 제외됩니다.

## 디렉토리

```
src/app/         라우트
src/components/  UI
src/lib/         posts · markdown · categories · site
content/posts/   글 (Markdown)
scripts/         빌드 스크립트
```

## 라이선스

`content/`의 글은 저작자 Kun-9에게 권리가 있습니다. 인용 시 출처를 남겨주세요.
