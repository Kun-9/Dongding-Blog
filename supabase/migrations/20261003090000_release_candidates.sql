-- 릴리스 글감 큐 — "릴리스 노트" 카테고리의 글감을 수집해 쌓고, 어드민에서
-- 검토한다. 집필은 여기서 하지 않는다: 큐가 "쓸래"로 표시한 글감을 Claude 가
-- 세션에서 집어 2차 소스까지 읽고 글을 쓴다. 릴리스 노트 본문만으로는 글이
-- 안 나온다 — React 19.3 은 28,000자 중 대부분이 PR 링크 나열이었다.

-- ── 추적 레포 ───────────────────────────────────────────────────────────
-- 수집 대상. 시끄러운 레포 하나를 끄는 일이 잦아서 목록을 DB 로 둔다
-- (코드 상수였다면 레포를 끌 때마다 배포해야 한다).
create table release_sources (
  repo       text primary key,
  enabled    boolean not null default true,
  sort       int not null default 0,
  created_at timestamptz not null default now()
);

-- ── 글감 ────────────────────────────────────────────────────────────────
-- id 가 '<repo>@<tag>' 라서 같은 릴리스를 두 번 수집해도 행이 늘지 않는다.
-- 수집은 upsert 로 돌고, 사람이 매긴 status 는 덮지 않는다.
create table release_candidates (
  id           text primary key,
  repo         text not null references release_sources(repo) on delete cascade,
  tag          text not null,
  name         text,
  published_at timestamptz not null,
  url          text not null,
  body         text not null,
  -- new: 수집만 됨 · queued: 쓸래 · skipped: 무시 · written: 글로 썼음
  status       text not null default 'new'
                 check (status in ('new', 'queued', 'skipped', 'written')),
  -- queued/skipped 로 옮긴 이유, 또는 written 의 글 slug.
  note         text,
  collected_at timestamptz not null default now()
);

-- 검토 화면은 "상태별 최신순"으로만 읽는다.
create index release_candidates_status_idx
  on release_candidates (status, published_at desc);

-- ── 전역 스위치 ─────────────────────────────────────────────────────────
-- 레포를 전부 끄지 않고도 자동 수집을 멈출 자리. site_settings 와 같은
-- 한 행 테이블 관용구.
create table release_config (
  id              int primary key default 1 check (id = 1),
  collect_enabled boolean not null default true,
  updated_at      timestamptz not null default now()
);

insert into release_config (id) values (1);

-- ── RLS ─────────────────────────────────────────────────────────────────
-- 셋 다 어드민 전용이다. 공개 페이지에 나가는 값이 아니라서 select 정책을
-- 열지 않는다 — /api 가 secret 키(dbAdmin)로만 읽고 쓴다.
alter table release_sources    enable row level security;
alter table release_candidates enable row level security;
alter table release_config     enable row level security;

-- ── 초기 추적 목록 ──────────────────────────────────────────────────────
-- scripts/collect-releases.mjs 가 쓰던 상수를 그대로 옮긴다. 이후 편집은
-- 어드민에서.
insert into release_sources (repo, sort) values
  ('anthropics/claude-code', 0),
  ('openai/codex', 1),
  ('google-gemini/gemini-cli', 2),
  ('cline/cline', 3),
  ('sst/opencode', 4),
  ('block/goose', 5),
  ('All-Hands-AI/OpenHands', 6),
  ('vercel/ai', 7),
  ('modelcontextprotocol/typescript-sdk', 8),
  ('modelcontextprotocol/python-sdk', 9),
  ('mastra-ai/mastra', 10),
  ('langchain-ai/langchain', 11),
  ('pydantic/pydantic-ai', 12),
  ('openai/openai-agents-python', 13),
  ('browser-use/browser-use', 14),
  ('oxc-project/oxc', 15),
  ('rolldown/rolldown', 16),
  ('biomejs/biome', 17),
  ('web-infra-dev/rspack', 18),
  ('oven-sh/bun', 19),
  ('denoland/deno', 20),
  ('vitejs/vite', 21),
  ('honojs/hono', 22),
  ('TanStack/router', 23),
  ('better-auth/better-auth', 24),
  ('drizzle-team/drizzle-orm', 25),
  ('shadcn-ui/ui', 26),
  ('vercel/next.js', 27),
  ('facebook/react', 28),
  ('tailwindlabs/tailwindcss', 29),
  ('withastro/astro', 30),
  ('sveltejs/kit', 31),
  ('microsoft/TypeScript', 32);
