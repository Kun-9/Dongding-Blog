-- 블로그 콘텐츠 스키마 (1단계)
-- content/posts/*.md, series.json, categories.json, bookmarks.json 을 DB 정본으로 이관.
-- toc / readTime 은 지금도 본문에서 파생하므로 컬럼으로 두지 않는다
-- (frontmatter 로 명시 오버라이드한 값만 posts.read_time 에 보존).

-- ── categories ──────────────────────────────────────────────────────────
-- 부모/서브 2계층을 self-reference 한 벌로 표현. 글은 부모 id 또는 서브 id 어느 쪽도 참조 가능.
create table categories (
  id          text primary key,
  name        text not null,
  description text not null default '',
  parent_id   text references categories (id) on delete cascade,
  sort        int  not null default 0
);

-- ── series ──────────────────────────────────────────────────────────────
-- count 는 posts 에서 파생되므로 컬럼으로 두지 않는다.
create table series (
  id    text primary key,
  title text not null,
  description text not null default '',
  color text not null default '#5a7480',
  sort  int  not null default 0
);

-- ── posts ───────────────────────────────────────────────────────────────
-- slug 는 Studio 에서 rename 가능하므로 PK 로 쓰지 않고 unique 제약만 건다.
create table posts (
  id           uuid primary key default gen_random_uuid(),
  slug         text not null unique,
  title        text not null,
  summary      text not null default '',
  category_id  text not null references categories (id),
  tags         text[] not null default '{}',
  date         date not null,
  read_time    int,
  featured     boolean not null default false,
  visibility   text not null default 'draft'
                 check (visibility in ('published', 'private', 'draft')),
  series_id    text references series (id) on delete set null,
  series_order int,
  body         text not null default '',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint slug_format check (slug ~ '^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$')
);

-- ponytail: 글이 수십 건 규모라 인덱스는 unique(slug) 로 충분.
-- 목록 정렬/태그 필터가 느려지면 (visibility, date desc) 와 tags GIN 추가.

-- ── bookmarks ───────────────────────────────────────────────────────────
create table bookmarks (
  id     bigint generated always as identity primary key,
  url    text not null,
  title  text not null,
  source text not null default '',
  tag    text not null default '',
  note   text not null default '',
  date   date not null
);

-- ── updated_at 자동 갱신 ────────────────────────────────────────────────
create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger posts_set_updated_at
  before update on posts
  for each row
  execute function set_updated_at();

-- ── RLS ─────────────────────────────────────────────────────────────────
-- 공개 읽기만 허용. 쓰기 정책은 두지 않으므로 service_role 로만 변경 가능하다
-- (3단계에서 Studio 인증을 붙일 때 authenticated 쓰기 정책 추가).
alter table categories enable row level security;
alter table series     enable row level security;
alter table posts      enable row level security;
alter table bookmarks  enable row level security;

create policy "categories are public" on categories
  for select to anon, authenticated using (true);

create policy "series are public" on series
  for select to anon, authenticated using (true);

-- draft / private 글은 anon 에게 노출되지 않는다.
create policy "published posts are public" on posts
  for select to anon, authenticated using (visibility = 'published');

create policy "bookmarks are public" on bookmarks
  for select to anon, authenticated using (true);
