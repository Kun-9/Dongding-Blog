# GitHub Pages 배포 계획 — Dongding Blog

> 작성일: 2026-04-27
> 대상 저장소: `Kun-9/Dongding-Blog`
> 배포 도메인: `https://dongding.dev` (커스텀 도메인, GitHub Pages)
> 프레임워크: Next.js 16.2.4 (App Router) + React 19.2.4

---

## 1. Requirements Summary

Next.js 16 App Router 블로그를 GitHub Pages로 정적 호스팅한다. 커스텀 도메인 `dongding.dev`를 사용하고, GitHub Actions로 push-to-deploy를 자동화한다. 데모 성격의 `/admin`, `/studio` 라우트는 공개 배포본에서 제외하고 로컬 dev 환경에서만 접근 가능하도록 유지한다.

### 결정 사항 (확정)
| 항목 | 선택 |
|---|---|
| 도메인 | `dongding.dev` 커스텀 도메인 |
| Admin/Studio | 빌드에서 제외 + 로컬 dev 전용 유지 |
| OG 이미지 | `opengraph-image.tsx`에서 `runtime = "edge"` 한 줄 제거 (디자인 유지) |
| 배포 트리거 | `main` 브랜치 push + 수동 `workflow_dispatch` |
| Plausible/Giscus | 빈 값으로 비활성 상태 유지 (필요 시 GH Variables로 후속 활성화) |

---

## 2. Acceptance Criteria

배포 성공 판정은 모두 외부에서 관측 가능해야 한다.

- [ ] `https://dongding.dev/`가 HTTP 200으로 홈페이지를 반환한다.
- [ ] HTTPS가 GitHub Pages에 의해 자동 발급되고 `Enforce HTTPS`가 활성화되어 있다.
- [ ] `https://dongding.dev/posts/jpa-n-plus-1/` (또는 `content/`에 존재하는 임의 슬러그) 가 정상 렌더링된다.
- [ ] `https://dongding.dev/sitemap.xml` 와 `https://dongding.dev/robots.txt` 가 200으로 응답한다.
- [ ] `https://dongding.dev/feed.xml` 가 `application/rss+xml` 콘텐츠로 응답한다.
- [ ] `https://dongding.dev/opengraph-image.png` (또는 라우트가 매핑한 경로) 가 1200x630 PNG로 응답한다.
- [ ] `https://dongding.dev/admin` 과 `/studio` 가 404를 반환한다 (배포본에 포함되지 않아야 함).
- [ ] `localhost:3000/admin` 과 `/studio` 는 `npm run dev` 환경에서 정상 접근된다.
- [ ] GitHub Actions 워크플로우가 `main` push 시 자동 실행되어 5분 이내에 deploy까지 성공한다.
- [ ] `npm run build`가 로컬에서도 성공하고 `out/` 디렉토리가 생성된다.

---

## 3. Implementation Steps

### Step 1 — `next.config.ts` 정적 export 설정

**파일**: `next.config.ts:1-7`

현재 상태:
```ts
import type { NextConfig } from "next";
const nextConfig: NextConfig = { /* config options here */ };
export default nextConfig;
```

변경:
```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
};

export default nextConfig;
```

**근거**:
- `output: "export"` — 정적 HTML/CSS/JS만 생성, GitHub Pages에 호환.
- `trailingSlash: true` — `/posts/foo/index.html` 형태로 떨어져 GH Pages의 디렉토리 라우팅과 일치.
- `images: { unoptimized: true }` — `next/image`의 런타임 최적화 서버가 없으므로 강제 비활성화.

---

### Step 2 — OG 이미지 edge runtime 제거

**파일**: `src/app/opengraph-image.tsx:3`

변경:
```diff
- export const runtime = "edge";
```

**근거**: `next/og`의 `ImageResponse`는 정적 export 환경에서 빌드 타임에 PNG로 직접 생성됨. `runtime = "edge"`가 남아 있으면 export 빌드가 실패한다. 한 줄만 제거하면 기존 React JSX 디자인이 그대로 PNG로 렌더링됨.

---

### Step 3 — 커스텀 도메인 파일 추가

**새 파일**: `public/CNAME`
```
dongding.dev
```

**근거**: GitHub Pages는 `out/CNAME` 파일을 보고 커스텀 도메인을 자동 인식한다. `public/`에 두면 export 시 `out/`으로 자동 복사됨.

