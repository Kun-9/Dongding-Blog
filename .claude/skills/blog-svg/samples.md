# svg 배치 견본

```svg 그림을 그릴 때 여기서 가장 가까운 모양을 골라 좌표·글자를 고쳐 쓴다. 다섯 개 모두 blog-svg 의 기준(그림만으로 읽힘, 간격 수치, 그림 글자 말투)으로 점검 경고 0, 데스크톱·휴대폰(390px)·다크에서 확인했다(2026-11-10). 견본을 고르는 기준은 독자가 문장으로 조립해야 하는 움직임이다.

| 견본 | 움직임 | 이런 내용 |
| --- | --- | --- |
| 퍼짐 · 같은 모양 두 판 | 복사된다, 세어진다 | 하나가 여럿에게 복사돼 비용·부하가 사람 수만큼 는다. 두 방식을 같은 배치로 나란히 두고 차이 나는 선만 색을 바꾼다 |
| 길×관문 | 막힌다, 돌아간다 | 여러 경로가 각자 어느 관문에서 막히나(권한, 방화벽, 훅, 샌드박스) |
| 상태 이동 | 바뀐다 | 무엇이 어떤 조건에서 다른 상태로 넘어가나(토큰 회전, 주문 상태, 세션) |
| 층 통과 | 거른다, 덧붙인다 | 요청이 층을 지나며 무엇이 붙고 걸러지나(미들웨어, RLS, 캐시) |
| 주고받기 | 오간다 | 참여자 사이에 무엇이 어떤 순서로 오가고 어디서 끊기나(리다이렉트, OAuth, 웹훅) |

공통: 판 폭 300 이면 넓은 화면에서 두 판이 나란히, 360 까지는 한 판. 그보다 넓은 그림은 길×관문처럼 `data-only="wide"` 판과 `data-only="narrow"` 판을 같이 둔다. 숫자는 글의 사실에서만 가져온다.

## 퍼짐 · 같은 모양 두 판

두 판의 배치는 같고 부채꼴 선의 색만 다르다. 사람 수의 제곱으로 느는 이유가 부채꼴 모양 그대로 보인다. 부채꼴 좌표는 중심 (150,120), 반지름 92, ±50° 에 19개를 고르게 놓고 묶음째 `translate(0,8)` 로 내렸다. 판 이름 아래 설명 줄은 제목과 같은 말이라 두지 않는다. 두 판의 사본 라벨은 같은 글자(사본 19통)로 두고 차이는 선 색으로만 보인다.

```svg
title: 위치 1통이 Supabase에서는 20통으로, 중계에서는 1통으로 세어진다
caption: 같은 칸 20명 중 지수가 위치 한 통을 보낼 때
legend: bad=요금에 세는 메시지; muted=세지 않는 메시지
<svg viewBox="0 0 300 304">
  <text class="lg" x="0" y="18">Supabase Realtime</text>
  <g transform="translate(0,8)">
  <g class="edge bad thin"><line x1="150" y1="120" x2="205.3" y2="54.1"/><line x1="150" y1="120" x2="211.4" y2="59.8"/><line x1="150" y1="120" x2="216.9" y2="66"/><line x1="150" y1="120" x2="221.9" y2="72.7"/><line x1="150" y1="120" x2="226.1" y2="79.9"/><line x1="150" y1="120" x2="229.6" y2="87.5"/><line x1="150" y1="120" x2="232.4" y2="95.3"/><line x1="150" y1="120" x2="234.4" y2="103.4"/><line x1="150" y1="120" x2="235.6" y2="111.7"/><line x1="150" y1="120" x2="236" y2="120"/><line x1="150" y1="120" x2="235.6" y2="128.3"/><line x1="150" y1="120" x2="234.4" y2="136.6"/><line x1="150" y1="120" x2="232.4" y2="144.7"/><line x1="150" y1="120" x2="229.6" y2="152.5"/><line x1="150" y1="120" x2="226.1" y2="160.1"/><line x1="150" y1="120" x2="221.9" y2="167.3"/><line x1="150" y1="120" x2="216.9" y2="174"/><line x1="150" y1="120" x2="211.4" y2="180.2"/><line x1="150" y1="120" x2="205.3" y2="185.9"/></g>
  <g class="dot"><circle cx="209.1" cy="49.5" r="3.6"/><circle cx="215.7" cy="55.6" r="3.6"/><circle cx="221.6" cy="62.2" r="3.6"/><circle cx="226.9" cy="69.4" r="3.6"/><circle cx="231.4" cy="77.1" r="3.6"/><circle cx="235.2" cy="85.2" r="3.6"/><circle cx="238.1" cy="93.6" r="3.6"/><circle cx="240.3" cy="102.3" r="3.6"/><circle cx="241.6" cy="111.1" r="3.6"/><circle cx="242" cy="120" r="3.6"/><circle cx="241.6" cy="128.9" r="3.6"/><circle cx="240.3" cy="137.7" r="3.6"/><circle cx="238.1" cy="146.4" r="3.6"/><circle cx="235.2" cy="154.8" r="3.6"/><circle cx="231.4" cy="162.9" r="3.6"/><circle cx="226.9" cy="170.6" r="3.6"/><circle cx="221.6" cy="177.8" r="3.6"/><circle cx="215.7" cy="184.4" r="3.6"/><circle cx="209.1" cy="190.5" r="3.6"/></g>
  <text class="sm" x="254" y="116">같은 칸</text>
  <text class="sm" x="254" y="134">19명</text>
  <line class="edge bad" x1="32" y1="120" x2="84" y2="120" marker-end="url(#a-bad)"/>
  <text class="xs mid" x="58" y="106">위치 1통</text>
  <circle class="box" cx="18" cy="120" r="13"/>
  <text class="sm mid" x="18" y="153">지수</text>
  <rect class="box" x="86" y="98" width="64" height="44" rx="8"/>
  <text class="b mid" x="118" y="125">채널</text>
  <text class="xs bad" x="120" y="206">사본 19통</text>
  </g>
  <line class="edge muted thin" x1="0" y1="234" x2="300" y2="234"/>
  <text class="xl bad" x="0" y="282">20통</text>
  <text class="xs" x="76" y="258">위치 1통당 요금에 세는 메시지</text>
  <text class="sm ink" x="76" y="278">20명이 초당 한 번씩 보내면 400통</text>
  <text class="xs" x="76" y="298">무료 한도는 초당 100통</text>
