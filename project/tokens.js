// Design tokens — Lovable cream + dark variant. Loaded as plain JS so all
// component files can read window.DD_TOKENS without prop drilling.

window.DD_TOKENS = {
  light: {
    bg: '#f7f4ed',          // cream — page surface
    surface: '#fcfbf8',     // off-white — card surface
    surfaceAlt: '#f1ede2',  // warm tonal step
    ink: '#1c1c1c',
    inkSoft: 'rgba(28,28,28,0.82)',
    inkMuted: '#5f5f5d',
    inkSubtle: 'rgba(28,28,28,0.4)',
    border: '#eceae4',
    borderStrong: 'rgba(28,28,28,0.4)',
    accent: '#1c1c1c',      // CTA dark
    accentInk: '#fcfbf8',   // CTA text
    hover: 'rgba(28,28,28,0.04)',
    code: {
      bg: '#1c1c1c',
      ink: '#e8e6e0',
      muted: '#888475',
      keyword: '#d49a6a',
      string: '#9bbf86',
      number: '#c08a76',
      comment: '#6b675c',
      type: '#c4a87a',
      filename: '#bcb6a4',
      lineNum: '#5f5b50',
    },
    callout: {
      info:    { bg: '#eef3f5', bd: '#aac0c8', ink: '#2a3e44', glyph: '#5a8590' },
      warning: { bg: '#f7eedb', bd: '#d4b56a', ink: '#5e4912', glyph: '#9a7a23' },
      tip:     { bg: '#ecf1e8', bd: '#9bb88a', ink: '#324225', glyph: '#5d7a46' },
      note:    { bg: '#f0ece2', bd: '#bdb39a', ink: '#3a342a', glyph: '#7a6e55' },
    },
    glow1: 'rgba(255,210,170,0.55)',
    glow2: 'rgba(190,205,225,0.45)',
  },
  dark: {
    bg: '#161513',
    surface: '#1f1d1a',
    surfaceAlt: '#26231f',
    ink: '#ece9e0',
    inkSoft: 'rgba(236,233,224,0.85)',
    inkMuted: '#9a948a',
    inkSubtle: 'rgba(236,233,224,0.35)',
    border: '#2c2925',
    borderStrong: 'rgba(236,233,224,0.18)',
    accent: '#ece9e0',
    accentInk: '#161513',
    hover: 'rgba(236,233,224,0.05)',
    code: {
      bg: '#0f0e0c',
      ink: '#d6d2c6',
      muted: '#7d7768',
      keyword: '#e0a878',
      string: '#a8c89b',
      number: '#d2a079',
      comment: '#5e5a4f',
      type: '#d4be8d',
      filename: '#a09a8a',
      lineNum: '#4a4640',
    },
    callout: {
      info:    { bg: '#1c2429', bd: '#3d525a', ink: '#bcd2da', glyph: '#7fa5b0' },
      warning: { bg: '#2a2316', bd: '#6e5523', ink: '#e0c486', glyph: '#c2a05a' },
      tip:     { bg: '#1d2419', bd: '#4d6037', ink: '#bcd1a4', glyph: '#92ad75' },
      note:    { bg: '#23211c', bd: '#4a4538', ink: '#c8c2b0', glyph: '#9c9583' },
    },
    glow1: 'rgba(110,75,40,0.35)',
    glow2: 'rgba(40,55,80,0.4)',
  },
};

window.DD_FONTS = {
  sans: `'Pretendard Variable', Pretendard, -apple-system, BlinkMacSystemFont, system-ui, sans-serif`,
  serif: `'Source Serif 4', 'Noto Serif KR', Georgia, serif`,
  mono: `'JetBrains Mono', 'D2Coding', ui-monospace, SFMono-Regular, Menlo, monospace`,
};

// 링크 프리뷰 메타 캐시 — 서버가 발행 시점에 상대 페이지의 OG 태그를 읽어 저장한
// 결과를 흉내낸 표. 키는 프로토콜과 끝 슬래시를 뺀 URL. 여기 없는 주소는 카드가
// 도메인 한 줄로 떨어진다 (og 태그가 없거나 크롤이 막힌 경우).
window.DD_LINKMETA = {
  'vladmihalcea.com/hibernate-multiplebagfetchexception': {
    title: 'MultipleBagFetchException — the best way to fix it',
    desc: 'List 두 개를 한 번에 fetch join 할 수 없는 이유와, Set 치환보다 나은 두 단계 조회 전략.',
  },
  'martinfowler.com/articles/patterns-of-distributed-systems': {
    title: 'Patterns of Distributed Systems',
    desc: '리더 선출, 로그 복제, Quorum — 분산 시스템을 만들 때 반복해서 나오는 구조를 패턴으로 정리한 글.',
  },
  'docs.spring.io/spring-framework/reference/data-access/transaction/declarative/tx-propagation.html': {
    title: 'Transaction Propagation :: Spring Framework',
    desc: 'REQUIRED · REQUIRES_NEW · NESTED가 물리 트랜잭션과 어떻게 대응되는지에 대한 레퍼런스.',
  },
  'github.com/dong-ding/blog': {
    title: 'dong-ding/blog',
    desc: 'Next.js + Supabase로 만든 이 블로그의 소스.',
  },
};