---

### Step 4 — Jekyll 비활성화 마커

**새 파일**: `public/.nojekyll` (빈 파일)

**근거**: GitHub Pages는 기본적으로 Jekyll로 처리하면서 `_`로 시작하는 디렉토리를 무시한다. Next.js의 `_next/` 폴더가 무시되면 사이트가 깨지므로 반드시 필요. 워크플로우에서 `touch out/.nojekyll` 로도 대체 가능하지만, `public/`에 두면 모든 빌드 환경에서 일관됨.

---

### Step 5 — GitHub Actions 워크플로우

**새 파일**: `.github/workflows/deploy.yml`

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: false

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm

      - name: Install dependencies
        run: npm ci

      - name: Strip local-only routes (admin/studio)
        run: rm -rf src/app/admin src/app/studio

      - name: Build static export
        env:
          NEXT_PUBLIC_SITE_URL: https://dongding.dev
        run: npm run build

      - name: Ensure .nojekyll
        run: touch out/.nojekyll

      - name: Upload Pages artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: out

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

**근거 / 핵심 결정**:
- `rm -rf src/app/admin src/app/studio` — admin/studio를 **빌드 직전에 통째로 제거**하여 정적 export 결과물에 포함되지 않게 한다. 로컬 git 상태에는 영향 없음.
- `permissions` 와 `id-token: write` — `actions/deploy-pages@v4`가 OIDC 기반으로 GH Pages에 업로드하기 위한 필수 권한.
- `concurrency` — 동시에 2개 deploy가 돌지 않도록 보호.
- `cache: npm` — package-lock 기반으로 의존성 캐싱.

---

### Step 6 — GitHub 저장소 설정 (사용자 직접 작업)

GitHub 웹 UI에서 수행:

1. **Settings → Pages → Build and deployment → Source** = `GitHub Actions` 로 변경.
2. **Settings → Pages → Custom domain** = `dongding.dev` 입력 후 저장 (`public/CNAME` 과 일치해야 함).
3. **Settings → Pages → Enforce HTTPS** 체크 (DNS 전파 후 활성화 가능).

---

### Step 7 — DNS 설정 (도메인 등록업체 콘솔)

`dongding.dev`의 DNS 관리 화면에서:

apex 도메인 A 레코드 4개:
```
185.199.108.153
185.199.109.153
185.199.110.153
185.199.111.153
```

(선택) `www` 서브도메인 CNAME:
```
www  CNAME  kun-9.github.io
```

**참고**: DNS 전파에는 보통 5분 ~ 24시간 소요. 전파 후에야 GitHub Pages의 Enforce HTTPS 토글이 활성화됨.

---

### Step 8 — 로컬 검증

```bash
NEXT_PUBLIC_SITE_URL=https://dongding.dev npm run build
npx serve out
```

브라우저로 `localhost:3000` (또는 serve가 출력하는 포트) 에 접속해 다음을 확인:
- 홈, 임의 포스트, sitemap.xml, robots.txt, feed.xml, opengraph-image.png
- `/admin`, `/studio`는 로컬 빌드에는 포함되지만 (rm -rf는 CI에서만 실행) 의도적이므로 무시

---

## 4. Risks and Mitigations

