"use client";

import { useEffect, useMemo, useState } from "react";
import { API } from "@/lib/api-routes";
import type { QueueRow } from "@/lib/release-queue";
import type { TopicRow } from "@/lib/release-topics";
import { ReleaseQueue } from "@/components/releases/ReleaseQueue";
import { TopicBoard } from "@/components/releases/TopicBoard";

/**
 * 집필 진행판과 글감 목록을 한 상태로 묶는다. 주제에 글감을 넣으면 그 글감이
 * 쓸래로 올라가고 목록에 주제 꼬리표가 붙어야 해서 둘이 따로 놀면 안 된다.
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

  return (
    <>
      <TopicBoard
        topics={topics}
        onTopicsChange={setTopics}
        candidates={rows.filter((r) => r.status !== "skipped")}
        onQueued={markQueued}
        onSkipped={markSkipped}
      />
      <ReleaseQueue rows={rows} setRows={setRows} topicsOf={topicsOf} />
    </>
  );
}