</svg>
<svg viewBox="0 0 300 304">
  <text class="lg" x="0" y="18">Durable Object 중계</text>
  <g transform="translate(0,8)">
  <g class="edge muted thin"><line x1="150" y1="120" x2="205.3" y2="54.1"/><line x1="150" y1="120" x2="211.4" y2="59.8"/><line x1="150" y1="120" x2="216.9" y2="66"/><line x1="150" y1="120" x2="221.9" y2="72.7"/><line x1="150" y1="120" x2="226.1" y2="79.9"/><line x1="150" y1="120" x2="229.6" y2="87.5"/><line x1="150" y1="120" x2="232.4" y2="95.3"/><line x1="150" y1="120" x2="234.4" y2="103.4"/><line x1="150" y1="120" x2="235.6" y2="111.7"/><line x1="150" y1="120" x2="236" y2="120"/><line x1="150" y1="120" x2="235.6" y2="128.3"/><line x1="150" y1="120" x2="234.4" y2="136.6"/><line x1="150" y1="120" x2="232.4" y2="144.7"/><line x1="150" y1="120" x2="229.6" y2="152.5"/><line x1="150" y1="120" x2="226.1" y2="160.1"/><line x1="150" y1="120" x2="221.9" y2="167.3"/><line x1="150" y1="120" x2="216.9" y2="174"/><line x1="150" y1="120" x2="211.4" y2="180.2"/><line x1="150" y1="120" x2="205.3" y2="185.9"/></g>
  <g class="dot"><circle cx="209.1" cy="49.5" r="3.6"/><circle cx="215.7" cy="55.6" r="3.6"/><circle cx="221.6" cy="62.2" r="3.6"/><circle cx="226.9" cy="69.4" r="3.6"/><circle cx="231.4" cy="77.1" r="3.6"/><circle cx="235.2" cy="85.2" r="3.6"/><circle cx="238.1" cy="93.6" r="3.6"/><circle cx="240.3" cy="102.3" r="3.6"/><circle cx="241.6" cy="111.1" r="3.6"/><circle cx="242" cy="120" r="3.6"/><circle cx="241.6" cy="128.9" r="3.6"/><circle cx="240.3" cy="137.7" r="3.6"/><circle cx="238.1" cy="146.4" r="3.6"/><circle cx="235.2" cy="154.8" r="3.6"/><circle cx="231.4" cy="162.9" r="3.6"/><circle cx="226.9" cy="170.6" r="3.6"/><circle cx="221.6" cy="177.8" r="3.6"/><circle cx="215.7" cy="184.4" r="3.6"/><circle cx="209.1" cy="190.5" r="3.6"/></g>
  <text class="sm" x="254" y="116">같은 칸</text>
  <text class="sm" x="254" y="134">19명</text>
  <line class="edge bad" x1="32" y1="120" x2="84" y2="120" marker-end="url(#a-bad)"/>
  <text class="xs mid" x="58" y="106">위치 1통</text>
  <circle class="box" cx="18" cy="120" r="13"/>
  <text class="sm mid" x="18" y="153">지수</text>
  <rect class="box" x="86" y="98" width="64" height="44" rx="8"/>
  <text class="b mid" x="118" y="125">중계</text>
  <text class="xs" x="120" y="206">사본 19통</text>
  </g>
  <line class="edge muted thin" x1="0" y1="234" x2="300" y2="234"/>
  <text class="xl good" x="0" y="282">1통</text>
  <text class="xs" x="76" y="258">위치 1통당 요금에 세는 메시지</text>
  <text class="sm ink" x="76" y="278">20명이 초당 한 번씩 보내면 20통</text>
