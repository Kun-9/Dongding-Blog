---
title: Step 2. 디자인 시스템 — 코드보다 토큰부터
summary: >-
  디자인 시스템 5종 토큰(색·타이포·spacing·radius·elevation)을 먼저 정의하고, 그 위에서만 시안을 그린 과정. AI가
  만든 임의의 hex와 px가 어떻게 한 곳에서 막히는지.
category: ai
tags:
  - ai
  - design-system
  - frontend-design
  - workflow
  - dev-log
date: '2026-04-28'
visibility: published
series: project-blog
seriesOrder: 2
---
> [!INFO] 시리즈 2 / 5 — 블로그 만들기
>
> **이번 편:** 컴포넌트보다 토큰을 먼저 정의해, AI의 랜덤성을 제약하는 과정

---

## 들어가며

얼마전에 구글의 stitch에서 처음 정의한 DESIGN.md라는 개념을 접했습니다. AGENT.md나 CLAUDE.md처럼 답변 전에 항상 읽는 디자인 규격입니다. 여기에 색상 스키마, 폰트 등을 미리 정의해놓고 사용하는 방식입니다. 

여기서 거꾸로 가는 사람이 많습니다. *"일단 만들어 보고 디자인은 나중에"* — 그렇게 시작한 프로젝트는 같은 회색을 일곱 가지 hex로 적게 됩니다.

이번엔 반대로 갔습니다. **컴포넌트 한 줄 쓰기 전에 디자인 시스템부터 정의** 했습니다.

## 1. 5종 토큰부터 정의 — `awesome-design` / `frontend-design`

색 팔레트, 타이포그래피 스케일, spacing scale, border-radius scale, shadow elevation. 이 다섯 가지를 *"design property"* 로 먼저 정의하고, 그 위에서만 시안을 그리도록 강제했습니다.

```yaml
색:
  bg-base / bg-subtle / bg-elevated
  text-strong / text-default / text-muted
  border-default / border-subtle
  accent / accent-soft

타이포그래피:
  display / h1 / h2 / h3 / body / caption
  (모두 line-height·tracking·weight 함께 정의)

spacing:
  4·8·12·16·24·32·48·64 (8px grid)

radius:
  sm·md·lg·full

elevation:
  none·card·overlay
```

이 토큰들이 **단 하나의 진실** 이 되어, 이후 모든 시안과 컴포넌트가 이 위에서만 그려졌습니다. AI가 임의의 hex나 px를 쓰면 즉시 막혔습니다.

## 2. 시안 머징과 컴포넌트 분해

토큰이 잡힌 다음에야 시안을 그렸습니다.

1. **레퍼런스 입력** — 좋아하는 블로그 몇 개의 스크린샷, 본인이 원하는 톤(절제, 흑백 위주, 타이포 중심)
2. **시안 N개 생성** — `frontend-design` 으로 4~5개 시안
3. **머징** — *"시안 A의 헤더 + 시안 B의 본문 타이포 + 시안 C의 카드 — 합쳐서 하나로"*
4. **컴포넌트 분해** — 합쳐진 결과물을 토큰 기반 컴포넌트로 풀어내기

> [!WARNING] 토큰 없이 그린 시안의 함정
> 보기엔 깔끔해도 토큰화되지 않은 디자인은 며칠만 지나도 일관성이 무너집니다. *"디자인 시스템을 가진 프로덕트"* 와 *"잘 그린 한 장의 그림"* 의 차이가 여기서 갈립니다.

> [!TIP] 이 단계에서 사용한 스킬
> - `frontend-design` (awesome-design) — 토큰 정의와 시안 생성
> - `design-sync` — 시안 폴더와 코드 토큰의 버전 동기화

## 닫으며

디자인 시스템 단계의 산출물은 *"시안"* 이 아니라 *"시안을 만들 수 있는 토큰 세트"* 였습니다. 이 한 단계가 *"AI가 만든 디자인이 며칠 만에 무너지는 함정"* 을 막아줬습니다.

다음 단계는 프로토타입. 와이어프레임 시안을 선택하고 보정하는 5라운드 과정입니다.

> [!INFO] 다음 단계
> **Step 3. 프로토타입 — 와이어프레임 선택과 보정**
