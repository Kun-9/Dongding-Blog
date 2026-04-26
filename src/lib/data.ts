/**
 * Sample blog data — direct port of window.DD_DATA / DD_POST_BODY / DD_EXTRA
 * from project/tokens.js + page-extras.jsx. Phase 4 will replace this with
 * actual MDX-driven loaders. Keeping the same shape so consumer components
 * survive that swap unchanged.
 */

export interface Subcategory {
  id: string;
  name: string;
  count: number;
}

export interface Category {
  id: string;
  name: string;
  count: number;
  desc: string;
  subs?: Subcategory[];
}

export interface Post {
  slug: string;
  title: string;
  summary: string;
  category: string;
  tags: string[];
  date: string; // ISO YYYY-MM-DD
  readTime: number;
  featured?: boolean;
  draft?: boolean;
}

export interface TocItem {
  id: string;
  label: string;
  level: 2 | 3;
}

export interface Series {
  id: string;
  title: string;
  desc: string;
  count: number;
  color: string;
  posts: string[];
}

export interface Bookmark {
  url: string;
  title: string;
  source: string;
  tag: string;
  note: string;
  date: string;
}

export interface Draft {
  slug: string;
  title: string;
  updated: string;
  words: number;
  status: "draft" | "review";
}

export interface SiteAuthor {
  author: string;
  bio: string;
  intro: string;
  social: {
    github: string;
    email: string;
    rss: string;
  };
}

export const site: SiteAuthor = {
  author: "동딩",
  bio: "Spring · JPA · 시스템 설계를 깊게 파는 백엔드 개발자",
  intro: "실무에서 마주친 문제를 끝까지 파보는 노트.",
  social: {
    github: "github.com/dong-ding",
    email: "dong-ding@dev.kr",
    rss: "/rss.xml",
  },
};

export const categories: Category[] = [
  {
    id: "java",
    name: "Java",
    count: 8,
    desc: "언어 자체의 깊은 동작",
    subs: [
      { id: "java-concurrency", name: "동시성", count: 3 },
      { id: "java-jvm", name: "JVM", count: 3 },
      { id: "java-lang", name: "언어 기능", count: 2 },
    ],
  },
  {
    id: "spring",
    name: "Spring",
    count: 12,
    desc: "프레임워크 내부와 실전",
    subs: [
      { id: "spring-core", name: "Core·DI·AOP", count: 5 },
      { id: "spring-boot", name: "Boot", count: 4 },
      { id: "spring-cloud", name: "Cloud·MSA", count: 3 },
    ],
  },
  {
    id: "db",
    name: "DB",
    count: 9,
    desc: "JPA · MySQL · 인덱스",
    subs: [
      { id: "db-jpa", name: "JPA·Hibernate", count: 4 },
      { id: "db-mysql", name: "MySQL·인덱스", count: 3 },
      { id: "db-design", name: "스키마·모델링", count: 2 },
    ],
  },
  {
    id: "system",
    name: "시스템",
    count: 6,
    desc: "아키텍처와 트러블슈팅",
    subs: [
      { id: "system-arch", name: "아키텍처", count: 3 },
      { id: "system-debug", name: "디버깅 일지", count: 3 },
    ],
  },
  {
    id: "interview",
    name: "면접",
    count: 7,
    desc: "미들 레벨 면접 정리",
    subs: [
      { id: "interview-cs", name: "CS 기초", count: 4 },
      { id: "interview-system", name: "시스템 설계", count: 3 },
    ],
  },
];

export const posts: Post[] = [
  {
    slug: "jpa-n-plus-1",
    title: "JPA N+1 — fetch join은 정답이 아니다",
    summary:
      "fetch join을 쓰면 N+1은 사라지지만, paging이 깨지고 distinct가 필요해진다. BatchSize와의 진짜 차이를 정리한다.",
    category: "db",
    tags: ["jpa", "hibernate", "performance"],
    date: "2026-04-20",
    readTime: 12,
    featured: true,
  },
  {
    slug: "spring-tx-propagation",
    title: "스프링 트랜잭션 전파, 그 진짜 동작",
    summary:
      "REQUIRES_NEW가 정말 새 트랜잭션을 만드는가. 같은 클래스 내부 호출에서 @Transactional이 무시되는 이유와 우회법.",
    category: "spring",
    tags: ["spring", "transaction", "aop"],
    date: "2026-04-12",
    readTime: 9,
  },
  {
    slug: "mysql-index-internals",
    title: "MySQL Index가 메모리에 올라가는 방식",
    summary:
      "B+Tree 노드가 InnoDB Buffer Pool에 올라올 때, 어디까지 올라오고 언제 evict되는가. covering index의 효용.",
    category: "db",
    tags: ["mysql", "index", "innodb"],
    date: "2026-03-28",
    readTime: 14,
  },
  {
    slug: "threadlocal-leak",
    title: "디버깅 일지 — ThreadLocal 메모리 누수",
    summary:
      "톰캣 thread pool 환경에서 ThreadLocal을 remove() 하지 않았을 때 어떤 일이 벌어지는지, heap dump로 따라가기.",
    category: "system",
    tags: ["debug", "threadlocal", "tomcat"],
    date: "2026-03-15",
    readTime: 11,
  },
  {
    slug: "java-record",
    title: "Java record, Lombok @Value를 정말 대체할까",
    summary:
      "필드 mutation, equals/hashCode, builder, JSON 직렬화 — record로 옮기기 전에 점검할 5가지.",
    category: "java",
    tags: ["java", "record", "lombok"],
    date: "2026-03-04",
    readTime: 7,
  },
  {
    slug: "interview-cs",
    title: "미들 레벨 면접에서 자주 묻는 CS 질문",
    summary:
      "TCP 3-way handshake보다 자주 나오는 건 따로 있다. 실제 코딩 경력 5년차 면접에서 받은 질문 정리.",
    category: "interview",
    tags: ["interview", "cs", "network"],
    date: "2026-02-22",
    readTime: 10,
  },
  {
    slug: "spring-boot-3-aot",
    title: "Spring Boot 3 AOT — 실전에서 켜야 하나",
    summary:
      "GraalVM native image의 빌드 시간 vs. 콜드 스타트 이득. 운영 서비스에 도입하기 전 확인할 것.",
    category: "spring",
    tags: ["spring-boot", "graalvm", "aot"],
    date: "2026-02-10",
    readTime: 8,
  },
  {
    slug: "jpa-dirty-checking",
    title: "JPA dirty checking, 어떻게 그렇게 빠른가",
    summary:
      "flush 시점에 변경 감지가 일어난다는 건 알겠는데, 어떤 자료구조를 쓰는가. 스냅샷의 비용과 한계.",
    category: "db",
    tags: ["jpa", "hibernate", "performance"],
    date: "2026-01-28",
    readTime: 11,
  },
];

