-- 공개 상태에 `review` 를 더한다.
-- 초안과 발행 사이에 "쓰긴 다 썼고 검토만 남은" 자리가 없어서, /manage 에서
-- 상태를 옮길 때 초안과 구분되지 않았다.
--
-- 공개 범위는 그대로다 — RLS 는 여전히 published 만 내보내므로 review 는
-- 방문자에게 draft/private 과 똑같이 안 보인다.

alter table posts drop constraint posts_visibility_check;

alter table posts
  add constraint posts_visibility_check
  check (visibility in ('published', 'private', 'draft', 'review'));
