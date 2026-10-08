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
import { fireReleaseRoutine } from "@/lib/routine-fire";
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
    /** 실행기가 집은 시각. 경과 시간을 센다. */
    startedAt: string | null;
    /** 이번 작업의 진행 로그. 오래된 것부터. */
    log: AiLogEntry[];
    /** 마지막 작업이 남긴 사람 몫의 일. 그 뒤로 무슨 일이든 생기면 비운다. */
    todo: string | null;
    /** 예약 — 루틴을 깨우지 않고 로컬 CLI 세션이 집기를 기다린다. */
    local: boolean;
    /** 고치기 지시. 있으면 단계를 넘기지 않고 발행 대기 초안만 고치는 작업이다. */
    prompt: string | null;
  };
  /** 작업 노트(markdown) — 조사 요약, 링크, 비교 표, 그림 목록. */
  notes: string;
}

export type AiStatus = "queued" | "running" | "failed";

export interface AiLogEntry {
  at: string;
  message: string;
  kind: "start" | "report" | "stage" | "done" | "fail";
  /** done·fail 줄에만. 사람이 해야 할 남은 일. */
  todo?: string;
}

/** 로그는 이 줄 수까지만 남긴다. 화면은 최근 것부터 본다. */
const LOG_LIMIT = 80;
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
  ai_log?: Json;
  ai_started_at?: string | null;
  ai_local?: boolean;
  ai_prompt?: string | null;
};

const BASE_COLUMNS =
  "id, title, angle, stage, checks, post_slug, dropped_reason, updated_at";
const AI_COLUMNS = `${BASE_COLUMNS}, ai_status, ai_until, ai_message, ai_updated_at, notes`;
const TOPIC_COLUMNS = `${AI_COLUMNS}, ai_log, ai_started_at`;
const LOCAL_COLUMNS = `${TOPIC_COLUMNS}, ai_local`;
const FULL_COLUMNS = `${LOCAL_COLUMNS}, ai_prompt`;

/**
 * 마이그레이션보다 배포가 먼저 나가도 화면은 살아 있어야 한다. 없는
 * 컬럼(42703)이면 한 단계씩 덜 읽는다: 고치기 → 예약 → 로그 → AI 상태 → 기본 컬럼.
 */
async function selectTopics(
  build: (columns: string) => PromiseLike<{ data: unknown; error: { code?: string; message: string } | null }>,
) {
  for (const cols of [FULL_COLUMNS, LOCAL_COLUMNS, TOPIC_COLUMNS, AI_COLUMNS]) {
    const res = await build(cols);
    if (res.error?.code !== "42703") return res;
  }
  return build(BASE_COLUMNS);
}