export const featuredPostBodyToc: TocItem[] = [
  { id: "problem", label: "문제 상황", level: 2 },
  { id: "lazy", label: "LAZY 로딩과 N+1", level: 2 },
  { id: "fetch-join", label: "fetch join의 한계", level: 2 },
  { id: "paging", label: "페이징과의 충돌", level: 3 },
  { id: "batch-size", label: "BatchSize 전략", level: 2 },
  { id: "wrap", label: "정리", level: 2 },
];

export const series: Series[] = [
  {
    id: "jpa-deep",
    title: "JPA 깊이 보기",
    desc: "실무에서 JPA를 모범생처럼 쓰지 않을 때의 이야기.",
    count: 5,
    color: "#7a8a5a",
    posts: ["jpa-n-plus-1", "jpa-dirty-checking"],
  },
  {
    id: "tx-internals",
    title: "트랜잭션 내부",
    desc: "AOP·Propagation·Isolation 그 너머.",
    count: 3,
    color: "#8a7355",
    posts: ["spring-tx-propagation"],
  },
  {
    id: "mysql-internals",
    title: "MySQL Internals",
    desc: "B+Tree, Buffer Pool, Redo log을 코드로 따라가기.",
    count: 4,
    color: "#5a7480",
    posts: ["mysql-index-internals"],
  },
  {
    id: "debugging-diary",
    title: "디버깅 일지",
    desc: "실제 운영 사고에서 배운 것.",
    count: 2,
    color: "#8a5d5d",
    posts: ["threadlocal-leak"],
  },
];

export const bookmarks: Bookmark[] = [
  {
    url: "martinfowler.com/articles/patterns-of-distributed-systems",
    title: "Patterns of Distributed Systems",
    source: "Martin Fowler",
    tag: "system",
    note: "리더 선출, 로그 복제 패턴이 이름붙여 정리되어 있어 인용하기 좋다.",
    date: "2026-04-22",
  },
  {
    url: "kafka.apache.org/documentation",
    title: "Kafka Documentation — Exactly-Once Semantics",
    source: "Apache Kafka",
    tag: "kafka",
    note: "idempotent producer + transactional API의 정확한 의미.",
    date: "2026-04-20",
  },
  {
    url: "planetscale.com/blog/btrees-and-database-indexes",
    title: "B-Trees and Database Indexes",
    source: "PlanetScale",
    tag: "mysql",
    note: "B+Tree 시각화가 가장 깔끔한 자료.",
    date: "2026-04-12",
  },
  {
    url: "jepsen.io/analyses",
    title: "Jepsen — Distributed Systems Safety Research",
    source: "Jepsen",
    tag: "system",
    note: "분산 시스템이 어떻게 거짓말하는지에 대한 정전.",
    date: "2026-04-08",
  },
  {
    url: "use-the-index-luke.com",
    title: "Use The Index, Luke!",
    source: "Markus Winand",
    tag: "mysql",
    note: "인덱스 책 한 권을 웹페이지로 옮긴 자료.",
    date: "2026-03-28",
  },
  {
    url: "shopify.engineering/scaling-shopify",
    title: "Shopify의 모놀리스 분리기",
    source: "Shopify Engineering",
    tag: "system",
    note: "큰 모놀리스를 모듈러로 옮기는 단계가 자세히.",
    date: "2026-03-15",
  },
];

export const drafts: Draft[] = [
  {
    slug: "kafka-exactly-once",
    title: "Kafka exactly-once는 정말 정확한가",
    updated: "2026-04-25",
    words: 2840,
    status: "draft",
  },
  {
    slug: "graphql-n-plus-1",
    title: "GraphQL DataLoader, REST의 N+1보다 잘 푸는가",
    updated: "2026-04-23",
    words: 1620,
    status: "review",
  },
  {
    slug: "redis-cluster",
    title: "Redis Cluster 슬롯 마이그레이션 일지",
    updated: "2026-04-18",
    words: 980,
    status: "draft",
  },
];

/** Find a category by id with strict typing. */
export function getCategory(id: string): Category | undefined {
  return categories.find((c) => c.id === id);
}

/** Get all unique tags across posts. */
export function getAllTags(): string[] {
  return [...new Set(posts.flatMap((p) => p.tags))];
}
