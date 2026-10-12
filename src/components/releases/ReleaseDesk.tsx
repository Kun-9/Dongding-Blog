"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { API } from "@/lib/api-routes";
import type { QueueRow } from "@/lib/release-queue";
import type { TopicRow } from "@/lib/release-topics";
import { ProposalBoard } from "@/components/releases/ProposalBoard";
import { ReleaseQueue } from "@/components/releases/ReleaseQueue";
import { monthDay, TopicBoard } from "@/components/releases/TopicBoard";

type View = "board" | "proposals";

const subscribeHash = (onChange: () => void) => {
  addEventListener("hashchange", onChange);
  return () => removeEventListener("hashchange", onChange);
};

/**
 * 집필 진행판과 글감 목록을 한 상태로 묶는다. 주제에 글감을 넣으면 그 글감이
 * 쓸래로 올라가고 목록에 주제 꼬리표가 붙어야 해서 둘이 따로 놀면 안 된다.
 * 집필 진행과 제안은 탭으로 나눈다. 주소 끝 #proposals 가 제안 탭이다.
 */
export function ReleaseDesk({
  initialQueue,
  initialTopics,
}: {
  initialQueue: QueueRow[];
  initialTopics: TopicRow[];
}) {
  const [rows, setRows] = useState(initialQueue);
  const [topics, setTopics] = useState(initialTopics);

  // AI 작업이 걸려 있는 동안만 다시 읽는다. 작업 중이면 5초, 대기 중이면
  // 15초, 예약만 있으면 1분. 실행기가 남기는 로그·단계·노트가 새로고침 없이
  // 따라온다. 탭이 가려져 있으면 쉬었다가 돌아오면 바로 한 번 읽는다.
  // 접은 주제는 실행기가 집지 않으니 기다릴 것도 없다.
  const live = topics.filter((t) => t.droppedReason === null);
  const mode = live.some((t) => t.ai.status === "running")
    ? "running"
    : live.some((t) => t.ai.status === "queued" && !t.ai.local)
      ? "queued"
      : live.some((t) => t.ai.status === "queued")
        ? "reserved"
        : null;
  useEffect(() => {
    if (!mode) return;
    const refresh = async () => {
      if (document.hidden) return;
      const res = await fetch(API.releaseTopics, { cache: "no-store" }).catch(() => null);
      if (!res?.ok) return;
      const body = (await res.json()) as { topics: TopicRow[] };
      setTopics(body.topics);
    };
    const timer = setInterval(refresh, { running: 5_000, queued: 15_000, reserved: 60_000 }[mode]);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [mode]);

  const topicsOf = useMemo(() => {
    const m = new Map<string, string[]>();
    for (const t of topics) {
      if (t.droppedReason !== null) continue;
      for (const c of t.candidates) m.set(c.id, [...(m.get(c.id) ?? []), t.title]);
    }
    return m;
  }, [topics]);

  function markQueued(ids: string[]) {
    const set = new Set(ids);
    setRows((rs) =>
      rs.map((r) => (set.has(r.id) && r.status === "new" ? { ...r, status: "queued" } : r)),
    );
  }

  function markSkipped(ids: string[], note: string) {
    const set = new Set(ids);
    setRows((rs) => rs.map((r) => (set.has(r.id) ? { ...r, status: "skipped", note } : r)));
  }

  const view = useSyncExternalStore<View>(
    subscribeHash,
    () => (location.hash === "#proposals" ? "proposals" : "board"),
    () => "board",
  );
  // 탭 전환은 기록을 쌓지 않는다. replaceState 는 hashchange 를 안 내서 직접 알린다.
  function show(next: View) {
    history.replaceState(null, "", next === "proposals" ? "#proposals" : location.pathname + location.search);
    dispatchEvent(new HashChangeEvent("hashchange"));
  }

  const proposals = topics.filter((t) => t.proposed && !t.discardedAt && t.droppedReason === null);
  const today = monthDay(new Date().toISOString());
  const freshToday = proposals.filter((t) => monthDay(t.createdAt) === today).length;
  const inProgress = topics.filter(
    (t) => !t.proposed && t.droppedReason === null && t.stage !== "published",
  ).length;

  return (
    <>
      <div role="group" aria-label="릴리스 글감 화면" className="mb-[22px] flex gap-[22px] border-b border-border-token">
        <ViewTab on={view === "board"} onClick={() => show("board")} label="집필 진행" n={inProgress} />
        <ViewTab
          on={view === "proposals"}
          onClick={() => show("proposals")}
          label="제안"
          n={proposals.length}
          badge={freshToday ? `오늘 +${freshToday}` : null}
        />
      </div>
      {/* 숨기기만 한다. 탭을 오가도 펼친 주제·필터·페이지가 남는다. */}
      <div hidden={view !== "proposals"}>
        <ProposalBoard
          topics={topics}
          onChange={(topic) => setTopics((ts) => ts.map((t) => (t.id === topic.id ? topic : t)))}
          onSkipped={markSkipped}
          onOpenBoard={() => show("board")}
        />
      </div>
      <div hidden={view !== "board"}>
        <TopicBoard
          topics={topics}
          onTopicsChange={setTopics}
          candidates={rows.filter((r) => r.status !== "skipped")}
          onQueued={markQueued}
          onSkipped={markSkipped}
        />
      </div>
      <ReleaseQueue rows={rows} setRows={setRows} topicsOf={topicsOf} />
    </>
  );
}

function ViewTab({
  on,
  label,
  n,
  badge = null,
  onClick,
}: {
  on: boolean;
  label: string;
  n: number;
  badge?: string | null;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={`-mb-px flex items-baseline gap-1.5 border-b-2 pb-2.5 font-sans text-[15px] font-semibold transition-colors ${
        on ? "border-ink text-ink" : "border-transparent text-ink-muted hover:text-ink"
      }`}
    >
      {label}
      <span className="font-mono text-[13px] font-normal tabular-nums text-ink-muted">{n}</span>
      {badge && (
        <span className="rounded-full bg-[color:var(--callout-tip-bg)] px-[7px] py-px text-[11px] font-semibold text-[color:var(--callout-tip-ink)]">
          {badge}
        </span>
      )}
    </button>
  );
}
