/**
 * 404 — port of project/page-about-404.jsx#NotFoundPage.
 * "NoSuchPostException" — JPA-themed 404 wit.
 */
import { CTA } from "@/components/ui/CTA";

export const metadata = {
  title: "404",
};

export default function NotFound() {
  return (
    <main className="mx-auto flex max-w-[700px] flex-col items-center justify-center px-8 py-32 text-center">
      <div className="mb-6 inline-flex items-center gap-2 rounded-md border border-border-token bg-surface px-3.5 py-2 font-mono text-[13px] text-ink-muted">
        <span
          className="h-1.5 w-1.5 rounded-full"
          style={{ background: "#c95642" }}
        />
        HTTP 404 · NoSuchPostException
      </div>

      <h1 className="m-0 font-sans text-[80px] font-bold leading-[0.95] tracking-[-0.05em] text-ink">
        404
      </h1>

      <h2 className="mb-3.5 mt-5 font-sans text-2xl font-semibold tracking-[-0.025em] text-ink">
        이 글은 영속성 컨텍스트에 없습니다
      </h2>

      <p className="m-0 max-w-[480px] text-[15px] leading-[1.7] text-ink-muted">
        URL이 잘못됐거나, 글이 옮겨졌거나, 아직 발행되지 않은 글일 수 있어요.
        <br />
        flush() 한 번 더 하면 나올 것 같지만 — 안 나올 거예요.
      </p>

      <div className="mt-8 flex gap-2.5">
        <CTA href="/">← 홈으로</CTA>
        <CTA dark={false} href="/posts">
          전체 글
        </CTA>
      </div>
    </main>
  );
}
