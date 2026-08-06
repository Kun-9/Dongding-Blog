---
title: Supabase는 무엇이고, 왜 쓰는가
summary: Postgres·Auth·Storage·Realtime 을 한 벌로 묶은 오픈소스 BaaS, Supabase 의 정체와 선택 기준을 정리합니다.
category: system
tags:
  - supabase
  - baas
  - backend
  - postgres
  - firebase
date: '2026-04-28'
visibility: published
series: supabase-guide
seriesOrder: 1
---
## 들어가며

사이드 프로젝트를 시작할 때마다 같은 작업을 반복한다. EC2 띄우고, RDS 붙이고, S3 권한 정리하고, JWT 라이브러리 골라서 로그인 만들고, 비밀번호 해시 정책 세우고, 이메일 인증 메일 SMTP 연결하고, 파일 업로드 presigned URL 코드 짜고… 정작 만들고 싶었던 *기능* 은 시작도 못 했는데 인프라 부트스트랩에 며칠이 녹는다.

`Supabase` 는 그 부트스트랩을 통째로 들어내고 시작하자는 도구다. **"Postgres 를 코어로 쓰는 오픈소스 Firebase 대안"** — 공식 한 줄 소개가 정확하다.

> [!INFO] 이 글이 다루는 범위
> Supabase 가 무엇이고 왜 쓰는지, 어떤 구성 요소로 돼 있는지를 정리합니다.
> 실제 프로젝트 세팅·SQL 작성·RLS·Auth 깊이 있는 사용은 다음 편부터.

![Supabase 로고|480](/posts/supabase-practical-guide/supabase-wordmark.svg)

## BaaS, 한 번 정리하고 가자

`BaaS` 는 *Backend-as-a-Service* 의 약자. 전형적인 백엔드가 떠안던 일들 — 데이터베이스, 인증, 파일 저장, 실시간 푸시, 서버리스 함수 — 을 SaaS 한 벌로 묶어 SDK·REST·관리 콘솔로 제공한다.

직접 백엔드를 만들 때 vs BaaS 를 쓸 때, 무엇이 달라지는가:

- **직접 운영**: 서버 인스턴스·DB·스토리지·인증 미들웨어를 *내가* 결정하고 *내가* 책임진다. 자유도 최고, 시간 비용 최고.
- **BaaS**: DB 스키마와 정책만 정의하면 REST·SDK·Auth UI 가 자동으로 따라온다. 자유도는 그 위에서 그 SDK 가 허용하는 범위.

> [!TIP] BaaS 를 단순히 "서버를 안 만든다" 로만 이해하면 곤란하다
> 더 정확하게는 **"공통 백엔드 코드를 한 곳에 위탁하고, 나는 데이터 모델과 정책에만 집중한다"** 는 모델.
> 데이터·권한·실시간을 어떻게 *디자인* 할지의 책임은 그대로 남는다.

## Supabase 한눈에 보기

Supabase 는 한 덩어리 서비스가 아니다. 오픈소스 부품을 모아 통합 콘솔과 API 로 묶은 *plumbing 의 패키지* 에 가깝다.

핵심 구성 요소 다섯 가지:

1. `Postgres` — 진짜 PostgreSQL 한 인스턴스. extension·트리거·view 까지 풀로 사용 가능.
2. `Auth` — `GoTrue` 기반 인증 서버. 이메일·매직 링크·OAuth·OTP·MFA.
3. `Storage` — S3 호환 객체 스토리지. RLS 와 동일한 정책 모델로 권한 제어.
4. `Realtime` — Postgres `wal2json` 을 흘려서 변경사항을 WebSocket 으로 브로드캐스트.
5. `Edge Functions` — Deno 런타임 위의 서버리스 함수.

여기에 **자동 REST API** (`PostgREST`) 와 **GraphQL API** (`pg_graphql`) 가 스키마에서 자동 생성된다 — 테이블만 만들면 그날부터 GET/POST/PATCH/DELETE 엔드포인트가 살아 있다.

![Supabase 의 5대 컴포넌트 — Postgres / Auth / Storage / Realtime / Edge Functions 가 API Gateway 뒤에 묶인 구조도|720](/posts/supabase-practical-guide/components.svg)

> [!NOTE] "오픈소스" 라는 단어의 진짜 의미
> Supabase 는 self-host 가 가능하다. 대시보드부터 GoTrue 까지 모두 GitHub 에 공개돼 있고, Docker Compose 한 벌로 자체 서버에서 동일한 스택을 돌릴 수 있다.
> 매니지드 서비스가 갑자기 비싸지거나 정책이 바뀌어도 *탈출 경로* 가 열려 있다는 뜻.

## Firebase 와의 차이

Supabase 가 자신을 "Firebase 대안" 이라 부르니 비교는 피할 수 없다. 가장 큰 차이는 **데이터 모델** 이다.

- **Firebase Firestore**: 문서/컬렉션 기반의 NoSQL. 스키마 자유도는 높지만 join·트랜잭션·복잡한 집계는 약함.
- **Supabase Postgres**: 관계형. 외래키·트랜잭션·복잡한 join·CTE·window function 다 됨. 대신 *스키마를 미리 설계해야* 한다.

권한 모델도 다르다.

- **Firebase Security Rules**: 프로젝트 루트에 별도 DSL 파일을 둬서, 경로별 read/write 규칙을 선언.
- **Supabase RLS** (Row Level Security): Postgres 의 표준 기능. 테이블마다 SQL 정책을 붙여 행 단위로 가시성·수정 권한을 결정.

