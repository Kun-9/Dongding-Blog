/**
 * Static category tree (5 top-level + subs each). Counts are derived from
 * actual post frontmatter in `posts.ts` at build time.
 */
import type { Category } from "@/lib/types";

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

export function getCategory(id: string): Category | undefined {
  return categories.find((c) => c.id === id);
}
