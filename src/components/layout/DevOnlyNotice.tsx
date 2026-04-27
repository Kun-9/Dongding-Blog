/**
 * DevOnlyNotice — full-page placeholder rendered when an admin/editor route
 * is opened in a non-development environment. /admin, /settings, /studio all
 * fall back to this in production builds; the real UI is reachable only via
 * `npm run dev` on the author's machine.
 */
import { CTA } from "@/components/ui/CTA";

interface Props {
  page: string;
}

export function DevOnlyNotice({ page }: Props) {
  return (
    <main className="mx-auto flex max-w-[700px] flex-col items-center justify-center px-8 py-32 text-center">
      <div className="mb-6 inline-flex items-center gap-2 rounded-md border border-border-token bg-surface px-3.5 py-2 font-mono text-[13px] text-ink-muted">
        <span
          className="h-1.5 w-1.5 rounded-full"
          style={{ background: "#7da75e" }}
        />
        DEV ONLY
      </div>

      <h1 className="m-0 font-sans text-[44px] font-semibold leading-[1.1] tracking-[-0.035em] text-ink">
        로컬 개발 환경 전용 페이지
      </h1>

      <p className="m-0 mt-5 max-w-[480px] text-[15px] leading-[1.7] text-ink-muted">
        <strong className="font-semibold text-ink">{page}</strong>은(는) 로컬
        개발 서버(
        <code className="rounded bg-surface-alt px-1 py-px font-mono text-[12.5px]">
          npm run dev
        </code>
        )에서만 사용 가능합니다.
        <br />
        배포 환경에서는 보안상 비활성화되어 있어요.
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
