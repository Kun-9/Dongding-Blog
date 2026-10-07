-- 글 주제 — 쓸래로 고른 글감을 글 한 편 단위로 묶고, 집필 전 과정을 단계로
-- 기록한다. 글감(release_candidates)은 릴리스 단위라 진행을 담을 수 없다:
-- 한 릴리스가 여러 글에 쓰이고(v2.1.287 → Claude Mods, 모델 가격), 한 글이
-- 릴리스 여럿을 묶는다(auto mode → 283·284·285).
--
-- 단계는 picked → demand → sources → draft → published 순서다. 수요 확인과
-- 2차 소스 수집은 화면에 흔적이 남지 않아서 어디까지 했는지 알 수 없었다 —
-- 각 단계를 넘길 때 근거(검색 결과, 읽은 문서)를 checks 에 남긴다.

create table release_topics (
  id            bigint generated always as identity primary key,
  title         text not null,
  -- 왜 쓸 만한가. 한 줄.
  angle         text,
  -- 마지막으로 끝낸 단계. 다음 할 일은 그 다음 단계다.
  stage         text not null default 'picked'
                  check (stage in ('picked', 'demand', 'sources', 'draft', 'published')),
  -- 단계별 근거: { "demand": { "at": "...", "note": "..." }, ... }
  checks        jsonb not null default '{}'::jsonb,
  -- 초안 단계에서 붙는 글 slug.
  post_slug     text,
  -- null 이면 진행 중. 값이 있으면 접은 주제이고 그 이유다. 단계는 그대로
  -- 둬서 어디서 멈췄는지 남는다.
  dropped_reason text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table release_topic_candidates (
  topic_id     bigint not null references release_topics(id) on delete cascade,
  candidate_id text   not null references release_candidates(id) on delete cascade,
  primary key (topic_id, candidate_id)
);

alter table release_topics           enable row level security;
alter table release_topic_candidates enable row level security;

-- ── 초기 주제 ───────────────────────────────────────────────────────────
-- 2026-10-07 검토에서 단독 글감으로 고른 여섯 편과 터미널 UX 묶음. 아직
-- 수요 확인 전이라 전부 picked 다. 연결은 수집된 글감이 있을 때만 걸린다.
with seed(title, angle, tags) as (
  values
    ('Claude Mods',
     '플러그인이 미들웨어로 바뀐 사건. 개념이 새것이라 설명 수요가 있다',
     array['v2.1.287']),
    ('auto mode 가 기본값이 됐다',
     '세 릴리스에 걸쳐 모든 환경에서 기본값으로. "왜 권한을 안 묻지?"에 답한다',
     array['v2.1.283', 'v2.1.284', 'v2.1.285']),
    ('AGENTS.md 지원',
     'Codex·Cursor 와 설정 파일이 합쳐지는 흐름. 도구 중립적 독자까지 닿는다',
     array['v2.1.277']),
    ('Opus 5.5 · Sonnet 5.5 와 1M 컨텍스트',
     '가격·기본 모델·1M 기본값이 한꺼번에 바뀌었다. 돈 얘기라 관심이 붙는다',
     array['v2.1.280', 'v2.1.284', 'v2.1.287']),
    ('턴 중간에 끼어들기 — send now',
     '추가된 뒤 의미가 두 번 바뀌었다. 설계가 바뀐 과정 자체가 글이 된다',
     array['v2.1.275', 'v2.1.281', 'v2.1.286']),
    ('프롬프트·플러그인 품질 도구',
     '/doctor prompt-audit 와 플러그인 평가. "내가 쓴 설정이 지금도 맞나"에 답한다',
     array['v2.1.269', 'v2.1.283']),
    ('두 달 치 터미널 개편',
     '매 릴리스 한 줄씩 들어온 터미널 UX 를 한 편으로 묶는다',
     array[]::text[])
),
topics as (
  insert into release_topics (title, angle)
  select title, angle from seed
  returning id, title
)
insert into release_topic_candidates (topic_id, candidate_id)
select t.id, c.id
from topics t
join seed s on s.title = t.title
-- unnest 결과는 u.tag 로 못박는다. 그냥 tag 라고 쓰면 release_candidates.tag
-- 와 겹쳐 "ambiguous" 로 멈춘다.
cross join unnest(s.tags) as u(tag)
join release_candidates c on c.id = 'anthropics/claude-code@' || u.tag;
