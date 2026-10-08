-- 주제 종류 — 릴리스 글(release)과 개념 글(concept).
-- 쓰기 기준과 점검이 갈린다. 배포일·버전 표기는 릴리스 글에만 요구한다.

alter table release_topics
  add column kind text not null default 'release'
  check (kind in ('release', 'concept'));
