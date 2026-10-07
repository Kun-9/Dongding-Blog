-- 글 주제 AI 작업 큐 — 화면에서 "AI에게 맡기기"를 누르면 요청이 쌓이고,
-- 실행기(클라우드 루틴 또는 로컬 크론으로 도는 Claude 세션)가 집어서 실제로
-- 2차 소스 조사·자료·초안·점검을 하고 단계를 넘긴다. 발행은 사람이 한다.
--
-- 상태는 주제 행에 둔다. 주제 하나에 작업은 한 번에 하나뿐이라 따로 큐
-- 테이블을 둘 이유가 없다.

alter table release_topics
  -- null: 맡긴 일 없음 · queued: 다음 실행 때 시작 · running: 작업 중 · failed: 멈춤
  add column ai_status text
    check (ai_status in ('queued', 'running', 'failed')),
  -- 어디까지 진행할지. 이 단계를 끝내면 멈춘다. 발행은 고를 수 없다.
  add column ai_until text
    check (ai_until in ('sources', 'assets', 'draft', 'review')),
  -- 실패 이유나 진행 중 한 줄 상황.
  add column ai_message text,
  add column ai_updated_at timestamptz,
  -- 작업 노트(markdown). 조사 요약·링크·비교 표·그림 목록이 쌓인다. 초안의
  -- 재료이자, 사람이 AI 가 무엇을 봤는지 확인하는 자리다.
  add column notes text not null default '';

-- 실행기는 "가장 먼저 맡긴 queued 하나"만 찾는다.
create index release_topics_ai_queue_idx
  on release_topics (ai_updated_at)
  where ai_status = 'queued';
