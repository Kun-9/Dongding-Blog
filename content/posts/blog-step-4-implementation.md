---
title: 'Step 4. 구현 — 메인 세션은 지휘만, 손은 sub-agent'
summary: '메인 Claude 세션을 오케스트라 지휘자에 두고, 코드는 explore/executor/document-specialist sub-agent에 분담시킨 운영 모델. 컨텍스트 윈도우 보호로 세션당 처리량이 두 배가 된 이유.'
category: ai
tags:
  - ai
  - claude-code
  - subagent
  - workflow
  - dev-log
date: '2026-04-28'
visibility: published
series: project-blog
seriesOrder: 4
---

> [!INFO] 시리즈 4 / 5 — 블로그 만들기
> **이전:** Step 3. 프로토타입 — 와이어프레임 선택과 보정
>
> **이번 편:** 디자인이 끝난 뒤 코드를 쓰는 단계. 메인 세션이 직접 코드를 쓰지 않는 이유.

## 들어가며 — 메인 세션의 역할은 지휘자

디자인이 끝난 다음에야 코드를 쓰기 시작했습니다. 그리고 메인 Claude 세션이 직접 코드를 쓰지 않는 방식을 택했습니다. 메인 세션의 역할은 *오케스트라 지휘자*. 코드를 직접 두드리는 건 sub-agent들입니다.

## 1. sub-agent 역할 분담

- **`explore`** — 코드베이스 탐색. *"카테고리 라우팅이 지금 어떻게 짜여 있어?"*
- **`executor`** — 실제 코드 작성과 수정. 큰 작업은 model을 opus로 격상
- **`document-specialist`** — 모르는 라이브러리/API의 공식 문서 확인 (할루시네이션 1차 방어선)

이 분담의 효과는 **컨텍스트 윈도우 보호** 입니다. 메인 세션은 *"누가 무엇을 했는지"* 만 알면 되고, 각 sub-agent의 긴 출력은 메인에 들어오지 않습니다. 결과적으로 **세션 한 번으로 끝나는 일의 양이 두 배 가까이** 늘었습니다.

### 실제 사례 — 카테고리 → 서브카테고리 라우팅

1. explore 에게 *"기존 카테고리 라우팅 구조 정리해줘"* (700자 요약 받음)
2. executor 에게 *"`resolveCategory` / `categoryLabel` 헬퍼 만들고 서브카테고리 슬러그까지"*
3. 메인 세션은 둘 사이의 결정만 함 — *"플랫 슬러그 vs 중첩 슬러그"* 같은 설계 판단
4. 결과 커밋: `[FEAT] 카테고리 — 서브카테고리 라우팅·resolveCategory/categoryLabel 헬퍼·카테고리 데이터 갱신`

## 2. 블로그 특화 Skill 묶음

이 블로그를 위해 작은 Skill 몇 개를 따로 만들었습니다.

- **이미지 업로드** — 드래그/붙여넣기/툴바 세 가지 입력을 한 번에 처리
- **callout 4종** — info / warning / tip / note 자동 분리 (이 글에서 보고 계신 그 콜아웃)
- **초안 관리** — `/studio` 안에서 글의 상태를 published / private / draft 셋 중 하나로 전환

한 번 만들어두면 다음 글 쓸 때마다 자동 적용됩니다. *"또 똑같은 일을 하고 있다"* 는 신호가 오면 그게 곧 Skill 후보입니다.

## 3. Tistory 마이그레이션 — 스크립트가 한다

4년치 글을 손으로 옮길 수는 없습니다. `scripts/migrate-tistory.ts` 한 번으로 끝냈습니다.

- Tistory 백업 XML 파싱 (`fast-xml-parser`)
- HTML → Markdown 변환 (`turndown`)
- 인라인 이미지 다운로드 → `public/images/posts/<slug>/`
- frontmatter 자동 생성 (`title`, `summary`, `category`, `tags`, `date`)

자동 변환 후엔 카테고리 추론과 콜아웃 마크업만 사람이 검수했습니다. 검색 유입을 잃지 않기 위해 기존 Tistory 글에는 `<link rel="canonical">` 을 박아 새 URL로 정렬했습니다.

> [!TIP] 이 단계에서 사용한 스킬/에이전트
> - `explore` — 기존 코드 구조 파악
> - `executor` — 코드 작성·수정 (복잡 작업은 opus)
> - `document-specialist` — 라이브러리/공식 문서 확인
> - `change-tracker` — 멀티 세션 변경사항 누적 추적

## 닫으며

구현 단계의 산출물은 *"동작하는 코드"* 가 아니라 *"메인 세션이 보호된 채 끝나는 운영 모델"* 입니다. 코드는 자연히 따라옵니다.

다음 단계는 검증과 배포. *"다 됐다"* 는 말을 믿지 않는 4단 게이트입니다.

> [!INFO] 다음 단계
> **Step 5. 검증·배포·회고 — "다 됐다"는 말을 믿지 않기**
