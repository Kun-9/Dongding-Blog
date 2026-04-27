/**
 * Static category tree (5 top-level + subs each). This module is import-safe
 * from client components — it carries only structural metadata (id/name/desc).
 *
 * Post counts are computed at build time from `content/posts/*.mdx` frontmatter
 * by `getCategoriesWithCounts()` in `category-stats.ts` (server-only).
 */
import type { Category } from "@/lib/types";

export const categories: Category[] = [
  {
    id: "java",
    name: "Java",
    desc: "언어 자체의 깊은 동작",
    subs: [
      { id: "java-concurrency", name: "동시성" },
      { id: "java-jvm", name: "JVM" },
      { id: "java-lang", name: "언어 기능" },
    ],
  },
  {
    id: "spring",
    name: "Spring",
    desc: "프레임워크 내부와 실전",
    subs: [
      { id: "spring-core", name: "Core·DI·AOP" },
      { id: "spring-boot", name: "Boot" },
      { id: "spring-cloud", name: "Cloud·MSA" },
    ],
  },
  {
    id: "db",
    name: "DB",
    desc: "JPA · MySQL · 인덱스",
    subs: [
      { id: "db-jpa", name: "JPA·Hibernate" },
      { id: "db-mysql", name: "MySQL·인덱스" },
      { id: "db-design", name: "스키마·모델링" },
    ],
  },
  {
    id: "system",
    name: "시스템",
    desc: "아키텍처와 트러블슈팅",
    subs: [
      { id: "system-arch", name: "아키텍처" },
      { id: "system-debug", name: "디버깅 일지" },
    ],
  },
  {
    id: "interview",
    name: "면접",
    desc: "미들 레벨 면접 정리",
    subs: [
      { id: "interview-cs", name: "CS 기초" },
      { id: "interview-system", name: "시스템 설계" },
    ],
  },
];

export function getCategory(id: string): Category | undefined {
  return categories.find((c) => c.id === id);
}
