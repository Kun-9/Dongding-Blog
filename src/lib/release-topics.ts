/**
 * 글 주제 읽기·쓰기 — 어드민 API 와 MCP 도구가 같이 쓴다.
 *
 * 단계 이동은 여기서만 한다. 화면에서 누르든 Claude 가 세션에서 부르든 같은
 * 규칙(한 칸씩, 근거 필수)을 타야 진행 기록이 믿을 만하다.
 */
import "server-only";

import { dbAdmin } from "@/lib/supabase";
import type { Json } from "@/lib/database.types";
import {
  STAGES,
  nextStage,
  stageIndex,
  type StageCheck,
  type StageKey,
} from "@/lib/release-stages";

export interface TopicCandidate {
  id: string;
  repo: string;
  tag: string;
}

export interface TopicRow {
  id: number;
  title: string;
  angle: string | null;
  stage: StageKey;
  checks: Partial<Record<StageKey, StageCheck>>;
  postSlug: string | null;
  droppedReason: string | null;
  updatedAt: string;
  candidates: TopicCandidate[];
}

/** 화면이 상태 코드로 옮길 수 있는 실패. */
export class TopicError extends Error {
  constructor(
    message: string,
    readonly status: 400 | 404 = 400,
  ) {
    super(message);
  }
}

/** 글감 id 는 '<repo>@<tag>' 다. repo 에는 '@' 가 없다. */
function splitCandidateId(id: string): TopicCandidate {
  const at = id.indexOf("@");
  return { id, repo: id.slice(0, at), tag: id.slice(at + 1) };
}

type DbTopic = {
  id: number;
  title: string;
  angle: string | null;
  stage: string;
  checks: Json;
  post_slug: string | null;
  dropped_reason: string | null;
  updated_at: string;
};

const TOPIC_COLUMNS =
  "id, title, angle, stage, checks, post_slug, dropped_reason, updated_at";

function toRow(t: DbTopic, candidateIds: string[]): TopicRow {
  return {
    id: t.id,
    title: t.title,
    angle: t.angle,
    stage: t.stage as StageKey,
    checks: (t.checks ?? {}) as TopicRow["checks"],
    postSlug: t.post_slug,
    droppedReason: t.dropped_reason,
    updatedAt: t.updated_at,
    candidates: candidateIds.map(splitCandidateId),
  };
}

export async function getTopics(): Promise<TopicRow[]> {
  const db = dbAdmin();
  const [topics, links] = await Promise.all([
    db.from("release_topics").select(TOPIC_COLUMNS).order("id"),
    db.from("release_topic_candidates").select("topic_id, candidate_id"),
  ]);
  // 마이그레이션 전에 배포돼도 글감 화면은 살아 있어야 한다. 테이블이 없으면
  // (PGRST205 / 42P01) 주제 없이 그린다.
  if (topics.error?.code === "PGRST205" || topics.error?.code === "42P01") {
    return [];
  }
  if (topics.error) throw new Error(topics.error.message);

  const byTopic = new Map<number, string[]>();
  for (const l of links.data ?? []) {
    byTopic.set(l.topic_id, [...(byTopic.get(l.topic_id) ?? []), l.candidate_id]);
  }
  return (topics.data ?? []).map((t) =>
    toRow(t, (byTopic.get(t.id) ?? []).sort()),
  );
}

async function getTopic(id: number): Promise<TopicRow> {
  const db = dbAdmin();
  const [topic, links] = await Promise.all([
    db.from("release_topics").select(TOPIC_COLUMNS).eq("id", id).maybeSingle(),
    db
      .from("release_topic_candidates")
      .select("candidate_id")
      .eq("topic_id", id),
  ]);
  if (topic.error) throw new Error(topic.error.message);
  if (!topic.data) throw new TopicError("없는 주제", 404);
  return toRow(
    topic.data,
    (links.data ?? []).map((l) => l.candidate_id).sort(),
  );
}

/**
 * 연결할 글감을 통째로 갈아 끼운다. 묶인 글감은 아직 new 면 queued 로
 * 올린다 — 글 주제에 들어갔다는 건 쓰기로 했다는 뜻이다.
 */
