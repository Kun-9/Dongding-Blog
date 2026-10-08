-- AI 작업을 어디서 돌릴지 — "AI에게 맡기기"에서 고른다.
--
-- false: 바로 실행. 맡기는 즉시 클라우드 루틴을 API 로 깨운다(정기 실행도 집는다).
-- true : 예약. 루틴을 깨우지 않고 쌓아 두면, 로컬 Claude Code 세션이 MCP 의
--        claim_release_work 로 집는다. 클라우드 루틴은 손대지 않는다. 터미널
--        화면을 직접 떠야 하는 주제처럼 로컬 환경이 필요할 때 쓴다.

alter table release_topics
  add column ai_local boolean not null default false;
