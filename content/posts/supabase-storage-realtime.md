---
title: Supabase Storage 와 Realtime — 파일과 변경을 한 벌의 권한 모델로
summary: 객체 스토리지를 RLS 와 같은 정책으로 잠그고, WebSocket 으로 DB 변경·메시지·프레즌스를 구독하는 세 가지 방식을 정리합니다.
category: system
tags:
  - supabase
  - storage
  - realtime
  - websocket
  - rls
date: '2026-04-28'
visibility: published
series: supabase-guide
seriesOrder: 4
---
## 들어가며

3편까지 우리는 데이터·권한·인증을 한 벌로 묶었다. 남은 두 영역이 *비정형 데이터(파일)* 와 *변경의 흐름(realtime)* 이다. Supabase 는 이 둘 모두를 *RLS 와 같은 정책 모델* 로 묶어 두려 한다 — 즉 인증·권한 토큰 한 벌이 DB·파일·구독에 모두 흐른다.

이번 편은 그 두 가지의 동작 방식과 실전 패턴.

> [!INFO] 이 글이 다루는 범위
> Storage 의 버킷·정책·이미지 변환과 Realtime 의 세 가지 모드(postgres_changes / broadcast / presence). 각 기능의 *큰 그림과 자주 쓰는 패턴* 에 집중하고, 세부 옵션 전수 조사는 공식 문서로 미룹니다.

## Storage — 모델부터

Supabase Storage 는 *S3 호환* 객체 스토리지를 추상화한 서비스다. 모델은 단순하다.

- **Bucket** — 최상위 컨테이너. 한 프로젝트에 여러 버킷.
- **Object** — 버킷 안의 파일. 경로(`folder/sub/file.png`)와 메타데이터를 가짐.
- **Policy** — 어떤 사용자가 어떤 객체에 SELECT/INSERT/UPDATE/DELETE 할 수 있는지를 결정.

**핵심 한 가지**: Storage 의 정책은 Postgres 의 `storage.objects` 테이블 위에 *그냥 RLS* 로 정의된다. 별도 DSL 이 아니라 같은 SQL 모델 — 우리가 지난 편에서 본 `auth.uid()` · `auth.jwt()` 가 그대로 동작한다.

> [!TIP] "버킷이 public 이다" 와 "정책 통과" 는 다른 개념
> 버킷을 *public* 으로 만들면 객체 URL 이 인증 없이 GET 가능해진다(읽기 한정).
> 그러나 INSERT/UPDATE/DELETE 는 여전히 정책 통과가 필요하고, 비공개 버킷의 다운로드도 정책으로 잠근다. 즉 *public 토글은 SELECT 단축 경로* 일 뿐, 권한의 일부가 아니다.

## 첫 버킷 만들기

대시보드 `Storage → New bucket` 또는 SQL 한 줄.

```sql:create_bucket.sql
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', false);
```

`public = false` 로 만들었으니, 모든 동작에 정책이 필요하다. 자주 쓰는 셋:

```sql:storage_policies.sql
-- 1) 누구나 읽을 수 있다 (대신 public 토글 대용)
create policy "anyone can view avatars"
on storage.objects for select
using ( bucket_id = 'avatars' );

-- 2) 로그인 사용자가 자기 폴더에만 업로드할 수 있다
create policy "users can upload to their own folder"
on storage.objects for insert
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- 3) 본인 객체만 수정·삭제
create policy "users can manage their own objects"
on storage.objects for update using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "users can delete their own objects"
on storage.objects for delete using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);
```

`storage.foldername(name)` 은 객체 path 를 `/` 로 쪼개 배열로 반환하는 헬퍼 함수. 위에선 *최상위 폴더 이름* 을 사용자 UUID 로 간주해 비교한다 — 사용자별 격리의 가장 단순한 패턴.

## 업로드 · 다운로드 · 서명 URL

```ts:upload.ts
const { data, error } = await supabase.storage
  .from('avatars')
  .upload(`${userId}/profile.png`, file, {
    cacheControl: '3600',
    upsert: true,
    contentType: 'image/png',
  });
```

업로드 결과의 `data.path` 가 객체 키. 다운로드는 두 가지 흐름.

### Public 버킷 — 그냥 URL

