/**
 * About — port of project/page-about-404.jsx#AboutPage.
 */
import { CTA } from "@/components/ui/CTA";
import { site } from "@/lib/site";

export const metadata = {
  title: "About",
};

const CAREER: ReadonlyArray<readonly [string, string, string]> = [
  ["2024.08 — 현재", "백엔드 엔지니어 · 한경정보기술", "MSA 시스템 공통관리 · 사내 AI 도입 실험"],
];

const INTERESTS = [
  "Java",
  "Spring",
  "Oracle",
  "MSA",
  "공통 모듈 설계",
  "AI 활용 개발",
  "LLM 워크플로우",
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
          2년차 백엔드 개발자입니다. Java · Spring · Oracle로 일하고, MSA
          환경의 공통관리 영역을 맡으면서 시스템이 어떻게 맞물려 돌아가는지
          익히고 있어요.
        </p>
        <p className="mb-5 font-sans text-[17px] leading-[1.85] tracking-[-0.005em] text-ink-soft">
          요즘은 AI를 학습하고 실제 업무에 어떻게 녹여낼지 실험하는 게
          가장 즐겁습니다. 이 블로그에는 그 과정에서 마주친 문제를 끝까지
          풀어본 기록을 남겨요. 답이 있는 글보다, 같이 고민하다가 함께
          답에 도달하는 글을 쓰고 싶습니다.
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
