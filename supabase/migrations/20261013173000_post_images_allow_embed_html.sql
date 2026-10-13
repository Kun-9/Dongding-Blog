-- ```embed 의 HTML 을 post-images 에 text/plain 으로 올린다(lib/embed 의 EMBED_UPLOAD).
-- 화면에서는 스크립트·폼만 허용한 sandbox iframe 의 srcdoc 으로만 돌고, 주소를 직접 열면 글자로 보인다.
update storage.buckets
set allowed_mime_types = array_append(allowed_mime_types, 'text/plain')
where id = 'post-images' and not ('text/plain' = any(allowed_mime_types));