</svg>
```

## 길×관문

넓은 판은 길이 행, 관문이 칸이다. 좁은 판은 길마다 한 줄씩 세로로 쌓아 다시 그린다. X 는 막는 관문 앞, 설정 키는 그 관문 옆에 둔다. 점선 상자는 일부만 잡는 규칙.

```svg
title: 허용 목록 하나가 두 관문에 걸려, 돌아가는 길이 모두 끊긴다
caption: aka.ms 만 허용하고 VS Code 홈페이지를 열게 했을 때
legend: x=막힘; ok=통과; dash=일부만 잡는 규칙
<svg viewBox="0 0 600 340" data-only="wide">
  <text class="xs end" x="120" y="22">Claude가 고른 길</text>
  <text class="xs mid" x="230" y="22">첫 관문</text>
  <text class="xs mid" x="470" y="22">둘째 관문</text>
  <text class="xs mid" x="552" y="22">바깥</text>
  <text class="end" x="120" y="69">WebFetch로 바로</text>
  <text class="end" x="120" y="105">단축 주소로</text>
  <text class="end" x="120" y="165">대상 주소로 다시</text>
  <text class="end" x="120" y="239">Bash로 curl</text>
  <text class="end" x="120" y="305">샌드박스 밖에서</text>
  <path class="edge muted thin dash" d="M260 180V196H470V212"/>
  <text class="xs" x="480" y="204">같은 허용 목록</text>
  <circle class="dot" cx="130" cy="64" r="3"/><line class="edge" x1="134" y1="64" x2="172" y2="64"/>
  <circle class="dot" cx="130" cy="100" r="3"/><line class="edge" x1="134" y1="100" x2="172" y2="100" marker-end="url(#a)"/>
  <line class="edge" x1="288" y1="100" x2="508" y2="100" marker-end="url(#a)"/>
  <line class="edge" x1="510" y1="130" x2="288" y2="130" marker-end="url(#a)"/>
  <circle class="dot" cx="130" cy="160" r="3"/><line class="edge" x1="134" y1="160" x2="172" y2="160"/>
  <circle class="dot" cx="130" cy="234" r="3"/><line class="edge" x1="134" y1="234" x2="172" y2="234" marker-end="url(#a)"/>
  <line class="edge" x1="288" y1="234" x2="396" y2="234"/>
  <circle class="dot" cx="130" cy="300" r="3"/><line class="edge" x1="134" y1="300" x2="172" y2="300"/>
  <text class="xs good mid" x="399" y="92">목록에 있으니 통과</text>
  <text class="xs mid" x="399" y="123">301, 대상 주소만 돌려줌</text>
  <text class="xs mono mid" x="345" y="222">/usr/bin/curl</text>
  <rect class="soft bad" x="174" y="40" width="112" height="140" rx="8"/>
  <text class="sm b ink mid" x="230" y="128">WebFetch 규칙</text>
  <text class="xs mid" x="230" y="146">허용: aka.ms</text>
  <rect class="box" x="510" y="86" width="84" height="56" rx="8"/>
  <text class="mono mid" x="552" y="119">aka.ms</text>
  <rect class="soft dash" x="174" y="212" width="112" height="44" rx="8"/>
  <text class="sm mono ink mid" x="230" y="231">Bash(curl *)</text>
  <text class="xs mid" x="230" y="248">거절 규칙</text>
  <rect class="soft bad" x="404" y="212" width="132" height="44" rx="8"/>
  <text class="sm b ink mid" x="470" y="231">샌드박스 프록시</text>
  <text class="xs mid" x="470" y="248">목록 밖은 403</text>
  <text class="xs mono mid" x="470" y="274">strictAllowlist: true</text>
  <rect class="soft bad" x="174" y="278" width="112" height="44" rx="8"/>
  <text class="sm b ink mid" x="230" y="297">밖에서 실행</text>
  <text class="xs mid" x="230" y="314">꺼 둠</text>
  <text class="xs mono" x="292" y="304">allowUnsandboxedCommands: false</text>
  <circle class="mark-x" cx="174" cy="64"/>
  <circle class="mark-x" cx="174" cy="160"/>
  <circle class="mark-x" cx="404" cy="234"/>
  <circle class="mark-x" cx="174" cy="300"/>
  <circle class="mark-ok" cx="286" cy="100"/>
