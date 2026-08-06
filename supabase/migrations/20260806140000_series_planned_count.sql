-- series.planned_count — 시리즈의 "계획 편수".
-- 실제 발행 글 수가 아니라 저자가 잡아 둔 총 편수라서 파생값으로 대체할 수 없다.
-- 글 페이지의 단계 네비와 시리즈 카드가 아직 안 쓴 회차를 대시(—)로 그릴 때 쓴다.
alter table series
  add column planned_count int not null default 0
    check (planned_count >= 0);

-- 이관 시점의 값(모두 5편)을 채운다.
update series set planned_count = 5;
