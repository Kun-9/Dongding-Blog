---
title: Supabase vs Convex — 어떤 BaaS 를 고를까
summary: 데이터 모델·권한·실시간·러닝 커브·이탈 비용 다섯 축으로 두 BaaS 를 비교하고, 상황별 선택 체크리스트로 정리합니다.
category: system
tags:
  - supabase
  - convex
  - baas
  - comparison
  - backend
date: '2026-04-28'
visibility: published
series: supabase-guide
seriesOrder: 5
---
## 들어가며

Supabase 만 다루다 끝낼 수도 있었지만, 실전에서는 BaaS 를 고를 때 *항상* 같은 질문이 따라온다 — "Convex 는 어때요?" 두 도구는 같은 *문제 영역(서비스를 빠르게 시작하고 싶다)* 을 풀지만, *전혀 다른 모델* 을 채택했다.

이번 편은 Supabase 시리즈의 마무리이지만, 결론은 "Supabase 가 항상 답" 이 아니다. 도메인과 팀 성향에 따라 Convex 가 더 잘 맞을 수 있다 — 그 판단 기준을 정리해 두자는 글.

> [!INFO] 이 글이 다루는 범위
> 두 도구의 *모델 차이* 와 *상황별 선택 기준* 에 집중합니다. 가격·요금제는 둘 다 자주 바뀌므로 다루지 않고, 마지막에 체크리스트로 정리합니다.

## 출발점이 다르다

같은 BaaS 라도 *철학* 이 다르다.

- **Supabase** — *Postgres 를 코어로 두고 그 위에 BaaS 컴포넌트를 얹는다.* "오픈소스 Firebase 대안"이 슬로건. 표준 SQL·관계형 모델을 그대로 쓰고, 권한은 RLS 로 데이터 옆에 둔다.
- **Convex** — *백엔드를 TypeScript 함수로 본다.* 데이터베이스는 함수가 다루는 매개체일 뿐, 클라이언트는 DB 가 아니라 *함수* 를 호출한다. 권한·검증·트랜잭션은 모두 함수 안.

이 차이가 글 전체의 모든 비교 항목을 결정한다.

> [!TIP] 한 줄 요약이 필요하다면
> Supabase 는 *DB-first*, Convex 는 *function-first* 다.
> "내가 SQL 로 사고하고 싶은가, TypeScript 로 사고하고 싶은가" 가 첫 번째 갈림길.

## 1. 데이터 모델

### Supabase — 관계형 Postgres

표준 PostgreSQL. 테이블·외래키·트랜잭션·뷰·트리거·CTE·인덱스 모두 사용 가능. 스키마는 SQL 로 정의하고, 마이그레이션 도구(Supabase CLI, drizzle-kit, prisma 등) 로 관리.

```sql
create table posts (
  id          bigserial primary key,
  author_id   uuid references profiles(id),
  title       text not null,
  ...
);
```

장점은 *익숙함* 과 *표현력*. 모든 RDBMS 지식이 그대로 통한다.

### Convex — 문서 기반 + 명시적 인덱스

Convex 의 데이터베이스는 *문서 컬렉션* 모델에 가깝다. 스키마는 TypeScript 로 선언한다.

```ts:convex/schema.ts
import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

export default defineSchema({
  posts: defineTable({
    title: v.string(),
    content: v.string(),
    authorId: v.id('users'),
    published: v.boolean(),
  }).index('by_author', ['authorId']),
});
```

조인은 함수 안에서 *명시적 fetch* 로 한다 — `db.get(authorId)` 식. 풀 SQL 이 아니라서 표현력은 좁지만, *어떤 데이터가 어떻게 오는지가 코드에 그대로 보인다* 는 장점이 있다.

> [!INFO] 데이터 모델은 한 번 정하면 *바꾸기 어렵다*
> 운영 중인 서비스의 데이터 모델 전환은 사실상 재작성이다.
> 도메인이 정규화에 친화적이라면 Supabase, 이벤트·문서·트리/그래프 형태가 자연스럽다면 Convex 쪽으로 기우는 편.

## 2. 권한 모델

### Supabase — 데이터 옆의 RLS

권한이 *테이블 정책* 으로 선언된다. 어떤 코드 경로에서 호출되든, 같은 사용자 토큰은 같은 결과를 본다.

```sql
create policy "users edit own posts"
on posts for update using ( auth.uid() = author_id );
```

**장점**: 권한 누락의 *단일 진실지* 가 DB. 모든 클라이언트·서버·SQL 호출에 일관 적용.
**단점**: 복잡한 비즈니스 규칙(예: "결제 후 N일 안에는 수정 가능") 을 SQL 로 표현하면 정책이 길어진다. SQL 식이 익숙하지 않으면 진입 장벽.

### Convex — 함수가 게이트

데이터는 함수를 통해서만 접근된다. 권한 체크는 *함수 본문 안에 직접* 작성한다.

