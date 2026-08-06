-- 같은 링크를 두 번 담지 않도록 URL 에 unique 를 건다.
-- 파일 시절엔 라우트 코드가 손으로 검사했는데, 제약으로 옮기면 경합에도 안전하다.
alter table bookmarks add constraint bookmarks_url_key unique (url);
