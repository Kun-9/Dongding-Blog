-- 버린 주제 — 쓰지 않기로 한 주제의 초안 글·이미지·작업 노트·AI 기록을 지우고,
-- 주제 행은 제목·진행 기록·버린 이유만 남긴 채 둔다. 행을 통째로 지우면
-- 무엇을 왜 버렸는지 남지 않고, 트렌드 탐색기가 같은 주제를 다시 고른다.
--
-- 이유는 dropped_reason 에 함께 둔다. 진행 중 주제를 고르는 곳은 모두
-- "dropped_reason 이 null" 로 거르니, 버린 주제도 따로 손대지 않아도 빠진다.
-- 접기와 다른 점은 이 시각이 있다는 것 하나다 — 있으면 다시 펼칠 수 없다.

alter table release_topics
  add column discarded_at timestamptz;
