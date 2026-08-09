-- 링크 프리뷰 카드가 쓰는 OG 메타 캐시.
--
-- 브라우저에서 남의 사이트를 긁을 수 없고(CORS), 글을 읽을 때마다 서버가 외부로
-- 나가면 상세 페이지가 남의 사이트 응답속도에 묶인다. 그래서 글을 저장하는
-- 시점에 한 번 읽어 두고, 렌더는 이 표만 본다.

create table link_meta (
  -- 프로토콜과 끝 슬래시를 뺀 주소 (lib/link-cards#linkKey).
  -- http/https, 끝 슬래시 유무로 같은 문서가 두 행이 되는 걸 막는다.
  url         text primary key,
  title       text,
  description text,
  image       text,
  -- 읽으러 갔던 시각. OG 가 없거나 크롤이 막힌 주소도 행은 남긴다 —
  -- 저장할 때마다 같은 벽에 다시 부딪히지 않게.
  fetched_at  timestamptz not null default now()
);

alter table link_meta enable row level security;

-- 발행된 글 본문에 그대로 나가는 값이라 읽기는 열어 둔다.
-- 쓰기는 정책을 열지 않는다 — lib/link-meta 가 secret 키(dbAdmin)로만 쓴다.
create policy "link meta is public" on link_meta
  for select to anon, authenticated using (true);
