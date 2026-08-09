-- 시리즈 생성일 — /series 의 `생성순` 정렬과 카드의 `생성` 날짜 표기에 쓴다.
-- 기존 행은 생성 시점을 알 수 없어 now() 로 채워진다. 정렬 기준으로만 쓰이므로
-- 첫 배포 시점에 몰려 있어도 동작에는 문제가 없다.
alter table public.series
  add column if not exists created_at timestamptz not null default now();