// Sample data — sample posts that read believably for a Korean Spring/JPA dev.
window.DD_DATA = {
  author: '동딩',
  bio: 'Spring과 Oracle, 분산 서비스 공통 계층을 만드는 백엔드 개발자',
  intro: '실무에서 마주친 문제를 끝까지 파보는 노트.',
  title: 'Dong-Ding · 개발 노트',
  shortTitle: 'Dong-Ding',
  description: '자바와 스프링, DB를 깊이, 천천히 따라가는 블로그.',
  copyright: '© 2026 Dong-Ding · 개발 노트',
  social: {
    github: 'github.com/dong-ding',
    email: 'dong-ding@dev.kr',
  },
  series: [
    { id: 'jpa-deep', title: 'JPA 깊이 보기', desc: '실무에서 JPA를 모범생처럼 쓰지 않을 때의 이야기.', count: 5, color: '#7a8a5a',
      createdAt: '2026-01-20', posts: ['jpa-n-plus-1', 'jpa-dirty-checking'] },
    { id: 'tx-internals', title: '트랜잭션 내부', desc: 'AOP·Propagation·Isolation 그 너머.', count: 3, color: '#8a7355',
      createdAt: '2026-04-02', posts: ['spring-tx-propagation'] },
    { id: 'mysql-internals', title: 'MySQL Internals', desc: 'B+Tree, Buffer Pool, Redo log을 코드로 따라가기.', count: 4, color: '#5a7480',
      createdAt: '2026-03-18', posts: ['mysql-index-internals'] },
    { id: 'debugging-diary', title: '디버깅 일지', desc: '실제 운영 사고에서 배운 것.', count: 2, color: '#8a5d5d',
      createdAt: '2026-03-08', posts: ['threadlocal-leak'] },
    { id: 'k8s-notes', title: '쿠버네티스 운영 노트', desc: '띄우는 것보다 어려운 건 계속 띄워 두는 것.', count: 4, color: '#6a6f8a',
      createdAt: '2026-04-26', posts: [] },
  ],
  categories: [
    { id: 'java',    name: 'Java',     count: 8,  desc: '언어 자체의 깊은 동작',
      subs: [
        { id: 'java-concurrency', name: '동시성', count: 3 },
        { id: 'java-jvm',         name: 'JVM',   count: 3 },
        { id: 'java-lang',        name: '언어 기능', count: 2 },
      ] },
    { id: 'spring',  name: 'Spring',   count: 12, desc: '프레임워크 내부와 실전',
      subs: [
        { id: 'spring-core',  name: 'Core·DI·AOP', count: 5 },
        { id: 'spring-boot',  name: 'Boot',  count: 4 },
        { id: 'spring-cloud', name: 'Cloud·MSA', count: 3 },
      ] },
    { id: 'db',      name: 'DB',       count: 9,  desc: 'JPA · MySQL · 인덱스',
      subs: [
        { id: 'db-jpa',     name: 'JPA·Hibernate', count: 4 },
        { id: 'db-mysql',   name: 'MySQL·인덱스', count: 3 },
        { id: 'db-design',  name: '스키마·모델링', count: 2 },
      ] },
    { id: 'system',  name: '시스템',   count: 6,  desc: '아키텍처와 트러블슈팅',
      subs: [
        { id: 'system-arch',  name: '아키텍처', count: 3 },
        { id: 'system-debug', name: '디버깅 일지', count: 3 },
      ] },
    { id: 'interview', name: '면접', count: 7,  desc: '미들 레벨 면접 정리',
      subs: [
        { id: 'interview-cs',     name: 'CS 기초', count: 4 },
        { id: 'interview-system', name: '시스템 설계', count: 3 },
      ] },
  ],
  posts: [
    {
      slug: 'jpa-n-plus-1',
      title: 'JPA N+1 — fetch join은 정답이 아니다',
      summary: 'fetch join을 쓰면 N+1은 사라지지만, paging이 깨지고 distinct가 필요해진다. BatchSize와의 진짜 차이를 정리한다.',
      category: 'db',
      tags: ['jpa', 'hibernate', 'performance'],
      date: '2026-04-20',
      readTime: 12,
      series: 'jpa-deep', seriesOrder: 1, views: 4820, likes: 63,
      featured: true,
    },
    {
      slug: 'spring-tx-propagation',
      title: '스프링 트랜잭션 전파, 그 진짜 동작',
      summary: 'REQUIRES_NEW가 정말 새 트랜잭션을 만드는가. 같은 클래스 내부 호출에서 @Transactional이 무시되는 이유와 우회법.',
      category: 'spring',
      tags: ['spring', 'transaction', 'aop'],
      date: '2026-04-12',
      readTime: 9,
      series: 'tx-internals', seriesOrder: 1, views: 3610, likes: 41,
    },
    {
      slug: 'mysql-index-internals',
      title: 'MySQL Index가 메모리에 올라가는 방식',
      summary: 'B+Tree 노드가 InnoDB Buffer Pool에 올라올 때, 어디까지 올라오고 언제 evict되는가. covering index의 효용.',
      category: 'db',
      tags: ['mysql', 'index', 'innodb'],
      date: '2026-03-28',
      readTime: 14,
      series: 'mysql-internals', seriesOrder: 2, views: 2940, likes: 35,
    },
    {
      slug: 'threadlocal-leak',
      title: '디버깅 일지 — ThreadLocal 메모리 누수',
      summary: '톰캣 thread pool 환경에서 ThreadLocal을 remove() 하지 않았을 때 어떤 일이 벌어지는지, heap dump로 따라가기.',
      category: 'system',
      tags: ['debug', 'threadlocal', 'tomcat'],
      date: '2026-03-15',
      readTime: 11,
      series: 'debugging-diary', seriesOrder: 1, views: 2180, likes: 28,
    },
    {
      slug: 'java-record',
      title: 'Java record, Lombok @Value를 정말 대체할까',
      summary: '필드 mutation, equals/hashCode, builder, JSON 직렬화 — record로 옮기기 전에 점검할 5가지.',
      category: 'java',
      tags: ['java', 'record', 'lombok'],
      date: '2026-03-04',
      readTime: 7,
      views: 1760, likes: 22,
    },
    {
      slug: 'interview-cs',
      title: '미들 레벨 면접에서 자주 묻는 CS 질문',
      summary: 'TCP 3-way handshake보다 자주 나오는 건 따로 있다. 실제 코딩 경력 5년차 면접에서 받은 질문 정리.',
      category: 'interview',
      tags: ['interview', 'cs', 'network'],
      date: '2026-02-22',
      readTime: 10,
      views: 5240, likes: 71,
    },
    {
      slug: 'spring-boot-3-aot',
      title: 'Spring Boot 3 AOT — 실전에서 켜야 하나',
      summary: 'GraalVM native image의 빌드 시간 vs. 콜드 스타트 이득. 운영 서비스에 도입하기 전 확인할 것.',
      category: 'spring',
      tags: ['spring-boot', 'graalvm', 'aot'],
      date: '2026-02-10',
      readTime: 8,
      views: 1290, likes: 14,
    },
    {
      slug: 'jpa-dirty-checking',
      title: 'JPA dirty checking, 어떻게 그렇게 빠른가',
      summary: 'flush 시점에 변경 감지가 일어난다는 건 알겠는데, 어떤 자료구조를 쓰는가. 스냅샷의 비용과 한계.',
      category: 'db',
      tags: ['jpa', 'hibernate', 'performance'],
      date: '2026-01-28',
      readTime: 11,
      series: 'jpa-deep', seriesOrder: 3, views: 2010, likes: 26,
    },
  ],
};