```ts
const { data } = supabase.storage
  .from('avatars')
  .getPublicUrl(`${userId}/profile.png`);

// data.publicUrl: https://<project>.supabase.co/storage/v1/object/public/avatars/...
```

### Private 버킷 — 서명 URL

```ts
const { data, error } = await supabase.storage
  .from('avatars')
  .createSignedUrl(`${userId}/profile.png`, 60); // 60초 유효

// data.signedUrl: https://...?token=...
```

서명 URL 은 *짧은 시간만 유효한 임시 다운로드 링크* 다. 이메일에 붙이거나 SSR 응답에 박을 때 유용.

> [!WARNING] 서명 URL 은 한 번 발급되면 *그 시간 동안 막을 수 없다*
> 만료 시간 안에 URL 을 가진 사람은 누구나 접근 가능. 만료 단위를 짧게(수십초~수분) 잡고, 그래도 마찰이 적게 SDK 호출로 그 자리에서 발급하는 게 정석.

## 이미지 변환

Supabase Storage 는 [imgproxy](https://imgproxy.net/) 를 백엔드로 *URL 파라미터 기반 변환* 을 제공한다 — 별도 CDN 설정 없이 즉시.

```ts
const { data } = supabase.storage
  .from('avatars')
  .getPublicUrl('user-1/profile.png', {
    transform: { width: 200, height: 200, resize: 'cover', quality: 80 },
  });
```

생성되는 URL 은 `/storage/v1/render/image/public/...?width=200&height=200&...` 형태. 같은 원본을 다양한 크기로 배포할 때 유용.

> [!INFO] 이미지 변환은 *유료 plan* 에서만 동작
> 무료 plan 은 변환 호출이 거부된다. 사이드 프로젝트라면 변환 없이 원본만 쓰거나, Cloudflare Images / next/image 같은 외부 도구 조합도 검토.

## Realtime — 세 가지 모드

Supabase Realtime 은 한 가지가 아니라 *세 가지 다른 채널 유형* 을 한 SDK 로 묶어 제공한다. 헷갈리기 쉬운 부분이라 한 번 정리.

- `postgres_changes` — DB 의 `INSERT/UPDATE/DELETE` 를 실시간 구독.
- `broadcast` — 가벼운 메시지(사용자가 보낸 임의 페이로드)를 채널 참여자들에게 푸시.
- `presence` — 채널에 누가 온라인인지·어떤 상태인지 동기화.

세 모드는 한 채널 안에서 *섞어* 쓸 수도 있다. 채팅방을 예로 들면 `postgres_changes` 로 메시지 영구 저장, `broadcast` 로 "ㅇㅇ가 입력 중" 같은 휘발성 신호, `presence` 로 접속자 목록을 동시에 다룬다.

## postgres_changes — DB 변경 구독

```ts:realtime-db.ts
const channel = supabase
  .channel('comments-stream')
  .on(
    'postgres_changes',
    { event: '*', schema: 'public', table: 'comments', filter: `post_id=eq.${postId}` },
    (payload) => {
      console.log(payload.eventType, payload.new, payload.old);
    },
  )
  .subscribe();
```

내부 동작: Postgres 의 *논리 복제(logical replication)* 가 만들어내는 WAL 을 [wal2json](https://github.com/eulerto/wal2json) 으로 흘려, Realtime 서버가 받아 채널 가입자에게 WebSocket 으로 푸시한다. 즉 *DB 가 truth* 이고 우리는 그 변경을 듣는다 — 메시지 발송 코드를 명시적으로 짤 필요가 없다.

> [!WARNING] Realtime 은 *RLS 를 적용해 필터링* 한다
> 구독 자체는 누구나 시도 가능하지만, 가입자에게 푸시되는 행은 그 가입자의 토큰으로 RLS 정책을 통과한 것만이다.
> *RLS 가 켜져 있지 않은 테이블의 변경은 Realtime 에서도 흘러나올 수 있다* — 구독을 켜기 전 반드시 RLS 가 켜져 있어야 한다.

```sql:enable_realtime.sql
-- 어떤 테이블의 변경을 Realtime 으로 흘릴지 명시 (publication 에 추가)
alter publication supabase_realtime add table comments;
```

대시보드에서 `Database → Replication` 탭으로도 토글 가능.

## broadcast — 가벼운 메시지

DB 를 거치지 않고 채널 참여자들에게 *그 자리에서* 메시지를 푸시한다.

```ts:broadcast.ts
// 보내는 쪽
const channel = supabase.channel('typing-room', { config: { broadcast: { self: false } } });
await channel.subscribe();

await channel.send({
  type: 'broadcast',
  event: 'typing',
  payload: { userId: 'kim', at: Date.now() },
});

// 받는 쪽
channel.on('broadcast', { event: 'typing' }, (payload) => {
  console.log('typing:', payload);
});
```

영속성이 없다. 메시지는 *그 순간 채널에 있는 사람만* 받고 사라진다. "입력 중", "마우스 커서 위치" 같은 *휘발성 신호* 에 적합.

## presence — 누가 온라인인가

각 클라이언트가 *자기 상태* 를 채널에 등록(`track`) 하면, 채널의 다른 참여자들이 그 상태 맵을 동기화 받는다.

```ts:presence.ts
const channel = supabase.channel('room-1', {
  config: { presence: { key: userId } },
});

channel
  .on('presence', { event: 'sync' }, () => {
    const state = channel.presenceState();
    console.log('online users:', Object.keys(state));
  })
  .on('presence', { event: 'join' }, ({ key }) => console.log(key, 'joined'))
  .on('presence', { event: 'leave' }, ({ key }) => console.log(key, 'left'))
  .subscribe(async (status) => {
    if (status === 'SUBSCRIBED') {
      await channel.track({ status: 'online', cursor: null });
    }
  });
```

연결이 끊기면 자동으로 `leave` 가 발생한다. 협업 도구의 *접속자 아바타 띠* 가 전형적인 사용처.

## 채팅 미니 예제 — 셋을 합치면

```ts:chat-room.ts
const channel = supabase.channel(`room:${roomId}`, {
  config: { presence: { key: userId } },
});

// (1) DB 에 저장된 메시지가 추가되면 화면에 추가
channel.on(
  'postgres_changes',
  { event: 'INSERT', schema: 'public', table: 'messages', filter: `room_id=eq.${roomId}` },
  (payload) => appendMessage(payload.new),
);

// (2) 입력 중 신호는 broadcast
channel.on('broadcast', { event: 'typing' }, ({ payload }) => showTyping(payload.userId));

// (3) 접속자 목록은 presence
channel.on('presence', { event: 'sync' }, () => {
  setOnlineUsers(Object.keys(channel.presenceState()));
});

await channel.subscribe(async (status) => {
  if (status === 'SUBSCRIBED') await channel.track({ joined_at: Date.now() });
});

// 메시지 보내기 — DB 에 INSERT 만 하면, postgres_changes 가 모두에게 알려준다
await supabase.from('messages').insert({
  room_id: roomId, author_id: userId, body: text,
});

// 입력 중 알림 — DB 거치지 않고 broadcast
await channel.send({ type: 'broadcast', event: 'typing', payload: { userId } });
```

세 가지 모드의 역할 분담이 그대로 드러난다 — *영속성 있는 데이터는 DB·RLS 에*, *휘발성 신호는 broadcast 에*, *상태 맵은 presence 에*.

> [!TIP] 한 채널 = 한 추상 단위
> 채널 이름은 도메인 단위로(`room:42`, `doc:abc`, `org:1/cursor`) 지어두는 게 협업 추적에 편하다.
> 정책·로깅·구독 인원 모니터링이 모두 채널 단위로 이뤄지기 때문.

## 정리

Storage 와 Realtime 은 *별도의 권한 시스템을 만들지 않는다* 는 점이 일관된 디자인이다. 인증 토큰 → JWT → RLS → DB·Storage·Realtime 이 한 줄로 흐른다.

- Storage 정책은 `storage.objects` 위 RLS 와 동일.
- Realtime 의 `postgres_changes` 는 RLS 를 *그대로* 적용해 필터링.
- 휘발성 신호는 broadcast, 접속자 동기화는 presence.

> [!NOTE] 다음 편 예고
> 마지막 5편에서는 *Supabase 와 Convex* 를 같은 도메인 위에 놓고 비교한다 — 데이터 모델·권한·실시간·러닝 커브·이탈 비용. 균형 잡힌 비교 후 *어떤 상황에서 무엇을 고를지* 를 체크리스트로 정리.
