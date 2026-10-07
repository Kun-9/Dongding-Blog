/**
 * `/admin/releases` 목록 재료.
 *
 * 글감 본문(`body`)은 싣지 않는다 — 수천 자짜리가 수십 건이고, 검토에는
 * 제목·레포·날짜면 족하다. 본문이 필요한 쪽은 집필이고, 그때 DB 에서 직접
 * 읽는다.
 */
import "server-only";

import { dbAdmin } from "@/lib/supabase";

export type CandidateStatus = "new" | "queued" | "skipped" | "written";

export interface QueueRow {
  id: string;
  repo: string;
  tag: string;
  name: string | null;
  publishedAt: string;
  url: string;
  status: CandidateStatus;
  note: string | null;
}

export interface SourceRow {
  repo: string;
  enabled: boolean;
  /** 이 레포가 물고 있는 글감 수. 삭제가 무엇을 지우는지 보여주는 값이다. */
  count: number;
}

export interface ReleaseAdminData {
  queue: QueueRow[];
  sources: SourceRow[];
  collectEnabled: boolean;
}

/** 어드민 대시보드의 입구 숫자. 행은 세기만 하고 싣지 않는다. */
export async function getNewCandidateCount(): Promise<number> {
  const { count } = await dbAdmin()
    .from("release_candidates")
    .select("id", { count: "exact", head: true })
    .eq("status", "new");
  return count ?? 0;
}

export async function getReleaseAdminData(): Promise<ReleaseAdminData> {
  const db = dbAdmin();

  const [candidates, sources, config] = await Promise.all([
    db
      .from("release_candidates")
      .select("id, repo, tag, name, published_at, url, status, note")
      .order("published_at", { ascending: false })
      .limit(300),
    db.from("release_sources").select("repo, enabled").order("sort"),
    db.from("release_config").select("collect_enabled").eq("id", 1).single(),
  ]);

  const rows = candidates.data ?? [];

  const counts = new Map<string, number>();
  for (const r of rows) counts.set(r.repo, (counts.get(r.repo) ?? 0) + 1);

  return {
    queue: rows.map((r) => ({
      id: r.id,
      repo: r.repo,
      tag: r.tag,
      name: r.name,
      publishedAt: r.published_at,
      url: r.url,
      status: r.status as CandidateStatus,
      note: r.note,
    })),
    sources: (sources.data ?? []).map((s) => ({
      repo: s.repo,
      enabled: s.enabled,
      count: counts.get(s.repo) ?? 0,
    })),
    collectEnabled: config.data?.collect_enabled ?? true,
  };
}
