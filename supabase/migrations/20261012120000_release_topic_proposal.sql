-- 제안 — 탐색기가 올린 주제는 사람이 채택하기 전까지 제안으로 둔다.
-- 집필 진행판에는 채택한 것만 오르고, 어드민의 제안 카드는 proposal 로 그린다.
-- proposal: { scout, summary, signals[], unverified?, trend? }
--   scout      올린 탐색기(release·trend·tool·skill·concept)
--   summary    무엇인가 한 줄
--   signals    근거 칩(수치·버전)
--   unverified 확인 못 한 것 한 줄. 없으면 1차 출처를 다 확인했다
--   trend      인기 스킬의 8주 주별 설치(오래된 주부터)

alter table release_topics
  add column proposed boolean not null default false,
  add column proposal jsonb;