function toRow(t: DbTopic, candidateIds: string[]): TopicRow {
  const log = Array.isArray(t.ai_log) ? (t.ai_log as unknown as AiLogEntry[]) : [];
  // 남은 일은 끝낸 줄이 로그의 마지막이고, 그 뒤로 주제가 바뀌지 않았을
  // 때만 유효하다. 다시 맡기면 로그가 새로 시작되고, 사람이 단계를 넘기거나
  // 되돌리거나 고치면 updated_at 이 끝낸 시각을 지나 저절로 사라진다.
  const end = log[log.length - 1];
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
      startedAt: t.ai_started_at ?? null,
      log,
      todo:
        end && (end.kind === "done" || end.kind === "fail") && Date.parse(t.updated_at) <= Date.parse(end.at)
          ? (end.todo ?? null)
          : null,
      local: t.ai_local ?? false,
      // 끝났거나 취소된 고치기의 지시는 남은 지시로 읽히지 않게 가린다.
      prompt: t.ai_status ? (t.ai_prompt ?? null) : null,
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
  /** expect: 넘어갈 단계. 화면을 띄운 뒤 단계가 바뀌었으면 엉뚱한 칸을 넘기지 않게 거절한다. */
  input: { note: string; postSlug?: string | null; expect?: StageKey },
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
  if (input.expect && next.key !== input.expect) {
    throw new TopicError(`단계가 바뀌었다(지금 ${next.label} 차례). 화면을 새로 고친 뒤 다시 할 것`);
  }

  const postSlug = input.postSlug ?? topic.postSlug;
  if (next.key === "draft" && !postSlug) {
    throw new TopicError("초안 단계는 글 slug 가 있어야 넘긴다");
  }

  if (next.key === "published" && !opts.allowPublish) {
    throw new TopicError("발행은 어드민의 발행 버튼으로만 한다");
  }
  if (next.key === "published" && (topic.ai.status === "queued" || topic.ai.status === "running")) {
    throw new TopicError("AI 가 맡은 작업이 끝나지 않았다. 끝나거나 취소한 뒤 발행할 것");
  }

  let note = input.note;
  // 점검과 발행 모두 본문을 검사한다. 점검 뒤에 본문을 고쳤을 수 있어서
  // 발행 직전에 한 번 더 본다.
  if (next.key === "review" || next.key === "published") {
    const post = postSlug ? await loadPost(postSlug) : null;
    if (!post) throw new TopicError(`'${postSlug}' 글이 없다. 초안 slug 를 확인할 것`);
    const report = checkVoice(post);
    // 캡처 자리(todo-)는 점검 단계에선 참고지만, 발행 직전에는 막는다.
    const blocking = report.issues.filter(
      (i) => i.severity !== "info" || (next.key === "published" && i.rule === "capture-pending"),
    );
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
  if (topic.ai.status === "running") {
    await saveAi(id, { ai_message: `${next.label} 완료` }, { topic, kind: "stage", message: `${next.label} 단계 완료` });
  } else if (topic.ai.status === "failed") {
    // AI 가 멈춘 단계를 사람이 직접 끝냈다. 멈춤 표시를 거둔다.
    await saveAi(id, { ai_status: null, ai_until: null });
  }

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
  patch: {
    ai_status?: AiStatus | null;
    ai_until?: AiUntil | null;
    ai_message?: string | null;
    ai_local?: boolean;
    ai_prompt?: string | null;
  },
  /** 로그에 한 줄 덧붙인다. reset 이면 로그를 비우고 이 줄로 시작한다. */
  log?: { topic: TopicRow; kind: AiLogEntry["kind"]; message: string; todo?: string; reset?: boolean },
) {
  const now = new Date().toISOString();
  const base = { ...patch, ai_updated_at: now };
  let extra: Record<string, unknown> = {};
  if (log) {
    const entry: AiLogEntry = { at: now, kind: log.kind, message: log.message, ...(log.todo ? { todo: log.todo } : {}) };
    const next = log.reset ? [entry] : [...log.topic.ai.log, entry].slice(-LOG_LIMIT);
    extra = { ai_log: next, ...(log.reset ? { ai_started_at: now } : {}) };
  }
  const db = dbAdmin().from("release_topics");
  let { error } = await db.update({ ...base, ...extra } as never).eq("id", id);
  // 로그 컬럼 마이그레이션 전이면(PGRST204·42703) 로그 없이 상태만 쓴다.
  if (error && log && (error.code === "PGRST204" || error.code === "42703")) {
    ({ error } = await dbAdmin().from("release_topics").update(base).eq("id", id));
  }
  if (error) throw new Error(error.message);
}

/**
 * AI 에게 맡긴다. until 단계까지 진행하고 멈춘다. 이미 그 단계를 지났거나
 * 접은 주제면 거절한다. local 이면 예약만 한다 — 루틴을 깨우지 않고, 로컬
 * CLI 세션이 claim_release_work(MCP)로 집을 때까지 기다린다.
 *
 * prompt 가 있으면 고치기다. 발행 대기(점검까지 끝남) 초안만 받고, 실행기는
 * 단계를 넘기지 않은 채 지시대로 초안을 고치고 점검을 다시 돌린다.
 */
export async function queueAi(
  id: number,
  until: AiUntil,
  local = false,
  prompt: string | null = null,
): Promise<TopicRow> {
  const topic = await getTopic(id);
  if (topic.droppedReason !== null) throw new TopicError("접은 주제는 맡길 수 없다");
  if (topic.ai.status === "running") throw new TopicError("이미 작업 중이다");
  if (prompt) {
    if (topic.stage !== "review" || !topic.postSlug) {
      throw new TopicError("고치기는 점검까지 끝난 초안에만 맡길 수 있다");
    }
    until = "review";
  } else if (stageIndex(topic.stage) >= stageIndex(until)) {
    throw new TopicError(`이미 ${until} 단계를 지났다`);
  }
  // 지시는 고치기일 때와 지난 지시를 지울 때만 쓴다. 컬럼 마이그레이션 전에
  // 배포돼도 일반 맡기기는 살아 있다(그때 읽은 prompt 는 늘 null 이다).
  const promptPatch = prompt || topic.ai.prompt ? { ai_prompt: prompt } : {};
  if (local) {
    await saveAi(id, {
      ai_status: "queued",
      ai_until: until,
      ai_local: true,
      ...promptPatch,
      ai_message: "예약함 — 로컬 CLI 에서 집으면 시작",
    });
    return getTopic(id);
  }
  await saveAi(id, { ai_status: "queued", ai_until: until, ai_local: false, ...promptPatch, ai_message: null });

  // 루틴을 바로 깨운다. 깨운 세션은 이 주제만 집는다(지시서 0단계).
  // 실패해도 요청은 queued 로 남아 정기 실행이 집어 간다.
  const fire = await fireReleaseRoutine(`topic_id=${id} until=${until}`);
  // 실행기가 벌써 집어 갔으면(running) 그쪽 메시지를 덮지 않는다.
  await dbAdmin()
    .from("release_topics")
    .update({
      ai_message: fire.fired
        ? `실행기를 깨웠음${fire.sessionUrl ? ` · ${fire.sessionUrl}` : ""}`
        : `${fire.reason} — 다음 정기 실행 때 시작`,
    })
    .eq("id", id)
    .eq("ai_status", "queued")
    .eq("ai_local", false);
  return getTopic(id);
}

/** 맡긴 일을 거둔다. 작업 중인 것도 다음 보고 때 멈추도록 상태를 지운다. */
export async function cancelAi(id: number): Promise<TopicRow> {
  const topic = await getTopic(id);
  await saveAi(
    id,
    { ai_status: null, ai_until: null, ai_message: "작업을 취소함" },
    { topic, kind: "fail", message: "작업을 취소함" },
  );
  return getTopic(id);
}

/**
 * 실행기가 다음 일을 집는다. queued 중 가장 먼저 맡긴 것, 없으면 오래 멈춘
 * running(실행기가 죽은 것)을 running 으로 바꿔 돌려준다. 없으면 null.
 *
 * 조건부 update 로 집어서 실행기 둘이 같은 주제를 동시에 잡지 않는다.
 * id 를 주면 그 주제만 본다 — 맡기기 버튼이 깨운 세션이 자기 주제만 집는다.
 * 어느 쪽이든 local 이 맞는 것만 — 클라우드 루틴은 예약을, 로컬 세션은
 * 바로 실행을 집지 않는다. 깨운 뒤 예약으로 바꿔 맡겨도 깨운 세션이 못 집는다.
 */
export async function claimAiWork(id?: number, local = false): Promise<TopicRow | null> {
  const db = dbAdmin();
  const stale = new Date(Date.now() - STALE_MS).toISOString();
  let q = db
    .from("release_topics")
    .select("id, ai_status, ai_updated_at")
    .or(`ai_status.eq.queued,and(ai_status.eq.running,ai_updated_at.lt."${stale}")`)
    .is("dropped_reason", null);
  q = q.eq("ai_local", local);
  if (id !== undefined) q = q.eq("id", id);
  const { data } = await q.order("ai_updated_at", { ascending: true }).limit(5);

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
    if (won) {
      const topic = await getTopic(c.id);
      // 로그를 새로 시작하고 시작 시각을 찍는다. 고치기면 지시를 첫 줄에 남긴다.
      const message = topic.ai.prompt ? `실행기가 고치기를 집었음 — ${topic.ai.prompt}` : "실행기가 작업을 집었음";
      await saveAi(c.id, {}, { topic, kind: "start", message, reset: true });
      return getTopic(c.id);
    }
  }
  return null;
}

/** 진행 중 한 줄 상황. 화면에 "작업 중 — …"으로 보인다. */
export async function reportAi(id: number, message: string): Promise<TopicRow> {
  const topic = await getTopic(id);
  if (topic.ai.status !== "running") throw new TopicError("작업 중인 주제가 아니다 (취소됐을 수 있다)");
  await saveAi(id, { ai_message: message }, { topic, kind: "report", message });
  return getTopic(id);
}

/**
 * 작업을 끝낸다. ok 면 상태를 비우고, 아니면 failed 로 이유를 남긴다.
 * todo 는 사람이 해야 할 남은 일 — 어드민 목록 둘째 줄에 보인다.
 */
export async function finishAi(id: number, ok: boolean, message: string, todo?: string): Promise<TopicRow> {
  const topic = await getTopic(id);
  await saveAi(
    id,
    ok
      ? { ai_status: null, ai_until: null, ai_message: message }
      : { ai_status: "failed", ai_message: message },
    { topic, kind: ok ? "done" : "fail", message, todo: todo?.trim() || undefined },
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
