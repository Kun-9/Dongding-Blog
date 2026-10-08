/**
 * 개념 글감의 큰 주제 — 어드민 라디오 버튼과 탐색기 API 가 같은 목록을 본다.
 *
 * tags 는 Stack Overflow 태그다. 탐색기는 태그마다 자주 묻는 질문(FAQ)을 받아
 * 개발자가 헷갈려하는 지점을 고른다. 화면에서도 읽어 서버 전용으로 두지 않는다.
 */
export const CONCEPT_AREAS = [
  { key: "backend", label: "백엔드", tags: ["model-view-controller", "design-patterns", "dependency-injection", "rest", "orm", "transactions", "microservices", "caching"] },
  { key: "frontend", label: "프론트엔드", tags: ["javascript", "event-loop", "dom", "css", "reactjs", "closures", "promise", "typescript"] },
  { key: "network", label: "네트워크", tags: ["http", "tcp", "dns", "https", "cors", "websocket", "load-balancing", "proxy"] },
  { key: "security", label: "인증·보안", tags: ["jwt", "oauth-2.0", "session", "csrf", "xss", "cookies", "hash", "encryption"] },
  { key: "cs", label: "CS", tags: ["multithreading", "concurrency", "process", "memory-management", "garbage-collection", "big-o", "recursion", "data-structures"] },
  { key: "db", label: "DB", tags: ["sql", "indexing", "database-normalization", "isolation-level", "deadlock", "nosql", "database-design", "acid"] },
] as const;

export type ConceptArea = (typeof CONCEPT_AREAS)[number]["key"];

export const CONCEPT_AREA_KEYS = CONCEPT_AREAS.map((a) => a.key) as [ConceptArea, ...ConceptArea[]];
