-- posts.thumbnail — 홈 Featured 리드 그림에 쓸 대표 이미지.
-- 값은 Storage 주소가 아니라 본문 이미지와 같은 `/posts/{slug}/{file}` 경로다
-- (next.config 의 fallback rewrite 가 post-images 버킷으로 넘겨준다).
-- 비어 있으면 시리즈 진행 인디케이터 → 카테고리·태그 타이포 순으로 대체된다.
alter table posts
  add column thumbnail text;