// Featured post body — used for /posts/[slug] preview.
window.DD_POST_BODY = {
  toc: [
    { id: 'problem', label: '문제 상황', level: 2 },
    { id: 'lazy', label: 'LAZY 로딩과 N+1', level: 2 },
    { id: 'fetch-join', label: 'fetch join의 한계', level: 2 },
    { id: 'paging', label: '페이징과의 충돌', level: 3 },
    { id: 'batch-size', label: 'BatchSize 전략', level: 2 },
    { id: 'wrap', label: '정리', level: 2 },
  ],
};

// Series context for a post — slots (published + planned), prev/next, progress.
// Mirrors src/app/posts/[slug]/page.tsx#seriesCtx.
window.DD_SERIES_CTX = function (post) {
  if (!post || !post.series) return null;
  const series = window.DD_DATA.series.find(s => s.id === post.series);
  if (!series) return null;
  const members = window.DD_DATA.posts
    .filter(p => p.series === series.id)
    .sort((a, b) => (a.seriesOrder || 0) - (b.seriesOrder || 0));
  const total = Math.max(series.count, members.length, post.seriesOrder || 1);
  const slots = [];
  for (let i = 1; i <= total; i++) {
    const found = members.find(p => p.seriesOrder === i);
    slots.push(found ? { kind: 'post', order: i, post: found } : { kind: 'empty', order: i });
  }
  const idx = members.findIndex(p => p.slug === post.slug);
  return {
    id: series.id, title: series.title, color: series.color,
    currentOrder: post.seriesOrder || idx + 1, total,
    publishedCount: members.length,
    seriesPrev: idx > 0 ? members[idx - 1] : undefined,
    seriesNext: idx >= 0 && idx < members.length - 1 ? members[idx + 1] : undefined,
    slots, currentSlug: post.slug,
  };
};