| ID | 리스크 | 영향도 | 가능성 | 완화책 |
|---|---|---|---|---|
| R1 | 동적 라우트의 `generateStaticParams` 누락으로 export 실패 | 높음 | 중간 | `npm run build` 로컬 선행 검증. 실패 시 `posts/[slug]/page.tsx`, `tags/[tag]/page.tsx`, `category/[id]/page.tsx`, `series/[id]/page.tsx` 에 `generateStaticParams` 추가. |
| R2 | `feed.xml/route.ts`가 export에서 제외될 가능성 | 중간 | 낮음 | 이미 `dynamic = "force-static"` 선언됨. 빌드 결과 `out/feed.xml` 존재 확인. 누락 시 `app/feed.xml/page.ts` 라우트로 변환 검토. |
| R3 | OG 이미지가 `runtime` 제거 후에도 export에 안 떨어짐 | 중간 | 낮음 | `out/opengraph-image.png` 파일 존재 확인. 누락 시 `public/og.png` 정적 파일 + `metadata.openGraph.images` 폴백. |
| R4 | DNS 전파 지연으로 첫 접속 실패 | 낮음 | 높음 | 등록업체 TTL을 미리 낮추고(예: 300초), 전파 확인 후 Enforce HTTPS 토글. |
| R5 | `npm ci`가 lockfile 불일치로 실패 | 중간 | 낮음 | 로컬에서 `npm install` 후 `package-lock.json` 동기화하여 커밋. |
| R6 | `next/image`를 사용한 컴포넌트가 외부 도메인 이미지를 참조 | 낮음 | 중간 | `unoptimized: true` 로 회피되지만, 외부 호스트 이미지 로딩 실패 가능. 현재 코드는 로컬 자산 위주이므로 영향 작음. |
| R7 | admin 디렉토리가 외부에 노출되는 사고 | 보안 | 낮음 | CI의 `rm -rf` 단계가 build 전에 무조건 실행. PR로 워크플로우 변경 시 코드 리뷰로 차단. |
| R8 | GitHub Pages의 100GB/월 대역폭, 1GB 저장소 제한 | 낮음 | 매우 낮음 | 정적 블로그 규모상 거의 불가능. 모니터링만. |

---

## 5. Verification Steps

배포 직후 순서대로 실행:

```bash
# 1. DNS 확인
dig +short dongding.dev
# → 185.199.108.153 등 4개 IP 반환 확인

# 2. HTTPS 응답
curl -I https://dongding.dev/
# → HTTP/2 200, content-type: text/html

# 3. 핵심 정적 자산
curl -I https://dongding.dev/sitemap.xml
curl -I https://dongding.dev/robots.txt
curl -I https://dongding.dev/feed.xml
curl -I https://dongding.dev/opengraph-image.png

# 4. admin/studio 차단
curl -I https://dongding.dev/admin/
curl -I https://dongding.dev/studio/
# → 둘 다 404

# 5. 임의 포스트
curl -I https://dongding.dev/posts/jpa-n-plus-1/
# → 200
```

GitHub Actions 탭에서:
- 가장 최근 deploy job이 ✅ 상태
- artifact 크기가 합리적 (보통 10–50MB)
- deploy step의 출력 URL이 `https://dongding.dev` 와 일치

---

## 6. Rollback Plan

배포본에 문제가 발생하면:

1. **빠른 롤백**: GitHub Actions 탭 → 직전 성공 run → `Re-run all jobs`. 이전 커밋 기준으로 재배포됨.
2. **코드 롤백**: `git revert <bad-commit> && git push origin main` — 다음 워크플로우 실행 시 자동 재배포.
3. **긴급 차단**: Settings → Pages → Custom domain 비우기 + Source를 `None`으로 변경. 사이트가 503 처리됨.

---

## 7. Post-Deployment Follow-ups (선택)

이번 범위가 아닌 후속 작업:

- [ ] Plausible 활성화: GH repo Variables에 `NEXT_PUBLIC_PLAUSIBLE_DOMAIN` 추가 + 워크플로우 `env`에 노출.
- [ ] Giscus 댓글 활성화: 4개 변수 (`NEXT_PUBLIC_GISCUS_REPO`, `_REPO_ID`, `_CATEGORY`, `_CATEGORY_ID`) 동일 방식.
- [ ] 빌드 성능 캐싱: `actions/cache@v4`로 `.next/cache` 캐싱.
- [ ] Lighthouse CI: PR 단위로 성능/접근성 회귀 감시.
- [ ] admin이 진짜 운영용으로 필요해지는 시점 → Cloudflare Access 또는 Vercel 분리 배포로 이전.

---

## 8. Implementation Order (제안)

작은 단위로 끊어서 검증하는 권장 순서:

1. Step 1 (next.config) + Step 2 (OG runtime) → 로컬에서 `npm run build` 성공 확인.
2. Step 3 (CNAME) + Step 4 (.nojekyll) → 빌드 결과물에 포함 여부 확인.
3. Step 5 (workflow yml) 작성 후 커밋·푸시.
4. Step 6 (GH Settings) → Step 7 (DNS) 순서로 외부 작업.
5. DNS 전파 후 Step 8 검증.

각 단계가 완료될 때마다 중간 커밋으로 이력 분리 권장.
