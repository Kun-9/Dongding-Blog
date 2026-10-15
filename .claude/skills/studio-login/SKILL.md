---
name: studio-login
description: 로컬에 띄운 dongding-blog 의 /studio 에 브라우저로 로그인해 편집 화면·편집 API 를 실제로 확인할 때 사용. "스튜디오 로그인", "studio 로그인해서 확인", "편집 화면 검증", "로그인해서 테스트", "이력 패널 확인", "에디터 동작 확인" 등을 언급하거나, 인증이 필요한 화면(/studio, /admin, /settings)이나 편집 API(POST/PUT/DELETE /api/posts/*)를 실측해야 할 때.
---

# Studio 로그인

`/studio`·`/admin`·`/settings` 와 편집 API 는 로그인 없이는 각각 `/login` 리다이렉트와
401 로 막힌다. 화면이나 API 를 실제로 확인하려면 브라우저 세션이 필요하다.

## 자격증명

`.env.local` 의 `STUDIO_EMAIL` / `STUDIO_PASSWORD` 를 쓴다. **파일에서 읽어 쓰고,
값을 출력하거나 커밋에 남기지 않는다.** (`.env.local` 은 gitignore 대상)

```bash
EMAIL=$(grep '^STUDIO_EMAIL=' .env.local | cut -d= -f2-)
PW=$(grep '^STUDIO_PASSWORD=' .env.local | cut -d= -f2-)
```

## 자격증명만 확인할 때

브라우저 없이 유효한지만 보려면 Supabase 에 직접 물어본다.

```bash
PUB=$(grep '^NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=' .env.local | cut -d= -f2-)
curl -s -X POST "$(grep '^NEXT_PUBLIC_SUPABASE_URL=' .env.local | cut -d= -f2-)/auth/v1/token?grant_type=password" \
  -H "apikey: $PUB" -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PW\"}" | head -c 80
```

`access_token` 이 나오면 유효, `invalid_credentials` 면 비밀번호가 바뀐 것이다
(Supabase 대시보드 → Authentication → Users 에서 확인·재설정).

## 브라우저로 로그인하기

1. 서버를 띄운다. **프로덕션 동작을 보려면 `npm run build && npm start`** —
   `npm run dev` 는 draft 도 열려서 배포판과 다르게 보인다.
2. `dev-browser` 스킬의 서버를 헤드리스로 띄운다.
   ```bash
   cd ~/.claude/skills/dev-browser && ./server.sh --headless &
   ```
3. 스크립트는 **반드시 `~/.claude/skills/dev-browser/tmp/` 안에** 두고 그 디렉터리에서
   실행한다. 밖에 두면 `@/client.js` 를 못 찾는다.

```js
import { connect, waitForPageLoad } from "@/client.js";
const client = await connect();
const page = await client.page("studio", { viewport: { width: 1400, height: 900 } });

await page.goto("http://localhost:3000/login/");
await waitForPageLoad(page);
await page.fill('input[name="email"]', process.env.EMAIL);
await page.fill('input[name="password"]', process.env.PW);
await page.click('button[type="submit"]');
// 리다이렉트를 기다린다 — 고정 대기는 느린 빌드에서 깨진다.
await page.waitForURL("**/studio/**", { timeout: 20000 });

// 이후 page.evaluate 안의 fetch 는 세션 쿠키를 달고 나간다.
const r = await page.evaluate(async () => {
  const res = await fetch("/api/categories");
  return { status: res.status, len: (await res.json()).length };
});
console.log(r);
await client.disconnect();
```

실행: `EMAIL="$EMAIL" PW="$PW" npx tsx tmp/그스크립트.mjs`

## 주의

- **로그인 성공 여부를 반드시 확인한다.** 실패해도 `/login?error=1` 로 남을 뿐이라,
  확인 없이 진행하면 뒤따르는 API 호출이 전부 401 이 되고 원인을 놓치기 쉽다.
  `page.url()` 을 찍거나 `waitForURL` 로 잡을 것.
- 테스트로 만든 글·이미지는 지운다. slug 를 `zz-` 로 시작하면 나중에 찾기 쉽다.
- 끝나면 브라우저와 서버를 정리한다.
  ```bash
  pkill -f dev-browser; lsof -ti:3000 | xargs kill
  rm -f ~/.claude/skills/dev-browser/tmp/*.mjs
  ```
