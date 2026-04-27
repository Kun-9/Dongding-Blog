/**
 * About — port of project/page-about-404.jsx#AboutPage.
 */
import { CTA } from "@/components/ui/CTA";
import { site } from "@/lib/site";

export const metadata = {
  title: "About",
};

const CAREER: ReadonlyArray<readonly [string, string, string]> = [
  ["2024 — 현재", "시니어 백엔드 엔지니어", "결제 도메인 마이그레이션, 트래픽 5배 처리"],
  ["2022 — 2024", "백엔드 엔지니어", "주문/배송 시스템 설계 및 구축"],
  ["2021 — 2022", "백엔드 엔지니어", "레거시 모놀리스를 모듈러 모놀리스로 전환"],
];

const INTERESTS = [
  "Java",
  "Spring",
  "JPA / Hibernate",
  "MySQL",
  "PostgreSQL",
  "시스템 설계",
  "면접 준비",
  "DB internals",
];

export default function Page() {
  return (
    <main className="mx-auto max-w-[720px] px-8 pt-16">
      <header className="mb-10">
        <div className="mb-3 font-sans text-[11px] font-bold uppercase tracking-[0.1em] text-ink-muted">
          About
        </div>
        <h1 className="m-0 font-sans text-[44px] font-semibold leading-[1.1] tracking-[-0.035em] text-ink">
          안녕하세요,
          <br />
          {site.author}입니다.
        </h1>
      </header>

      <section className="mb-10">
        <p className="mb-5 font-sans text-[17px] leading-[1.85] tracking-[-0.005em] text-ink-soft">
          5년차 백엔드 개발자입니다. Java · Spring · JPA로 일하고, 최근에는 DB
          internals와 시스템 설계 쪽을 깊게 파고 있어요.
        </p>
        <p className="mb-5 font-sans text-[17px] leading-[1.85] tracking-[-0.005em] text-ink-soft">
          이 블로그에는 실무에서 마주친 문제를 끝까지 풀어본 기록을 씁니다.
          답이 있는 글보다, 같이 고민하다가 함께 답에 도달하는 글을 쓰고 싶어요.
          빠르게 훑어 읽기 어려운 글이 되더라도, 한 번 읽고 나면 코드를 짤 때
          떠올릴 수 있는 글이 목표입니다.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="mb-4 font-sans text-[22px] font-semibold tracking-[-0.025em] text-ink">
          경력
        </h2>
        <ul className="m-0 list-none p-0">
          {CAREER.map(([when, role, desc]) => (
            <li
              key={when}
              className="grid grid-cols-[140px_1fr] gap-4 border-t border-border-token py-3.5"
            >
              <span className="font-mono text-[13px] tabular-nums text-ink-muted">
                {when}
              </span>
              <div>
                <div className="text-[15px] font-semibold tracking-[-0.015em] text-ink">
                  {role}
                </div>
                <div className="mt-0.5 text-sm leading-[1.6] text-ink-muted">
                  {desc}
                </div>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="mb-10">
        <h2 className="mb-3.5 font-sans text-[22px] font-semibold tracking-[-0.025em] text-ink">
          관심사
        </h2>
        <div className="flex flex-wrap gap-1.5">
          {INTERESTS.map((t) => (
            <span
              key={t}
              className="rounded-full border border-border-token bg-surface px-3 py-[5px] font-sans text-[13px] font-medium tracking-[-0.01em] text-ink"
            >
              {t}
            </span>
          ))}
        </div>
      </section>

      <section className="pb-8">
        <h2 className="mb-3.5 font-sans text-[22px] font-semibold tracking-[-0.025em] text-ink">
          연락
        </h2>
        <div className="flex gap-2.5">
          <CTA href={`https://${site.social.github}`}>GitHub</CTA>
          <CTA dark={false} href={`mailto:${site.social.email}`}>
            Email
          </CTA>
          <CTA dark={false} href={site.social.rss}>
            RSS
          </CTA>
        </div>
      </section>
    </main>
  );
}