async function setCandidates(id: number, candidateIds: string[]) {
  const db = dbAdmin();
  const del = await db
    .from("release_topic_candidates")
    .delete()
    .eq("topic_id", id);
  if (del.error) throw new Error(del.error.message);
  if (candidateIds.length === 0) return;

  const ins = await db
    .from("release_topic_candidates")
    .insert(candidateIds.map((candidate_id) => ({ topic_id: id, candidate_id })));
  // 23503: 없는 글감 id.
  if (ins.error?.code === "23503") throw new TopicError("없는 글감이 섞여 있다");
  if (ins.error) throw new Error(ins.error.message);

  await db
    .from("release_candidates")
    .update({ status: "queued" })
    .in("id", candidateIds)
    .eq("status", "new");
}

async function save(id: number, patch: Record<string, unknown>) {
  const { error } = await dbAdmin()
    .from("release_topics")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function createTopic(input: {
  title: string;
  angle?: string | null;
  candidateIds?: string[];
}): Promise<TopicRow> {
  const { data, error } = await dbAdmin()
    .from("release_topics")
    .insert({ title: input.title, angle: input.angle ?? null })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  if (input.candidateIds?.length) await setCandidates(data.id, input.candidateIds);
  return getTopic(data.id);
}

export async function editTopic(
  id: number,
  input: { title?: string; angle?: string | null; candidateIds?: string[] },
): Promise<TopicRow> {
  await getTopic(id);
  const patch: Record<string, unknown> = {};
  if (input.title !== undefined) patch.title = input.title;
  if (input.angle !== undefined) patch.angle = input.angle;
  await save(id, patch);
  if (input.candidateIds) await setCandidates(id, input.candidateIds);
  return getTopic(id);
}

/**
 * 다음 단계를 끝냈다고 기록한다. 근거(note)는 필수다 — "수요 확인 완료"만
 * 남으면 나중에 무엇을 확인했는지 알 수 없다.
 */
export async function advanceTopic(
  id: number,
  input: { note: string; postSlug?: string | null },
): Promise<TopicRow> {
  const topic = await getTopic(id);
  if (topic.droppedReason !== null) {
    throw new TopicError("접은 주제다. 다시 펼친 뒤 진행할 것");
  }
  const next = nextStage(topic.stage);
  if (!next) throw new TopicError("이미 발행까지 끝난 주제다");

  const postSlug = input.postSlug ?? topic.postSlug;
  if (next.key === "draft" && !postSlug) {
    throw new TopicError("초안 단계는 글 slug 가 있어야 넘긴다");
  }

  const checks = {
    ...topic.checks,
    [next.key]: { at: new Date().toISOString(), note: input.note },
  };
  await save(id, { stage: next.key, checks, post_slug: postSlug });

  // 발행하면 묶인 글감도 썼음으로 닫는다. 메모(어느 글에 쓸지)는 남긴다.
  if (next.key === "published" && topic.candidates.length) {
    await dbAdmin()
      .from("release_candidates")
      .update({ status: "written" })
      .in(
        "id",
        topic.candidates.map((c) => c.id),
      );
  }
  return getTopic(id);
}

/** 마지막 단계를 취소한다. 그 단계의 근거도 지운다. */
export async function revertTopic(id: number): Promise<TopicRow> {
  const topic = await getTopic(id);
  const i = stageIndex(topic.stage);
  if (i === 0) throw new TopicError("더 되돌릴 단계가 없다");

  const checks = { ...topic.checks };
  delete checks[topic.stage];
  await save(id, { stage: STAGES[i - 1].key, checks });
  return getTopic(id);
}

/** reason 이 null 이면 다시 펼친다. */
export async function dropTopic(
  id: number,
  reason: string | null,
): Promise<TopicRow> {
  await getTopic(id);
  await save(id, { dropped_reason: reason });
  return getTopic(id);
}

export async function deleteTopic(id: number): Promise<void> {
  await getTopic(id);
  const { error } = await dbAdmin().from("release_topics").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
