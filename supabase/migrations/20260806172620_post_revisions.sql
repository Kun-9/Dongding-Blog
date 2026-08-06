-- 글 수정 이력.
--
-- 저장할 때마다 "직전" 상태를 트리거로 쌓는다. 앱 코드가 아니라 DB 에서 잡는
-- 이유는, 어느 경로로 고치든(API·SQL·대시보드) 빠짐없이 남기기 위해서다.
--
-- posts.id 를 참조하므로 slug 를 바꿔도 이력이 이어지고, 글을 지우면 함께 사라진다.

create table post_revisions (
  id           bigint generated always as identity primary key,
  post_id      uuid not null references posts (id) on delete cascade,
  slug         text not null,
  title        text not null,
  summary      text not null default '',
  category_id  text,
  tags         text[] not null default '{}',
  date         date,
  visibility   text,
  series_id    text,
  series_order int,
  body         text not null default '',
  created_at   timestamptz not null default now()
);

-- 한 글의 이력을 최신순으로 뽑는 게 유일한 조회 패턴이다.
create index post_revisions_post_idx
  on post_revisions (post_id, created_at desc);

alter table post_revisions enable row level security;
-- 정책을 두지 않는다 — 초안 본문이 들어 있으므로 secret 키를 쓰는 서버만 읽는다.

/**
 * 수정 직전 상태를 남긴다.
 *
 * 내용이 실제로 달라졌을 때만 쌓는다. 발행 상태만 토글하거나 같은 내용을 다시
 * 저장하는 일이 잦은데, 그걸 전부 남기면 이력이 금세 쓸모없어진다.
 */
create function save_post_revision()
returns trigger
language plpgsql
as $$
begin
  if OLD.body        is distinct from NEW.body
  or OLD.title       is distinct from NEW.title
  or OLD.summary     is distinct from NEW.summary
  or OLD.category_id is distinct from NEW.category_id
  or OLD.tags        is distinct from NEW.tags
  or OLD.series_id   is distinct from NEW.series_id
  then
    insert into post_revisions (
      post_id, slug, title, summary, category_id, tags,
      date, visibility, series_id, series_order, body
    )
    values (
      OLD.id, OLD.slug, OLD.title, OLD.summary, OLD.category_id, OLD.tags,
      OLD.date, OLD.visibility, OLD.series_id, OLD.series_order, OLD.body
    );
  end if;
  return NEW;
end;
$$;

create trigger posts_save_revision
  before update on posts
  for each row
  execute function save_post_revision();