</svg>
<svg viewBox="0 0 360 460" data-only="narrow">
  <text class="b" x="0" y="16">WebFetch로 바로</text>
  <circle class="dot" cx="6" cy="48" r="3"/><line class="edge" x1="10" y1="48" x2="92" y2="48"/>
  <rect class="soft bad" x="100" y="30" width="140" height="36" rx="8"/>
  <text class="sm b ink mid" x="170" y="53">WebFetch 규칙</text>
  <circle class="mark-x" cx="100" cy="48"/>

  <text class="b" x="0" y="104">단축 주소로</text>
  <circle class="dot" cx="6" cy="136" r="3"/><line class="edge" x1="10" y1="136" x2="98" y2="136" marker-end="url(#a)"/>
  <rect class="soft" x="100" y="118" width="140" height="36" rx="8"/>
  <text class="sm b ink mid" x="170" y="141">WebFetch 규칙</text>
  <circle class="mark-ok" cx="240" cy="136"/>
  <line class="edge" x1="248" y1="136" x2="286" y2="136" marker-end="url(#a)"/>
  <rect class="box" x="288" y="118" width="72" height="36" rx="8"/>
  <text class="sm mono ink mid" x="324" y="141">aka.ms</text>
  <path class="edge" d="M324 154V172H175V156" marker-end="url(#a)"/>
  <text class="xs mid" x="250" y="190">301, 대상 주소만 돌려줌</text>
  <text class="sm" x="0" y="206">대상 주소로 다시</text>
  <circle class="dot" cx="6" cy="230" r="3"/><line class="edge" x1="10" y1="230" x2="92" y2="230"/>
  <rect class="soft bad" x="100" y="212" width="140" height="36" rx="8"/>
  <text class="sm b ink mid" x="170" y="235">WebFetch 규칙</text>
  <circle class="mark-x" cx="100" cy="230"/>

  <text class="b" x="0" y="278">Bash로 curl</text>
  <text class="xs mono mid" x="190" y="282">/usr/bin/curl</text>
  <circle class="dot" cx="6" cy="310" r="3"/><line class="edge" x1="10" y1="310" x2="38" y2="310" marker-end="url(#a)"/>
  <rect class="soft dash" x="40" y="292" width="110" height="36" rx="8"/>
  <text class="xs mono ink mid" x="95" y="314">Bash(curl *)</text>
  <line class="edge" x1="150" y1="310" x2="222" y2="310"/>
  <rect class="soft bad" x="230" y="292" width="130" height="36" rx="8"/>
  <text class="sm b ink mid" x="295" y="315">샌드박스 프록시</text>
  <circle class="mark-x" cx="230" cy="310"/>
  <text class="xs mono end" x="360" y="346">strictAllowlist: true</text>

  <text class="b" x="0" y="378">샌드박스 밖에서</text>
  <circle class="dot" cx="6" cy="410" r="3"/><line class="edge" x1="10" y1="410" x2="92" y2="410"/>
  <rect class="soft bad" x="100" y="392" width="140" height="36" rx="8"/>
  <text class="sm b ink mid" x="170" y="415">밖에서 실행 꺼 둠</text>
  <circle class="mark-x" cx="100" cy="410"/>
  <text class="xs mono" x="0" y="448">allowUnsandboxedCommands: false</text>
