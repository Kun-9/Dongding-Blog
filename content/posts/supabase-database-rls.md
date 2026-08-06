---
title: Supabase Database 와 RLS — 한 줄 정책으로 권한을 잠근다
summary: Postgres 위 행 단위 보안(RLS)으로 권한을 데이터 옆에 둔다. 스키마 설계부터 자주 쓰는 정책 패턴, 디버깅 팁까지 정리합니다.
category: system
tags:
  - supabase
  - postgres
  - rls
  - sql
  - security
date: '2026-04-28'
visibility: published
series: supabase-guide
seriesOrder: 2
---
## 들어가며

1편에서 한 가지 단서를 남겼다. Supabase 는 테이블을 만든 *그 순간부터* REST·GraphQL 엔드포인트를 자동으로 노출한다 — 그 말은 곧 *권한 설계를 하지 않으면 그 엔드포인트는 누구나 쓸 수 있다* 는 뜻이다.

전형적인 백엔드라면 권한은 보통 컨트롤러나 서비스 레이어에 둔다. Supabase 의 모델은 다르다. **권한을 데이터 옆에 둔다** — Postgres 의 표준 기능인 RLS (Row Level Security) 를 활용해, "이 행을 누가 읽고 쓸 수 있는가" 를 *테이블 정책* 으로 선언한다.

> [!INFO] 이 글이 다루는 범위
> 이번 편은 Supabase Database 의 권한 모델, 즉 RLS 에 집중합니다.
> 스키마 설계 자체(정규화, 인덱싱, 마이그레이션 도구)는 별도 주제로, 이번 글에선 권한과 직접 닿는 부분만 다룹니다.

## 먼저 한 벌 스키마를 만들자

권한을 이야기하려면 데이터가 있어야 하니, 작은 블로그 스키마를 한 벌 만들어 두자.

```sql:schema.sql
-- 사용자 프로필 (auth.users 와 1:1 으로 매핑)
create table profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  username    text unique not null,
  bio         text,
  created_at  timestamptz not null default now()
);

-- 글
create table posts (
  id          bigserial primary key,
  author_id   uuid not null references profiles(id) on delete cascade,
  title       text not null,
  content     text,
  published   boolean not null default false,
  created_at  timestamptz not null default now()
);

-- 댓글
create table comments (
  id          bigserial primary key,
  post_id     bigint not null references posts(id) on delete cascade,
  author_id   uuid not null references profiles(id) on delete cascade,
  body        text not null,
  created_at  timestamptz not null default now()
);
```

핵심 한 가지: `auth.users` 는 Supabase Auth 가 관리하는 *내장 테이블* 이다. 직접 INSERT 하지 않고, 인증을 통해서만 행이 생성된다. 우리 도메인 테이블(`profiles`)은 그 `id` 를 외래키로 따라간다.

> [!TIP] profiles 테이블을 따로 두는 이유
> `auth.users` 에 도메인 컬럼(닉네임, 자기소개 등)을 직접 추가할 수도 있지만, **권장되지 않는다.**
> Supabase Auth 가 관리하는 스키마는 시간이 지나면서 변경될 수 있고, 도메인 데이터와 인증 데이터를 한 테이블에 섞으면 마이그레이션이 어려워진다. 1:1 매핑된 `profiles` 테이블을 따로 두는 패턴이 표준이다.

## RLS 가 무엇이고, 왜 default off 가 위험한가

RLS 는 Postgres 의 기능이다 — Supabase 의 발명이 아니다. 테이블에 RLS 를 켜면, 그 테이블에 대한 *모든* `SELECT/INSERT/UPDATE/DELETE` 가 정책(policy) 함수를 통과해야 한다.

Supabase 가 새 테이블을 만들 때 **기본값은 RLS off** 이다. 즉, 방금 만든 `posts` 테이블은 **익명 키로도 누구나 읽고 쓸 수 있는 상태** 다.

> [!WARNING] 이건 운영에서 절대 피해야 할 상태다
> 매 테이블마다 명시적으로 RLS 를 켜야 한다. Supabase 대시보드는 RLS 가 꺼진 테이블에 빨간 경고 배지를 띄워준다 — 무시하지 말 것.
> 켜는 명령은 단 한 줄: `alter table <name> enable row level security;`

세 테이블 모두에 RLS 를 켜자.

```sql:enable_rls.sql
alter table profiles enable row level security;
alter table posts    enable row level security;
alter table comments enable row level security;
```

**여기서 끝이 아니다.** RLS 만 켜고 정책을 안 만들면 *어떤 행도 보이지 않는* 상태가 된다 (정책이 없으니 모두 거부). 켰다면 정책도 같이 정의해야 한다.

