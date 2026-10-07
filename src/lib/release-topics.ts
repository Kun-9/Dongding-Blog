/**
 * 글 주제 읽기·쓰기 — 어드민 API 와 MCP 도구가 같이 쓴다.
 *
 * 단계 이동은 여기서만 한다. 화면에서 누르든 Claude 가 세션에서 부르든 같은
 * 규칙(한 칸씩, 근거 필수)을 타야 진행 기록이 믿을 만하다.
 */
import "server-only";

import { revalidatePath } from "next/cache";
import { dbAdmin } from "@/lib/supabase";
import { syncLinkMeta } from "@/lib/link-meta";
import { loadPost } from "@/lib/mcp-blog";
import { checkVoice } from "@/lib/voice";
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
  /** AI 작업 상태. null 이면 맡긴 일이 없다. */
  ai: {
    status: AiStatus | null;
    until: AiUntil | null;
    message: string | null;
    updatedAt: string | null;
  };
  /** 작업 노트(markdown) — 조사 요약, 링크, 비교 표, 그림 목록. */
  notes: string;
}

export type AiStatus = "queued" | "running" | "failed";
/** AI 가 진행할 수 있는 마지막 단계. 발행은 사람이 한다. */
export type AiUntil = "sources" | "assets" | "draft" | "review";
export const AI_UNTIL: AiUntil[] = ["sources", "assets", "draft", "review"];

/** running 이 이보다 오래되면 실행기가 죽은 것으로 보고 다시 집는다. */
const STALE_MS = 2 * 60 * 60 * 1000;

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
  ai_status?: string | null;
  ai_until?: string | null;
  ai_message?: string | null;
  ai_updated_at?: string | null;
  notes?: string;
};

const BASE_COLUMNS =
  "id, title, angle, stage, checks, post_slug, dropped_reason, updated_at";
const TOPIC_COLUMNS = `${BASE_COLUMNS}, ai_status, ai_until, ai_message, ai_updated_at, notes`;

/**
 * AI 컬럼 마이그레이션보다 배포가 먼저 나가도 화면은 살아 있어야 한다.
 * 없는 컬럼(42703)이면 기본 컬럼만으로 다시 읽는다.
 */
async function selectTopics(
  build: (columns: string) => PromiseLike<{ data: unknown; error: { code?: string; message: string } | null }>,
) {
  const first = await build(TOPIC_COLUMNS);
  if (first.error?.code === "42703") return build(BASE_COLUMNS);
  return first;
}

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
    ai: {
      status: (t.ai_status ?? null) as AiStatus | null,
      until: (t.ai_until ?? null) as AiUntil | null,
      message: t.ai_message ?? null,
      updatedAt: t.ai_updated_at ?? null,
    },
    notes: t.notes ?? "",
  };
}

