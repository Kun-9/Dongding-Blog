-- 고치기 지시 — 발행 대기(점검까지 끝난) 초안을 사람이 쓴 지시대로 AI 가
-- 고치게 맡길 때 그 지시를 담는다. 있으면 실행기는 단계를 넘기지 않고
-- 초안만 고친 뒤 점검을 다시 돌린다. 다음에 맡길 때 새 값(또는 null)으로 바뀐다.

alter table release_topics
  add column ai_prompt text
    check (char_length(ai_prompt) <= 2000);