## 첫 정책 — 공개 글은 누구나, 수정은 본인만

가장 흔한 패턴. `posts` 에 적용해 보자.

```sql:policies_posts.sql
-- 1) 발행된 글은 누구나 읽을 수 있다
create policy "published posts are readable by anyone"
on posts for select
using ( published = true );

-- 2) 본인이 쓴 글은 발행 여부와 무관하게 본인이 읽을 수 있다
create policy "users can read their own posts"
on posts for select
using ( auth.uid() = author_id );

-- 3) 글 작성은 로그인한 사용자만, 본인 author_id 로만
create policy "authenticated users can insert their own posts"
on posts for insert
with check ( auth.uid() = author_id );

-- 4) 글 수정·삭제는 본인 글만
create policy "users can update their own posts"
on posts for update
using ( auth.uid() = author_id );

create policy "users can delete their own posts"
on posts for delete
using ( auth.uid() = author_id );
```

읽어보면 자연스럽다. 정책은 *어떤 행을 통과시킬지* 를 SQL 식으로 선언하는 것뿐이다.

`using` 과 `with check` 는 헷갈리는 지점이라 한 번 정리:

- `using` — *기존 행* 에 대한 가시성·접근 가능성. SELECT/UPDATE/DELETE 시 평가.
- `with check` — *새 행/변경 후 행* 에 대한 검증. INSERT/UPDATE 시 평가.

> [!INFO] UPDATE 는 `using` 과 `with check` 모두 평가된다
> 즉, "기존 글이 본인 것이고 (`using`), 변경 후에도 author_id 가 본인이어야 한다 (`with check`)" 까지 자연스럽게 강제할 수 있다.
> 한 쪽만 정의하면 같은 식이 양쪽에 적용된다.

## auth.uid() · auth.jwt() — Supabase 가 주입하는 컨텍스트

정책에서 `auth.uid()` 를 그냥 호출하면 *현재 요청자의 사용자 ID* 가 나온다. 어떻게?

Supabase 는 클라이언트가 보낸 `Authorization: Bearer <jwt>` 헤더를 PostgREST 가 받아 — 그 JWT 의 payload 를 Postgres 의 `request.jwt.claims` 세션 변수에 채워준다. `auth.uid()` 는 거기서 `sub` 를 뽑는 헬퍼 함수다.

```sql
-- 거칠게 풀어보면 이렇게 동작한다
create or replace function auth.uid() returns uuid as $$
  select coalesce(
    nullif(current_setting('request.jwt.claims', true), '')::json ->> 'sub',
    ''
  )::uuid;
$$ language sql stable;
```

JWT 안의 다른 클레임(`role`, `email`, custom claim) 도 `auth.jwt()` 로 꺼낼 수 있다. 권한 모델을 확장할 때 자주 쓰인다.

```sql
-- 운영자 클레임이 붙은 사용자만 발행 여부와 상관없이 모두 읽기
create policy "admins can read all posts"
on posts for select
using ( (auth.jwt() ->> 'user_role') = 'admin' );
```

> [!TIP] 정책에서 *익명 호출* 과 *로그인 호출* 을 구분하고 싶다면
> Supabase 는 익명 요청에 `anon` 롤, 로그인된 요청에 `authenticated` 롤을 부여한다.
> `to authenticated` / `to anon` 절을 정책에 붙이면 호출 주체별로 다른 정책을 정의할 수 있다.
>
> 예: `create policy "..." on posts for insert to authenticated with check (...);`

## 자주 쓰는 패턴

처음 한두 테이블이 익숙해지면, 다음 패턴들이 거의 모든 경우를 덮는다.

### 1. 공개 읽기 + 소유자 쓰기

가장 흔하다. 위에서 본 `posts` 가 정확히 이 형태.

### 2. 조직(팀) 단위 가시성

다중 테넌트(multi-tenant) 앱의 표준. `memberships(user_id, org_id)` 같은 매핑 테이블을 두고, 조회 정책을 그 매핑으로 join.

```sql
-- 조직에 속한 멤버만 그 조직의 문서를 읽을 수 있다
create policy "org members can read documents"
on documents for select
using (
  exists (
    select 1 from memberships
    where memberships.user_id = auth.uid()
      and memberships.org_id  = documents.org_id
  )
);
```

`exists` 서브쿼리는 인덱스만 잘 잡혀 있으면 RLS 의 *기본 도구* 가 된다.

### 3. 역할 기반 (admin / editor / viewer)

