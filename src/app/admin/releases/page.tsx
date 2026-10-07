/**
 * 릴리스 글감 — 수집된 글감을 검토하고, 글 주제로 묶어 집필 단계를
 * 기록하고, 추적 레포를 켜고 끈다.
 *
 * 집필 자체는 여기서 하지 않는다. Claude 가 세션에서 주제를 집어 2차 소스,
 * 자료를 거쳐 초안을 쓰고, 단계를 넘길 때마다 근거를 남긴다(MCP
 * `advance_release_topic`). 이 화면은 그 진행을 보여주는 자리다.
 */
import { requireUser } from "@/lib/auth";
import { getReleaseAdminData } from "@/lib/release-queue";
import { getTopics } from "@/lib/release-topics";
import { ReleaseDesk } from "@/components/releases/ReleaseDesk";
import { SourceManager } from "@/components/releases/SourceManager";

export const metadata = { title: "릴리스 글감" };

export default async function Page() {
  // proxy 가 이미 걸러내지만, 데이터에 손대기 직전에 한 번 더 확인한다.
  await requireUser();

  const [{ queue, sources, collectEnabled }, topics] = await Promise.all([
    getReleaseAdminData(),
    getTopics(),
  ]);
  const fresh = queue.filter((r) => r.status === "new").length;
  const inProgress = topics.filter(
    (t) => t.droppedReason === null && t.stage !== "published",
  ).length;

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
          진행 중 주제 {inProgress} · 새 글감 {fresh} · 추적 {sources.length}곳.
          주제는 글감 묶음 → 2차 소스 → 자료 → 초안 → 점검 → 발행 순으로
          넘어갑니다. 점검은 본문을 문체·구성 기준으로 직접 검사합니다.
        </p>
      </header>

      <ReleaseDesk initialQueue={queue} initialTopics={topics} />
      <SourceManager initial={sources} collectEnabled={collectEnabled} />
    </main>
  );
}