</svg>
```

## 상태 이동

상태는 상자, 넘어가는 조건은 화살표 옆 글자. 나쁜 길만 붉게.

```svg
title: 폐기된 토큰이 다시 오면 새 토큰까지 함께 끊긴다
caption: 리프레시 토큰을 한 번 쓸 때마다 바꿔 주는 회전
legend: bad=탈취로 보고 끊는 길
<svg viewBox="0 0 300 236">
  <rect class="box" x="0" y="20" width="104" height="48" rx="8"/>
  <text class="b mid" x="52" y="41">토큰 A</text>
  <text class="xs mid" x="52" y="59">살아 있음</text>
  <rect class="soft" x="196" y="20" width="104" height="48" rx="8"/>
  <text class="b mid" x="248" y="41">토큰 A</text>
  <text class="xs mid" x="248" y="59">폐기됨</text>
  <line class="edge" x1="104" y1="44" x2="194" y2="44" marker-end="url(#a)"/>
  <text class="xs mid" x="150" y="36">한 번 쓰면</text>
  <path class="edge" d="M150 44V96H52V118" marker-end="url(#a)"/>
  <text class="xs" x="158" y="92">새로 발급</text>
  <rect class="box good" x="0" y="120" width="104" height="48" rx="8"/>
  <text class="b mid" x="52" y="141">토큰 B</text>
  <text class="xs mid" x="52" y="159">살아 있음</text>
  <line class="edge bad" x1="248" y1="68" x2="248" y2="178" marker-end="url(#a-bad)"/>
  <text class="xs bad end" x="240" y="126">A가 다시 오면</text>
  <rect class="soft bad" x="160" y="180" width="140" height="48" rx="8"/>
  <text class="sm b ink mid" x="230" y="201">A와 B 모두</text>
  <text class="xs bad mid" x="230" y="219">끊김, 다시 로그인</text>
