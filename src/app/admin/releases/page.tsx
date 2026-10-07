/**
 * 릴리스 글감 — 수집된 글감을 검토하고, 추적 레포를 켜고 끈다.
 *
 * 집필은 여기서 하지 않는다. "쓸래"로 표시만 해두면 Claude 가 세션에서
 * 그 글감을 집어 2차 소스까지 읽고 글을 쓴다 — 릴리스 본문만으로는 글이
 * 안 나온다.
 */
import { requireUser } from "@/lib/auth";
import { getReleaseAdminData } from "@/lib/release-queue";
import { ReleaseQueue } from "@/components/releases/ReleaseQueue";
import { SourceManager } from "@/components/releases/SourceManager";

export const metadata = { title: "릴리스 글감" };

export default async function Page() {
  // proxy 가 이미 걸러내지만, 데이터에 손대기 직전에 한 번 더 확인한다.
  await requireUser();

  const { queue, sources, collectEnabled } = await getReleaseAdminData();
  const fresh = queue.filter((r) => r.status === "new").length;
  const queued = queue.filter((r) => r.status === "queued").length;

  return (
    <main className="mx-auto max-w-[1080px] px-[var(--gut)] pb-16 pt-10">
      <header className="mb-[22px]">
        <div className="mb-2 font-sans text-[11px] font-bold uppercase tracking-[0.1em] text-ink-muted">
          RELEASES
        </div>
        <h1 className="m-0 font-sans text-[clamp(27px,6vw,36px)] font-semibold leading-[1.1] tracking-[-0.03em] text-ink">
          릴리스 글감
        </h1>
        <p className="m-0 mt-2.5 max-w-[560px] text-[14.5px] leading-[1.6] text-ink-muted">
          새 글감 {fresh} · 쓸래 {queued} · 추적 {sources.length}곳. 쓸래로
          표시해두면 집필할 때 그 목록부터 봅니다.
        </p>
      </header>

      <ReleaseQueue initial={queue} />
      <SourceManager initial={sources} collectEnabled={collectEnabled} />
    </main>
  );
}
