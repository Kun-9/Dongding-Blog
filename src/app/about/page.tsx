/**
 * About — port of project/page-about-404.jsx#AboutPage.
 */
import { CTA } from "@/components/ui/CTA";
import { EmailCopy } from "@/components/ui/EmailCopy";
import { getSite } from "@/lib/site-db";

export const metadata = {
  title: "About",
  alternates: { canonical: "/about" },
};

const CAREER: ReadonlyArray<readonly [string, string, string]> = [
  ["2024.08 — 현재", "한경정보기술 백엔드 엔지니어", "분산 서비스 공통 계층을 설계하고 운영, 업무에 AI 도구를 적극 활용"],
];

const INTERESTS = [
  "Java",
  "Spring",
  "Oracle",
  "분산 서비스",
  "공통 모듈 설계",
  "AI 활용 개발",
  "LLM 워크플로우",
];

export default async function Page() {
  const site = await getSite();

  return (
    <main className="mx-auto max-w-[720px] px-[var(--gut)] pt-16">
      <header className="mb-10">
        <div className="mb-3 font-sans text-[11px] font-bold uppercase tracking-[0.1em] text-ink-muted">
          About
        </div>
        <h1 className="m-0 font-sans text-[clamp(33px,7vw,44px)] font-semibold leading-[1.1] tracking-[-0.035em] text-ink">
          안녕하세요,
          <br />
          {site.author}입니다.
        </h1>
      </header>

      <section className="mb-10">
        {site.about
          .split(/\n\s*\n/)
          .map((para) => para.trim())
          .filter(Boolean)
          .map((para) => (
            <p
              key={para}
              className="mb-5 whitespace-pre-line font-sans text-[17px] leading-[1.85] tracking-[-0.005em] text-ink-soft"
            >
              {para}
            </p>
          ))}
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
          <EmailCopy email={site.social.email} as="cta" />
        </div>
      </section>
    </main>
  );
}
