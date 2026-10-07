"use client";

import { useMemo, useState } from "react";
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

  return (
    <>
      <TopicBoard
        topics={topics}
        onTopicsChange={setTopics}
        candidates={rows.filter((r) => r.status !== "skipped")}
        onQueued={markQueued}
      />
      <ReleaseQueue rows={rows} setRows={setRows} topicsOf={topicsOf} />
    </>
  );
}
