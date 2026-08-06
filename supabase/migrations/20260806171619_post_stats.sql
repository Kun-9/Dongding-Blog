-- 조회수·좋아요.
--
-- posts.id(uuid)를 참조한다 — slug 는 Studio 에서 바뀔 수 있어서 그걸 키로 쓰면
-- 이름을 고치는 순간 통계가 끊긴다.
--
-- 증감은 함수로만 연다. anon 에게 테이블 UPDATE 를 열어주면 조회수를 임의값으로
-- 덮어쓸 수 있으므로, security definer 함수 안에서 "1 증가"만 가능하게 한다.

create table post_stats (
  post_id    uuid primary key references posts (id) on delete cascade,
  views      bigint not null default 0 check (views >= 0),
  likes      int    not null default 0 check (likes >= 0),
  updated_at timestamptz not null default now()
);

alter table post_stats enable row level security;

-- 숫자를 읽는 건 누구나 가능하다.
create policy "stats are public" on post_stats
  for select to anon, authenticated using (true);

-- 쓰기 정책은 두지 않는다 — 아래 함수(정의자 권한)로만 바뀐다.

/**
 * 조회수 +1. 공개된 글에만 쌓는다.
 * ponytail: 같은 사람이 새로고침하면 또 오른다. 봇·중복 제외가 필요해지면
 * 그때 방문 로그 테이블을 두고 집계로 바꾼다 — 지금은 카운터 하나로 충분하다.
 */
create function increment_view(p_slug text)
returns void
language sql
security definer
set search_path = public
as $$
  insert into post_stats (post_id, views)
  select id, 1 from posts where slug = p_slug and visibility = 'published'
  on conflict (post_id)
    do update set views = post_stats.views + 1, updated_at = now();
$$;

/**
 * 좋아요 토글. delta 는 +1 / -1 만 받는다.
 * 익명이라 서버가 "누가 눌렀는지"를 알 수 없다 — 중복은 브라우저가 기억한다.
 * 바뀐 뒤의 개수를 돌려준다.
 */
create function toggle_like(p_slug text, p_delta int)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_likes int;
begin
  if p_delta not in (1, -1) then
    raise exception 'delta 는 1 또는 -1 이어야 합니다';
  end if;

  select id into v_id from posts where slug = p_slug and visibility = 'published';
  if v_id is null then
    raise exception '글을 찾을 수 없습니다: %', p_slug;
  end if;

  insert into post_stats (post_id, likes)
  values (v_id, greatest(p_delta, 0))
  on conflict (post_id)
    do update set likes = greatest(post_stats.likes + p_delta, 0),
                  updated_at = now()
  returning likes into v_likes;

  return v_likes;
end;
$$;

revoke all on function increment_view(text) from public;
revoke all on function toggle_like(text, int) from public;
grant execute on function increment_view(text) to anon, authenticated;
grant execute on function toggle_like(text, int) to anon, authenticated;