</svg>
```

## 층 통과

층은 `zone` 띠로 쌓고, 요청은 한 줄로 뚫고 내려간다. 층마다 무엇이 붙거나 걸러지는지를 오른쪽에 적고, 결과(남는 행)를 마지막 층에 그린다.

```svg
title: RLS는 요청이 테이블에 닿기 전에 남의 행을 거른다
caption: anon 키로 내 일기 목록을 읽을 때
<svg viewBox="0 0 300 240">
  <rect class="zone" x="0" y="0" width="300" height="50" rx="8"/>
  <rect class="zone" x="0" y="62" width="300" height="50" rx="8"/>
  <rect class="zone" x="0" y="124" width="300" height="50" rx="8"/>
  <rect class="zone" x="0" y="186" width="300" height="50" rx="8"/>
  <text class="b" x="12" y="30">브라우저</text>
  <text class="b" x="12" y="92">PostgREST</text>
  <text class="b" x="12" y="154">RLS 정책</text>
  <text class="b" x="12" y="216">테이블</text>
  <line class="edge" x1="104" y1="25" x2="104" y2="204" marker-end="url(#a)"/>
  <circle class="dot" cx="104" cy="25" r="4"/>
  <circle class="dot" cx="104" cy="87" r="4"/>
  <circle class="dot accent" cx="104" cy="149" r="4"/>
  <text class="sm ink" x="118" y="30">anon 키 + 로그인 JWT</text>
  <text class="sm ink" x="118" y="92">JWT로 auth.uid() 채움</text>
  <text class="sm ink" x="118" y="146">user_id = auth.uid()</text>
  <text class="xs" x="118" y="164">조건을 쿼리에 붙인다</text>
  <text class="sm ink" x="118" y="216">내 행만</text>
  <rect class="box good" x="176" y="204" width="14" height="18" rx="3"/>
  <rect class="box good" x="194" y="204" width="14" height="18" rx="3"/>
  <rect class="box good" x="212" y="204" width="14" height="18" rx="3"/>
  <rect class="box faint" x="230" y="204" width="14" height="18" rx="3"/>
  <rect class="box faint" x="248" y="204" width="14" height="18" rx="3"/>
  <rect class="box faint" x="266" y="204" width="14" height="18" rx="3"/>
</svg>
```

## 주고받기

참여자는 머리 상자와 점선 생명선, 메시지는 이름 붙은 화살표. 끊기는 자리에 mark-x 와 이유.

```svg
title: WebFetch는 다른 호스트로 가는 301을 따라가지 않는다
caption: aka.ms 만 허용하고 단축 주소를 열게 했을 때
legend: x=막힘
<svg viewBox="0 0 300 224">
  <rect class="box" x="4" y="0" width="72" height="26" rx="6"/>
  <text class="sm b ink mid" x="40" y="18">Claude</text>
  <rect class="box" x="110" y="0" width="80" height="26" rx="6"/>
  <text class="sm b ink mid" x="150" y="18">WebFetch</text>
  <rect class="box" x="224" y="0" width="72" height="26" rx="6"/>
  <text class="sm mono ink mid" x="260" y="18">aka.ms</text>
  <g class="edge muted thin dash"><line x1="40" y1="26" x2="40" y2="216"/><line x1="150" y1="26" x2="150" y2="216"/><line x1="260" y1="26" x2="260" y2="216"/></g>
  <line class="edge" x1="40" y1="56" x2="148" y2="56" marker-end="url(#a)"/>
  <text class="xs mono mid" x="95" y="49">aka.ms/vscode</text>
  <line class="edge" x1="150" y1="92" x2="258" y2="92" marker-end="url(#a)"/>
  <text class="xs mid" x="205" y="85">GET</text>
  <line class="edge" x1="260" y1="128" x2="152" y2="128" marker-end="url(#a)"/>
  <text class="xs mid" x="205" y="121">301 다른 호스트</text>
  <line class="edge" x1="150" y1="164" x2="42" y2="164" marker-end="url(#a)"/>
  <text class="xs mid" x="95" y="157">대상 주소만</text>
  <line class="edge" x1="40" y1="200" x2="140" y2="200"/>
  <text class="xs mid" x="92" y="193">대상 주소로 다시</text>
  <circle class="mark-x" cx="150" cy="200"/>
  <text class="xs bad" x="164" y="204">규칙에서 막힘</text>
</svg>
```