```ts:convex/posts.ts
import { v } from 'convex/values';
import { mutation } from './_generated/server';

export const updatePost = mutation({
  args: { postId: v.id('posts'), title: v.string() },
  handler: async (ctx, { postId, title }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Unauthenticated');

    const post = await ctx.db.get(postId);
    if (!post) throw new Error('Not found');
    if (post.authorId !== identity.subject) throw new Error('Forbidden');

    await ctx.db.patch(postId, { title });
  },
});
```

**장점**: 비즈니스 로직과 권한을 *같은 언어로* 표현 — 복잡한 규칙이 자연스럽다. 디버깅도 일반 TypeScript 디버깅과 같다.
**단점**: 권한 체크가 *모든 함수* 에 있어야 한다. 한 곳이라도 빼먹으면 누수. 추상화 패턴(헬퍼 함수, 미들웨어)을 팀 차원에서 잡아야 한다.

> [!WARNING] 두 모델 모두 *기본 보안 가정* 이 다르다
> Supabase 는 *RLS 를 켜지 않으면 다 공개*, Convex 는 *함수에서 권한 체크를 안 하면 그 함수는 다 통과*.
> 어느 쪽이든 *기본값을 잠그고 명시적으로 풀어주는* 디자인을 팀이 가져가야 한다.

## 3. 실시간

### Supabase — 명시적 구독

`postgres_changes` / `broadcast` / `presence` 세 모드를 명시적으로 채널에 붙인다. 4편에서 다룬 그대로.

**좋은 점**: 어떤 데이터가 흐르는지 *읽기 쉽다*. 서버에 부담을 주는 구독은 명시적으로 보임.
**아쉬운 점**: 화면 컴포넌트마다 구독·해제·캐시 동기화 코드를 매번 다뤄야 한다.

### Convex — 모든 query 가 자동 reactive

```tsx
import { useQuery } from 'convex/react';
import { api } from '../convex/_generated/api';

function PostList() {
  const posts = useQuery(api.posts.list);
  return <ul>{posts?.map((p) => <li key={p._id}>{p.title}</li>)}</ul>;
}
```

이 한 줄이 *자동으로 실시간* 이다. Convex 는 query 함수가 어떤 문서·인덱스에 의존하는지 추적해 두고, 그 데이터가 변경되면 의존하는 클라이언트의 결과를 다시 보낸다.

**좋은 점**: 마법처럼 동작 — *실시간을 따로 코딩하지 않아도 된다*.
**아쉬운 점**: query 가 비싸지면 *어디서 무엇이 다시 평가되는지* 가 추상 뒤에 숨는다. 부주의하면 한 mutation 이 수십 query 의 재평가를 트리거.

## 4. 개발자 경험

### Supabase

- *익숙한* 모델: SQL·관계형·외래키·인덱스. 기존 백엔드 경험이 그대로 전이.
- 클라이언트는 SDK 가 자동 생성한 REST·GraphQL 을 호출. 타입은 `supabase gen types` 로 별도 생성.
- 마이그레이션은 SQL 또는 외부 도구.
- 디버깅은 SQL 쿼리·로그 위주.

### Convex

- *함수 중심* 모델: TypeScript·문서·명시적 인덱스. 백엔드와 프론트엔드가 *같은 언어* 로 닿는다.
- 클라이언트는 `api.posts.list` 같은 *타입 자동 추론된* 함수 호출. 컴파일 타임에 인자·반환 타입이 모두 추적.
- 마이그레이션은 *함수 디플로이* 로 통합. 스키마 변경 시 마이그레이션 헬퍼 제공.
- 디버깅은 일반 TypeScript 디버깅과 동일.

> [!TIP] 풀스택 TS 팀이라면 Convex 의 DX 는 매우 매끄럽다
> 컴포넌트가 호출하는 함수의 인자·반환 타입이 *자동으로* 잡힌다는 건 Supabase 의 `gen types` 를 따로 돌리는 흐름과는 마찰이 다르다.
> 다만 *백엔드를 굳이 TS 로* 묶고 싶지 않은 팀에겐 Supabase 의 SDK + 자동 REST 가 더 자유롭다.

## 5. 락인·이탈 비용

서비스가 자라면 결국 *이걸 떠날 수 있나* 가 문제가 된다.

### Supabase

- 코어가 *그냥 Postgres*. `pg_dump` 한 번으로 다른 RDBMS 호스팅(RDS, Neon, self-host)에 옮길 수 있다.
- Auth(GoTrue)·Storage·Realtime 도 모두 오픈소스 — Docker Compose 로 self-host 가능.
- *RLS 정책 자체* 는 Postgres 표준이라 그대로 들고 갈 수 있다.

이탈 비용이 비교적 낮다.

### Convex

- 데이터·런타임이 *Convex 만의 모델* 이다. query/mutation/action 이라는 함수 모델, reactive 추적, 명시적 인덱스 — 같은 모델을 다른 곳에서 그대로 가질 수 없다.
- 데이터 export 는 가능하지만, *함수와 권한 모델 전체를* 다른 백엔드로 옮기려면 사실상 재작성.

