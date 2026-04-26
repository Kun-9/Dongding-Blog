/**
 * Phase 2-3-4 component sanity page.
 * Sample data is inlined here (not imported from lib/posts) because this
 * file is a client component for ReadingProgress's ref. Phase 5 replaces
 * this whole file with the real Home page (server component).
 */
"use client";

import { useRef } from "react";
import type { PostMeta, TocItem } from "@/lib/types";
import { PostCard } from "@/components/post/PostCard";
import { TagChip } from "@/components/post/TagChip";
import { CTA } from "@/components/ui/CTA";
import { HeroGlow } from "@/components/layout/HeroGlow";
import { CodeBlock } from "@/components/prose/CodeBlock";
import { InlineCode } from "@/components/prose/InlineCode";
import { Callout } from "@/components/prose/Callout";
import { TOC } from "@/components/prose/TOC";
import { ReadingProgress } from "@/components/prose/ReadingProgress";

// Demo-only sample. Real lists come from lib/posts in Phase 5.
const SAMPLE_POSTS: PostMeta[] = [
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
];

const SAMPLE_TOC: TocItem[] = [
  { id: "problem", label: "문제 상황", level: 2 },
  { id: "lazy", label: "LAZY 로딩과 N+1", level: 2 },
  { id: "fetch-join", label: "fetch join의 한계", level: 2 },
  { id: "paging", label: "페이징과의 충돌", level: 3 },
  { id: "batch-size", label: "BatchSize 전략", level: 2 },
  { id: "wrap", label: "정리", level: 2 },
];

const SAMPLE_JAVA = `@Entity
public class Order {
    @Id @GeneratedValue
    private Long id;

    @ManyToOne(fetch = LAZY)
    private Member member;

    @OneToMany(mappedBy = "order")
    private List<OrderItem> items = new ArrayList<>();
}`;

const SAMPLE_JPQL = `// 페이징과 함께 쓰면 경고가 난다
SELECT DISTINCT o
FROM Order o
JOIN FETCH o.items
WHERE o.status = 'PAID'
ORDER BY o.createdAt DESC`;

export default function Page() {
  const articleRef = useRef<HTMLElement>(null);

  return (
    <main>
      <ReadingProgress target={articleRef} />

      <section className="relative mx-auto max-w-[1180px] px-8 pb-8 pt-16">
        <HeroGlow />
        <div className="relative max-w-[720px]">
          <div className="mb-3.5 inline-flex items-center gap-2 font-sans text-xs font-semibold uppercase tracking-[0.08em] text-ink-muted">
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{ background: "#5d8a66" }}
            />
            Phase 2–4 · Sanity Check
          </div>
          <h1 className="m-0 font-sans text-[56px] font-semibold leading-[1.05] tracking-[-0.04em] text-ink">
            컴포넌트 + 컨텐츠 검증
          </h1>
          <p className="mb-7 mt-4 max-w-[580px] font-sans text-[18px] leading-[1.7] tracking-[-0.005em] text-ink-soft">
            Header(⌘K로 8개 MDX 글 검색 가능) · CTA · TagChip · PostCard ·
            Callout · CodeBlock · TOC · ReadingProgress 모두 동작 확인.
          </p>
          <div className="flex gap-2.5">
            <CTA href="/posts">최근 글 →</CTA>
            <CTA dark={false} href="/about">About</CTA>
          </div>
        </div>
      </section>

      <section className="mx-auto mt-10 max-w-[1180px] px-8">
        <Eyebrow>TagChip</Eyebrow>
        <div className="flex flex-wrap gap-2">
          {["jpa", "spring", "mysql", "performance", "innodb", "interview"].map(
            (t) => (
              <TagChip key={t} tag={t} />
            ),
          )}
          <TagChip tag="filled-active" filled />
        </div>
      </section>

      <section className="mx-auto mt-10 max-w-[1180px] px-8">
        <Eyebrow>PostCard · 3 variants</Eyebrow>
        <div className="grid grid-cols-3 gap-[18px]">
          {SAMPLE_POSTS.map((p) => (
            <PostCard key={p.slug} post={p} layout="card" />
          ))}
        </div>
      </section>

      <section className="mx-auto mt-12 max-w-[1180px] px-8 pb-16">
        <Eyebrow>Prose system</Eyebrow>
        <div className="grid grid-cols-[minmax(0,720px)_220px] justify-center gap-16">
          <article ref={articleRef}>
            <H2 id="problem">문제 상황</H2>
            <P>
              주문 목록 화면에서 응답이 8초로 늘었다. 페이지당 20건만 보여주는데
              <InlineCode>SELECT</InlineCode> 쿼리가 60번 넘게 나가고 있었다.
            </P>

            <Callout kind="info" title="이 글이 다루는 범위">
              Hibernate 6.x 기준이며, <InlineCode>OneToMany</InlineCode>
              관계 위주로 본다.
            </Callout>

            <H2 id="lazy">LAZY 로딩과 N+1</H2>
            <P>엔티티는 다음과 같이 정의되어 있다. 모든 연관관계는 LAZY.</P>
            <CodeBlock
              filename="Order.java"
              lang="java"
              code={SAMPLE_JAVA}
              highlight={[6, 9]}
            />

            <H2 id="fetch-join">fetch join의 한계</H2>
            <P>
              JPQL에서 <InlineCode>JOIN FETCH</InlineCode>를 쓰면 단일 쿼리로
              묶을 수 있다.
            </P>
            <CodeBlock
              filename="OrderRepository.java"
              lang="jpql"
              code={SAMPLE_JPQL}
              highlight={[3]}
            />

            <Callout kind="warning" title="MultipleBagFetchException">
              <InlineCode>List</InlineCode>를 두 개 이상 fetch join 하면
              Hibernate가 거부한다.
            </Callout>

            <H3 id="paging">페이징과의 충돌</H3>
            <P>
              <InlineCode>setMaxResults(20)</InlineCode>을 호출해도 SQL에
              LIMIT이 붙지 않는다.
            </P>

            <Callout kind="tip" title="batch_fetch_size, 얼마가 적당한가">
              경험적으로는 100~500 사이가 안전하다.
            </Callout>

            <H2 id="batch-size">BatchSize 전략</H2>
            <P>ToOne은 fetch join, ToMany는 BatchSize로 묶는다.</P>

            <H2 id="wrap">정리</H2>
            <P>상황에 맞는 도구를 골라 쓰는 게 정답이다.</P>

            <Callout kind="note" title="다음 글">
              <InlineCode>@EntityGraph</InlineCode>는 fetch join을 좀 더
              선언적으로 쓰는 방법이다.
            </Callout>
          </article>

          <aside className="pt-8">
            <TOC items={SAMPLE_TOC} />
          </aside>
        </div>
      </section>
    </main>
  );
}

function Eyebrow({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`mb-3 font-mono text-[11px] font-bold uppercase tracking-[0.1em] text-ink-muted ${className}`}
    >
      {children}
    </div>
  );
}

function H2({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h2
      id={id}
      className="mb-2.5 mt-10 font-sans text-[28px] font-semibold leading-[1.3] tracking-[-0.025em] text-ink"
      style={{ scrollMarginTop: 80 }}
    >
      {children}
    </h2>
  );
}

function H3({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h3
      id={id}
      className="mb-2 mt-8 font-sans text-[21px] font-semibold leading-[1.35] tracking-[-0.02em] text-ink"
      style={{ scrollMarginTop: 80 }}
    >
      {children}
    </h3>
  );
}

function P({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-5 font-sans text-[17px] leading-[1.85] tracking-[-0.005em] text-ink-soft">
      {children}
    </p>
  );
}
