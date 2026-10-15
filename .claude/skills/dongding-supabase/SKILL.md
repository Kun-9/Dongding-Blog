---
name: dongding-supabase
description: dongding-blog 의 Supabase 프로젝트에 접근할 때 사용. "마이그레이션 적용", "db push", "스키마 변경", "supabase 접속", "psql 로 확인", "DB 조회", "타입 재생성", "gen types", "Auth 설정 변경", "사용자 계정 생성", "Storage 업로드/삭제", "RLS 확인", "supabase CLI 가 권한 없다고 함", "Cannot find project ref" 등을 언급하거나, 이 저장소에서 DB·Auth·Storage 를 건드릴 때. CLI 기본 계정으로는 이 프로젝트에 접근할 수 없다는 함정을 먼저 알려준다.
---

# Supabase 접근

## 가장 중요한 것: 기본 계정은 이 프로젝트의 주인이 아니다

이 블로그의 Supabase 프로젝트는 **CLI 로 로그인된 기본 계정(Kun-9)의 소유가 아니다.**
`~/.supabase/plate-token` 의 계정(조직 `PlateLog`)이 갖고 있다.

**계정 API 를 쓰는 명령에는 토큰을 환경변수로 주입해야 한다.**

```bash
SUPABASE_ACCESS_TOKEN=$(cat ~/.supabase/plate-token) supabase gen types typescript ...
```

`--profile plate` 는 듣지 않는다 — 그 플래그는 이 토큰 파일을 집지 않고 기본 토큰으로
폴백해서, 마치 같은 계정인 것처럼 보이는 엉뚱한 결과를 준다. 반드시 환경변수를 쓸 것.

### 어떤 명령이 토큰을 요구하나

`supabase link` 로 링크된 뒤로는 **DB 에 직접 붙는 명령은 토큰 없이도 돈다.**
계정 권한이 아니라 저장된 접속 정보를 쓰기 때문이다.

| 명령 | 토큰 | 이유 |
|---|---|---|
| `db push`, `migration list` | 불필요 | 링크된 DB 에 직접 접속 |
| `migration list --linked` | **필요** | `--linked` 가 계정 API 를 태운다 — 붙이지 말 것 |
| `gen types` | **필요** | Management API — 없으면 "account does not have access" |
| `projects list`, `orgs list` | **필요** | 없으면 Kun-9 의 프로젝트가 나온다 |
| `config` 조회·변경 (REST) | **필요** | Management API |

**토큰 없이 도는 게 오히려 함정이다.** `db push` 는 확인 없이 *미적용 마이그레이션을
전부* 밀어버린다. 다른 세션이 작업 중인 파일까지 딸려 들어갈 수 있으니, 무엇이 적용될지
먼저 본다.

```bash
supabase migration list   # remote 가 비어 있는 게 미적용분
```

| 계정 | 토큰 위치 | 소유 프로젝트 |
|---|---|---|
| stance_ (PlateLog 조직) | `~/.supabase/plate-token` | **dongding-blog**, plate |
| Kun-9 (기본) | macOS 키체인 | Solvory, cairn-prod, cairn-dev |

Kun-9 쪽 토큰이 필요하면(다른 프로젝트 작업):
```bash
security find-generic-password -s "Supabase CLI" -w
```

## 프로젝트 정보

| | |
|---|---|
| ref | `frzfpydhbjjvctcdegmn` |
| 리전 | ap-northeast-2 (서울) |
| 대시보드 | https://supabase.com/dashboard/project/frzfpydhbjjvctcdegmn |

접속 정보는 전부 `.env.local`(gitignore 대상)에 있다. **값을 출력하거나 커밋에 남기지 않는다.**

```
NEXT_PUBLIC_SUPABASE_URL              공개 URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY  브라우저까지 나가는 키 (RLS 적용)
SUPABASE_SECRET_KEY                   서버 전용, RLS 우회
SUPABASE_DB_PASSWORD                  psql 직접 접속용
```

## 마이그레이션

`supabase/migrations/` 에 `YYYYMMDDHHMMSS_설명.sql` 로 넣고 push 한다.
타임스탬프는 `date +%Y%m%d%H%M%S`.

```bash
supabase migration list   # 무엇이 적용될지 먼저 확인 (remote 가 비면 미적용)
supabase db push
```

**스키마를 바꿨으면 타입도 다시 뽑는다.** 안 하면 `select` 한 컬럼이 타입에 없어
`SelectQueryError` 가 뜬다.

```bash
SUPABASE_ACCESS_TOKEN=$(cat ~/.supabase/plate-token) \
  supabase gen types typescript --project-id frzfpydhbjjvctcdegmn --schema public \
  > src/lib/database.types.ts
```

실패한 마이그레이션은 롤백된다(적용 이력에도 안 남음). 고쳐서 다시 push 하면 된다.

## psql 로 직접 보기

집계·검증처럼 SQL 이 편한 일에 쓴다.

