-- 사이트 전역 설정을 DB 정본으로 이관.
-- 지금까지는 /api/settings 가 src/lib/site.json 을 fs.writeFile 로 덮어썼는데,
-- Vercel 서버리스는 파일시스템이 읽기 전용이라 저장이 500 으로 떨어졌다.
-- (게다가 site.json 은 빌드 타임 import 라 런타임에 고쳐도 렌더에 반영되지 않는다.)

-- ponytail: 필드마다 컬럼을 파는 대신 jsonb 한 칸. 스키마 검증은 이미
-- /api/settings 의 zod 가 하고 있고, 항목이 늘 때마다 마이그레이션을 새로
-- 쓰지 않아도 된다. 항상 한 행만 존재한다 (id = 1 체크).
create table site_settings (
  id         int primary key default 1 check (id = 1),
  data       jsonb not null,
  updated_at timestamptz not null default now()
);

alter table site_settings enable row level security;

-- 제목·소개·OG 문구라 전부 공개 페이지에 그대로 나가는 값이다. 읽기는 열어 둔다.
-- 쓰기는 정책을 열지 않는다 — /api/settings 가 secret 키(dbAdmin)로만 쓴다.
create policy "site settings are public" on site_settings
  for select to anon, authenticated using (true);

-- site.json 현재 값을 그대로 심는다. 이후 편집은 설정 화면에서.
insert into site_settings (id, data) values (
  1,
  '{
    "url": "https://blog.dongding.dev",
    "title": "Dong-Ding · 개발 노트",
    "shortTitle": "Dong-Ding",
    "description": "자바와 스프링, DB를 깊이, 천천히 따라가는 블로그.",
    "lang": "ko",
    "locale": "ko-KR",
    "copyright": "© 2026 Dong-Ding · 개발 노트",
    "author": "동딩",
    "handle": "dongding",
    "bio": "Spring과 JPA, 시스템 설계를 깊게 파는 백엔드 개발자",
    "intro": "실무에서 마주친 문제를 끝까지 파보는 노트.",
    "og": {
      "headline": ["개발 노트"],
      "tagline": "AI를 활용해 만들고, 직접 쓰고, 고쳐나가는 기록",
      "label": "Dong-Ding"
    },
    "social": {
      "github": "github.com/dong-ding",
      "email": "sus533001@gmail.com"
    }
  }'::jsonb
);