export async function getTopics(): Promise<TopicRow[]> {
  const db = dbAdmin();
  const [topics, links] = await Promise.all([
    selectTopics((cols) => db.from("release_topics").select(cols).order("id")),
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
  return ((topics.data ?? []) as DbTopic[]).map((t) =>
    toRow(t, (byTopic.get(t.id) ?? []).sort()),
  );
}

async function getTopic(id: number): Promise<TopicRow> {
  const db = dbAdmin();
  const [topic, links] = await Promise.all([
    selectTopics((cols) =>
      db.from("release_topics").select(cols).eq("id", id).maybeSingle(),
    ),
    db
      .from("release_topic_candidates")
      .select("candidate_id")
      .eq("topic_id", id),
  ]);
  if (topic.error) throw new Error(topic.error.message);
  if (!topic.data) throw new TopicError("없는 주제", 404);
  return toRow(
    topic.data as DbTopic,
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
 * 다음 단계를 끝냈다고 기록한다. 근거(note)는 필수다. "자료 완료"만 남으면
 * 나중에 무엇을 만들었는지 알 수 없다.
 *
 * 점검(review) 단계만은 근거를 사람 말로 받지 않는다. 서버가 초안 본문을
 * 문체·구성 기준(lib/voice)으로 검사해서 경고가 남으면 넘기지 않고, 통과하면
 * 그 결과를 근거에 붙인다.
 */
export async function advanceTopic(
  id: number,
  input: { note: string; postSlug?: string | null },
  /**
   * 발행까지 넘길 수 있는가. 발행은 글을 실제로 공개하므로 어드민 버튼만
   * true 로 부른다. MCP(실행기 포함)는 false — AI 가 공개하는 길을 막는다.
   */
  opts: { allowPublish?: boolean } = {},
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

  if (next.key === "published" && !opts.allowPublish) {
    throw new TopicError("발행은 어드민의 발행 버튼으로만 한다");
  }

  let note = input.note;
  // 점검과 발행 모두 본문을 검사한다. 점검 뒤에 본문을 고쳤을 수 있어서
  // 발행 직전에 한 번 더 본다.
  if (next.key === "review" || next.key === "published") {
    const post = postSlug ? await loadPost(postSlug) : null;
    if (!post) throw new TopicError(`'${postSlug}' 글이 없다. 초안 slug 를 확인할 것`);
    const report = checkVoice(post);
    const blocking = report.issues.filter((i) => i.severity !== "info");
    if (blocking.length > 0) {
      const list = blocking
        .slice(0, 6)
        .map((i) => `· ${i.line ? `${i.line}행 ` : ""}${i.message}`)
        .join("\n");
      const more = blocking.length > 6 ? `\n· 외 ${blocking.length - 6}건` : "";
      throw new TopicError(`점검 통과 못 함 — 경고 ${blocking.length}건\n${list}${more}`);
    }
    const infos = report.issues.length;
    note = `${note}\n[자동 점검] 통과 · 참고 ${infos}건`;

    if (next.key === "published") {
      // 글을 실제로 공개한다. 편집 API 의 공개 전환과 같은 뒤처리(링크 카드
      // 메타 동기화, 캐시 무효화)를 한다.
      const { error } = await dbAdmin()
        .from("posts")
        .update({ visibility: "published" })
        .eq("slug", post.slug);
      if (error) throw new Error(`발행 실패: ${error.message}`);
      await syncLinkMeta(post.body).catch(() => {});
      revalidatePath("/", "layout");
    }
  }

  const checks = {
    ...topic.checks,
    [next.key]: { at: new Date().toISOString(), note },
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

/**
 * 마지막 단계를 취소한다. 그 단계의 근거도 지운다. 발행을 취소하면 글도
 * draft 로 내린다 — 단계는 점검인데 글은 공개된 채로 남으면 안 된다.
 */
export async function revertTopic(id: number): Promise<TopicRow> {
  const topic = await getTopic(id);
  const i = stageIndex(topic.stage);
  if (i === 0) throw new TopicError("더 되돌릴 단계가 없다");

  if (topic.stage === "published" && topic.postSlug) {
    const { error } = await dbAdmin()
      .from("posts")
      .update({ visibility: "draft" })
      .eq("slug", topic.postSlug);
    if (error) throw new Error(`발행 취소 실패: ${error.message}`);
    revalidatePath("/", "layout");
    await dbAdmin()
      .from("release_candidates")
      .update({ status: "queued" })
      .in("id", topic.candidates.map((c) => c.id))
      .eq("status", "written");
  }

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

/* ── AI 작업 ─────────────────────────────────────────────────────────── */

async function saveAi(
  id: number,
  patch: { ai_status?: AiStatus | null; ai_until?: AiUntil | null; ai_message?: string | null },
) {
  const { error } = await dbAdmin()
    .from("release_topics")
    .update({ ...patch, ai_updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

/**
 * AI 에게 맡긴다. until 단계까지 진행하고 멈춘다. 이미 그 단계를 지났거나
 * 접은 주제면 거절한다.
 */
export async function queueAi(id: number, until: AiUntil): Promise<TopicRow> {
  const topic = await getTopic(id);
  if (topic.droppedReason !== null) throw new TopicError("접은 주제는 맡길 수 없다");
  if (topic.ai.status === "running") throw new TopicError("이미 작업 중이다");
  if (stageIndex(topic.stage) >= stageIndex(until)) {
    throw new TopicError(`이미 ${until} 단계를 지났다`);
  }
  await saveAi(id, { ai_status: "queued", ai_until: until, ai_message: null });
  return getTopic(id);
}

/** 맡긴 일을 거둔다. 작업 중인 것도 다음 보고 때 멈추도록 상태를 지운다. */
export async function cancelAi(id: number): Promise<TopicRow> {
  await getTopic(id);
  await saveAi(id, { ai_status: null, ai_until: null, ai_message: "사람이 취소함" });
  return getTopic(id);
}

/**
 * 실행기가 다음 일을 집는다. queued 중 가장 먼저 맡긴 것, 없으면 오래 멈춘
 * running(실행기가 죽은 것)을 running 으로 바꿔 돌려준다. 없으면 null.
 *
 * 조건부 update 로 집어서 실행기 둘이 같은 주제를 동시에 잡지 않는다.
 */
export async function claimAiWork(): Promise<TopicRow | null> {
  const db = dbAdmin();
  const stale = new Date(Date.now() - STALE_MS).toISOString();
  const { data } = await db
    .from("release_topics")
    .select("id, ai_status, ai_updated_at")
    .or(`ai_status.eq.queued,and(ai_status.eq.running,ai_updated_at.lt."${stale}")`)
    .is("dropped_reason", null)
    .order("ai_updated_at", { ascending: true })
    .limit(5);

  for (const c of data ?? []) {
    const { data: won } = await db
      .from("release_topics")
      .update({
        ai_status: "running",
        ai_message: "작업 시작",
        ai_updated_at: new Date().toISOString(),
      })
      .eq("id", c.id)
      .eq("ai_status", c.ai_status as string)
      .eq("ai_updated_at", c.ai_updated_at as string)
      .select("id")
      .maybeSingle();
    if (won) return getTopic(c.id);
  }
  return null;
}

/** 진행 중 한 줄 상황. 화면에 "작업 중 — …"으로 보인다. */
export async function reportAi(id: number, message: string): Promise<TopicRow> {
  const topic = await getTopic(id);
  if (topic.ai.status !== "running") throw new TopicError("작업 중인 주제가 아니다 (취소됐을 수 있다)");
  await saveAi(id, { ai_message: message });
  return getTopic(id);
}

/** 작업을 끝낸다. ok 면 상태를 비우고, 아니면 failed 로 이유를 남긴다. */
export async function finishAi(id: number, ok: boolean, message: string): Promise<TopicRow> {
  await getTopic(id);
  await saveAi(
    id,
    ok
      ? { ai_status: null, ai_until: null, ai_message: message }
      : { ai_status: "failed", ai_message: message },
  );
  return getTopic(id);
}

/**
 * 작업 노트를 쓴다. append 는 끝에 덧붙이고, replace 는 통째로 바꾼다.
 * 노트는 초안의 재료라 50,000자까지 받는다.
 */
export async function saveNotes(
  id: number,
  markdown: string,
  mode: "append" | "replace",
): Promise<TopicRow> {
  const topic = await getTopic(id);
  const next =
    mode === "replace" ? markdown : [topic.notes.trimEnd(), markdown.trim()].filter(Boolean).join("\n\n");
  if (next.length > 50_000) throw new TopicError("노트가 50,000자를 넘는다. 요약해서 replace 할 것");
  const { error } = await dbAdmin()
    .from("release_topics")
    .update({ notes: next, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(error.message);
  return getTopic(id);
}
