/**
 * Series — port of project/page-extras.jsx#SeriesPage.
 */
import { getAllSeriesWithPosts } from "@/lib/series";
import { SeriesGrid } from "@/components/series/SeriesGrid";

export const metadata = {
  title: "Series",
};

export default function Page() {
  const series = getAllSeriesWithPosts();

  return (
    <main className="mx-auto max-w-[880px] px-5 pt-10 md:px-8 md:pt-16">
      <header className="mb-8">
        <div className="mb-3 font-sans text-[11px] font-bold uppercase tracking-[0.1em] text-ink-muted">
          SERIES
        </div>
        <h1 className="m-0 font-sans text-[40px] font-semibold leading-[1.1] tracking-[-0.035em] text-ink">
          연재 모음
        </h1>
        <p className="mt-3 max-w-[540px] text-[15px] leading-[1.6] text-ink-muted">
          한 주제를 여러 글로 나누어 천천히 따라가는 글 묶음. 처음부터 읽으면
          가장 잘 이해됩니다.
        </p>
      </header>

      <SeriesGrid series={series} />
    </main>
  );
}