> [!WARNING] 데이터 모델은 *나중에* 바꾸기 어렵다
> "일단 NoSQL 로 시작하고 나중에 옮기지" 는 흔한 함정.
> 운영 중인 서비스의 데이터 모델 전환은 거의 *재작성* 에 가깝다.
> 도메인 관계가 명확하다면 처음부터 관계형으로 가는 게 유리하다.

## 어떨 때 Supabase 를 고르면 좋은가

선택은 항상 *trade-off* 다. 잘 맞는 경우와 그렇지 않은 경우를 분리해서 보자.

### 잘 맞는 경우

- 사이드 프로젝트·MVP — 인프라에 들이는 시간을 *0 에 가깝게* 줄여야 할 때.
- SQL 에 익숙한 팀 — 관계형 모델·인덱스·뷰·함수를 쓰던 사고방식 그대로 가져갈 수 있다.
- 인증·실시간이 필요한 앱 — 채팅·라이브 대시보드·협업 도구처럼 WebSocket 이 핵심인 도메인.
- 빠른 프로토타입 후 self-host 로 옮기고 싶을 때 — 같은 스택을 그대로 가져갈 수 있다.

### 잘 안 맞는 경우

- 백엔드 비즈니스 로직이 *매우 복잡* 한 서비스 — 결제·정산·복잡한 워크플로우는 Edge Functions 만으로 부족할 수 있다.
- 멀티 리전 read/write 가 필수인 글로벌 서비스 — 매니지드 Supabase 는 단일 리전 Postgres 가 기본.
- 이미 운영 중인 자체 백엔드와 통합해야 하는 경우 — 권한 모델이 두 벌 되면 오히려 복잡해진다.

> [!TIP] 한 가지 단순한 판단 기준
> *"내가 SQL 로 권한·관계를 표현하는 게 즐거운가?"* — 즐겁다면 Supabase 는 거의 항상 좋은 선택.
> SQL 을 가능하면 안 보고 싶다면 다른 BaaS 를 보는 게 낫다.

## 5분 만에 시작해보기

추상적인 설명보다 직접 한 번 눌러 보는 게 빠르다. 신용카드 없이 무료 plan 으로 한 프로젝트 생성 가능.

### 1. 프로젝트 만들기

`supabase.com` 에 가입하고 `New Project` 를 누르면 된다.

- **Name**: 프로젝트 식별자 (대시보드용).
- **Database password**: 한 번만 보여주니 비밀번호 매니저에 저장.
- **Region**: 사용자 위치와 가까운 곳. 한국 서비스라면 `ap-northeast-2 (Seoul)` 또는 `ap-northeast-1 (Tokyo)`.

대시보드 UI 는 자주 바뀌므로 캡처를 박아두기보단 직접 들어가서 흐름을 따라가는 편이 정확하다 — [supabase.com/dashboard](https://supabase.com/dashboard) 에서 `New Project` 버튼이 첫 화면에 있다.

프로젝트가 프로비저닝되는 데 1~2분. 끝나면 대시보드로 들어가 `Settings → API` 에서 두 가지를 메모해 두자.

- `Project URL` — REST/Realtime 진입점.
- `anon public key` — 클라이언트에서 쓰는 익명 키.

### 2. 첫 테이블 만들기

좌측 메뉴 `Table Editor` 에서 GUI 로 만들거나, `SQL Editor` 에서 SQL 로 직접 만들 수 있다. 이 글에선 SQL 쪽이 더 빠르다.

```sql:create_posts.sql
create table posts (
  id          bigserial primary key,
  title       text not null,
  content     text,
  published   boolean not null default false,
  created_at  timestamptz not null default now()
);
```

이 한 줄로 끝이다. 테이블이 만들어지는 즉시:

- `Table Editor` 에 행 단위 편집 UI 가 생김.
- `PostgREST` 가 `/rest/v1/posts` 엔드포인트를 자동 노출.
- `pg_graphql` 이 `posts` 쿼리/뮤테이션을 GraphQL 스키마에 추가.

### 3. JS SDK 로 한 번 호출해 보기

```ts:hello-supabase.ts
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!,
);

const { data, error } = await supabase
  .from('posts')
  .insert({ title: 'Hello, Supabase', published: true })
  .select()
  .single();

console.log(data, error);
```

서버 한 대 띄우지 않고도 INSERT 가 동작한다 — 단, *지금 이 상태로는 누구나 쓰고 누구나 읽는다*. 그래서 다음 단계가 RLS 다.

> [!WARNING] RLS 를 켜기 전엔 운영에 절대 올리지 말 것
> Supabase 는 기본적으로 테이블이 *공개* 상태로 만들어진다.
> 서비스에 띄우기 전에 반드시 `alter table ... enable row level security;` 를 적용하고 정책을 정의해야 한다.
> RLS 는 *2편* 에서 자세히 다룬다.

## 정리

Supabase 는 "백엔드를 안 만든다" 가 아니라 **"공통 백엔드를 위탁하고, 데이터 모델과 정책 설계에 집중한다"** 는 도구다. Postgres 에 익숙하다면 진입 장벽이 낮고, 이탈 비용도 낮다 — 같은 스택을 self-host 로 그대로 옮길 수 있기 때문.

이 시리즈에서 다룰 순서:

1. **(이번 편)** Supabase 가 무엇이고 왜 쓰는가
2. Database · RLS — 스키마 설계와 행 단위 권한
3. Auth — 이메일·OAuth·매직 링크 실전
4. Storage · Realtime — 파일 업로드와 WebSocket 구독
5. Supabase vs Convex — 어떤 BaaS 를 고를까

> [!NOTE] 다음 편 예고
> 2편에서는 실제 프로젝트 스키마를 한 벌 만들고, RLS 로 *내 글만 내가 수정* 정책을 거는 작업을 따라간다.
> Postgres 정책 문법이 처음이라면 거기서부터 같이 짚을 예정.