JWT 클레임에 역할이 들어 있다면 `auth.jwt() ->> 'user_role'` 로 분기. 역할 자체를 DB 에 두고 싶다면 `role` 컬럼을 `profiles` 에 두고 함수로 감싸는 패턴이 흔하다.

```sql
create or replace function is_admin() returns boolean as $$
  select exists (
    select 1 from profiles
    where id = auth.uid() and role = 'admin'
  );
$$ language sql stable security definer;

create policy "admins bypass restrictions"
on posts for all using ( is_admin() );
```

> [!WARNING] `security definer` 함수는 호출자 권한이 아니라 *함수 소유자* 권한으로 실행된다
> 정책 안에서 RLS 우회 헬퍼를 만들 때 자주 쓰지만, 함수 본문 안에서 의도하지 않게 다른 행을 노출하지 않도록 입력 검증을 꼼꼼히 해야 한다.

### 4. 공개·비공개 토글

`posts.published` 처럼 한 컬럼이 가시성을 결정. 위 *첫 정책* 에서 본 그대로.

## Service Role 은 RLS 를 우회 — 절대 클라이언트에 두지 말 것

Supabase 가 발급하는 두 종류의 키:

- `anon public key` — 클라이언트(브라우저·앱)에서 안전하게 노출 가능. RLS 적용.
- `service role key` — 서버 전용 키. **RLS 를 우회한다.** 즉, 모든 행을 보고 모든 행을 쓸 수 있다.

> [!WARNING] service role key 가 클라이언트 번들에 들어가면 *전부 끝난다*
> 누구나 그 키를 추출해 모든 데이터를 다운로드·수정할 수 있다.
> 이 키는 서버 사이드(Edge Function, Next.js API route, 백엔드)에서만 사용. 환경 변수로만 주입하고, 절대 `NEXT_PUBLIC_*` 접두사를 붙이지 말 것.

Cron 작업·관리자 백오피스·웹훅 같은 *시스템 동작* 이 필요할 때만 service role 을 써야 하는 자리다.

## 정책 디버깅 팁

RLS 는 강력하지만 디버깅이 까다롭다. 정책을 통과 못한 행은 *그냥 안 보일 뿐* 에러를 안 던지기 때문에, "왜 빈 결과가 나오지?" 가 흔한 시나리오다.

체크 순서:

1. **테이블에 RLS 가 켜져 있는가** — 대시보드의 빨간 배지로 확인.
2. **그 테이블에 정책이 *하나라도* 있는가** — 없으면 모두 거부 상태.
3. **여러 정책이 있다면 OR 결합이라는 점을 기억** — 한 정책만 통과해도 행이 보인다. 정책 의도를 좁게 적었는데 다른 정책이 넓다면 거기서 통과될 수 있다.
4. **`auth.uid()` 가 실제로 무엇인가** — 익명 호출이면 `null` 이라 비교가 다 거짓. 로그인 토큰을 SDK 에 제대로 주입했는지 확인.
5. **SQL Editor 에서 직접 시뮬레이션** — `set role authenticated; set request.jwt.claims to '{"sub": "..."}';` 후 쿼리.

```sql:debug.sql
-- 사용자 X 의 시점에서 posts 가 어떻게 보이는지 확인
begin;
set local role authenticated;
set local request.jwt.claims to '{"sub": "<user-uuid>"}';

select id, title, published from posts;

rollback;
```

> [!TIP] Supabase Inspector / Logs 로 한 단계 더 들어가기
> 대시보드 `Logs` 탭의 *Postgres logs* 에서 거부된 쿼리를 직접 볼 수 있다.
> 정책 위반은 `permission denied for ...` 형태로 기록되니 검색 키워드로 활용.

## 정리

RLS 는 처음 보면 어색하지만, 익숙해지면 **권한을 데이터 옆에 두는 모델** 이 코드베이스의 *진실의 위치* 를 줄여준다. 비즈니스 로직 어디에서도 권한 체크가 누락될 수 없게 되는 셈.

기억할 것 셋:

- 테이블을 만들면 *바로* RLS 를 켠다 — 그리고 정책을 같이 정의한다.
- `using` / `with check` 의미를 분리해서 본다.
- `service role key` 는 클라이언트에 *절대* 두지 않는다.

> [!NOTE] 다음 편 예고
> 3편에서는 Supabase Auth — 이메일·OAuth·매직 링크 — 의 실제 흐름을 따라가며, JWT 가 어떻게 발급·갱신되고 SSR 환경에서 어떻게 다뤄야 하는지를 짚는다.
> 그 토큰이 바로 RLS 의 입력이다.
