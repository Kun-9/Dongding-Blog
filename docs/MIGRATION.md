# Tistory → Dong-Ding 마이그레이션 가이드

기존 [dong-ding.tistory.com](https://dong-ding.tistory.com) 글을 이 저장소의 MDX 컨텐츠로 옮기는 절차.

## 1. Tistory 백업 XML 다운로드

1. Tistory 관리자 → **블로그 관리** → **백업/복원** 메뉴
2. **블로그 백업** 클릭 → ZIP 다운로드
3. ZIP 압축 해제 후 안에 있는 `tistory.xml` 확인 (또는 `tistory-export.xml`)

> Tistory 외부출력(API) 백업은 OpenAPI deprecated 이슈로 사용 비권장.

## 2. 마이그레이션 실행

```bash
# 의존성은 이미 설치되어 있음 (fast-xml-parser, turndown)
npx tsx scripts/migrate-tistory.ts /path/to/tistory.xml
```

스크립트가 처리하는 것:

- XML 파싱 (`fast-xml-parser`)
- 각 글의 HTML → Markdown 변환 (`turndown`)
- 인라인 이미지 다운로드 → `public/images/posts/<slug>/`
- frontmatter 자동 생성 (`title`, `summary`, `category`, `tags`, `date`)
- `content/posts/<slug>.mdx` 출력

## 3. 결과 검수

자동 변환 후 **반드시 수동 검수해야 하는 항목**:

| 항목 | 확인 |
|---|---|
| **카테고리** | `inferCategory()`가 키워드로 추측한 값. 실제 의도와 다르면 수정 |
| **summary** | 첫 30자 이상 줄을 자동 추출. 어색하면 직접 작성 |
| **코드블록** | `<pre><code>` 마크업이 적절한 ` ```언어 `로 변환됐는지 |
| **콜아웃** | Tistory의 인용/박스는 `<blockquote>` 또는 `<div>`. `<Callout>` MDX 컴포넌트로 수동 전환 권장 |
| **이미지 경로** | `/images/posts/<slug>/##.ext`로 재작성됨. 본문에 그대로 노출되는지 확인 |
| **링크** | 외부 링크(`a[href^="http"]`)는 그대로. 내부 Tistory 링크는 새 라우트로 수정 |
| **TOC** | 자동 추출 미지원. featured 글은 frontmatter `toc:` 필드를 직접 추가 |

## 4. 결과 검증

```bash
npm run build
```

- frontmatter zod 검증 실패 시 출력에 줄 번호와 함께 표시됨
- 빌드 통과 후 `npm run dev`로 각 글 페이지 시각 확인

## 5. SEO 자산 보존 (선택)

기존 Tistory 글의 검색 유입을 잃지 않으려면:

1. Tistory 글에 **canonical 링크** 추가 (관리자 → HTML 편집)
   ```html
   <link rel="canonical" href="https://dongding.dev/posts/<slug>" />
   ```
2. Tistory 글 본문 상단에 "이 글은 dongding.dev로 이전되었습니다" 안내 + 링크
3. 6개월 후 Tistory 글을 비공개 처리 (이전 사이트는 유지)

## 트러블슈팅

### 카테고리가 모두 `system`으로 들어감
`inferCategory()`의 정규식이 매치되지 않는 경우. `scripts/migrate-tistory.ts`에서 키워드를 보강하거나, 변환 후 일괄 sed로 교체:

```bash
# 예: spring-* 파일은 모두 category: spring으로
sed -i '' 's/category: "system"/category: "spring"/' content/posts/spring-*.mdx
```

### 이미지가 깨짐
Tistory 이미지 호스팅은 hotlink 방어가 있을 수 있음. 스크립트가 다운로드 실패 시 경고를 출력하고 원본 URL을 유지하므로, 별도 다운로드 후 수동 교체.

### MDX 빌드 실패 (frontmatter)
zod 스키마는 `src/lib/posts.ts`의 `FrontmatterSchema` 참고. `date`는 `YYYY-MM-DD`, `tags`는 string array, `level`은 2 또는 3.
