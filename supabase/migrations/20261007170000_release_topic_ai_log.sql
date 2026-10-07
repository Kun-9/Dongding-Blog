-- AI 작업 진행 로그 — 실행기가 보고할 때마다 한 줄씩 쌓는다. 어드민 카드가
-- 이걸 실시간으로 보여준다(작업 중엔 5초마다 다시 읽음). 한 줄 메시지만
-- 덮어쓰던 ai_message 로는 무엇을 거쳐 왔는지 보이지 않았다.
--
-- 로그는 작업 하나 단위다. 실행기가 집을 때 비우고 새로 시작한다.

alter table release_topics
  -- [{ "at": "...", "message": "...", "kind": "start|report|stage|done|fail" }]
  add column ai_log jsonb not null default '[]'::jsonb,
  -- 실행기가 집은 시각. 경과 시간을 센다.
  add column ai_started_at timestamptz;