```bash
export PGPASSWORD=$(grep '^SUPABASE_DB_PASSWORD=' .env.local | cut -d= -f2-)
psql "postgresql://postgres.frzfpydhbjjvctcdegmn@aws-0-ap-northeast-2.pooler.supabase.com:5432/postgres" \
  -Atc "select count(*) from posts"
```

URL 에 비밀번호를 넣지 말고 `PGPASSWORD` 를 쓴다 — 프로세스 목록에 노출되지 않는다.

## 앱에서 쓰는 클라이언트

| 모듈 | 키 | 용도 |
|---|---|---|
| `lib/supabase` → `db()` | publishable | 공개 읽기. RLS 때문에 published 만 보인다 |
| `lib/supabase` → `dbAdmin()` | secret | draft 조회·쓰기. RLS 우회 |
| `lib/auth` → `authClient()` | publishable + 쿠키 | 로그인 세션 |
| `lib/supabase-browser` | publishable | 브라우저(조회수·좋아요) |

## Management API (Auth 설정 등)

CLI 로는 auth 설정을 못 읽는다(`supabase config` 는 push 만 있음). REST 로 한다.

```bash
TOKEN=$(cat ~/.supabase/plate-token)
# 조회
curl -s -H "Authorization: Bearer $TOKEN" \
  "https://api.supabase.com/v1/projects/frzfpydhbjjvctcdegmn/config/auth" | \
  python3 -c "import json,sys; d=json.load(sys.stdin); print(d['site_url'], d['uri_allow_list'], d['disable_signup'])"

# 변경 (덮어쓰기다 — 기존 목록을 먼저 읽어 이어붙일 것)
curl -s -X PATCH -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"site_url":"https://blog.dongding.dev"}' \
  "https://api.supabase.com/v1/projects/frzfpydhbjjvctcdegmn/config/auth"
```

현재 설정: `site_url` = `https://blog.dongding.dev`, 허용 목록에 `blog.dongding.dev/**` 와
`localhost:3000/**`, **공개 가입은 막혀 있다**(`disable_signup: true`) — 계정은 관리자 하나뿐이다.

## 사용자 계정

가입이 막혀 있으므로 계정은 Admin API 로 만든다. `email_confirm: true` 를 줘야
메일 확인 없이 바로 로그인된다.

```bash
SECRET=$(grep '^SUPABASE_SECRET_KEY=' .env.local | cut -d= -f2-)
curl -s -X POST "https://frzfpydhbjjvctcdegmn.supabase.co/auth/v1/admin/users" \
  -H "apikey: $SECRET" -H "Authorization: Bearer $SECRET" -H "Content-Type: application/json" \
  -d '{"email":"...","password":"...","email_confirm":true}'
```

로그인이 안 되면 `admin/users` 로 목록을 보고 `updated_at` 을 확인한다 — 생성 이후에
갱신돼 있으면 비밀번호가 바뀐 것이다(`.env.local` 의 `STUDIO_PASSWORD` 갱신 필요).

## Storage

버킷 `post-images` (공개). 글 이미지가 `{slug}/{file}` 로 들어 있고, 본문의
`/posts/{slug}/{file}` 경로는 `next.config.ts` 의 fallback rewrite 가 여기로 넘긴다.

**키에 한글·공백을 쓸 수 없다.** 업로드 전에 ASCII 로 정규화한다
(`scripts/upload-images.mjs` 의 `safeKey`, 업로드 API 의 `sanitizeBaseName` 이 같은 규칙).

macOS 파일명은 NFD(자모 분리), DB 본문은 NFC 라 한글 파일명을 문자열로 맞추면 안 맞는다.
경로를 치환할 일이 있으면 양쪽 정규화로 비교할 것.

## 검증

RLS 는 손댈 때마다 확인한다 — publishable 키는 브라우저까지 나가므로 그 경계가 곧 공개 범위다.

```bash
node --env-file=.env.local scripts/verify-rls.mjs
```

**RLS 로 막힌 삭제·수정은 에러가 아니라 "0행 성공"으로 돌아온다.** 에러 유무로 판정하면
막혔는지 통과했는지 알 수 없다. 반드시 `.select()` 로 영향받은 행 수를 세서 판단할 것.

## 함정 모음

- `supabase projects list` 가 엉뚱한 프로젝트를 보여주면 토큰 주입을 빠뜨린 것이다.
- 새 프로젝트를 만들려 하면 무료 한도(계정당 활성 2개)에 걸릴 수 있다. 조직당이 아니라 **계정당**이다.
- `uuid_generate_v4()` 는 없다(확장이 `extensions` 스키마에 있음). `gen_random_uuid()` 를 쓴다.
- 스크립트는 프로젝트 루트에서 `node --env-file=.env.local scripts/...` 로 돌린다.
  `/tmp` 등 밖에 두면 `@supabase/supabase-js` 를 못 찾는다.
