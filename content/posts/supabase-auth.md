---
title: Supabase Auth — 이메일·OAuth·매직 링크를 SDK 한 벌로
summary: GoTrue 기반 인증 서버의 동작 방식과 가입·로그인·세션·SSR 처리를 실전 예제로 정리합니다.
category: system
tags:
  - supabase
  - auth
  - oauth
  - jwt
  - nextjs
date: '2026-04-28'
visibility: published
series: supabase-guide
seriesOrder: 3
---
## 들어가며

직접 만들면 안 되는 것이 몇 가지 있다 — 암호 알고리즘, 결제 시스템, 그리고 인증. 인증은 *겉보기엔* 단순하다. 이메일을 받고, 비밀번호를 해시하고, 토큰을 발급한다. 그러나 *제대로* 만들려면 비밀번호 정책, 이메일 검증, 비밀번호 재설정, 토큰 만료·갱신, 디바이스 관리, OAuth 콜백, 무상태 SSR, MFA, brute-force 보호… 끝이 없다.

Supabase 는 이걸 [GoTrue](https://github.com/supabase/auth) 라는 오픈소스 인증 서버에 위탁한다. GoTrue 는 Netlify 가 만들고 Supabase 가 fork·발전시킨 *작고 단단한* 인증 서버다. 우리는 SDK 한 벌과 정책 몇 줄로 그 결과만 받아 쓴다.

> [!INFO] 이 글이 다루는 범위
> 가입·로그인 패턴, 세션·JWT, SSR(Next.js)에서의 토큰 다루기, MFA 의 큰 그림.
> Supabase 외 인증 시스템(예: Auth.js + DB)은 다루지 않습니다.

## GoTrue 가 하는 일

내부적으로 GoTrue 가 하는 일은 다음 정도로 요약된다.

- 사용자 회원가입·로그인·로그아웃을 처리한다.
- 비밀번호를 bcrypt 로 해시해 `auth.users` 테이블에 보관한다.
- 인증이 성공하면 *짧은 만료의* `access_token` (JWT) 과 *긴 만료의* `refresh_token` 을 발급한다.
- access token 만료가 가까워지면 refresh token 으로 새 토큰을 자동 발급한다.
- OAuth provider(Google, GitHub, ...) 와의 콜백 흐름을 대신 한다.
- 비밀번호 재설정·이메일 검증·매직 링크 발송을 SMTP 또는 외부 서비스로 처리한다.

발급된 JWT 는 PostgREST 가 받아 `request.jwt.claims` 로 Postgres 에 흘려주고, 이전 편에서 본 RLS 가 그 값을 읽어 권한을 결정한다.

> [!TIP] *왜* JWT 인가
> JWT 는 *서버에 세션 상태를 저장하지 않아도* 쿠키만으로 권한 검증이 되는 토큰 형식.
> Supabase 가 PostgREST 같은 stateless 서비스를 한 줄로 묶을 수 있는 핵심 이유다. 다만 무효화는 까다롭다 — 토큰이 만료될 때까지 *살아 있다* 는 점은 항상 기억.

## 이메일 + 패스워드 — 가장 단순한 흐름

먼저 가장 익숙한 형태부터.

### 가입

```ts:signup.ts
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

const { data, error } = await supabase.auth.signUp({
  email: 'kim@example.com',
  password: 'super-secret-passphrase',
  options: {
    emailRedirectTo: 'https://example.com/auth/callback',
  },
});
```

기본 설정에서는 가입 직후 GoTrue 가 *확인 메일* 을 보낸다. 사용자가 메일 링크를 누르기 전엔 `auth.users.email_confirmed_at` 이 `null` 이고, 그 상태로는 로그인 시도를 거부한다.

> [!WARNING] 개발 환경에서 SMTP 가 비어 있으면 메일이 *안 간다*
> Supabase 의 무료 plan 은 가벼운 SMTP 를 기본 제공하지만 발송 한도가 낮다.
> 프로덕션에서는 외부 SMTP(Resend, Postmark, SES 등) 를 `Settings → Auth → SMTP` 에 연결.
> 또는 Auth 설정에서 `Confirm email` 을 끄면 메일 검증 없이 즉시 로그인 가능 — 다만 *프로덕션* 에선 권장하지 않는다.

### 로그인

```ts:signin.ts
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'kim@example.com',
  password: 'super-secret-passphrase',
});

if (error) {
  // Invalid login credentials, Email not confirmed, ...
  console.error(error.message);
}

console.log(data.session); // access_token, refresh_token, expires_at, user, ...
```

성공하면 SDK 가 `session` 을 SDK 내부 storage(브라우저면 localStorage 기본) 에 저장한다. 이후의 모든 `supabase.from(...)` 호출은 그 토큰을 자동으로 헤더에 붙여 보낸다.

## 매직 링크 — 비밀번호 없는 인증

이메일만 받고 그 이메일로 *원클릭 로그인 링크* 를 보낸다. 보안이 단순하고 사용자 마찰이 적어 사이드 프로젝트나 B2B 도구에서 인기.

```ts:magic-link.ts
const { error } = await supabase.auth.signInWithOtp({
  email: 'kim@example.com',
  options: {
    emailRedirectTo: 'https://example.com/auth/callback',
  },
});
```

사용자가 메일의 링크를 누르면 `emailRedirectTo` 로 돌아오면서 URL 해시(또는 코드 파라미터)에 토큰이 실려 온다. SDK 가 그 토큰을 읽어 세션을 만든다.

> [!INFO] OTP 도 같은 흐름
> `signInWithOtp` 는 매직 링크뿐 아니라 *6자리 코드를 메일/문자로 보내는* OTP 흐름에도 쓰인다.
> 모바일 앱에서는 링크보다 코드 입력이 자연스러울 때가 많다.

## OAuth — 소셜 로그인

Google·GitHub·Apple·Discord·Kakao 등 주요 provider 가 클릭 한 번으로 연결된다. 대시보드 `Authentication → Providers` 에서 클라이언트 ID·시크릿을 입력하면 끝.

```ts:oauth.ts
const { data, error } = await supabase.auth.signInWithOAuth({
  provider: 'github',
  options: {
    redirectTo: 'https://example.com/auth/callback',
    scopes: 'read:user user:email',
  },
});
```

호출하면 SDK 가 브라우저를 GitHub 로 보내고, GitHub 가 인증 후 우리 콜백 URL 로 돌려보낸다. 콜백에서는 SDK 가 자동으로 토큰을 교환해 세션을 만든다.

OAuth 콜백 라우트는 보통 별도로 한 줄 만들어 둔다.

```ts:app/auth/callback/route.ts
import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');

  if (code) {
    const supabase = createServerClient();
    await supabase.auth.exchangeCodeForSession(code);
  }

  return NextResponse.redirect(new URL('/', request.url));
}
```

> [!TIP] redirect URL 은 Supabase 대시보드에 *허용 목록* 으로 등록해야 한다
> `Authentication → URL Configuration → Redirect URLs` 에 등록되지 않은 URL 은 거부된다.
> 로컬 개발 시 `http://localhost:3000/auth/callback` 도 잊지 말고 추가.

## 세션과 JWT — RLS 의 입력

세션 객체는 대략 이렇게 생겼다.

```ts
interface Session {
  access_token: string;   // 짧게(기본 1시간) 살아 있는 JWT
  refresh_token: string;  // 길게 살아 있는 갱신 토큰
  expires_at: number;     // unix timestamp
  user: User;
}
```

SDK 는 만료가 가까워지면 자동으로 `refresh_token` 으로 새 access token 을 받아온다. 우리가 명시적으로 갱신 코드를 짤 필요는 없다.

JWT 의 payload(=`auth.jwt()` 가 보는 값) 안에는 다음이 들어 있다.

- `sub` — user UUID. RLS 의 `auth.uid()` 가 이걸 꺼낸다.
- `email`, `phone` — 식별자.
- `role` — `authenticated` 또는 `anon`.
- `aal` — 인증 보증 레벨 (Authenticator Assurance Level). MFA 통과 여부.
- `app_metadata` — 시스템이 박는 메타. 사용자가 못 바꿈.
- `user_metadata` — 사용자가 자기 프로필에서 채워 넣는 메타.

> [!WARNING] 권한 결정에 `user_metadata` 를 절대 쓰지 말 것
> `user_metadata` 는 클라이언트가 `updateUser({ data })` 로 *직접 수정 가능* 한 영역이다.
> 권한 분기(예: 관리자 여부)는 반드시 `app_metadata` 또는 DB(`profiles.role`) 기반으로.

## SSR (Next.js) — 서버에서 토큰 다루기

브라우저 SDK 는 localStorage 를 기본 storage 로 쓴다. 이 모델은 SSR(서버 사이드 렌더링) 과 잘 안 맞는다 — 서버에서는 localStorage 가 없고, 첫 요청에서 사용자가 누구인지를 알아야 한다.

해결책: **쿠키 기반 storage** 를 쓰는 SSR 헬퍼를 SDK 가 따로 제공한다.

```ts:lib/supabase/server.ts
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export function createClient() {
  const cookieStore = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name) => cookieStore.get(name)?.value,
        set: (name, value, options) => cookieStore.set({ name, value, ...options }),
        remove: (name, options) => cookieStore.set({ name, value: '', ...options }),
      },
    },
  );
}
```

서버 컴포넌트·라우트 핸들러·미들웨어에서 이 클라이언트를 쓰면, 쿠키에 저장된 토큰이 자동으로 PostgREST 호출 헤더에 실린다 — RLS 가 사용자 컨텍스트로 동작한다.

```ts:app/page.tsx
import { createClient } from '@/lib/supabase/server';

export default async function Home() {
  const supabase = createClient();
  const { data: posts } = await supabase
    .from('posts')
    .select('id, title')
    .order('created_at', { ascending: false });

  return <ul>{posts?.map((p) => <li key={p.id}>{p.title}</li>)}</ul>;
}
```

서버 사이드라도 *해당 사용자 토큰* 으로 호출되므로, RLS 가 그대로 적용된다. 익명 사용자는 익명 권한으로, 로그인 사용자는 로그인 권한으로 — 한 코드.

> [!TIP] 미들웨어에서 토큰 갱신을 한 번 돌려준다
> SSR 환경에서는 토큰 만료 갱신을 미들웨어에서 한 번 호출해 두는 패턴이 정석.
> 공식 문서의 `updateSession` 헬퍼가 그걸 한다 — 안 깔면 만료된 토큰으로 페이지를 그리는 사고가 난다.

## MFA — 간단히

Supabase Auth 는 TOTP 기반 MFA 를 지원한다 (Authenticator 앱). 큰 그림:

```ts:mfa.ts
// 1) 사용자가 등록할 때 — TOTP secret 발급
const { data: enroll } = await supabase.auth.mfa.enroll({ factorType: 'totp' });
// data.totp.qr_code 를 화면에 띄움 — 사용자가 스캔

// 2) 첫 코드를 입력해 등록 검증
await supabase.auth.mfa.challengeAndVerify({
  factorId: enroll.id,
  code: '123456',
});

// 3) 다음 로그인 시 패스워드 통과 후, MFA 단계
const { data: factors } = await supabase.auth.mfa.listFactors();
await supabase.auth.mfa.challengeAndVerify({
  factorId: factors.totp[0].id,
  code: '654321',
});
```

MFA 통과 여부는 JWT 의 `aal` 에 박힌다(`aal1` = 패스워드만, `aal2` = MFA 통과). RLS 정책에서 *민감 작업은 aal2 만 허용* 같은 정책이 가능.

```sql
create policy "delete requires mfa"
on posts for delete
using (
  auth.uid() = author_id
  and (auth.jwt() ->> 'aal') = 'aal2'
);
```

> [!NOTE] MFA 강제는 사용자 경험과 트레이드오프
> 모든 사용자에게 강제하면 마찰이 크다. *조직 도메인의 사용자만*, *민감 작업 직전에만* 같은 점진적 적용이 일반적.

## 정리

Supabase Auth 의 좋은 점은 **JWT 가 RLS 의 직접 입력이 된다** 는 것이다. 인증과 권한이 *같은 토큰* 위에서 한 줄로 연결된다 — 이게 1편에서 말한 "권한을 데이터 옆에 두는 모델" 의 토대다.

세 가지만 남는다.

- 인증 방식은 이메일·매직링크·OAuth 중 도메인에 맞게 *섞어* 쓴다.
- SSR 환경에서는 *쿠키 storage 헬퍼* 로 토큰을 다룬다 — localStorage 아님.
- 권한 분기는 절대 `user_metadata` 가 아닌 `app_metadata` 또는 DB.

> [!NOTE] 다음 편 예고
> 4편에서는 Storage 와 Realtime 을 함께 다룬다 — 파일 업로드·다운로드를 RLS 와 같은 정책 모델로 잠그는 법, 그리고 WebSocket 으로 DB 변경을 구독하는 세 가지 방식(`postgres_changes` / `broadcast` / `presence`).