이탈 비용이 상대적으로 높다.

> [!WARNING] 락인은 *나쁘다* 가 아니라 *전제* 다
> Convex 의 매끄러운 DX 는 그 모델에 *깊이 개입* 했기 때문에 가능하다. 락인이 싫다면 그 매끄러움도 일부 포기하는 셈.
> 둘 중 어느 쪽이 옳다가 아니라, *프로젝트의 시간 지평선* 에 맞는 트레이드오프를 고르는 것이 중요.

## 상황별 선택 가이드

체크리스트 형식으로 정리. 항목이 많이 해당되는 쪽이 후보.

### Supabase 쪽이 유리한 신호

- SQL·관계형 모델이 익숙하다.
- 도메인이 *조인 많고 집계 많은* 형태(분석, 리포트, 통계).
- *오픈소스·self-host* 가 미래 옵션으로 필요하다.
- 백엔드 언어를 TS 외 다른 것(Go, Rust, Python)으로 가져갈 가능성이 있다.
- 권한 규칙이 비교적 *데이터 형태로* 표현 가능 (소유자, 조직, 공개 토글 정도).
- 기존 RDB 시스템에서 마이그레이션해 오는 길이 필요하다.

### Convex 쪽이 유리한 신호

- 풀스택 TypeScript 팀이고, *컴파일 타임 타입 추적* 이 중요한 가치.
- 도메인이 *문서·트리·이벤트* 형태가 자연스럽다 (협업, 노트, 화이트보드, 채팅).
- *모든 화면이 실시간* 인 앱 — 구독 코드를 매번 짜는 것이 부담.
- 비즈니스 규칙이 복잡해 *함수로* 표현하는 편이 자연스럽다.
- 사이드 프로젝트나 빠른 MVP, *락인 비용을 알면서도* 단기 속도를 사겠다.

### 판단을 보류해야 하는 신호

- 데이터 모델이 아직 흐릿하다 — *둘 다* 위험. 먼저 도메인을 종이 위에 그려본 뒤 다시 결정.
- 팀이 SQL 도 TS 도 강하지 않다 — 작은 프로토타입을 양쪽으로 24시간씩 만들어 보고 *느낌* 으로 결정하는 편이 빠르다.

## 그래서, 어떤 걸 골라야 하나

도구의 우열이 아니라 *팀과 도메인의 짝짓기* 다.

- **관계형이고, 락인 비용에 민감하다면** → Supabase.
- **풀스택 TS·실시간 위주의 협업 도구라면** → Convex.
- **둘 다 끌리지만 결정 못 하겠다면** → 가장 위험한 도메인 한 부분(권한 모델 또는 가장 복잡한 비즈니스 규칙)을 양쪽으로 *소량 프로토타입*. 한 시간이면 어느 쪽이 *덜 어색* 한지 알 수 있다.

> [!TIP] BaaS 결정은 *되돌릴 수 있어야* 한다
> 1년 후에 후회할 수 있다는 가정으로 디자인. 도메인 로직(엔티티, 도메인 함수) 을 BaaS SDK 와 분리해 두면 *같은 코드* 가 양쪽 위에서 돌 수 있게 짜는 것이 가능. 어느 BaaS 를 고르든 *얇은 어댑터* 한 겹은 두자.

## 정리 — 시리즈를 마치며

이 시리즈에서 본 흐름:

1. BaaS 가 무엇이고 왜 쓰는가 — Supabase 의 위치
2. Database · RLS — 권한을 데이터 옆에 두는 모델
3. Auth — JWT 가 RLS 의 입력이 되는 흐름
4. Storage · Realtime — 같은 정책 모델로 파일과 변경을 다루는 법
5. *(이번 편)* Supabase vs Convex — 모델 차이와 선택 기준

Supabase 의 핵심은 한 줄로 요약된다 — **"인증 토큰 한 벌이 DB·파일·구독에 같은 정책으로 흐른다"**. 이 일관성이 가장 큰 매력이고, 동시에 SQL·관계형 모델에 *어느 정도 들어가야* 그 매력이 보이는 도구이기도 하다.

Convex 는 그 정반대 방향에서, 함수 모델로 같은 일관성을 만든다. 어느 쪽도 정답은 아니지만 *고르고 나면 그 모델 안에서 일하는* 결심이 따라온다 — 그래서 처음의 결정이 중요하다.

> [!NOTE] 시리즈는 여기서 마무리
> 이후로는 RLS 디버깅 패턴, Realtime 성능 모니터링, Edge Functions 활용 같은 *깊이 있는 한 주제* 를 단발 글로 다룰 예정. 시리즈가 도움이 됐다면 댓글이나 피드백을 남겨 주시면 다음 글의 우선순위에 반영하겠다.
