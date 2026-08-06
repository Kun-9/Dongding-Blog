-- MCP 커넥터 OAuth — 인가 코드 1회용 보장.
--
-- 코드 자체는 서명 JWT 라 저장할 필요가 없지만, "이미 썼는지"만은 서명으로
-- 알 수 없다. 서버리스라 인스턴스별 메모리도 못 믿으므로 교환 때 jti 를
-- 여기 넣고 unique 충돌이면 재사용으로 보고 거부한다.
--
-- 만료 행은 교환할 때마다 함께 지운다 — 별도 크론이 필요 없는 크기다.
create table oauth_code (
  jti        text primary key,
  expires_at timestamptz not null
);

create index oauth_code_expires_idx on oauth_code (expires_at);

-- 서버(secret 키)만 건드린다. anon/authenticated 정책은 두지 않는다.
alter table oauth_code enable row level security;
